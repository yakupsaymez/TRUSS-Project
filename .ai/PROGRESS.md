# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-C2` MÜHÜRLENDİ)
- **Mühürlenen Geçmiş (`V2.1..FORGE-C0`):** `radix-luma` OKLCH, `a.org_id` + `SYSTEM_ADMIN` (`ADR-13/17`), TCO/anomali/CSV/denetim/arşiv (`ADR-18..23`), `FORGE` 5 uzman + `*WriteService` + `schema_migrations` + `token_version` + `is_emirleri` + ratchet (`ADR-24..27`), üretim zırhı + boş-DB bootstrap + PG 16 CI (`ADR-28`) — **QA PASS**.
- **`FORGE-C1 (DOC-VAULT)` — MÜHÜRLENDİ:** `0` yeni npm paketiyle `009_v23_doc_vault` (`belge_kasasi`), sıfır-npm AWS SigV4 (`s3Presigner`) + dev HMAC `local` sürücü (`localVaultDriver`), `DRIVER` taslak vs `hasFinanceAccess` indirme, `WorkOrderComplete -> bakim` ve `doc-vault` UI (`ADR-29`) — **QA PASS**.
- **`FORGE-OPS` & `FORGE-HARNESS-V2` — MÜHÜRLENDİ:** 5 uzman `model: inherit`, 4-8'li paralel G/Ç, `<= 2` FE eki vs `>= 3` FE dilim yönlendirme + `shell-crafter` baseline ratchet izni, `forge:meter` ve 3 satırlık kompakt HUD.
- **`FORGE-C2 (HANDOVER & INSPECTION)` — MÜHÜRLENDİ:** `010_v23_handover_inspection` (`zimmet_muayeneleri`, 19. tablo), her atamada yeni `atama_id`, sayaç kronolojisi + `doc-vault` `'zimmet'` (`<= 4` görsel), kusurda tek TX konsolide `ariza` iş emri (`lockedArac`), `/api/zimmetler` + `AssignVehicleSheet` daraltma (`ADR-30`) — **`test:core 35/35 PASS`, `maxChunkKb: 227.9 KB`, `7` adımlı E2E PASS**.

## 2. Yol Haritası (`FORGE-C0..C4` · Faz C / `V2.3`)
- **`FORGE-C0` (`PROD-SHIELD & CI` [TAMAM]):** `validateEnv`, `securityHeaders`, `rateLimiter`, `/api/health`, `gracefulShutdown`, `000_base_schema` + PG 16 CI.
- **`FORGE-C1` (`DOC-VAULT` [TAMAM]):** Kiracı-izole S3/R2 presigned + dev HMAC yerel belge kasası (`belge_kasasi`), yakıt/bakım/iş emri entegrasyonu.
- **`FORGE-C2` (`HANDOVER & INSPECTION` [TAMAM]):** Dijital zimmet teslim/muayene kontrol listesi, görsel yükleme ve otomatik arıza iş emri + `AssignVehicleSheet` ratchet düşüşü.
- **`FORGE-C3` (`EXEC-EXPORT & REPORT-SLIM` [PLANLI]):** Yönetici rapor dışa aktarım + büyük rapor/tablo dosyalarını daraltma.
- **`FORGE-C4` (`V2.3-SEAL` [PLANLI]):** Kalan `13`-dosya ratchet daraltma ve `V2.3` nihai sürüm mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** `maxChunkKb: 227.9` (`<= 228 KB`), Gate 1 `13` ratchet dosya (`AssignVehicleSheet` listeden düşürüldü; `0` fail, `0` warn, `0` shrinkable), `test:core 35/35 PASS`, PG 16 CI aktif.
