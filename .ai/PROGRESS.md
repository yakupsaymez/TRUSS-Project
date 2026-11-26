# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-D2 FE DİLİMİ`)
- **`V2.1..FORGE-C4` (`ADR-01..32`) — QA PASS:** `radix-luma`, `a.org_id` + `SYSTEM_ADMIN`, TCO/anomali/CSV/denetim/arşiv, `*WriteService` + `schema_migrations` + `token_version` + `is_emirleri`, prod zırhı + PG 16 CI, `belge_kasasi`, `zimmet_muayeneleri`, BOM CSV + `raporController` slim, `userSettings` + `V2.3` X-Ray mührü.
- **`FORGE-D0..D1` (`ADR-33..34`) — QA BEKLİYOR:** `parcaQuery/WriteService` + `parcaController` (`84`L), `complianceUtils` (`<=120`L), `FleetHealthWidget` + `Takvim` 3-katman, `IsEmirleri` `prefillWorkOrder`, ratchet `6 -> 3`.
- **`FORGE-D2` (`ADR-35`) — QA BEKLİYOR:** `CreateMemberSheet` (`59`L) + `useCreateMemberController` (`useRef` kilit, `arsivlendi_mi` filtre, `DATA_SCOPES.VEHICLE/HANDOVER`) + 2 saf yaprak; `CostTrendChart` (`33`L) + `useCostTrendController` (`effectiveTab`, sıfır-bölme koruması) + `CostTrendChartView`, ratchet `3 -> 1`.

## 2. Yol Haritası & Ratchet
- **`FORGE-C0..C4` [TAMAM]; `FORGE-D0..D2` [UYGULANDI]:** Gate 1 `1` ratchet (`Harita.jsx: 483`, `0` BE, `vendor-charts <= 228 KB`), PG 16 CI aktif.
