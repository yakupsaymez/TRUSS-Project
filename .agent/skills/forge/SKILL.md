---
name: forge
description: FORGE 5 fazlı orkestrasyon; keystone/critic plan, onay, core-smith/shell-crafter, sentinel QA, /forge-seal.
---

# `/forge <hedef>` — FORGE Ana Orkestratör

- **Ana Oturum (`keystone` modu):** `READ-ONLY` (`0 diff`), `caveman lite`; alt uzmanlar (`invoke_subagent`) ana oturumdan çağrılır.
- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/SWARM_PLAYBOOK.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 5 Fazlı Deterministik Akış
1. **Faz 1 — Plan & Sözleşme Kilidi (`READ-ONLY`, `0 diff`):**
   - `keystone` ile hedefi cerrahi mikro-paketlere böl; zorunlu `/critic` (`.agent/skills/critic/SKILL.md`) Red-Team öz-denetimini çalıştır.
   - **Frozen Contract** kilitle (`URL`, HTTP Method, `Status`, `JSON Keys`, Kanonik Enum, `DATA_SCOPES`).
   - Çıktıda `İzinli Kapsam`, `Kesin Yasak Bölge`, `Frozen Contract`, `Kabul Kriterleri` ve `📌 Durum Panosu` sun.
2. **Faz 2 — Zorunlu Kullanıcı Onayı (`STOP`, `0 diff`):**
   - Kullanıcı açık onay vermeden yazma uzmanı (`core-smith` / `shell-crafter`) başlatılmaz.
3. **Faz 3 — Uygulama (`invoke_subagent`):**
   - **Ardışık Kural:** Yeni şema/iş kuralında zorunlu **`core-smith -> shell-crafter`** sırası izlenir.
   - **Paralel Dalga:** Yalnız dondurulmuş kontratlı ve ayrık dosyalı refaktörde paralel çalıştırılır.
   - Her uygulayıcı ilk satırda `COMMIT DURUMU: ATILMADI (QA bekleniyor)` basar ve tam doğrulama çıktılarını döndürür.
4. **Faz 4 — İzole Adversarial QA (`sentinel`, `READ-ONLY`):**
   - Bağımsız `sentinel` kırılma/kiracı/yarış/gate denetimi yapar; UI değişikliğinde `forge-qa-browser` zorunludur.
   - `QA KARARI: FAIL` -> bulgular ilgili uygulayıcıya (`send_message`) döner ve tekrar `sentinel` çalışır (maks 2 döngü, sonra kullanıcıya eskalasyon).
5. **Faz 5 — Mühürleme (`/forge-seal`):**
   - Yalnız `QA KARARI: PASS` sonrası `core-smith` (`/forge-seal`) ile `.ai/*` güncellenir, `context:audit --strict` + `gate` doğrulanır ve atomik commit atılır (`git push` yalnız kullanıcı isterse).

## Zorunlu Yanıt Sonu Panosu (`📌 Durum Panosu`)
Her yanıt sonunda 5 uzman (`keystone`, `core-smith`, `shell-crafter`, `sentinel`, `radar`) için 5 sütunlu pano bas:
`| Uzman | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |`
