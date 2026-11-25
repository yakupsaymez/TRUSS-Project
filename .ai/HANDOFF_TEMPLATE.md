# TRUSS — FORGE Oturum Başlatma & Devir Şablonu (`HANDOFF_TEMPLATE.md`)

## 1. Tek Satırlık Uzman Boot Komutları
- **Keystone (`READ-ONLY`):** `AGENTS.md, .ai/PROGRESS.md, .ai/SWARM_PLAYBOOK.md, .ai/DECISIONS.md oku. Uzman: keystone (READ-ONLY). /critic ile analiz et, Frozen Contract kilitle.`
- **Core-Smith (`BE/Ops`):** `AGENTS.md, .ai/PROGRESS.md, .ai/ENGINEERING_GUARDRAILS.md, .ai/DECISIONS.md oku. Uzman: core-smith. Frontend/* yasak (0 diff). Görevi bekle.`
- **Shell-Crafter (`FE/UI`):** `AGENTS.md, .ai/PROGRESS.md, .ai/ENGINEERING_GUARDRAILS.md, .ai/DECISIONS.md oku. Uzman: shell-crafter. Backend/* yasak (0 diff). Görevi bekle.`
- **Sentinel (`QA — READ-ONLY`):** `AGENTS.md, .ai/PROGRESS.md, .ai/ENGINEERING_GUARDRAILS.md, .ai/DECISIONS.md oku. Uzman: sentinel (READ-ONLY). Son değişiklikleri kırılma/E2E ile denetle.`
- **Radar (`X-Ray — READ-ONLY`):** `AGENTS.md, .ai/PROGRESS.md, .ai/ENGINEERING_GUARDRAILS.md, .ai/DECISIONS.md oku. Uzman: radar (READ-ONLY). /forge-xray ile sapmaları raporla.`

## 2. Tam Bağlam Paketi
```bash
npm run context:pack
```

## 3. Frozen Contract Mikro-Paket Devir Şablonu
```markdown
UZMAN: [core-smith | shell-crafter] — GÖREV: [FORGE-M* — Hedef]
İZİNLİ: [Tam dosya yolları] | YASAK (0 diff): [Yasak bölge]
FROZEN CONTRACT: [URL, Method, Status, JSON Keys, Enum, DATA_SCOPES]
KABUL: [wc -l / node --check / build / npm run gate]
```
