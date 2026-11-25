# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — HEAD `980cc98`)
- **Mühürlenen Epoklar:**
  - `V2.1` (`cbca5d0..c6bcfa4`): `V2.1-BE`, `V2.1-FE1/FE2/FE3R/FE4` (`radix-luma` + `HomePage v2`), `OPS-1..5b`, `PERF-1/1b` (`89.6 KB` entry, `maxChunkKb: 352`), `REFACTOR-1` (`14/14 -> 0` monolit), `QA-SWEEP` (`BE+FE`), `CLEANUP-1`, `HOTFIX-W1..W3` (`FIX-1..4`) — **QA PASS**.
  - `V2.2` (`V2.2-DBPERF..980cc98`): `araclar.org_id` + 5 indeks (`ADR-17`), bildirim/aksiyon merkezi (`ADR-18`), TCO (`tcoService`), yakıt anomali (`ADR-19`, `POLISH` `ADR-20`), toplu CSV import (`ADR-22`), araç soft-archive + append-only `denetim_kayitlari` (`ADR-23`) — **QA PASS**.
- **`980cc98` Sistemik Röntgen Özeti (`7` Bulgu):**
  1. Node `v26.13.1`, **0** runtime test (`test:core` eksik).
  2. `deleteParca` P1 delik (`arsivlendi_mi` kilidi yok).
  3. `odometerGuard` `res` kelepçeli (controller-bağımlı).
  4. `schema_migrations` yok, `database.sql` mükerrer DDL & `denetim_kayitlari.org_id` CASCADE riski.
  5. `notificationScheduler` `pg_try_advisory_lock` yok & `userController.register` ROLLBACK riski.
  6. JWT DB-tazeliği + P2 `token_version` / `rbacMiddleware` çift sorgu.
  7. `18` warn dosya (`301-600`L), dağınık `'truss:data-changed'` eventleri, `ui/chart.jsx` (`351.3 / 352 KB` chunk sınırında).

## 2. Master Yol Haritası (`FORGE-M0..M4`)
- **`FORGE-M0` (AKTİF — Mühürleniyor):** FORGE Topolojisi (`5` uzman/`5` skill/`4` rule), Kural Hizalama (`422 SAYAC_KRONOLOJI_IHLALI`, `409 VEHICLE_ARCHIVED`, `a.org_id = $N`) & Bağlam Budaması (`<= 7800` tok).
- **`FORGE-M1 (SHIELD & INTEGRITY)`:** Node v26 `node:test` kalıcı `test:core` regresyon zırhı, `schema_migrations` (`db:migrate` + `database.sql` mükerrer DDL & `denetim_kayitlari.org_id ON DELETE SET NULL`), `deleteParca` arşiv kilidi, `notificationScheduler` `pg_try_advisory_lock`, `rbacMiddleware` mükerrer sorgu/rol-düşürme temizliği ve `userController.register` TX koruması.
- **`FORGE-M2 (CORE-SLIM & BUNDLE)`:** `test:core` güvencesiyle `AppError` + `withTransaction` + `req/res` bağımsız `yakit/bakimWriteService`, `components/ui/chart.jsx` wildcard Recharts import düzeltmesi, `utils/dataEvents.js` ve `Hareketler.jsx` + `BudgetVarianceCard.jsx` 3 katmanlı bölünmesi.
- **`FORGE-M3 (WORKORDER)`:** Ardışık `core-smith -> shell-crafter` ile Arıza & Bakım İş Emri modülü.
- **`FORGE-M4 (RELEASE-SEAL)`:** Son `radar` röntgeni, `gate-baseline.json` ratchet daraltması ve `V2.2` sürüm mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** Entry `89.6 KB`, vendor `351.3/352 KB` (kritik marj `0.7 KB`), `0` monolit (`>600`L), `18` uyarı dosyası (`301-600`L).

## 4. 📌 Durum Panosu
| Uzman | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **Keystone** | `pro` | `FORGE-M0` planlandı | `sentinel` QA sonucunu bekle | `FORGE-M1` Frozen Contract & plan |
| **Core-Smith** | `inherit` | `FORGE-M0` uygulandı (`QA bekleniyor`) | `sentinel` `PASS` sonrası `/forge-seal` | `FORGE-M1` `test:core` & TX/DB yamaları |
| **Shell-Crafter** | `inherit` | Beklemede (`FORGE-M0` `0 diff`) | Beklemede kal | `FORGE-M2` 3 katmanlı UI & `chart.jsx` |
| **Sentinel** | `pro` | `FORGE-M0` QA bekliyor | `context:audit --strict`, `gate` & `0 diff` denetle | `FORGE-M1..M4` adversarial QA |
| **Radar** | `flash` | `980cc98` röntgeni tamamlandı | Beklemede kal | `FORGE-M4` final röntgeni |
