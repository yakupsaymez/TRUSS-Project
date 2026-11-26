# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-D3 FE DİLİMİ`)
- **`V2.1..FORGE-C4` (`ADR-01..32`) — QA PASS:** `radix-luma`, `a.org_id` + `SYSTEM_ADMIN`, TCO/anomali/CSV/denetim/arşiv, `*WriteService` + `schema_migrations` + `token_version` + `is_emirleri`, prod zırhı + PG 16 CI, `belge_kasasi`, `zimmet_muayeneleri`, BOM CSV + `raporController` slim, `userSettings` + `V2.3` X-Ray mührü.
- **`FORGE-D0..D2` (`ADR-33..35`) — QA BEKLİYOR:** `parcaQuery/WriteService` + `parcaController` (`84`L), `complianceUtils`, `FleetHealthWidget`/`Takvim` 3-katman, `CreateMemberSheet`/`CostTrendChart` 3-katman, ratchet `6 -> 1`.
- **`FORGE-D3` (`ADR-36`) — QA BEKLİYOR:** `Harita` 3-katman (`useHaritaController`, `haritaUtils`, `HaritaHeader`, `HaritaUnpositionedPanel`, `HaritaCheckInDialog`), `(0,0)`/arşiv/uçuş koruması, `FleetMapDetailBar` `İş Emri Aç` + `prefillWorkOrder`, ratchet `1 -> 0`.

## 2. Yol Haritası & Ratchet
- **`FORGE-C0..C4` [TAMAM]; `FORGE-D0..D3` [UYGULANDI]:** Gate 1 **`0` ratchet** (`"files": {}`, `0` BE/FE, `vendor-charts <= 228 KB`), PG 16 CI aktif.
