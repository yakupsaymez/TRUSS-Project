# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-HARNESS-V2` MÜHÜRLENDİ)
- **Mühürlenen Geçmiş (`V2.1..FORGE-C0`):** `radix-luma` OKLCH, `a.org_id` + `SYSTEM_ADMIN` (`ADR-13/17`), TCO/anomali/CSV/denetim/arşiv (`ADR-18..23`), `FORGE` 5 uzman + `*WriteService` + `schema_migrations` + `token_version` + `is_emirleri` + `14`-dosya ratchet (`ADR-24..27`), üretim zırhı + boş-DB bootstrap + PG 16 CI (`ADR-28`) — **QA PASS**.
- **`FORGE-C1 (DOC-VAULT)` — MÜHÜRLENDİ:** `0` yeni npm paketiyle `009_v23_doc_vault` (`belge_kasasi`), sıfır-npm AWS SigV4 (`s3Presigner`) + dev HMAC `local` sürücü (`localVaultDriver`), `DRIVER` taslak yükleme vs `hasFinanceAccess` indirme/görüntüleme ayrımı, `WorkOrderComplete -> bakim` belge bağlama ve 3 katmanlı `doc-vault` UI (`ADR-29`) — **`test:core 31/31 PASS`, `maxChunkKb: 228 KB`, `QA PASS`**.
- **`FORGE-OPS-METER` & `FORGE-OPS-SPEED` — MÜHÜRLENDİ:** `npm run forge:meter` + `0` ön-okumalı delege, kontrat-bazlı boot ve tekil `gate:fast` / `1x gate` — **`QA PASS`**.
- **`FORGE-HARNESS-V2` — MÜHÜRLENDİ:** 5 uzman `model: inherit`, 4-8'li paralel G/Ç, `<= 2` FE eki vs `>= 3` FE dilim yönlendirme + `shell-crafter` baseline ratchet izni, hedefli E2E (`<= 10` adım hedef, `15` tavan; `0 diff` FE'de E2E yok), `2x` gate tavanı, kalibreli `forge-meter` zarfları ve 3 satırlık kompakt HUD (`DURUM`, `KANIT`, `HUD`).

## 2. Yol Haritası (`FORGE-C0..C4` · Faz C / `V2.3`)
- **`FORGE-C0` (`PROD-SHIELD & CI` [TAMAM]):** `validateEnv`, `securityHeaders`, `rateLimiter`, `/api/health`, `gracefulShutdown`, `000_base_schema` + PG 16 CI.
- **`FORGE-C1` (`DOC-VAULT` [TAMAM]):** Kiracı-izole S3/R2 presigned + dev HMAC yerel belge kasası (`belge_kasasi`), yakıt/bakım/iş emri entegrasyonu.
- **`FORGE-C2` (`HANDOVER & INSPECTION` [PLANLI]):** Şoför zimmet teslim/muayene kontrol listesi ve hasar kayıt akışı.
- **`FORGE-C3` (`EXEC-EXPORT & REPORT-SLIM` [PLANLI]):** Yönetici rapor dışa aktarım + büyük rapor/tablo dosyalarını daraltma.
- **`FORGE-C4` (`V2.3-SEAL` [PLANLI]):** `14`-dosya ratchet daraltma ve `V2.3` nihai sürüm mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** `maxChunkKb: 228` (`<= 228 KB`), Gate 1 `14` ratchet dosya (`0` fail, `0` warn, `0` shrinkable), `test:core 31/31 PASS`, PG 16 CI aktif.
