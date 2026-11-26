# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-D1 FE DİLİMİ`)
- **`V2.1..FORGE-C4` (`ADR-01..32`) — QA PASS:** `radix-luma`, `a.org_id` + `SYSTEM_ADMIN`, TCO/anomali/CSV/denetim/arşiv, `*WriteService` + `schema_migrations` + `token_version` + `is_emirleri`, prod zırhı + PG 16 CI, `belge_kasasi`, `zimmet_muayeneleri`, BOM CSV + `raporController` slim, `userSettings` + `V2.3` X-Ray mührü.
- **`FORGE-D0` (`ADR-33`) — QA BEKLİYOR:** `parcaQueryService` (`73`L) + `parcaWriteService` (`188`L) + `parcaController` (`84`L), `!hasFinanceAccess` `maliyet` koruması, `araclar -> parca_takip` kilit, `23505 -> 409`, `PARCA_*` audit, ratchet `6 -> 5` (`0` BE ratchet).
- **`FORGE-D1` (`ADR-34`) — QA BEKLİYOR:** `complianceUtils` (`<=120`L), `FleetHealthWidget` + `Takvim` 3-katman (`AbortController`+`requestIdRef`, `TakvimEventDialog`, `prefillWorkOrder`), ratchet `5 -> 3`.

## 2. Yol Haritası & Ratchet
- **`FORGE-C0..C4` [TAMAM]; `FORGE-D0..D1` [UYGULANDI]:** Gate 1 `3` ratchet (`0` BE, `0` fail, `0` warn, `vendor-charts 227.9 KB`), PG 16 CI aktif.
