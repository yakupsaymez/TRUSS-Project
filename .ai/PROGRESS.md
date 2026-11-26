# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-C1` MÜHÜRLENDİ)
- **Mühürlenen Geçmiş (`V2.1..FORGE-C0`):** `radix-luma` OKLCH, `a.org_id` + `SYSTEM_ADMIN` (`ADR-13/17`), TCO/anomali/CSV/denetim/arşiv (`ADR-18..23`), `FORGE` 5 uzman + `*WriteService` + `schema_migrations` + `token_version` + `is_emirleri` + `14`-dosya ratchet (`ADR-24..27`), üretim zırhı + boş-DB bootstrap + PG 16 CI (`ADR-28`) — **QA PASS**.
- **`FORGE-C1 (DOC-VAULT)` — TAMAMLANDI — MÜHÜRLENDİ:** `0` yeni npm paketiyle `009_v23_doc_vault` (`belge_kasasi`, `18` tablo), sıfır-npm AWS SigV4 `UNSIGNED-PAYLOAD` (`s3Presigner`) + dev-only HMAC `local` sürücü (`localVaultDriver`), `DRIVER` taslak yükleme vs `hasFinanceAccess` indirme/görüntüleme ayrımı, `WorkOrderComplete -> bakim` belge bağlama ve 3 katmanlı `doc-vault` UI (`ADR-29`) — **`test:core 31/31 PASS`, `maxChunkKb: 228 KB`, `QA PASS`**.
- **`FORGE-OPS-METER` — MÜHÜRLENDİ:** `npm run forge:meter` (`codeburn` token/maliyet/verimlilik HUD) + `<= 15` adım E2E tarayıcı bütçe sınırı (`STEP_BUDGET_EXCEEDED`) — **`QA PASS`**.

## 2. Yol Haritası (`FORGE-C0..C4` · Faz C / `V2.3`)
- **`FORGE-C0` (`PROD-SHIELD & CI` [TAMAM]):** `validateEnv`, `securityHeaders`, `rateLimiter`, `/api/health`, `gracefulShutdown`, `000_base_schema` + PG 16 CI.
- **`FORGE-C1` (`DOC-VAULT` [TAMAM]):** Kiracı-izole S3/R2 presigned + dev HMAC yerel belge kasası (`belge_kasasi`), yakıt/bakım/iş emri entegrasyonu.
- **`FORGE-C2` (`HANDOVER & INSPECTION` [PLANLI]):** Şoför zimmet teslim/muayene kontrol listesi ve hasar kayıt akışı.
- **`FORGE-C3` (`EXEC-EXPORT & REPORT-SLIM` [PLANLI]):** Yönetici rapor dışa aktarım + büyük rapor/tablo dosyalarını daraltma.
- **`FORGE-C4` (`V2.3-SEAL` [PLANLI]):** `14`-dosya ratchet daraltma ve `V2.3` nihai sürüm mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** `maxChunkKb: 228` (`<= 228 KB`), Gate 1 `14` ratchet dosya (`0` fail, `0` warn, `0` shrinkable), `test:core 31/31 PASS`, `18` PG tablosu + PG 16 CI aktif.

## 4. 📌 Durum Panosu
| Uzman | Güç | Şu An | Hemen Şimdi | İleride |
|:---|:---|:---|:---|:---|
| **Keystone** | `pro` | `FORGE-C1` mühürlendi | `FORGE-C2` kapsamı | `C2..C4` mimari plan |
| **Core-Smith** | `inherit` | `FORGE-OPS-METER` `/forge-seal` | `FORGE-C2` bekle | `C2` BE şema & servis |
| **Shell-Crafter** | `inherit` | `FORGE-C1` `doc-vault` UI | `FORGE-C2` bekle | `14` dosya daraltma |
| **Sentinel** | `pro` | `FORGE-OPS-METER` **QA PASS** | Sonraki paketi bekle | Regresyon & E2E |
| **Radar** | `flash` | `FORGE-C1` temiz | Periyodik röntgen bekle | `C2..C4` sapma avı |
