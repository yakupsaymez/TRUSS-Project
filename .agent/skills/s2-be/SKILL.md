---
name: s2-be
description: >-
  TRUSS S2 Backend/Ops geliştirme, PostgreSQL TX/RBAC, node --check ve ai-gate
  doğrulama akışı.
---

# `/s2-be` — S2 Backend / Ops Geliştirme Becerisi

## 1. Rol & Kısıtlar
- **Ajan:** `S2 (Backend / Ops)` (`.agent/agents/s2-backend-ops.md`) — Çıktı stili `caveman`.
- **İzinli Kapsam:** Yalnızca S5 paketinde açıkça izin verilen `Backend/**`, `scripts/**`, `.ai/**` veya `.agent/**` dosyaları.
- **Kesin Yasak Bölge (`0 diff`):** `Frontend/**`, onaysız `package.json` / `package-lock.json`, onaysız `.ai/gate-baseline.json`.
- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 2. Zorunlu Çıktı Başlangıcı
Yanıtın **ilk satırı** istisnasız şu olmalıdır:
`COMMIT DURUMU: ATILMADI (S3 QA bekleniyor)`

## 3. Uygulama & Doğrulama Adımları
1. İzinli dosyalarda cerrahi yama uygula:
   - Parametreli `pg` SQL (`$1, $2`), `authMiddleware` + `rbacMiddleware` ve `org_id` izolasyonu (`ADR-05`, `ADR-08`).
   - `DATE` (`OID 1082`) saf string (`ADR-01`) ve `Europe/Istanbul` `tarihStr` + `ileriTarihMi` (`ADR-02`).
   - `pool.connect()` için `let client;` + `try/finally if (client) client.release()`, yakıt/bakımda `FOR UPDATE` + `422` (`ADR-03`) ve `aracSayaciniSenkronizeEt` (`ADR-04`).
   - `updateParca` `arac_id` değişmezliği (`ADR-09`) ve nullable FK `undefined vs null` ayrımı (`ADR-11`).
   - Dosya boyutu hedefi `<= 300` satır (`<= 600` sert sınır).
2. Aşağıdaki doğrulama komutlarını sırasıyla çalıştır ve çıktılarını **kırpmadan** bas:
   - `wc -l <değişen_dosyalar>`
   - `node --check <değişen_js_dosyaları>`
   - `npm run gate` (`RESULT: PASS`, `0 failed`)
   - `git status --short && git diff --stat`
