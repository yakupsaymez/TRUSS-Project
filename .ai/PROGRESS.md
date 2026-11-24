# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main`)
- **Temel Sürüm:** `v2.0.0` (`cbca5d0`)
- **Mühürlenen V2.1 & Ops Paketleri:**
  - `V2.1-BE` (`3026455`): 11/11 Backend P0/P1/P2 mantık yaması — **PASS**.
  - `V2.1-FE1` (`67e0203`) & `V2.1-FE2` (`92857bb`): `radix-luma` v2 arayüz, RBAC kanal koruması ve sheet/tablo yamaları — **PASS**.
  - `OPS-1` (`1828c66`) & `OPS-2` (`7536874`) & `OPS-2b` (`ddb0129`): Evrensel TRUSS AI-OS, 7 kapılı `ai-gate.mjs` + `gate-baseline.json` ve `context:pack` — **PASS**.
  - `V2.1-FE3R` (`7f2c8fd`) & `PERF-1` (`b435c93`) & `PERF-1b` (`2c7746c`): Kurumsal `HomePage v2`, lazy routing, `manualChunks`, `maxChunkKb: 352` — **PASS**.
  - `REFACTOR-1-BE1` (`be77170`): `adminController` (`638->26`), `aracRoutes` (`602->28`), 8 dosya `<=300` satır, Backend monolit `0` — **QA PASS**.
  - `REFACTOR-1-FE1` (`b697d81`) & `FE2a` (`d3c4f52`) & `FE2b` (`cdf7de3`) & `FE3a` (`12248b0`): `Ayarlar`, `VehicleSheet`, `MovementSheet`, `ComponentSheet`, `ComponentDataTable`, `LedgerDataTable` — **QA PASS**.
  - `REFACTOR-1-FE3b`: `CrewDataTable` (`835->224`), `FleetDataTable` (`824->210`), 12 dosya `<=270` satır — **QA PASS**.

## 2. Sıradaki Kuyruk (Öncelik Sırasıyla)
1. **`REFACTOR-1` (`REFACTOR-1-FE4a` ile devam eder — Kalan 4 FE Monolit):** `>600` satırlık 4 Frontend monolit dosyanın Unix modüler mimariye (`Feature-Module` klasör kuralı) bölünmesi ve `.ai/gate-baseline.json` ratchet sıkılaştırması.
2. **`HomePage v2` Görsel Doluluk & Cila:** Kurumsal vitrin bileşenlerinin görsel yoğunluk ve mikro-etkileşim cilası.

## 3. Açık Teknik Riskler
- **Bundle Bütçesi (`PASS` / Kilitlendi):** Ana giriş chunk'ı `1416.5 KB → 89.6 KB`, en büyük vendor chunk `351.3 KB` (`maxChunkKb: 352 KB` ratchet tavanına kilitlendi).
- **Monolit Dosyalar (`WARN`):** Kalan 4 dosya (yalnız FE) `>600` satır ratchet kilidinde (`FleetLiveMap.jsx` `813`, `FleetCalendar.jsx` `725`, `CommandPalette.jsx` `723`, `AppShell.jsx` `637`) → `REFACTOR-1-FE4*` ile bölünecek.

## 4. 📌 Durum Panosu (Her Yanıt Sonunda Zorunlu Şablon)
| Ajan | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **S5 (Baş Mimar)** | `Neon High` (`Neon X-High` / Opus) | `REFACTOR-1-FE3b` mühürlendi | `REFACTOR-1-FE4a` komutunu S1'e vermeli | `REFACTOR-1` son FE paketleri & `HomePage v2` cila |
| **S1 (Frontend)** | `Neon` Normal (`Neon High` / Sonnet) | `REFACTOR-1-FE3b` tamamlandı (QA PASS) | S5'ten `REFACTOR-1-FE4a` komutunu almalı | `REFACTOR-1` (kalan 4 FE monolit bölünmesi) |
| **S2 (Backend / Ops)** | `Argon` / `Neon` Normal (Sonnet) | `REFACTOR-1-FE3b` ratchet & commit mühürlendi | Beklemede kalmalı | `REFACTOR-1-FE4a` sonrası ratchet mühürleme |
| **S3 (QA / Denetçi)** | `Hidrojen` / `Argon` (`Neon High`) | `REFACTOR-1-FE3b` QA PASS onaylandı | `REFACTOR-1-FE4a` denetimine hazır olmalı | `REFACTOR-1` regresyon & ratchet QA |
| **S4 (Bug Hunter)** | `2.8 Flash` / `Hidrojen` (`Neon High`) | Beklemede (`V2.1-BE` 11/11 PASS) | Beklemede kalmalı | `REFACTOR-1` sonrası cerrahi hata avı |
