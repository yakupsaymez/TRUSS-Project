# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main`)
- **Temel Sürüm:** `v2.0.0` (`cbca5d0`)
- **Mühürlenen V2.1 & Ops Paketleri:**
  - `V2.1-BE` (`3026455`): 11/11 Backend P0/P1/P2 mantık yaması — **PASS**.
  - `V2.1-FE1` (`67e0203`) & `V2.1-FE2` (`92857bb`): `radix-luma` v2 arayüz, RBAC kanal koruması ve sheet/tablo yamaları — **PASS**.
  - `OPS-1` (`1828c66`) & `OPS-2` (`7536874`) & `OPS-2b` (`ddb0129`) & `OPS-3` (`628da17`): Evrensel TRUSS AI-OS, 7 kapılı `ai-gate.mjs`, `.githooks/pre-commit`, `ARCHITECTURE_MAP` ve `context:pack` — **PASS**.
  - `V2.1-FE3R` (`7f2c8fd`) & `PERF-1` (`b435c93`) & `PERF-1b` (`2c7746c`): Kurumsal `HomePage v2`, lazy routing, `manualChunks`, `maxChunkKb: 352` — **PASS**.
  - `REFACTOR-1` (`be77170`..`6964f73`): `14/14` BE+FE monolit (`>600` satır) Feature-Module mimarisine bölündü (`gate-baseline.json` `files: {}`) — **QA PASS**.
  - `QA-SWEEP-BE`: 1 P1 `kategori_id: null` + 3 P2 `ADR-02 tarihStr`/`pool.connect`/`FOR UPDATE` + `ADR-11` — **QA PASS**.

## 2. Sıradaki Kuyruk (Öncelik Sırasıyla)
1. **`QA-SWEEP-FE` (S4):** `REFACTOR-1` sonrası Frontend Feature-Module cerrahi regresyon ve uç durum taraması.
2. **`HomePage v2` Görsel Doluluk & Cila (S1):** Kurumsal vitrin bileşenlerinin görsel yoğunluk ve mikro-etkileşim cilası.

## 3. Açık Teknik Riskler
- **Bundle Bütçesi (`PASS` / Kilitlendi):** Ana giriş chunk'ı `1416.5 KB → 89.6 KB`, en büyük vendor chunk `351.3 KB` (`maxChunkKb: 352 KB` ratchet tavanına kilitlendi).
- **Monolit Dosyalar (`KAPANDI` / `0 Monolit`):** `14/14` monolit (`>600` satır) Feature-Module mimarisine bölündü; `.ai/gate-baseline.json` `files: {}` sıfırlandı ve `maxNewFileLines: 600` kilitlendi.

## 4. 📌 Durum Panosu (Her Yanıt Sonunda Zorunlu Şablon)
| Ajan | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **S5 (Baş Mimar)** | `Neon High` (`Neon X-High` / Opus) | `QA-SWEEP-BE` mühürlendi | `QA-SWEEP-FE` komutunu S4'e vermeli | `HomePage v2` Görsel Doluluk & Cila (S1) |
| **S1 (Frontend)** | `Neon` Normal (`Neon High` / Sonnet) | Beklemede (`REFACTOR-1` tamamlandı) | S5'ten `HomePage v2` Cila komutunu beklemeli | `HomePage v2` Görsel Doluluk & Cila |
| **S2 (Backend / Ops)** | `Argon` / `Neon` Normal (Sonnet) | `QA-SWEEP-BE` & `ADR-11` mühürlendi | Beklemede kalmalı | `QA-SWEEP-FE` sonrası mühürleme |
| **S3 (QA / Denetçi)** | `Hidrojen` / `Argon` (`Neon High`) | `QA-SWEEP-BE` QA PASS onaylandı | `QA-SWEEP-FE` denetimine hazır olmalı | `QA-SWEEP-FE` & `HomePage v2` QA |
| **S4 (Bug Hunter)** | `2.8 Flash` / `Hidrojen` (`Neon High`) | `QA-SWEEP-BE` tamamlandı (QA PASS) | S5'ten `QA-SWEEP-FE` komutunu almalı | `QA-SWEEP-FE` cerrahi tarama |
