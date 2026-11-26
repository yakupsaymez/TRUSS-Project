---
name: forge-seal
description: sentinel PASS sonrası .ai hafıza bütçesi koruması, audit/gate doğrulaması ve atomik commit.
---

# `/forge-seal` — FORGE Paket Mühürleme & Atomik Commit

## 1. Ön Koşul
- Yalnızca **`sentinel` (`QA KARARI: PASS`)** onayı sonrasında `core-smith` tarafından çalıştırılır.

## 2. Mühürleme Adımları
1. **Canlı Hafıza & Bütçe Koruması:**
   - `.ai/PROGRESS.md` (`<= 120`L): Tek satırlık paket deltası ekle.
   - Yeni P0/P1 veya mimari karar varsa `.ai/DECISIONS.md` (`<= 180`L) içine 3 satırlık `P0-to-Rule` ekle.
   - Yeni rota/modül/uç/tablo varsa `.ai/ARCHITECTURE_MAP.md` (`<= 160`L) güncelle.
   - Toplam `.ai/*` Full Boot bütçesini **`<= 7800` tok** altında tut.
2. **Tekil Denetim:**
   - Yalnız **`1x npm run context:audit -- --strict`** (`Ceiling Violations: 0`, `Drift Alerts: 0`) doğrula (mükerrer `test:core`, `gate`, `context-pack` koşma).
3. **Atomik Git Commit & Push:**
   - İlgili dosyaları `git add` ile stage'e al ve `git commit` çalıştır (`.githooks/pre-commit` zaten `1x npm run gate` koşturur; **`--no-verify` YASAKTIR**).
   - Kullanıcı komutta açıkça push istediyse `git push origin main` çalıştır.
4. **Çıktı (3 Satırlık Kompakt Özet):**
   - `DURUM: COMMIT <kısa_hash>` + değişen dosya özeti, `KANIT:` tek satır audit/hook sonucu, `HUD:` `forge:meter` `codeburn` tek satırı.
