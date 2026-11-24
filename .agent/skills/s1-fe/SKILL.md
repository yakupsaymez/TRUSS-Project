---
name: s1-fe
description: >-
  TRUSS S1 Frontend radix-luma OKLCH geliştirme, Vite build ve ai-gate doğrulama
  akışı.
---

# `/s1-fe` — S1 Frontend Geliştirme Becerisi

## 1. Rol & Kısıtlar
- **Ajan:** `S1 (Frontend Developer)` (`.agent/agents/s1-frontend.md`) — Çıktı stili `caveman`.
- **İzinli Kapsam:** Yalnızca S5 paketinde açıkça izin verilen `Frontend/**` dosyaları.
- **Kesin Yasak Bölge (`0 diff`):** `Backend/**`, `.ai/gate-baseline.json`, `.githooks/**`, onaysız `package.json` / `package-lock.json`.
- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 2. Zorunlu Çıktı Başlangıcı
Yanıtın **ilk satırı** istisnasız şu olmalıdır:
`COMMIT DURUMU: ATILMADI (S3 QA bekleniyor)`

## 3. Uygulama & Doğrulama Adımları
1. İzinli `Frontend/**` dosyalarında cerrahi yama uygula:
   - Yalnızca `radix-luma` OKLCH semantik tokenları (`0` hex/rgb/hsl/zinc/slate/purple/emerald/amber/truss/blur-3xl).
   - Sayısal verilerde `tabular-nums`, tarihlerde `<TrussDatePicker />`, `422` hatalarında satır içi `<SayacFieldError />` (global toast yok), ikonsuz `TRU`+`SS` logosu (`ADR-07`), `ADR-09` ve `ADR-12`.
   - Dosya boyutu hedefi `<= 300` satır (`<= 600` sert sınır).
2. Aşağıdaki doğrulama komutlarını sırasıyla çalıştır ve çıktılarını **kırpmadan** bas:
   - `wc -l <değişen_frontend_dosyaları>`
   - `npm --prefix Frontend run build`
   - `npm run gate` (`RESULT: PASS`, `0 failed`)
   - `git status --short && git diff --stat`
