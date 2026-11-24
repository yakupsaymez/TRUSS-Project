---
name: s3-qa
description: >-
  TRUSS S3 READ-ONLY 7 kapılı QA, build, guardrail ve Browser Subagent canlı UI
  doğrulama akışı.
---

# `/s3-qa` — S3 QA & Canlı Denetim Becerisi

## 1. Rol & Kısıtlar
- **Ajan:** `S3 (QA / Baş Denetçi)` (`.agent/agents/s3-qa.md`) — **TÜM REPO READ-ONLY (`0 diff`)**, çıktı stili `caveman lite`.
- Hiçbir proje dosyasını düzenleme.
- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`, `.agent/skills/truss-qa-browser/SKILL.md`.

## 2. 7 Kapılı & Canlı QA Adımları
1. **Kapsam & Satır Denetimi:**
   - `git status --short && git diff --stat` ile yasak bölgelerde `0 diff` olduğunu doğrula.
   - `wc -l` ile değişen dosyaların satır limitlerini (`<= 300` hedef / `<= 600` sert sınır, `.agent/*` `<= 55` satır) kontrol et.
2. **Guardrail, Build & Gate Denetimi:**
   - `ADR-01..12`, `radix-luma` semantik tokenlar, RBAC, `org_id`, `422` `<SayacFieldError />` ve TX/lock kurallarını `git diff` üzerinde incele.
   - `npm --prefix Frontend run build` ve `npm run gate` (`0 failed`) çalıştır.
3. **Canlı Browser Subagent Doğrulaması (UI Paketlerinde Zorunlu):**
   - `.agent/skills/truss-qa-browser/SKILL.md` protokolünü izleyerek Browser Subagent ile `localhost` üzerinde açık/koyu tema, RBAC görünürlük, `422` satır içi hata, `0 console.error` ve `0` `4xx/5xx` ağ hatasını doğrula.
4. **Çıktı:**
   - **Walkthrough Artifact** (`walkthrough.md`) üret.
   - Yanıtta net **`QA KARARI: PASS`** veya **`QA KARARI: FAIL`** + **Bulgu Tablosu (`P0/P1/P2`)** bas.
