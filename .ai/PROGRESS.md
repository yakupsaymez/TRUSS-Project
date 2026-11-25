# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main` — `FORGE-M4 (RELEASE-SEAL)`)
- **Faz B (`V2.2`) TAMAMLANDI — MÜHÜRLENDİ (`QA PASS`)**
- **Mühürlenen Epoklar:**
  - `V2.1..V2.2` (`cbca5d0..980cc98`): `radix-luma`, `OPS-1..5b`, `REFACTOR-1`, `HOTFIX-W1..W3`, `org_id`, TCO/anomali/CSV, arşiv+denetim (`ADR-17..23`) — **QA PASS**.
  - `FORGE-M0..M2` (`d07405b..51ae544`): 5 uzman (`ADR-24`), `schema_migrations`, `token_version`, `CRON_LOCKS`, arşiv (`ADR-25`), `*WriteService`, Recharts `227.9KB`, `dataEvents` (`ADR-26`) — **QA PASS**.
  - `FORGE-M3A..M3B` (`7bdae0e..M3B`): `is_emirleri`+`008`, `workOrder{Write,Query}Service`, `/app/is-emirleri` 3 katmanlı UI (`ADR-27`) — **QA PASS**.
  - `FORGE-M4 (RELEASE-SEAL)`: Arşiv dikişleri (`updateArac`, `updateAracKonum`, `getAllParcalar`, `getYakitAnomalileri`), `qaSeed` `org_id`/cleanup, `ai-gate` 14-dosya (`301-600`L) ratchet + `v2/index.js` temizliği + doküman senkronu — **`test:core 20/20 PASS`, `maxChunkKb: 228`, `QA PASS`**.

## 2. Master Yol Haritası (`FORGE-M0..M4`)
- **`FORGE-M0..M2` (TAMAM):** Topoloji (`d07405b`), DB/Auth (`a7c68d6`), çekirdek/bundle (`51ae544`).
- **`FORGE-M3A..M3B` (TAMAM):** İş emri şeması, çekirdek, 3 katmanlı UI (`ADR-27`).
- **`FORGE-M4` (TAMAMLANDI — MÜHÜRLENDİ):** `radar` röntgeni, 14-dosya `gate-baseline.json` ratchet, arşiv/`qaSeed` dikişleri, `V2.2` mührü.

## 3. Teknik Risk & Ratchet Durumu
- **Bundle & Monolit:** `maxChunkKb: 228` (`<= 228 KB`), Gate 1 `14` ratchet dosya (`0` fail, `0` warn, `0` shrinkable), `test:core 20/20 PASS`.

## 4. 📌 Durum Panosu
| Uzman | Güç | Şu An | Hemen Şimdi | İleride |
|:---|:---|:---|:---|:---|
| **Keystone** | `pro` | `FORGE-M4` mühürlendi | Sonraki faz bekle | `V2.3` planlama |
| **Core-Smith** | `inherit` | `FORGE-M4` `/forge-seal` | Atomik commit + push | Bakım/ölçek |
| **Shell-Crafter** | `inherit` | `FORGE-M4` tamam (`v2/index.js` temiz) | Sonraki paket bekle | `14` dosya daraltma |
| **Sentinel** | `pro` | `FORGE-M4` **QA PASS** | Sonraki paket bekle | Regresyon E2E |
| **Radar** | `flash` | `FORGE-M4` röntgen tamam | Sonraki taramayı bekle | `V2.3` sapma avı |
