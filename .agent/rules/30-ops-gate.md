---
trigger: glob
globs: "**/.ai/**, **/scripts/**, **/.githooks/**, **/.agent/**"
description: TRUSS Ops, ai-gate ratchet, 6 .ai/* dosyası ve .agent/* satır/bütçe tavanları
---

# TRUSS — Ops, Kalite Kapısı & Hafıza Kuralları (`30-ops-gate`)

- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 1. `ai-gate` Ratchet & Pre-Commit
- `scripts/ai-gate.mjs` (`npm run gate`) ve `.ai/gate-baseline.json` yalnız aşağı yönlü (`ratchet`) sıkılaşır.
- `maxNewFileLines: 600`, `warnFileLines: 300`, `maxChunkKb: 352` gevşetilemez; `git commit --no-verify` kesinlikle **YASAKTIR**.

## 2. Kanonik `.ai/*` Satır & Bütçe Sınırları (6 Dosya, `<= 7800` tok Full Boot)
- `.ai/PROGRESS.md`: **`<= 120`L** (canlı durum, `FORGE-M0..M4` yol haritası, 5 uzman panosu).
- `.ai/ENGINEERING_GUARDRAILS.md`: **`<= 140`L** (tema, RBAC, `422 SAYAC_KRONOLOJI_IHLALI`, `409 VEHICLE_ARCHIVED`, çekirdek/UI sınırları).
- `.ai/SWARM_PLAYBOOK.md`: **`<= 150`L** (`FORGE` işletim kılavuzu).
- `.ai/ARCHITECTURE_MAP.md`: **`<= 160`L** (gerçek rotalar, uçlar, `15` PostgreSQL tablosu ve `ADR-01..24` haritası).
- `.ai/DECISIONS.md`: **`<= 180`L** (`ADR-01..24`; her yeni `P0-to-Rule` `Tarih · Kök Neden · Kalıcı Kural` 3 satır).
- `.ai/HANDOFF_TEMPLATE.md`: **`<= 60`L** (`FORGE` 5 uzman boot komutları ve devir şablonu).

## 3. `.agent/*` Şema & Denetim
- `.agent/rules/*.md`, `.agent/skills/*/SKILL.md` ve `.agent/agents/*.md` her biri **`<= 55`L** (`<= 50`L hedef); Always-On `<= 1600` tok.
- Doğrulama: `npm run context:audit -- --strict` (`Ceiling Violations: 0`, `Drift Alerts: 0`) ve `node scripts/context-pack.mjs` (`0 MISSING`).
