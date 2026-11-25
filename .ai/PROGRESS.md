# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-M3B`, Önceki `7bdae0e`)
- **Mühürlenen Epoklar:**
  - `V2.1..V2.2` (`cbca5d0..980cc98`): `radix-luma`, `OPS-1..5b`, `REFACTOR-1`, `HOTFIX-W1..W3`, `org_id`, TCO/anomali/CSV, arşiv+denetim (`ADR-17..23`) — **QA PASS**.
  - `FORGE-M0..M2` (`d07405b..51ae544`): 5 uzman (`ADR-24`), `schema_migrations`, `token_version`, `CRON_LOCKS`, arşiv (`ADR-25`), `*WriteService`, Recharts `227.9KB`, `dataEvents` (`ADR-26`) — **QA PASS**.
  - `FORGE-M3A` (`7bdae0e`): `is_emirleri`+`008`, `workOrder{Write,Query}Service`, `isEmri{Controller,Routes}`, `test:core 19/19` (`ADR-27`) — **QA PASS**.
  - `FORGE-M3B (WORKORDER-UI)`: `/app/is-emirleri` 3 katmanlı UI (`work-orders/*`, `isEmriService.js`), sürücü/yönetici akışı, aksiyon/denetim dikişi — **TAMAMLANDI — QA PASS**.

## 2. Master Yol Haritası (`FORGE-M0..M4`)
- **`FORGE-M0..M2` (TAMAM):** Topoloji (`d07405b`), DB/Auth (`a7c68d6`), çekirdek/bundle (`51ae544`).
- **`FORGE-M3A` (TAMAM — `7bdae0e`):** İş emri şeması, çekirdek, arşiv/aksiyon (`ADR-27`).
- **`FORGE-M3B (WORKORDER-UI)` (TAMAMLANDI — QA PASS):** İş Emri UI (`work-orders/*`, `DATA_SCOPES`: `'work-order'`).
- **`FORGE-M4` (SONRAKİ — `RELEASE-SEAL`):** `radar` röntgeni, `gate-baseline.json` daraltması, `V2.2` mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** `maxChunkKb: 228` (`227.9 KB`), Gate 1 `<= 14 warn` (`0` fail, `0` monolit), `test:core 19/19 PASS`.

## 4. 📌 Durum Panosu
| Uzman | Güç | Şu An | Hemen Şimdi | İleride |
|:---|:---|:---|:---|:---|
| **Keystone** | `pro` | `FORGE-M3B` mühürlendi | `FORGE-M4` sözleşmesi | `V2.2` `/critic` |
| **Core-Smith** | `inherit` | `FORGE-M3B` `/forge-seal` | `commit`+`push` sonrası bekle | `FORGE-M4` mühür |
| **Shell-Crafter** | `inherit` | `FORGE-M3B` tamam | `FORGE-M4` hazır ol | `FORGE-M4` UI temizlik |
| **Sentinel** | `pro` | `FORGE-M3B` **QA PASS** | `FORGE-M4` QA bekle | `FORGE-M4` E2E onay |
| **Radar** | `flash` | `980cc98` röntgeni tamam | `FORGE-M4` röntgene hazırlan | `FORGE-M4` final röntgen |
