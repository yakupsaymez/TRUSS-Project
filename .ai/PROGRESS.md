# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-D4 / V2.4-SEAL`)
- **`V2.1..C4` (`ADR-01..32`) — QA PASS:** `radix-luma`, `a.org_id`+`SYSTEM_ADMIN`, TCO/CSV/denetim/arşiv, `*WriteService`+`schema_migrations`+`token_version`+`is_emirleri`, prod zırhı+PG16 CI, `belge_kasasi`, `zimmet_muayeneleri`, `raporController`/`userSettings` slim.
- **`FORGE-D0..D4` (`ADR-33..37`) — `V2.4-SEAL` (QA BEKLİYOR):** `parcaQuery/WriteService`, `complianceUtils`, 3-katman (`FleetHealthWidget`+`prefillWorkOrder`, `Takvim`, `CreateMemberSheet`, `CostTrendChart`, `Harita`), `is_emirleri` tam finans maskeleme/koruma, `parca`+`parcaIntegrity`+`v24SealMatrix`, `0` ratchet.

## 2. Yol Haritası & Ratchet
- **`FORGE-C0..C4` [TAMAM]; `FORGE-D0..D4` [V2.4-SEAL]:** Gate 1 **`0` ratchet** (`"files": {}`, `0` BE/FE/uyarı, `vendor-charts <= 228 KB`), PG 16 CI aktif.
