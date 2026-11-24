---
trigger: glob
globs: "**/.ai/**, **/scripts/**, **/.githooks/**, **/.agent/**"
description: TRUSS Ops, ai-gate ratchet, pre-commit ve doküman satır sınırı kuralları
---

# TRUSS — Ops, Kalite Kapısı & Hafıza Kuralları (`30-ops-gate`)

- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 1. `ai-gate` Ratchet & Pre-Commit Disiplini
- 7 kapılı kalite kontrolü (`scripts/ai-gate.mjs` / `npm run gate`) ve `.ai/gate-baseline.json` yalnızca aşağı yönlü (`ratchet`) sıkılaşır.
- `maxNewFileLines: 600`, `warnFileLines: 300` ve `maxChunkKb: 352` tavanlarını gevşetmek veya muafiyet uydurmak yasaktır.
- `.githooks/pre-commit` her commit öncesi otomatik çalışır; `git commit --no-verify` kullanımı kesinlikle **YASAKTIR**.

## 2. Kanonik `.ai/*` Satır Sınırları (Tek Doğruluk Kaynağı)
Dokümanlar şişirilmez, her zaman aşağıdaki sert satır tavanları altında tutulur:
- `.ai/PROGRESS.md`: **`<= 120` satır** (canlı durum, tamamlanan paketler, kuyruk ve 5 ajan panosu).
- `.ai/ENGINEERING_GUARDRAILS.md`: **`<= 140` satır** (tema, RBAC, `422`, dosya/chunk bütçesi).
- `.ai/SWARM_PLAYBOOK.md`: **`<= 150` satır** (S1..S5 rol matrisi ve iş akışı).
- `.ai/ARCHITECTURE_MAP.md`: **`<= 160` satır** (gerçek rotalar, uçlar ve 12 PostgreSQL tablosu).
- `.ai/DECISIONS.md`: **`<= 180` satır** (`ADR-01..12` kalıcı kararlar; her yeni `P0-to-Rule` kaydı `Tarih` · `Kök Neden` · `Kalıcı Kural` olarak tam 3 satır).

## 3. Antigravity v2.34.0 `.agent/*` Şema Kuralı
- `.agent/rules/*.md`, `.agent/skills/*/SKILL.md` ve `.agent/agents/*.md` dosyalarının her biri **`<= 55` satır** olmalıdır ve kuralları kopyalamak yerine kanonik `.ai/*` kaynaklarına işaret etmelidir (eski `.agent/workflows/` kullanılmaz).
