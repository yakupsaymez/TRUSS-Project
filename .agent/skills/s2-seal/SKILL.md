---
name: s2-seal
description: >-
  TRUSS S2 S3-PASS sonrası .ai/PROGRESS.md hafıza güncellemesi ve atomik git
  commit mühürleme akışı.
---

# `/s2-seal` — S2 Paket Mühürleme & Commit Becerisi

## 1. Ön Koşul & Kanonik Kaynaklar
- Yalnızca `S3 (QA / Baş Denetçi)` tarafından açık **`PASS`** onayı verilmiş paketlerde çalıştırılır.
- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md` (`<= 120` satır), `.ai/DECISIONS.md` (`<= 180` satır), `.ai/ARCHITECTURE_MAP.md` (`<= 160` satır), `.ai/ENGINEERING_GUARDRAILS.md`.

## 2. Mühürleme Adımları
1. **Canlı Hafıza Güncellemesi:**
   - `.ai/PROGRESS.md` dosyasına mühürlenen paketin tek satırlık deltasını ve güncel ajan durumunu işle (`<= 120` satır sınırını koru).
   - Yeni mimari karar veya çözülen P0/P1 kök nedeni varsa `.ai/DECISIONS.md` içine 3 satırlık `P0-to-Rule` (`Tarih` · `Kök Neden` · `Kalıcı Kural`) ekle (`<= 180` satır).
   - Yeni rota, modül, API ucu veya tablo eklendiyse `.ai/ARCHITECTURE_MAP.md` dosyasını güncelle (`<= 160` satır).
2. **Kalite Kapısı Doğrulaması:**
   - `wc -l .ai/PROGRESS.md .ai/DECISIONS.md .ai/ARCHITECTURE_MAP.md`
   - `npm run gate` (`RESULT: PASS (0 failed)` zorunlu).
3. **Atomik Commit:**
   - İlgili dosyaları `git add` ile stage'e al ve anlamlı mesajla `git commit` çalıştır.
   - `.githooks/pre-commit` otomatik çalışır; **`--no-verify` kullanımı kesinlikle YASAKTIR**.
4. **Çıktı:** Yanıtın ilk satırında tam olarak bas:
   `COMMIT DURUMU: ATILDI — <kısa_commit_hash>`
