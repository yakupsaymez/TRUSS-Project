# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-C0` MÜHÜRLENDİ)
- **Mühürlenen Geçmiş (`V2.1..FORGE-M4`):** `radix-luma` OKLCH, `a.org_id` + `SYSTEM_ADMIN` (`ADR-13/17`), TCO/anomali/CSV/denetim/arşiv (`ADR-18..23`), `FORGE` 5 uzman + `*WriteService` + `schema_migrations` + `token_version` + `is_emirleri` + `14`-dosya `gate-baseline` ratchet (`ADR-24..27`) — **QA PASS**.
- **`FORGE-C0 (PROD-SHIELD & CI)` — TAMAMLANDI — MÜHÜRLENDİ:** Sıfır yeni npm paketiyle `validateEnv` (`DATABASE_URL`/prod `JWT_SECRET>=32`/CORS), `securityHeaders`, 2 katmanlı `rateLimiter` (`429 RATE_LIMITED`), single-flight `GET /api/health`, DI `gracefulShutdown`, `000_base_schema` (`current_schema()::regnamespace`) boş-DB bootstrap ve `.github/workflows/ci.yml` PG 16 CI (`ADR-28`) — **`test:core 26/26 PASS`, `maxChunkKb: 228`, `QA PASS`**.

## 2. Yol Haritası (`FORGE-C0..C4`)
- **`FORGE-C0` (TAMAM):** Üretim zırhı (`validateEnv`, `securityHeaders`, `rateLimiter`, `/api/health`, `gracefulShutdown`), `000_base_schema` + PG 16 CI.
- **`FORGE-C1..C4` (PLANLI):** Gözlemlenebilirlik/loglama, toplu operasyon/rapor sertleştirme, 14-dosya ratchet daraltma ve sonraki ürün dilimleri.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** `maxChunkKb: 228` (`<= 228 KB`), Gate 1 `14` ratchet dosya (`0` fail, `0` warn, `0` shrinkable), `test:core 26/26 PASS`, PG 16 CI + `000_base_schema` aktif.

## 4. 📌 Durum Panosu
| Uzman | Güç | Şu An | Hemen Şimdi | İleride |
|:---|:---|:---|:---|:---|
| **Keystone** | `pro` | `FORGE-C0` mühürlendi | `FORGE-C1` kapsamı | `C1..C4` mimari plan |
| **Core-Smith** | `inherit` | `FORGE-C0` `/forge-seal` | Atomik commit + CI kontrol | `C1` BE sertleştirme |
| **Shell-Crafter** | `inherit` | `FORGE-C0` (`0 diff`) | `FORGE-C1` bekle | `14` dosya daraltma |
| **Sentinel** | `pro` | `FORGE-C0` **QA PASS** | Sonraki paketi bekle | Regresyon & E2E |
| **Radar** | `flash` | `FORGE-C0` temiz | Periyodik röntgen bekle | `C1..C4` sapma avı |
