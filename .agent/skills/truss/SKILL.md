---
name: truss
description: >-
  Tek komutluk TRUSS S5 orkestrasyon akışı: READ-ONLY plan, kullanıcı onayı,
  izole S1/S2/S4 uygulama, izole S3 QA ve /s2-seal mühürleme.
---

# `/truss <hedef>` — Tek Komutluk TRUSS Orkestratörü

## 1. Rol & Kritik Orkestrasyon Kısıtı (`0 diff`)
- **Ana Oturum (`S5 Baş Mimar`):** `/truss <hedef>` ana oturumda `READ-ONLY` çalışır (`caveman lite`); repo dosyalarını doğrudan düzenlemez.
- **Delegasyon Kısıtı:** `s5-architect` subagent'ı yalnız `[read_file, search_web]` araçlarına sahiptir; alt subagent çağrıları (`invoke_subagent`) ana oturum üzerinden yapılır.
- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md` (`ADR-01..12`), `.ai/SWARM_PLAYBOOK.md`.

## 2. 5 Fazlı Deterministik Akış

### Faz 1 — Plan (`READ-ONLY`, `0 diff`)
- `/s5-plan` (veya `s5-architect`) ile hedefi 1–3 dosyalık cerrahi mikro-pakete böl.
- Çıktıda `İzinli Kapsam`, `Kesin Yasak Bölge (0 diff)`, `Kabul Kriterleri`, `Hedef Ajan` ve 5 ajanlı `📌 Durum Panosu` sun.

### Faz 2 — Zorunlu Kullanıcı Onayı (`STOP`)
- Kullanıcı açık onay vermeden **hiçbir** yazma subagent'ı başlatılmaz (`0 diff`).
- Onay için kapsam özeti sun ve kullanıcıdan açık yürütme onayı gelene kadar bekle.

### Faz 3 — Uygulama (`invoke_subagent`)
- Onayla yalnız tek sorumlu ajana delege et: `s1-frontend` (`/s1-fe`) | `s2-backend-ops` (`/s2-be`) | `s4-bughunter` (`/s4-sweep`).
- İlk satır zorunlu: `COMMIT DURUMU: ATILMADI (S3 QA bekleniyor)`.
- Kırpılmamış doğrulama: `wc -l`, `node --check` / `npm --prefix Frontend run build`, `npm run gate` (`0 failed`), `git status --short && git diff --stat`.

### Faz 4 — İzole QA (`s3-qa`, `READ-ONLY`)
- Bağımsız `s3-qa` ile 7 kapılı denetim çalıştır.
- UI değişikliğinde `truss-qa-browser` zorunludur (Light/Dark, `422` `<SayacFieldError />`, RBAC, `0 console.error`, `0` 4xx/5xx).
- `QA KARARI: FAIL` gelirse `P0/P1` bulguları aynı uygulayıcıya (`send_message`) döner ve tekrar `s3-qa` çalışır (maks 2 döngü, sonra kullanıcıya eskalasyon).

### Faz 5 — Mühürleme (`/s2-seal`)
- Yalnız `QA KARARI: PASS` sonrası `s2-backend-ops` (`/s2-seal`) ile mühürle:
  - `.ai/PROGRESS.md` (gerekirse `.ai/DECISIONS.md` / `.ai/ARCHITECTURE_MAP.md`) güncelle.
  - `npm run context:audit -- --strict` ve `npm run gate` (`0 failed`) doğrula.
  - `--no-verify` olmadan atomik `git commit` at (`git push` yalnız kullanıcı açıkça isterse).

## 3. Çıktı Protokolü
- Çıktı stili: `caveman lite` (sıfır dolgu, madde/tablo odaklı).
- Kod, diff, SQL, hata kodu, `context:audit` ve `ai-gate` çıktıları asla kırpılmaz.
- Her yanıt sonunda güncel 5 ajanlı `📌 Durum Panosu` tablosu basılır.
