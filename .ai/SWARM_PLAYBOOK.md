# TRUSS — FORGE İşletim Kılavuzu (`SWARM_PLAYBOOK.md`)

## 1. Uzman Matrisi & Yasak Bölgeler
| Uzman | Rol & Sorumluluk | Kesin Yasak Bölge (`0 diff`) | Model |
| :--- | :--- | :--- | :--- |
| **Keystone** | Baş Mimar (`READ-ONLY`, `/critic`, Frozen Contract) | **TÜM REPO** | `pro` |
| **Core-Smith** | Fonksiyonel Çekirdek, Veri, TX/SQL & `/forge-seal` | `Frontend/**`, onaysız `package*.json`/baseline | `inherit` |
| **Shell-Crafter** | İnce UI Kabuğu, 3 katmanlı dikey dilim & `radix-luma` | `Backend/**`, `.ai/**`, `scripts/**`, `.agent/**`, `package*.json` | `inherit` |
| **Sentinel** | İzole Düşman QA & `forge-qa-browser` E2E (`READ-ONLY`) | **TÜM REPO** | `pro` |
| **Radar** | Sistemik Röntgen & Sapma Avcısı (`/forge-xray`, `READ-ONLY`) | **TÜM REPO** | `flash` |

## 2. FORGE İş Akışı & Frozen Contract
1. **Plan (`keystone`):** `Orchestrator` delege öncesi `0` dosya okur; tam `.ai/*` boot + `/critic` + **Frozen Contract** (`URL`, `Status`, `JSON Keys`, Enum, `DATA_SCOPES`) yalnız `keystone` içindir.
2. **Onay (`STOP`):** Kullanıcı onayı olmadan yazma uzmanı başlatılmaz (`0 diff`).
3. **Uygulama:** Ardışık `core-smith -> shell-crafter` (ayrık dosya/kontratta paralel); uzmanlar `.ai/*` tekrar okumaz, yalnız `npm run gate:fast` + ilgili tekil `node --test <dosya>` koşar (tam `gate` YASAK).
4. **Adversarial QA (`sentinel`):** Çapraz kiracı, yarış, sızan TX, `forge-qa-browser` E2E + tam `npm run gate` (`1x`, `PASS`/`FAIL`, maks 2 döngü).
5. **Mühürleme (`/forge-seal`):** Yalnız `PASS` sonrası `core-smith` `.ai/*` günceller, `context:audit --strict` doğrular ve atomik commit atar (manuel `npm run gate` koşmaz; `.githooks/pre-commit` `1x` çalıştırır).

## 3. Caveman İletişim & `📌 Durum Panosu`
- **Caveman (`core-smith`, `shell-crafter`, `radar`) / Caveman Lite (`keystone`, `sentinel`):** Ultra-kısa, sıfır dolgu, madde/tablo odaklı; kod, SQL, path, hata kodu ve gate/audit çıktısı asla kısaltılmaz.
- **Zorunlu Pano:** Her yanıt sonunda 5 uzman (`keystone`, `core-smith`, `shell-crafter`, `sentinel`, `radar`) için 5 sütunlu `📌 Durum Panosu` basılır (`| Uzman | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |`).
