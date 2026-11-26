# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-C3` MÜHÜRLENDİ)
- **`V2.1..FORGE-C0`:** `radix-luma` OKLCH, `a.org_id` + `SYSTEM_ADMIN` (`ADR-13/17`), TCO/anomali/CSV/denetim/arşiv (`ADR-18..23`), `FORGE` + `*WriteService` + `schema_migrations` + `token_version` + `is_emirleri` (`ADR-24..27`), prod zırhı + boş-DB + PG 16 CI (`ADR-28`) — **QA PASS**.
- **`FORGE-C1`..`C2` + `HARNESS-V2`:** `0`-npm `belge_kasasi` SigV4/HMAC (`ADR-29`); `FORGE` 5 uzman `inherit`, 4-8 paralel G/Ç, `forge:meter`, 3 satır HUD; `zimmet_muayeneleri` (`19.` tablo), yeni `atama_id`, `doc-vault` `'zimmet'` (`<= 4` görsel), kusurda tek-TX `ariza` iş emri + `AssignVehicleSheet` ratchet (`ADR-30`) — **QA PASS**.
- **`FORGE-C3 (EXEC-EXPORT & REPORT-SLIM)` — MÜHÜRLENDİ:** `0`-npm UTF-8 BOM `csvSerializer` (OWASP/RFC4180), `raporQueryService` + `/api/raporlar/export/{filo-maliyet,hareketler,is-emirleri}`, `raporController` slim (`76`L, `12` ratchet), `GenelBakis` 3 katman (`158`L/`144`L/`86`L) + `Hareketler` CSV (`ADR-31`) — **QA PASS**.

## 2. Yol Haritası (`FORGE-C0..C4` · Faz C / `V2.3`)
- **`FORGE-C0`..`C2` [TAMAM]:** Prod zırhı + PG 16 CI (`C0`); kiracı-izole S3/R2 + HMAC `belge_kasasi` (`C1`); dijital zimmet muayenesi + konsolide arıza iş emri (`C2`).
- **`FORGE-C3` (`EXEC-EXPORT & REPORT-SLIM` [TAMAM]):** Yönetici CSV export, `raporController` slim (`76`L), `GenelBakis` 3 katman.
- **`FORGE-C4` (`V2.3-SEAL` [PLANLI]):** Kalan `12`-dosya ratchet daraltma ve `V2.3` nihai mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** Gate 1 `12` ratchet (`raporController` düştü; `0` fail, `0` warn, `0` shrinkable), PG 16 CI aktif.
