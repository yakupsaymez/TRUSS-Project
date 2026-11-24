---
name: truss-audit
description: >-
  TRUSS READ-ONLY bağlam token bütçesi, .ai/.agent satır tavanı, gate:fast ve
  AI Verimlilik Karnesi denetim becerisi.
---

# `/truss-audit` — TRUSS Bağlam & Kalite Denetimi (`READ-ONLY`)

## 1. Rol & Kesin Kısıt (`0 diff`)
- Bu beceri tamamen **READ-ONLY** çalışır; hiçbir repo dosyasını düzenlemez (`0 diff`).
- Çıktı disiplini `caveman lite` olarak uygulanır; tablo, sayısal metrik ve ihlal yolları kırpılmaz.
- Kanonik kaynaklar: `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 2. Denetim Komutları
Sırasıyla yalnızca salt-okunur komutları çalıştır:
1. `npm run context:audit` (makine özeti gerekiyorsa `node scripts/context-audit.mjs --json`)
2. `npm run gate:fast` (`ai-gate.mjs --fast` ile 7 kapı + `301-600` uyarı bandı + baseline `maxChunkKb`)

## 3. Çıktı: TRUSS AI Verimlilik Karnesi
Tek ekranda hizalı tablo ve net metriklerle raporla:
- **Always-On Bütçe:** Always-On token yükü vs `20,000` token bütçe `%` (`AGENTS.md` + `always_on` `.agent/rules/*`).
- **Progressive Metadata:** Skill/Agent (`name: description`) enjeksiyon token yükü ve tam dosya satır/token bilgisi.
- **Baseline Turn Tabanı:** `Baseline Turn Overhead = Always-On + Metadata` toplam token maliyeti.
- **Satır & Byte Tavanları:** `.ai/*` (`120/140/150/160/180/50/60`) ve `.agent/*` (`<= 55` satır, `<= 24,000` byte) ihlal durumu.
- **Kod & Bundle Sağlığı (`gate:fast`):** `301-600` satır uyarı bandı dosyaları, `> 600` sert reddi ve `.ai/gate-baseline.json` `maxChunkKb` (`352 KB`) tavanı.
- **Drift Uyarıları:** Eski `.agent/workflows/**` kalıntısı, kök `skills/**` bayt/token yükü ve `> 55` satırlı `references/*.md` dosyaları.

## 4. Opsiyonel Lokal READ-ONLY Postgres MCP
- Canlı veritabanı şema veya salt-okunur sorgu denetimi gerekiyorsa [postgres-mcp-readonly.md](./references/postgres-mcp-readonly.md) rehberini uygula.
- **Sıfır Şifre Kuralı:** `Backend/.env`, veritabanı kullanıcısı, şifre veya bağlantı dizgisi repo içine **ASLA** yazılmaz; tüm bağlantı bilgileri yalnızca repo dışındaki `~/.gemini/config/mcp_config.json` dosyasında tutulur.

## 5. Zorunlu Kapanış
Raporun sonunda güncel 5 ajanlı `📌 Durum Panosu` tablosunu bas.
