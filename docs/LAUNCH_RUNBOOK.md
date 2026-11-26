# TRUSS — V2.5 Production Launch & Rollback Runbook

## 1. Ön Koşullar & Altyapı Gereksinimleri
- **Çalışma Zamanı:** Node.js `v22+` / `v26` (ESM + CJS köprüsü), `TZ=Europe/Istanbul`.
- **Veritabanı:** PostgreSQL `16+` (`server_version_num >= 160000`).
- **Depolama (DOC-VAULT):** Production ortamında `DOC_VAULT_DRIVER=s3` zorunludur (`local` sürücüsü prod'da reddedilir). Cloudflare R2 veya AWS S3 uyumlu bucket + `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` hazırlanmalıdır.
- **Ters Vekil (Reverse Proxy):** Nginx / Caddy / Cloudflare arkasında `TRUST_PROXY` hop sayısı (`1..5`) veya CIDR/keyword (`loopback`, `linklocal`, `uniquelocal`) olmalıdır (`TRUST_PROXY=true` prod'da yasaktır).
- **Şablonlar:** `Backend/.env.example` ve `Frontend/.env.example` baz alınarak sırlar enjekte edilir; `.example.com` veya `000 00 00` yer tutucuları prod'da reddedilir.

## 2. Build & Veritabanı Migrasyon Adımları
1. Bağımlılıkları kurun:
   ```bash
   npm --prefix Backend ci --omit=dev
   npm --prefix Frontend ci
   ```
2. Frontend üretim derlemesini alın (çıktı dizini: `Frontend/dist`):
   ```bash
   VITE_API_URL=/api npm --prefix Frontend run build
   ```
   - `Frontend/dist/index.html`, `Frontend/dist/robots.txt` (`Disallow: /app`, `Disallow: /api`) ve `Frontend/dist/assets/*.js` dosyalarının oluştuğunu doğrulayın.
3. PostgreSQL 16 migrasyonlarını çalıştırın (`pg_advisory_lock` + SHA-256 checksum korumalı):
   ```bash
   npm run db:migrate
   ```
4. İlk `SYSTEM_ADMIN` hesabının `aktif_mi = TRUE` olduğunu doğrulayın (yoksa güvenli seed/SQL ile oluşturun).

## 3. Preflight Doğrulama (`preflight:prod`)
Canlı trafiği açmadan önce tek komutla env, kripto, build hijyeni ve PG 16 şemasını doğrulayın:
```bash
npm run preflight:prod -- --env-file /etc/truss/backend.env
```
- **Çıkış Kodları:** `0` = PASS, `1` = FAIL (bir veya daha fazla kontrol başarısız), `2` = geçersiz CLI bayrağı veya çalışma hatası.
- **Bayraklar:** `--skip-build` (yalnız env+DB), `--skip-db` (yalnız env+build), `--json` (CI/CD makine çıktısı).
- **Sır Güvenliği:** Çıktıda `JWT_SECRET`, `DATABASE_URL` şifresi veya `S3_SECRET_ACCESS_KEY` asla basılmaz.

## 4. Canlıya Alım & Smoke Test Checklist
1. `Backend` servisini `NODE_ENV=production` ile başlatın (`npm --prefix Backend start`).
2. `Frontend/dist` statik dosyalarını HTTPS ters vekil ile servis edin; `/api/*` isteklerini `Backend` portuna (`5001`) yönlendirin.
3. Smoke kontrolleri:
   - `GET /api/health` -> `200 OK` ve `X-Request-Id` başlığı mevcut.
   - `GET /robots.txt` -> `Disallow: /app` ve `Disallow: /api` içeriyor.
   - `POST /api/users/login` -> `200 OK` + `Strict-Transport-Security` + `Cache-Control: no-store`.
   - `SYSTEM_ADMIN` ile giriş -> `/app` ekranında KPI, Filo, Harita ve `SupportFeedbackSheet` sorunsuz açılıyor.

## 5. Rollback Prosedürü
1. **Uygulama Rollback:** Ters vekili önceki çalışan sürüm konteynerine / artifact'ine çevirin ve `Backend` servisini önceki commit tag'i ile yeniden başlatın.
2. **Frontend Rollback:** Önceki `Frontend/dist` artifact'ini geri yükleyin (`VITE_API_URL=/api` doğrulayın).
3. **Veritabanı Notu:** `000..011` migrasyonları geriye dönük uyumlu (append-only tablo ve nullable/default sütunlar) tasarlanmıştır; acil durumda `geri_bildirimler` veya `users.aktif_mi` için yıkıcı `DROP` yerine uygulama katmanı önceki sürüme alınır ve ardından kök neden `X-Request-Id` ile incelenir.
