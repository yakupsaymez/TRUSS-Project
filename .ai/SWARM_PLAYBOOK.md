# TRUSS — FORGE İşletim Kılavuzu (`SWARM_PLAYBOOK.md`)

## 1. Uzman Matrisi & Yasak Bölgeler
| Uzman | Rol & Sorumluluk | Kesin Yasak Bölge (`0 diff`) | Model |
| :--- | :--- | :--- | :--- |
| **Keystone** | Baş Mimar (`READ-ONLY`, `/critic`, Frozen Contract) | **TÜM REPO** | `inherit` |
| **Core-Smith** | Fonksiyonel Çekirdek, Veri, TX/SQL, `<= 2` FE eki (kontratla) & `/forge-seal` | Onaysız `Frontend/**` / `package*.json` / baseline | `inherit` |
| **Shell-Crafter** | İnce UI Kabuğu, 3 katmanlı dikey dilim & `radix-luma` | `Backend/**`, `.ai/gate-baseline.json` dışı `.ai/**`, `scripts/**`, `.agent/**`, `package*.json` | `inherit` |
| **Sentinel** | İzole Düşman QA & hedefli `forge-qa-browser` E2E (`READ-ONLY`) | **TÜM REPO** | `inherit` |
| **Radar** | Sistemik Röntgen & Sapma Avcısı (`/forge-xray`, `READ-ONLY`) | **TÜM REPO** | `inherit` |

## 2. FORGE İş Akışı, Paralel G/Ç & Dilim Yönlendirme
1. **Plan (`keystone`):** `Orchestrator` `0` dosya okur; tam `.ai/*` boot + **4-8'li paralel `read_file`** (maks `12` hedef dosya) + `/critic` + **Frozen Contract** (`URL`, `Status`, `JSON Keys`, Enum, `DATA_SCOPES`) yalnız `keystone` içindir.
2. **Onay (`STOP`):** Kullanıcı onayı olmadan yazma uzmanı başlatılmaz (`0 diff`).
3. **Uygulama:** Uzmanlar `.ai/*` tekrar okumaz, tekil ardışık okuma yerine **4-8'li paralel `read_file`** kullanır ve yalnız `npm run gate:fast` + hedefli `node --test <dosya>` koşar. `FROZEN CONTRACT` yetkisiyle `<= 2` FE dosyası tek geçişte `core-smith` ile bağlanır; `>= 3` FE dosyasında ardışık `core-smith -> shell-crafter` çalışır. `shell-crafter` daralttığı `Frontend/**` satırlarını `.ai/gate-baseline.json`'dan düşebilir.
4. **Adversarial QA (`sentinel`):** Yalnız **`1x npm run gate`** + **`1x npm run context:audit -- --strict`** koşar (mükerrer test/build yok). `Frontend/**` `0 diff` ise tarayıcı E2E yok; değişiklik varsa değişen rota/sheet üzerinde hedefli E2E (`<= 10` hedef, `15` tavan).
5. **Mühürleme (`/forge-seal`):** Yalnız `PASS` sonrası `core-smith` `.ai/*` günceller, **`1x npm run context:audit -- --strict`** doğrular ve commit atar (`.githooks/pre-commit` `1x gate` koşar; push yalnız kullanıcı isterse).

## 3. Caveman İletişim & 3 Satırlık Kompakt Özet
- **Caveman (`core-smith`, `shell-crafter`, `radar`) / Caveman Lite (`keystone`, `sentinel`):** Ultra-kısa, sıfır dolgu, madde/tablo odaklı; kod, SQL, path, hata kodu ve gate/audit çıktısı asla kısaltılmaz.
- **Zorunlu Tur Sonu Özeti (3 Satır):**
  1) `DURUM:` (`PLAN / QA PASS / COMMIT <hash>`) + değişen dosya özeti
  2) `KANIT:` (`gate / test / context:audit` tek satır sonucu)
  3) `HUD:` (`node scripts/forge-meter.mjs --dir <aktif-artifact-dizini>` tek satırlık `codeburn` çıktısı)
