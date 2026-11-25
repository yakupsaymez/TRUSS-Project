# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-M1` Mühürleniyor, Önceki HEAD `d07405b`)
- **Mühürlenen Epoklar:**
  - `V2.1` (`cbca5d0..c6bcfa4`): `V2.1-BE`, `V2.1-FE1/FE2/FE3R/FE4` (`radix-luma` + `HomePage v2`), `OPS-1..5b`, `PERF-1/1b`, `REFACTOR-1` (`0` monolit), `QA-SWEEP`, `CLEANUP-1`, `HOTFIX-W1..W3` — **QA PASS**.
  - `V2.2` (`V2.2-DBPERF..980cc98`): `araclar.org_id` + 5 indeks (`ADR-17`), bildirim (`ADR-18`), TCO, anomali (`ADR-19/20`), toplu CSV (`ADR-22`), soft-archive + `denetim_kayitlari` (`ADR-23`) — **QA PASS**.
  - `FORGE-M0` (`d07405b`): `5` uzman / `5` skill / `4` rule topolojisi, kural hizalama & bağlam budaması — **QA PASS**.
  - `FORGE-M1 (SHIELD & INTEGRITY)`: `schema_migrations` (`db:migrate` 7 adım, advisory lock + SHA-256), `fk_denetim_kayitlari_org ON DELETE SET NULL`, `token_version` (`401 TOKEN_REVOKED`), `CRON_LOCKS` `pg_try_advisory_lock`, tam arşiv mutasyon kilidi (`409 VEHICLE_ARCHIVED` + `deleteParca` audit), `rbacMiddleware` 0-ek-sorgu, `register` TX koruması ve `node:test` `npm run test:core` (`10/10 PASS`) — **QA PASS**.

## 2. Master Yol Haritası (`FORGE-M0..M4`)
- **`FORGE-M0` (TAMAMLANDI — `d07405b`):** FORGE Topolojisi & bağlam budaması.
- **`FORGE-M1` (TAMAMLANDI — Mühürleniyor):** Node v26 `test:core` (`10/10`), `schema_migrations`, `ON DELETE SET NULL`, `token_version`, cron kilidi & tam arşiv kilidi (`ADR-25`).
- **`FORGE-M2 (SONRAKİ — CORE-SLIM & BUNDLE)`:** `test:core` güvencesiyle `AppError` + `withTransaction` + `req/res`-bağımsız `yakit/bakimWriteService`, `components/ui/chart.jsx` wildcard Recharts import düzeltmesi, `utils/dataEvents.js` ve `Hareketler.jsx` + `BudgetVarianceCard.jsx` 3 katmanlı bölünmesi.
- **`FORGE-M3 (WORKORDER)`:** Ardışık `core-smith -> shell-crafter` ile Arıza & Bakım İş Emri modülü.
- **`FORGE-M4 (RELEASE-SEAL)`:** Son `radar` röntgeni, `gate-baseline.json` ratchet daraltması ve `V2.2` sürüm mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** Entry `89.6 KB`, vendor `351.3/352 KB` (kritik marj `0.7 KB`), `0` monolit (`>600`L), `18` uyarı dosyası (`301-600`L).

## 4. 📌 Durum Panosu
| Uzman | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **Keystone** | `pro` | `FORGE-M1` mühürlendi | `FORGE-M2` Frozen Contract & plan hazırla | `FORGE-M3/M4` plan & `/critic` |
| **Core-Smith** | `inherit` | `FORGE-M1` `/forge-seal` tamamlanıyor | `commit` + `push` sonrası bekle | `FORGE-M2` `AppError` & `*WriteService` |
| **Shell-Crafter** | `inherit` | Beklemede (`FORGE-M1` `0 diff`) | `FORGE-M2` planını bekle | `FORGE-M2` `chart.jsx` & 3 katmanlı UI |
| **Sentinel** | `pro` | `FORGE-M1` **QA PASS** verdi (`0 P0/P1`) | `FORGE-M2` QA için hazır bekle | `FORGE-M2..M4` adversarial QA |
| **Radar** | `flash` | `980cc98` röntgeni tamamlandı | Beklemede kal | `FORGE-M4` final röntgeni |
