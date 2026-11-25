# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-M3A` Mühürleniyor, Önceki HEAD `51ae544`)
- **Mühürlenen Epoklar:**
  - `V2.1..V2.2` (`cbca5d0..980cc98`): `radix-luma` v2 UI, `OPS-1..5b`, `REFACTOR-1`, `HOTFIX-W1..W3`, `araclar.org_id` (`ADR-17`), bildirim/TCO/anomali (`ADR-18..20`), CSV (`ADR-22`), soft-archive + `denetim_kayitlari` (`ADR-23`) — **QA PASS**.
  - `FORGE-M0..M2` (`d07405b..51ae544`): 5 uzman topoloji (`ADR-24`), `schema_migrations`, `token_version`, `CRON_LOCKS`, tam arşiv (`ADR-25`), `AppError`/`withTransaction`, `*WriteService`, Recharts split (`227.9 KB`), `dataEvents` (`ADR-26`) — **QA PASS**.
  - `FORGE-M3A (WORKORDER-BE)`: `is_emirleri` + `008`, `workOrderWriteService`/`QueryService`, `isEmriController`/`Routes`, arşiv/aksiyon dikişleri, `test:core 19/19 PASS` (`ADR-27`) — **QA PASS**.

## 2. Master Yol Haritası (`FORGE-M0..M4`)
- **`FORGE-M0..M2` (TAMAMLANDI):** Topoloji (`d07405b`), DB/Auth (`a7c68d6`), çekirdek/bundle (`51ae544`).
- **`FORGE-M3A` (TAMAMLANDI — Mühürleniyor):** İş emri şeması, fonksiyonel çekirdek, arşiv/aksiyon dikişleri (`ADR-27`).
- **`FORGE-M3B` (SONRAKİ — `WORKORDER-UI`):** `shell-crafter` ile 3 katmanlı İş Emri UI (`DATA_SCOPES`: `'work-order'`, `'movement'`, `'vehicle'`, `'component'`).
- **`FORGE-M4` (RELEASE-SEAL):** Son `radar` röntgeni, `gate-baseline.json` daraltması ve `V2.2` mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** `maxChunkKb: 228` (`227.9 KB`), Gate 1 `14 warn` (`0` fail, `0` monolit), `test:core 19/19 PASS`.

## 4. 📌 Durum Panosu
| Uzman | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **Keystone** | `pro` | `FORGE-M3A` mühürlendi | `FORGE-M3B (WORKORDER-UI)` sözleşmesi | `FORGE-M4` plan & `/critic` |
| **Core-Smith** | `inherit` | `FORGE-M3A` `/forge-seal` | `commit` + `push` sonrası bekle | `FORGE-M4` final mührü |
| **Shell-Crafter** | `inherit` | `FORGE-M3B` bekliyor | `/app/is-emirleri` 3 katmanlı UI | `FORGE-M4` son rötuşlar |
| **Sentinel** | `pro` | `FORGE-M3A` **QA PASS** (`0 P0/P1`) | `FORGE-M3B` E2E QA için bekle | `FORGE-M3B..M4` QA |
| **Radar** | `flash` | `980cc98` röntgeni tamam | Beklemede kal | `FORGE-M4` final röntgeni |
