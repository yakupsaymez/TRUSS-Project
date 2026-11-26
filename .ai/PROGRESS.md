# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-E1 / V2.5 LAUNCH-FORTRESS`)
- **`V2.1..V2.4-SEAL` (`ADR-01..37`) — QA PASS:** `radix-luma`, `a.org_id`+`SYSTEM_ADMIN`, `*WriteService`+`schema_migrations`+`token_version`+`is_emirleri`, prod zırhı+PG16 CI, `belge_kasasi`, `zimmet_muayeneleri`, `parca` çekirdeği, `is_emirleri` finans maskeleme.
- **`FORGE-E0..E1` (`ADR-38..39`) — `V2.5` (QA BEKLİYOR):** `requestIdMiddleware`, steril `errorHandler`+`apiNotFoundHandler`, `parseTrustProxy` (prod `true` yasak, 1..5, IP/CIDR), `100kb` JSON limiti, `CROSS_TENANT_FORBIDDEN`, `DRIVER_ALREADY_ASSIGNED`, 12 vektörlü `securityFortress`+`logicConcurrencyTorture` süitleri.

## 2. Yol Haritası & Ratchet
- **`FORGE-C0..D4` [TAMAM]; `FORGE-E0..E1` [V2.5 LAUNCH-FORTRESS]:** Gate 1 **`0` ratchet** (`"files": {}`, `0` BE/FE/uyarı), PG 16 CI aktif.
