---
name: forge-seal
description: sentinel PASS sonrası .ai hafıza bütçesi koruması, audit/gate doğrulaması ve atomik commit.
---

# `/forge-seal` — FORGE Paket Mühürleme & Atomik Commit

## 1. Ön Koşul
- Yalnızca **`sentinel` (`QA KARARI: PASS`)** onayı sonrasında `core-smith` tarafından çalıştırılır.

## 2. Mühürleme Adımları
1. **Canlı Hafıza & Bütçe Koruması:**
   - `.ai/PROGRESS.md` (`<= 120`L): Tek satırlık paket deltası ve güncel 5 uzmanlı `📌 Durum Panosu`.
   - Yeni P0/P1 veya mimari karar varsa `.ai/DECISIONS.md` (`<= 180`L) içine 3 satırlık `P0-to-Rule` ekle.
   - Yeni rota/modül/uç/tablo varsa `.ai/ARCHITECTURE_MAP.md` (`<= 160`L) güncelle.
   - Toplam `.ai/*` Full Boot bütçesini **`<= 7800` tok** altında tut.
2. **Sert Doğrulama Komutları:**
   - Backend değişikliğinde `npm run test:core` (`0` fail)
   - `npm run context:audit -- --strict` (`Ceiling Violations: 0`, `Drift Alerts: 0`)
   - `npm run gate` (`RESULT: PASS (0 failed)`)
   - `node scripts/context-pack.mjs` çıktısında `0` `MISSING` doğrula (dosya olarak repoya kaydetme).
3. **Atomik Git Commit:**
   - Yalnız ilgili dosyaları `git add` ile stage'e al ve anlamlı mesajla `git commit` çalıştır.
   - `.githooks/pre-commit` aktif kalır; **`--no-verify` kesinlikle YASAKTIR**.
   - `git push` yalnız kullanıcı açıkça isterse çalıştırılır.
4. **Çıktı İlk Satırı:** `COMMIT DURUMU: ATILDI — <kısa_commit_hash>`
