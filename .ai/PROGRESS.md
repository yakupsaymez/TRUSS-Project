# TRUSS — Canlı İlerleme & Durum (`PROGRESS.md`)

## 1. Aktif Durum (`main`)
- **Temel Sürüm:** `v2.0.0` (`cbca5d0`)
- **Mühürlenen V2.1 & Ops Paketleri:**
  - `V2.1-BE` (`3026455`): 11/11 Backend P0/P1/P2 mantık yaması — **PASS**.
  - `V2.1-FE1` (`67e0203`) & `V2.1-FE2` (`92857bb`): `radix-luma` v2 arayüz, RBAC kanal koruması ve sheet/tablo yamaları — **PASS**.
  - `OPS-1` (`1828c66`): Evrensel TRUSS AI-OS (`AGENTS.md`, `.ai/*`, `scripts/context-pack.mjs`) ve v1 temizliği — **PASS**.
  - `V2.1-FE3R` (`7f2c8fd`): Sade kurumsal `HomePage v2` final — **PASS**.
  - `OPS-2` (`7536874`): 7 kapılı mekanik kalite kapısı (`scripts/ai-gate.mjs` + `.ai/gate-baseline.json`) — **PASS**.
  - `OPS-2b`: Standart `context:pack` içine `ENGINEERING_GUARDRAILS.md` dahil edildi (`--full` ile `ARCHITECTURE_MAP.md`).

## 2. Sıradaki 3 Kuyruk (Öncelik Sırasıyla)
1. **`PERF-1`:** `React.lazy` rota bazlı kod bölme + Vite `manualChunks` (`entry chunk ≤350 KB` hedef / `450 KB` sert üst sınır) + font ve ölü paket temizliği.
2. **`REFACTOR-1`:** `>600` satırlık 14 monolit dosyanın Unix modüler mimariye (`Feature-Module` klasör kuralı) bölünmesi ve `.ai/gate-baseline.json` ratchet sıkılaştırması.
3. **`HomePage v2` Görsel Doluluk & Cila:** Kurumsal vitrin bileşenlerinin görsel yoğunluk ve mikro-etkileşim cilası.

## 3. Açık Teknik Riskler
- **Bundle Bütçesi (`WARN`):** Ana giriş chunk'ı şu an `1416.5 KB` (tavan `1442 KB`, hedef `≤450 KB`) → `PERF-1` ile çözülecek.
- **Monolit Dosyalar (`WARN`):** 14 dosya `>600` satır ratchet kilidinde (`Ayarlar.jsx` `1559`, `VehicleSheet.jsx` `1133`, `ComponentDataTable.jsx` `1030`) → `REFACTOR-1` ile bölünecek.

## 4. 📌 Durum Panosu (Her Yanıt Sonunda Zorunlu Şablon)
| Ajan | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **S5 (Baş Mimar)** | `Neon High` (`Neon X-High` / Opus) | `OPS-2b` kabul & `PERF-1` hazırlığı | `PERF-1` paket komutunu S1'e vermeli | `REFACTOR-1` mimari bölünme planı |
| **S1 (Frontend)** | `Neon` Normal (`Neon High` / Sonnet) | Beklemede (`V2.1-FE3R` PASS) | S5'ten `PERF-1` komutunu beklemeli | `PERF-1` & `REFACTOR-1` (FE monolitler) |
| **S2 (Backend / Ops)** | `Argon` / `Neon` Normal (Sonnet) | `OPS-2b` tamamlandı | Beklemede kalmalı | `REFACTOR-1` (`adminController`, `aracRoutes`) |
| **S3 (QA / Denetçi)** | `Hidrojen` / `Argon` (`Neon High`) | `OPS-2b` doğrulamasına hazır | `OPS-2b` ve ardından `PERF-1` denetlemeli | `REFACTOR-1` regresyon & ratchet QA |
| **S4 (Bug Hunter)** | `2.8 Flash` / `Hidrojen` (`Neon High`) | Beklemede (`V2.1-BE` 11/11 PASS) | Beklemede kalmalı | `PERF-1` / `REFACTOR-1` sonrası hata avı |
