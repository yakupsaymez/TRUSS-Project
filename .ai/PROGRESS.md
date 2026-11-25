# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-M2` Mühürleniyor, Önceki HEAD `a7c68d6`)
- **Mühürlenen Epoklar:**
  - `V2.1` (`cbca5d0..c6bcfa4`): `V2.1-BE`, `V2.1-FE1/FE2/FE3R/FE4` (`radix-luma` + `HomePage v2`), `OPS-1..5b`, `PERF-1/1b`, `REFACTOR-1` (`0` monolit), `QA-SWEEP`, `CLEANUP-1`, `HOTFIX-W1..W3` — **QA PASS**.
  - `V2.2` (`V2.2-DBPERF..980cc98`): `araclar.org_id` + 5 indeks (`ADR-17`), bildirim (`ADR-18`), TCO, anomali (`ADR-19/20`), toplu CSV (`ADR-22`), soft-archive + `denetim_kayitlari` (`ADR-23`) — **QA PASS**.
  - `FORGE-M0` (`d07405b`): `5` uzman / `5` skill / `4` rule topolojisi, kural hizalama & bağlam budaması — **QA PASS**.
  - `FORGE-M1` (`a7c68d6`): `schema_migrations`, `fk_denetim_kayitlari_org ON DELETE SET NULL`, `token_version`, `CRON_LOCKS`, tam arşiv kilidi (`409`) ve `npm run test:core` (`10/10 PASS`) — **QA PASS**.
  - `FORGE-M2 (CORE-SLIM & BUNDLE)`: `AppError` + `withTransaction` (`release(true)`), `req/res`-bağımsız `yakitWriteService` & `bakimWriteService`, `parcaController` TOCTOU & `adminUserController` email `tlds` fix, `chart.jsx` named import (`Legend` kaldırıldı) + `vendor-charts`/`vendor-charts-core` ayrımı, sıkı `dataEvents.js`, 3 katmanlı `Hareketler` & `BudgetVarianceCard` ve `test:core 15/15 PASS` — **QA PASS**.

## 2. Master Yol Haritası (`FORGE-M0..M4`)
- **`FORGE-M0` (TAMAMLANDI — `d07405b`):** FORGE Topolojisi & bağlam budaması.
- **`FORGE-M1` (TAMAMLANDI — `a7c68d6`):** `schema_migrations`, `ON DELETE SET NULL`, `token_version`, cron kilidi & tam arşiv kilidi (`ADR-25`).
- **`FORGE-M2` (TAMAMLANDI — Mühürleniyor):** Fonksiyonel çekirdek `*WriteService`, `chart.jsx` + Recharts split (`227.9 KB`), sıkı `dataEvents` & 3 katmanlı UI (`ADR-26`).
- **`FORGE-M3 (SONRAKİ — WORKORDER)`:** Ardışık `core-smith -> shell-crafter` ile Arıza & Bakım İş Emri modülü.
- **`FORGE-M4 (RELEASE-SEAL)`:** Son `radar` röntgeni, `gate-baseline.json` ratchet daraltması ve `V2.2` sürüm mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** `vendor-charts` `351.3 -> 227.9 KB` (`maxChunkKb: 228`), Gate 1 `18 -> 14 warn` (`0` fail, `0` monolit), `test:core 15/15 PASS`.

## 4. 📌 Durum Panosu
| Uzman | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **Keystone** | `pro` | `FORGE-M2` mühürlendi | `FORGE-M3 (WORKORDER)` Frozen Contract hazırla | `FORGE-M3/M4` plan & `/critic` |
| **Core-Smith** | `inherit` | `FORGE-M2` `/forge-seal` tamamlanıyor | `commit` + `push` sonrası bekle | `FORGE-M3` `workorder` şema & servis |
| **Shell-Crafter** | `inherit` | `FORGE-M2` Dalga 2 + 1C tamamlandı | `FORGE-M3` sözleşmesini bekle | `FORGE-M3` 3 katmanlı İş Emri UI |
| **Sentinel** | `pro` | `FORGE-M2` **QA PASS** verdi (`0 P0/P1`) | `FORGE-M3` QA için hazır bekle | `FORGE-M3..M4` adversarial QA |
| **Radar** | `flash` | `980cc98` röntgeni tamamlandı | Beklemede kal | `FORGE-M4` final röntgeni |
