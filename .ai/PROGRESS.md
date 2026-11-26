# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-E3 / V2.5 LAUNCH-FORTRESS`)
- **`V2.1..V2.4-SEAL` (`ADR-01..37`) — QA PASS:** `radix-luma`, `a.org_id`+`SYSTEM_ADMIN`, `*WriteService`+`schema_migrations`+`token_version`+`is_emirleri`, prod zırhı+PG16 CI, `belge_kasasi`, `zimmet_muayeneleri`, `parca` çekirdeği, `is_emirleri` finans maskeleme.
- **`FORGE-E0..E1` (`ADR-38..39`) — QA PASS:** `requestIdMiddleware`, steril `errorHandler`+`apiNotFoundHandler`, `parseTrustProxy` (prod `true` yasak), `100kb` JSON, `CROSS_TENANT_FORBIDDEN`, `DRIVER_ALREADY_ASSIGNED`.
- **`FORGE-E2..E3` (`ADR-40..41`) — TAMAMLANDI (QA BEKLİYOR):** `011` `geri_bildirimler`, `users.aktif_mi` (`403 ACCOUNT_DISABLED`), `uq_sofor_tek_aktif_zimmet`, `SupportFeedbackSheet`, `ErrorBoundary`, `NotFoundV2`, `LegalDocsModal`, `CorporateContactCard`, `LandingV2` (`components/v2/landing/*`), `robots.txt` & OG meta, `/login?reason=expired|disabled`.

## 2. Yol Haritası & Ratchet
- **`FORGE-C0..E1` [TAMAM]; `FORGE-E2..E3` [QA BEKLİYOR]:** Gate 1 **`0` ratchet** (`"files": {}`, `0` BE/FE/uyarı), PG 16 CI aktif.
