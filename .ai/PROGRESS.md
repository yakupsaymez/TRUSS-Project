# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-C4 / V2.3 MÜHÜRLENDİ`)
- **`V2.1..FORGE-C2`:** `radix-luma` OKLCH, `a.org_id` + `SYSTEM_ADMIN` (`ADR-13/17`), TCO/anomali/CSV/denetim/arşiv (`ADR-18..23`), `FORGE` + `*WriteService` + `schema_migrations` + `token_version` + `is_emirleri` (`ADR-24..27`), prod zırhı + PG 16 CI (`ADR-28`), `0`-npm `belge_kasasi` (`ADR-29`), `zimmet_muayeneleri` (`19.` tablo) + tek-TX `ariza` (`ADR-30`) — **QA PASS**.
- **`FORGE-C3 (EXEC-EXPORT & REPORT-SLIM)` — MÜHÜRLENDİ:** `0`-npm UTF-8 BOM `csvSerializer`, `raporQueryService` + `/api/raporlar/export/*`, `raporController` (`76`L), `GenelBakis` 3 katman + `Hareketler` CSV (`ADR-31`) — **QA PASS**.
- **`FORGE-C4 (V2.3-SEAL)` — MÜHÜRLENDİ:** `V2.3` release seal; X-Ray dikişleri kapatıldı (`database.sql` `typnamespace`, `qaSeed/Helpers`, `userRoutes` `23`L -> `userSettingsController/Service`, `FleetEfficiencyCard`, `fuelImportHelpers`, `forge-meter` `1M`/`$0.90`); 6 dosya daraltıldı (ratchet `12 -> 6` [toplam `14 -> 6`]); `39/39 test:core`, `vendor-charts 227.9 KB`, `0 P0/P1` (`ADR-32`) — **QA PASS**.

## 2. Yol Haritası (Faz C / `V2.3` TAMAM)
- **`FORGE-C0..C4` [TAMAM]:** Prod zırhı + PG 16 CI (`C0`); DOC-VAULT (`C1`); zimmet muayenesi (`C2`); BOM CSV export + report slim (`C3`); X-Ray dikişleri + ratchet `12 -> 6` + `V2.3` mührü (`C4`).

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** Gate 1 `6` ratchet (`0` fail, `0` warn, `0` shrinkable; `vendor-charts 227.9 KB`), PG 16 CI aktif.
