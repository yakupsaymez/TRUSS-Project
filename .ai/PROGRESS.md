# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-E4 / V2.5 LAUNCH-FORTRESS SEAL`)
- **`V2.1..V2.4-SEAL` (`ADR-01..37`) — QA PASS:** `radix-luma`, `a.org_id`+`SYSTEM_ADMIN`, `*WriteService`+`schema_migrations`+`token_version`+`is_emirleri`, prod zırhı+PG16 CI, `belge_kasasi`, `zimmet_muayeneleri`, `parca` çekirdeği, `is_emirleri` finans maskeleme.
- **`FORGE-E0..E3` (`ADR-38..41`) — TAMAMLANDI:** `requestIdMiddleware`, steril `errorHandler`, `parseTrustProxy`, `CROSS_TENANT_FORBIDDEN`, `DRIVER_ALREADY_ASSIGNED`, `011` `geri_bildirimler`, `users.aktif_mi`, `uq_sofor_tek_aktif_zimmet`, `LandingV2` & `SupportFeedbackSheet`.
- **`FORGE-E4 / V2.5 LAUNCH-FORTRESS SEAL` (`ADR-42`) — QA BEKLİYOR:** `preflight:prod` (`scripts/preflight-prod.mjs`), FE `api.js` prod `/api` `baseURL`, `ErrorBoundary` route `resetKey`, `useSupportFeedback` `mountedRef`/`requestSeqRef`, `Backend/.env.example`, `docs/LAUNCH_RUNBOOK.md`, `v25LaunchSeal.test.js`.

## 2. Yol Haritası & Ratchet
- **`FORGE-C0..E3` [TAMAM]; `FORGE-E4` [QA BEKLİYOR]:** Gate 1 **`0` ratchet** (`"files": {}`, `0` BE/FE/uyarı), PG 16 CI aktif.
