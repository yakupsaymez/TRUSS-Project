# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main`)
- **Temel Sürüm:** `v2.0.0` (`cbca5d0`)
- **Mühürlenen V2.1 & Ops Paketleri:**
  - `V2.1-BE` (`3026455`): 11/11 Backend P0/P1/P2 mantık yaması — **PASS**.
  - `V2.1-FE1` (`67e0203`) & `V2.1-FE2` (`92857bb`): `radix-luma` v2 arayüz, RBAC kanal koruması ve sheet/tablo yamaları — **PASS**.
  - `OPS-1` (`1828c66`) & `OPS-2` (`7536874`) & `OPS-2b` (`ddb0129`) & `OPS-3` (`628da17`) & `OPS-4` (`9c25f12`): Evrensel TRUSS AI-OS, 7 kapılı `ai-gate.mjs`, `.githooks/pre-commit`, `ARCHITECTURE_MAP`, `context:pack` ve Antigravity v2.34.0 native `.agent/` (4 rule, 7 modern skill, 5 custom agent) — **QA PASS**.
  - `OPS-2c` (`0b054a2`): `scripts/ai-gate.mjs` Gate 2 (`Semantic Theme Hygiene`) kapsamına `Frontend/src/pages/home/**` (`7` dosya; toplam `120` v2/home dosyası) eklendi — **QA PASS**.
  - `OPS-5` (`7bfcf81`): `scripts/context-audit.mjs` (`npm run context:audit`), `/truss-audit` skilli ve şifresiz lokal READ-ONLY Postgres MCP rehberi (Faz 5A+5B) eklendi — **QA PASS**.
  - `OPS-4b` (`667fd61`): Tek komutluk `/truss` üst orkestrasyon skilli (`.agent/skills/truss/SKILL.md`, 5 fazlı `S5 -> onay -> S1/S2/S4 -> izole S3 -> /s2-seal`) eklendi — **QA PASS**.
  - `OPS-4c` (`415222f`): `.agent/agents/*.md` model sabitlemesi (`s5/s3=pro`, `s4=flash`, `s1/s2=inherit`) eklendi — **QA PASS**.
  - `V2.1-FE3R` (`7f2c8fd`) & `PERF-1` (`b435c93`) & `PERF-1b` (`2c7746c`): Kurumsal `HomePage v2`, lazy routing, `manualChunks`, `maxChunkKb: 352` — **PASS**.
  - `REFACTOR-1` (`be77170`..`6964f73`): `14/14` BE+FE monolit (`>600` satır) Feature-Module mimarisine bölündü (`gate-baseline.json` `files: {}`) — **QA PASS**.
  - `QA-SWEEP` (`b5e1a5e`, `6396f98`): `QA-SWEEP-BE` + `QA-SWEEP-FE` (`ADR-11`, `ADR-12`, 0 açık P0/P1/P2) — **QA PASS**.
  - `V2.1-FE4` (`c6bcfa4`): `HomePage v2` kurumsal vitrin (`pages/home/*`), etkileşimli önizleme & mikro-etkileşim cilası — **QA PASS**.
  - `CLEANUP-1`: Sıfır referanslı `Frontend/src/components/v2/home/*` (`6` dosya) ve kök `skills/system/run-workflow/SKILL.md` temizlendi (`Drift Alerts: 0`) — **QA PASS**.
  - `V2.1-HOTFIX-W1` (Wave 1: `FIX-1` + `FIX-3B`): `SYSTEM_ADMIN` `org_id` izolasyonu, `ADR-09` parca `arac_id` kilidi, `JWT_SECRET` fail-fast, `fk_araclar_kullanici ON DELETE SET NULL`, `GenelTab` salt-okunur kilit, dark mod kontrast, sticky tablo aksiyonları ve Takvim/KPI/Filo UX yamaları — **QA PASS**.
  - `V2.1-HOTFIX-W2` (Wave 2: `FIX-2` + `FIX-3A`): `H-05` başlangıç sayacı/tek kayıt silme/KM-SMH kilidi & deterministik bakım parça sıfırlaması, `H-06` `ADR-11` tarih/varyant & `400` katalog doğrulaması, `H-08` TX+`FOR UPDATE` bütçe/TR zaman dilimi, `H-12` `zimmetli_sofor_id`/`ad` JOIN, `H-04` 3 aktif yetki anahtarı senkronu ve `H-10` `analytics` finans gizliliği + tek-toast yamaları — **QA PASS**.
  - `V2.1-HOTFIX-W3` (Wave 3 / `FIX-4` — Faz A Kapanış): `H-13` kök/BE `package*.json` `ABTS` & `recharts` temizliği ve `ARCHITECTURE_MAP` DB senkronu, `H-16` `yakitController`/`bakimController` Joi taşma validasyonu + `raporController` `detay` sızıntı temizliği + `CORS_ORIGIN` + Gate 2 `utils/**` + OKLCH `index.css` & ölü kod temizliği (`exporter.js`, `sayacInputSinifi`), `H-15` `useAppStore` `vite-ui-theme` koruması + tablo `autoResetPageIndex: false` + `OrganizasyonTab`/`PasswordChangeForm` tek-toast ve `/app/parcalar` açık tema kontrastı — **QA PASS**.
  - `V2.2-DBPERF`: `araclar.org_id` kiracı kolonu + backfill, `yakitlar`/`bakimlar` `fatura_no`/`belge_url`/`olusturan_user_id` normalizasyonu, 5 kompozit/kısmi indeks (`idx_araclar_org_id`, `idx_yakitlar_arac_tarih_km`, `idx_bakimlar_arac_tarih_km`, `idx_parca_takip_arac_id`, `idx_atamalar_aktif_arac`), runtime `ALTER TABLE` kaldırımı ve `ADR-17` — **QA PASS**.
  - `V2.2-NOTIFY`: Bildirim motoru, `bildirim_olaylari` dedup (`uq_bildirim_user_kat_ref`), `predictiveService.js`, `alertEvaluators.js`, `dateUtils.js` TR takvim yardımcıları, `/api/bildirimler` + `/aksiyon-merkezi` ve `bildirim_tercihleri` + `hasFinanceAccess` RBAC matrisi (`ADR-18`) — **QA PASS**.
  - `V2.2-INBOX`: `bildirimService.js`, `NotificationBell.jsx` popover/tekil-toplu okundu/navigasyon, `ActionCenterCard.jsx` kategori filtreleri/kompakt liste/RBAC finans gizliliği ve `BildirimlerTab.jsx` `Uygulama İçi` kanalı — **QA PASS**.
  - `V2.2-TCO`: `Backend/services/tcoService.js`, `tcoController.js`, `GET /api/raporlar/tco-analizi`, `FleetEfficiencyCard.jsx`, `FleetEfficiencyCell.jsx`, `KM/SMH` ayrık birim maliyet & 0-100 yenileme skoru, `DRIVER` gizliliği — **QA PASS**.
  - `V2.2-ANOMALY-BE`: `Backend/services/fuelAnomalyService.js`, `yakitAnomalyController.js`, `yakit_anomalileri`, `araclar.{depo_kapasitesi_l,hedef_tuketim}`, 4 deterministik kural, `GET/PATCH/POST /api/yakitlar/anomaliler*`, `ON DELETE CASCADE` — **QA PASS**.
  - `V2.2-ANOMALY-FE`: `FuelAnomalyPanel.jsx`, `fuel-anomaly/FuelAnomalyRow.jsx`, `yakitService.js` anomali uçları, `VehicleSheet` `depo_kapasitesi_l`/`hedef_tuketim`, RBAC & `truss:data-changed` — **QA PASS**.
  - `V2.2-POLISH`: `SW-01..SW-12` backend/frontend çapraz-modül onarımları, gizli e-posta dedup kilidi, CTE kiracı filtresi, ortak `fuelAnomalyRules.js` + toplu `UNNEST` tarama, `truss:data-changed` tek-yayın senkronu, TCO skeleton & RBAC bildirim matrisi — **QA PASS**.
  - `OPS-5b`: Principal Critic & Anti-Median Standardı (`.agent/rules/00-truss-core.md` §5 Principal Bar, `.agent/skills/critic/SKILL.md` `/critic`, `truss/SKILL.md` Faz 1 zorunlu Red-Team kilidi ve `s5-architect`/`s3-qa` seam şüpheciliği) — **QA PASS**.
  - `V2.2-IMPORT-BE`: `Backend/utils/csvFuelParser.js` (RFC-4180 TR/EN ayrıştırıcı, 1000 satır limiti, `ADR-02` TR takvim), `fuelImportService.js` (`FOR UPDATE`, fiziksel imza dedup, ters-sıralı aynı gün kronoloji koruması, `UNNEST` toplu yazım), `yakitImportController.js`, `fuelAnomalyService.evaluateBatchFuelAnomalies` ve `/api/yakitlar/toplu-onizleme|toplu-aktar` (`1mb` izole parser) — **QA PASS**.
  - `V2.2-IMPORT-FE`: `csvFuelParser.js` `normalizePlate`/`parseLocaleNumber` P1 yaması, `yakitService` toplu uçları, `FuelImportSheet.jsx`, `fuel-import/{FuelImportPreviewTable.jsx,fuelImportHelpers.js}` UTF-8/windows-1254 decoder + 100 satır dilimleme + RBAC — **QA PASS**.
  - `V2.2-AUDIT-BE`: `denetim_kayitlari` değişmez denetim izi (`auditService.js`, `GET /api/denetim-kayitlari`, `ADR-13` `403 FORBIDDEN_ORG_REQUIRED`, hassas anahtar maskeleme), `araclar.arsivlendi_mi` soft-archive (`aracArchiveHandlers.js`, `PATCH /api/araclar/:id/{arsiv,geri-yukle}`, `arsiv=aktif|sadece|dahil`), `409 VEHICLE_ARCHIVED` kilidi ve tarihsel maliyet koruması (`ADR-23`) — **QA PASS**.
  - `V2.2-AUDIT-FE` (`2026-11-25`): `aracArchiveHandlers` Joi/`!mevcut.arsivlendi_mi` idempotensi, `parcaController` TX+`409 VEHICLE_ARCHIVED`, `fuelAnomalyService` `arsivlendi_mi = FALSE` tarama filtresi, `Filo` `Aktif/Arşivlenenler` görünümü (`useFleetArchive`, `VehicleArchiveDialog`, `aracService` `deleteArac` `{ data }` + `restoreArac`), `FuelImportPreviewTable` sarmalama/rozet cilası ve `/app/ayarlar?tab=denetim` (`DenetimTab`, `denetimService`, `ADR-13` RBAC) — **QA PASS**.

