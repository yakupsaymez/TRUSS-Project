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

## 2. Sıradaki Kuyruk (Öncelik Sırasıyla)
- **Mühürlenenler:** `PERF-1/1b`, `REFACTOR-1` (`14/14 -> 0` monolit), `OPS-1..5`, `QA-SWEEP` (`BE+FE`), `V2.1-FE4`, `CLEANUP-1` ve `V2.1-HOTFIX-W1` mühürlendi.
- **Sırada / Beklemede:** Wave 2 (`FIX-2` + `FIX-3A` + `FIX-4`) -> `V2.2-DBPERF` + `V2.2-NOTIFY` + `V2.2-INBOX` -> `V2.2-TCO` + `V2.2-ANOMALY`.

## 3. Açık Teknik Riskler
- **Bundle Bütçesi (`PASS` / Kilitlendi):** Ana giriş chunk'ı `1416.5 KB → 89.6 KB`, en büyük vendor chunk `351.3 KB` (`maxChunkKb: 352 KB` ratchet tavanına kilitlendi).
- **Monolit Dosyalar (`KAPANDI` / `0 Monolit`):** `14/14` monolit (`>600` satır) Feature-Module mimarisine bölündü; `.ai/gate-baseline.json` `files: {}` sıfırlandı ve `maxNewFileLines: 600` kilitlendi.
- **Regresyon & Mantık Riski (`KAPANDI` / `0 Açık P0/P1/P2`):** `QA-SWEEP-BE` ve `QA-SWEEP-FE` tamamlandı (`ADR-11`, `ADR-12`).

## 4. 📌 Durum Panosu (Her Yanıt Sonunda Zorunlu Şablon)
| Ajan | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |
| :--- | :--- | :--- | :--- | :--- |
| **S5 (Baş Mimar)** | `pro` (`Neon High` / Opus) | `V2.1-HOTFIX-W1` mühürlendi (`QA PASS`) | Temiz oturumda Wave 2 (`FIX-2` + `FIX-3A`) planlamasına geçmeli | `FIX-4` ve `V2.2` paket orkestrasyonu |
| **S1 (Frontend)** | `inherit` (`Neon` Normal) | `FIX-3B` UI kontrast/sticky/UX mühürlendi (`QA PASS`) | Wave 2 (`FIX-3A`) için temiz oturumda beklemeli | `FIX-3A`, `FIX-4` ve `V2.2` FE paketleri |
| **S2 (Backend / Ops)** | `inherit` (`Argon` / `Neon`) | `FIX-1` güvenlik/`ADR-09`/JWT/FK mühürlendi (`QA PASS`) | Wave 2 (`FIX-2`) için temiz oturumda beklemeli | `FIX-2`, `FIX-4` ve `V2.2` BE paketleri |
| **S3 (QA / Denetçi)** | `pro` (`Hidrojen` / `Argon`) | `V2.1-HOTFIX-W1` 7-kapı + API + E2E PASS onaylandı | Wave 2 QA için temiz oturumda beklemeli | Wave 2 ve `V2.2` paketlerinde 7 kapılı QA |
| **S4 (Bug Hunter)** | `flash` (`2.8 Flash`) | `QA-SWEEP` tamamlandı (`0` açık hata) | Beklemede kalmalı | Wave 2 / `V2.2` sonrası cerrahi hata avı |
