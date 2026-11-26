---
name: forge
description: FORGE 5 fazlı orkestrasyon; keystone/critic plan, onay, core-smith/shell-crafter, sentinel QA, /forge-seal.
---

# `/forge <hedef>` — FORGE Ana Orkestratör

- **Ana Oturum (`keystone` modu):** `READ-ONLY` (`0 diff`), `caveman lite`; alt uzmanlar (`invoke_subagent`) ana oturumdan çağrılır.
- **Kanonik Kaynaklar:** `AGENTS.md`, `.ai/PROGRESS.md`, `.ai/SWARM_PLAYBOOK.md`, `.ai/ENGINEERING_GUARDRAILS.md`, `.ai/DECISIONS.md`.

## 5 Fazlı Deterministik Akış
1. **Faz 1 — Plan & Sözleşme Kilidi (`READ-ONLY`, `0 diff`):**
   - `keystone` ile **4-8'li paralel `read_file`** (maks `12` hedef dosya) + `/critic` öz-denetimi uygula.
   - **Frozen Contract** kilitle (`URL`, Method, `Status`, `JSON Keys`, Enum, `DATA_SCOPES`), `İzinli Kapsam`, `Kesin Yasak Bölge` ve `Kabul Kriterleri` sun.
2. **Faz 2 — Zorunlu Kullanıcı Onayı (`STOP`, `0 diff`):**
   - Kullanıcı açık onay vermeden yazma uzmanı başlatılmaz.
3. **Faz 3 — Uygulama (`invoke_subagent`):**
   - `FROZEN CONTRACT` yetkisiyle `<= 2` FE dosyası tek geçişte `core-smith` ile bağlanır; `>= 3` FE dosyasında ardışık `core-smith -> shell-crafter` (ayrık refaktörde paralel). `shell-crafter` daralttığı `Frontend/**` satırlarını `.ai/gate-baseline.json`'dan düşebilir.
   - Uygulayıcılar ilk satırda `COMMIT DURUMU: ATILMADI (QA bekleniyor)` basar, yalnız `npm run gate:fast` + hedefli test koşar.
4. **Faz 4 — İzole Adversarial QA (`sentinel`, `READ-ONLY`):**
   - `sentinel` yalnız **`1x npm run gate`** + **`1x npm run context:audit -- --strict`** koşar; `Frontend/**` `0 diff` ise E2E yok, değişiklik varsa hedefli `forge-qa-browser` (`<= 10` hedef, maks `15` adım). `FAIL` -> maks 2 döngü, sonra eskalasyon.
5. **Faz 5 — Mühürleme (`/forge-seal`):**
   - Yalnız `PASS` sonrası `core-smith` `.ai/*` günceller, `1x npm run context:audit -- --strict` doğrular ve commit atar (`.githooks/pre-commit` `1x gate` koşar; push yalnız kullanıcı isterse).

## Zorunlu 3 Satırlık Kompakt Özet
1. `DURUM:` (`PLAN / QA PASS / COMMIT <hash>`) + değişen dosya özeti
2. `KANIT:` (`gate / test / context:audit` tek satır sonucu)
3. `HUD:` (`node scripts/forge-meter.mjs --dir <aktif-artifact-dizini>` tek satırlık `codeburn` çıktısı)