## 2. Sıradaki Kuyruk (Öncelik Sırasıyla)
- **Mühürlenenler:** `PERF-1/1b`, `REFACTOR-1` (`14/14 -> 0` monolit), `OPS-1..5`, `QA-SWEEP` (`BE+FE`), `V2.1-FE4`, `CLEANUP-1`, `V2.1-HOTFIX-W1`, `V2.1-HOTFIX-W2`, `V2.1-HOTFIX-W3` (`FIX-4` — Faz A), `V2.2-DBPERF`, `V2.2-NOTIFY`, `V2.2-INBOX`, `V2.2-TCO`, `V2.2-ANOMALY-BE`, `V2.2-ANOMALY-FE`, `V2.2-POLISH`, `OPS-5b`, `V2.2-IMPORT-BE`, `V2.2-IMPORT-FE`, `V2.2-AUDIT-BE` ve `V2.2-AUDIT-FE` mühürlendi.
- **Sırada / Beklemede:** `V2.2` tam kapsamlı sürüm mühürlendi; yeni faz veya `S4` cerrahi tarama kullanıcı talebine göre başlatılır.

## 3. Açık Teknik Riskler
- **Bundle Bütçesi (`PASS` / Kilitlendi):** Ana giriş chunk'ı `1416.5 KB → 89.6 KB`, en büyük vendor chunk `351.3 KB` (`maxChunkKb: 352 KB` ratchet tavanına kilitlendi).
- **Monolit Dosyalar (`KAPANDI` / `0 Monolit`):** `14/14` monolit (`>600` satır) Feature-Module mimarisine bölündü; `.ai/gate-baseline.json` `files: {}` sıfırlandı ve `maxNewFileLines: 600` kilitlendi.
- **Regresyon & Mantık Riski (`KAPANDI` / `0 Açık P0/P1/P2`):** `QA-SWEEP-BE` ve `QA-SWEEP-FE` tamamlandı (`ADR-11`, `ADR-12`).

