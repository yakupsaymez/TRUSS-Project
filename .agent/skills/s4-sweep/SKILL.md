---
name: s4-sweep
description: >-
  TRUSS S4 2 fazlı Bug Hunter cerrahi P0/P1/P2 kök neden tarama ve yama akışı.
---

# `/s4-sweep` — S4 Bug Hunter 2 Fazlı Hata Avı Becerisi

## 1. Rol & Kanonik Kaynaklar
- **Ajan:** `S4 (Bug Hunter)` (`.agent/agents/s4-bughunter.md`) — Çıktı stili `caveman`. Kapsam dışı tüm modüller kesin yasak (`0 diff`).
- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md` (`ADR-01..12`).

## 2. Faz 1 — Salt-Okunur Derin Tarama (`0 diff`)
1. Atanan modülde hiçbir dosyayı değiştirmeden P0/P1/P2 kök neden taraması yap:
   - **Backend:** SQL injection/parametre, `org_id` sızıntısı (`ADR-05`), UTC tarih kayması (`ADR-01/02`), `FOR UPDATE` / `422` sayaç (`ADR-03/04`), `client.release()` sızıntısı, nullable FK `undefined vs null` (`ADR-11`).
   - **Frontend:** `radix-luma` tema ihlali (`ADR-06/07`), RBAC `<ChannelGuard />` (`ADR-08`), `422` `<SayacFieldError />`, async dropdown race condition & kısmi form hidrasyonu (`ADR-12`).
2. **Bulgu Tablosu** (`ID` · `Seviye P0/P1/P2` · `Dosya:Satır` · `Kök Neden` · `Cerrahi Çözüm`) bas ve Faz 2 için S5 onayı bekle.

## 3. Faz 2 — Cerrahi Yama (Yalnız S5 Onaylı Dosyalarda)
1. Yanıtın ilk satırında `COMMIT DURUMU: ATILMADI (S3 QA bekleniyor)` bas.
2. Yalnızca S5'in onayladığı dosyalarda minimum diff ile kök neden yamasını uygula.
3. Doğrulama çıktılarını kırpmadan bas:
   - `wc -l <değişen_dosyalar>`
   - `node --check` (BE) ve/veya `npm --prefix Frontend run build` (FE)
   - `npm run gate` (`0 failed`)
   - `git status --short && git diff --stat`
