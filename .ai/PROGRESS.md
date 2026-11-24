# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main`)
- **Temel Sürüm:** `v2.0.0` (`cbca5d0`)
- **Mühürlenen V2.1 & Ops Paketleri:**
  - `V2.1-BE` (`3026455`): 11/11 Backend P0/P1/P2 mantık yaması — **PASS**.
  - `V2.1-FE1` (`67e0203`) & `V2.1-FE2` (`92857bb`): `radix-luma` v2 arayüz, RBAC kanal koruması ve sheet/tablo yamaları — **PASS**.
  - `OPS-1` (`1828c66`): Evrensel TRUSS AI-OS (`AGENTS.md`, `.ai/*`, `scripts/context-pack.mjs`) ve v1 temizliği — **PASS**.
  - `V2.1-FE3R` (`7f2c8fd`): Sade kurumsal `HomePage v2` final — **PASS**.
  - `OPS-2` (`7536874`) & `OPS-2b` (`ddb0129`): 7 kapılı `scripts/ai-gate.mjs` + `.ai/gate-baseline.json` ve `context:pack` guardrails senkronu — **PASS**.
  - `PERF-1` (`b435c93`): Lazy routing, `manualChunks`, font/ölü paket temizliği (`index` `89.6 KB`, `maxChunkKb: 352`) — **PASS**.
  - `PERF-1b` (`Frontend/Frontend` temizliği + `AppShell` iç `Suspense`, `646 -> 637` ratchet — **PASS**).

## 2. Sıradaki Kuyruk (Öncelik Sırasıyla)
1. **`REFACTOR-1` (`REFACTOR-1-BE1` ile başlar):** `>600` satırlık 14 monolit dosyanın Unix modüler mimariye (`Feature-Module` klasör kuralı) bölünmesi ve `.ai/gate-baseline.json` ratchet sıkılaştırması.
2. **`HomePage v2` Görsel Doluluk & Cila:** Kurumsal vitrin bileşenlerinin görsel yoğunluk ve mikro-etkileşim cilası.

## 3. Açık Teknik Riskler
- **Bundle Bütçesi (`PASS` / Kilitlendi):** Ana giriş chunk'ı `1416.5 KB → 89.6 KB`, en büyük vendor chunk `351.3 KB` (`maxChunkKb: 352 KB` ratchet tavanına kilitlendi).
- **Monolit Dosyalar (`WARN`):** 14 dosya `>600` satır ratchet kilidinde (`Ayarlar.jsx` `1559`, `VehicleSheet.jsx` `1133`, `ComponentDataTable.jsx` `1030`, `AppShell.jsx` `637`) → `REFACTOR-1` ile bölünecek.

## 4. 📌 Durum Panosu (Her Yanıt Sonunda Zorunlu Şablon)
| Ajan | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **S5 (Baş Mimar)** | `Neon High` (`Neon X-High` / Opus) | `PERF-1b` mühürlendi, `REFACTOR-1-BE1` hazır | `REFACTOR-1-BE1` komutunu S2'ye vermeli | `REFACTOR-1` FE paketleri & `HomePage v2` cila |
| **S1 (Frontend)** | `Neon` Normal (`Neon High` / Sonnet) | `PERF-1b` tamamlandı (QA PASS) | S5'ten `REFACTOR-1` FE paketini beklemeli | `REFACTOR-1` (12 FE monolit bölünmesi) |
| **S2 (Backend / Ops)** | `Argon` / `Neon` Normal (Sonnet) | `PERF-1b` ratchet & commit mühürlendi | S5'ten `REFACTOR-1-BE1` komutunu almalı | `REFACTOR-1-BE1` (`adminController`, `aracRoutes`) |
| **S3 (QA / Denetçi)** | `Hidrojen` / `Argon` (`Neon High`) | `PERF-1b` QA PASS onaylandı | `REFACTOR-1-BE1` denetimine hazır olmalı | `REFACTOR-1` regresyon & ratchet QA |
| **S4 (Bug Hunter)** | `2.8 Flash` / `Hidrojen` (`Neon High`) | Beklemede (`V2.1-BE` 11/11 PASS) | Beklemede kalmalı | `REFACTOR-1` sonrası cerrahi hata avı |
