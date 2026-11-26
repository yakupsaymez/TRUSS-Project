---
name: forge-meter
description: FORGE-OPS-METER Codeburn token/maliyet/verimlilik HUD ve 15-adım tarayıcı bütçe ölçümü.
---

# `/forge-meter` — Token & Maliyet HUD

```bash
npm run forge:meter -- [--dir <conv-dir> | --conv <conv-id>] [--limit <N>] [--json] [--strict]
```

- `--dir <conv-dir>`: Tek oturum dizinini doğrudan okur (`brain` üst dizinini taramaz).
- `--conv <conv-id>`: `~/.gemini/antigravity/brain/<conv-id>` dizinini doğrudan okur.
- `--limit <N>`: Varsayılan `5` son oturum (`mtimeMs` azalan).
- `--json`: Sıfır-sızıntılı makine çıktısı (`{ conversations, totals }`).
- `--strict`: `EPERM`/`EACCES`/`ENOENT` durumunda çıkış kodu `1` döner.

**Sütunlar (`codeburn`):** `#N | in (cache) · out · tot | Eff (A+..D) | Cost (tot) | Ctx` (`[!browser:N>15]` = `D`).
