# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main`)
- **Temel Sürüm:** `v2.0.0` (`cbca5d0`)
- **Mühürlenen V2.1 & Ops Paketleri:**
  - `V2.1-BE` (`3026455`): 11/11 Backend P0/P1/P2 mantık yaması — **PASS**.
  - `V2.1-FE1` (`67e0203`) & `V2.1-FE2` (`92857bb`): `radix-luma` v2 arayüz, RBAC kanal koruması ve sheet/tablo yamaları — **PASS**.
  - `OPS-1` (`1828c66`): Evrensel TRUSS AI-OS (`AGENTS.md`, `.ai/*`, `scripts/context-pack.mjs`) ve v1 temizliği — **PASS**.
  - `V2.1-FE3R` (`7f2c8fd`): Sade kurumsal `HomePage v2` final — **PASS**.
  - `OPS-2` (`7536874`) & `OPS-2b` (`ddb0129`): 7 kapılı `scripts/ai-gate.mjs` + `.ai/gate-baseline.json` ve `context:pack` guardrails senkronu — **PASS**.
  - `PERF-1` (`b435c93`) & `PERF-1b` (`2c7746c`): Lazy routing, `manualChunks`, font/ölü paket temizliği (`index` `89.6 KB`, `maxChunkKb: 352`, `AppShell` `637`) — **PASS**.
  - `REFACTOR-1-BE1` (`be77170`): `adminController` (`638->26`), `aracRoutes` (`602->28`), 8 dosya `<=300` satır, Backend monolit `0` — **QA PASS**.
  - `REFACTOR-1-FE1`: `Ayarlar.jsx` (`1559->205`), 9 dosya `<=278` satır — **QA PASS**.

## 2. Sıradaki Kuyruk (Öncelik Sırasıyla)
1. **`REFACTOR-1` (`REFACTOR-1-FE2a` — `VehicleSheet.jsx` ile devam eder):** Kalan 11 Frontend monolit dosyanın (`>600` satır) Unix modüler mimariye (`Feature-Module` klasör kuralı) bölünmesi ve `.ai/gate-baseline.json` ratchet sıkılaştırması.
2. **`HomePage v2` Görsel Doluluk & Cila:** Kurumsal vitrin bileşenlerinin görsel yoğunluk ve mikro-etkileşim cilası.

## 3. Açık Teknik Riskler
- **Bundle Bütçesi (`PASS` / Kilitlendi):** Ana giriş chunk'ı `1416.5 KB → 89.6 KB`, en büyük vendor chunk `351.3 KB` (`maxChunkKb: 352 KB` ratchet tavanına kilitlendi).
- **Monolit Dosyalar (`WARN`):** Kalan 11 dosya (yalnız FE) `>600` satır ratchet kilidinde (`VehicleSheet.jsx` `1133`, `ComponentDataTable.jsx` `1030`, `LedgerDataTable.jsx` `920`, `AppShell.jsx` `637`) → `REFACTOR-1-FE*` ile bölünecek.

## 4. 📌 Durum Panosu (Her Yanıt Sonunda Zorunlu Şablon)
| Ajan | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **S5 (Baş Mimar)** | `Neon High` (`Neon X-High` / Opus) | `REFACTOR-1-FE1` mühürlendi | `REFACTOR-1-FE2a` (`VehicleSheet.jsx`) komutunu S1'e vermeli | `REFACTOR-1` kalan FE paketleri & `HomePage v2` cila |
| **S1 (Frontend)** | `Neon` Normal (`Neon High` / Sonnet) | `REFACTOR-1-FE1` tamamlandı (QA PASS) | S5'ten `REFACTOR-1-FE2a` komutunu almalı | `REFACTOR-1` (kalan 11 FE monolit bölünmesi) |
| **S2 (Backend / Ops)** | `Argon` / `Neon` Normal (Sonnet) | `REFACTOR-1-FE1` ratchet & commit mühürlendi | Beklemede kalmalı | `REFACTOR-1-FE2a` sonrası ratchet mühürleme |
| **S3 (QA / Denetçi)** | `Hidrojen` / `Argon` (`Neon High`) | `REFACTOR-1-FE1` QA PASS onaylandı | `REFACTOR-1-FE2a` denetimine hazır olmalı | `REFACTOR-1` regresyon & ratchet QA |
| **S4 (Bug Hunter)** | `2.8 Flash` / `Hidrojen` (`Neon High`) | Beklemede (`V2.1-BE` 11/11 PASS) | Beklemede kalmalı | `REFACTOR-1` sonrası cerrahi hata avı |