## 4. 📌 Durum Panosu (Her Yanıt Sonunda Zorunlu Şablon)
| Ajan | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **S5 (Baş Mimar)** | `pro` (`Neon High` / Opus) | `V2.2-AUDIT-FE` mühürlendi (`QA PASS`) | Yeni görev/faz için beklemede | Sonraki faz mikro-paket dağıtımı |
| **S1 (Frontend)** | `inherit` (`Neon` Normal) | `V2.2-AUDIT-FE` tamamlandı & mühürlendi | Beklemede kalmalı | Sonraki UI/UX paketleri |
| **S2 (Backend / Ops)** | `inherit` (`Argon` / `Neon`) | `V2.2-AUDIT-FE` `/s2-seal` tamamlandı (`main` mühürlendi) | Beklemede kalmalı | Sonraki backend/ops görevleri |
| **S3 (QA / Denetçi)** | `pro` (`Hidrojen` / `Argon`) | `V2.2-AUDIT-FE` QA `PASS` (`0 P0`, `0 P1`) onaylandı | Beklemede kalmalı | Sonraki paket QA denetimi |
| **S4 (Bug Hunter)** | `flash` (`2.8 Flash`) | `QA-SWEEP` tamamlandı (`0` açık hata) | Beklemede kalmalı | `V2.2` sonrası cerrahi hata avı |
