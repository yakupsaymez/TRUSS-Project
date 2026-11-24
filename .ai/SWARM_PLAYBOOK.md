# TRUSS — 5 Ajanlı Swarm İşletim Kılavuzu (`SWARM_PLAYBOOK.md`)

## 1. Rol Matrisi, Yasak Bölgeler ve Güç Profilleri
| Ajan | Rol & Sorumluluk | Kesin Yasak Bölge (`0 diff`) | Çıktı Becerisi | Varsayılan Güç & Üst Vites (Claude Karşılığı) |
| :--- | :--- | :--- | :--- | :--- |
| **S5** | **Baş Mimar** (Orkestrasyon, ADR, mikro-paket tasarımı) | **TÜM REPO (READ-ONLY)** — Hiçbir dosyayı düzenleyemez | `caveman lite` | `Neon High` (`Neon X-High`: karmaşık mimari / derin denetim; Claude: **Opus**) |
| **S1** | **Frontend Developer** (`Frontend/src/*`, `radix-luma` UI/UX) | `Backend/*`, onaysız `package.json` / `package-lock.json` | `caveman` | `Neon` Normal (`Neon High`: ağır dashboard / tema / refactor; Claude: **Sonnet / Opus**) |
| **S2** | **Backend / Ops** (`Backend/*`, `scripts/*`, `.ai/*`) | `Frontend/*` | `caveman` | `Argon` / `Neon` Normal (`Neon High`: TX / lock / çoklu tablo; Claude: **Sonnet / Opus**) |
| **S3** | **QA / Baş Denetçi** (Build, lint, tema, RBAC, regresyon) | **TÜM REPO (READ-ONLY)** — Kod değiştiremez | `caveman lite` | `Hidrojen` / `Argon` (`Neon High`: tam proje tema / görsel tarama; Claude: **Sonnet / Opus**) |
| **S4** | **Bug Hunter** (Cerrahi P0/P1/P2 hata avı ve kök neden yaması) | Kapsam dışı tüm modüller | `caveman` | `2.8 Flash` / `Hidrojen` (`Neon High`: derin çok-dosyalı mantık denetimi; Claude: **Haiku / Sonnet**) |

## 2. Standart Swarm İş Akışı (Mikro-Paket Döngüsü)
1. **Tasarım (S5):** Görevi maksimum 1–3 dosyalık cerrahi mikro-pakete böler; izinli ve yasak dosyaları açıkça yazar.
2. **Uygulama (S1 / S2 / S4):** Yalnızca izinli dosyalarda `surgical-patch` uygular; kendi doğrulama komutunu (`node --check`, `npm run build`, vb.) çalıştırır.
3. **Bağımsız Denetim (S3):** READ-ONLY modda `git diff`, build, RBAC ve `ENGINEERING_GUARDRAILS.md` uyumluluğunu denetler (`PASS` / `FAIL`).
4. **Mühürleme & Hafıza Güncellemesi:**
   - `PASS` sonrası atomik commit atılır.
   - `.ai/PROGRESS.md` dosyasına tek satırlık delta işlenir.
   - Her P0/P1 hata çözümünden sonra `.ai/DECISIONS.md` dosyasına **3 satırlık `P0-to-Rule`** (`Tarih · Kök Neden · Kalıcı Kural`) eklenir.

## 3. Zorunlu Yanıt Sonu Protokolü (`📌 Durum Panosu`)
Her ajan (S1..S5), her yanıtının en sonunda **5 ajanın tamamını** şu 5 sütun standardıyla içeren `📌 Durum Panosu` tablosunu basmak zorundadır:
`| Ajan | Model / Güç | Şu An Ne Yapıyor | Hemen Şimdi Ne Yapmalı | İleride Ne Yapacak |`
- Her satırda ilgili ajanın anlık durumu, hemen şimdi yapması gereken eylem ve sıradaki faz görevi net olarak yazılır.
- Tablonun altına kullanıcıya bir sonraki adımda hangi ajana hangi komutu vereceğini gösteren tek satırlık yönlendirme eklenir.

## 4. Çakışma Önleme Kuralları
- Aynı anda iki ajan aynı dosyaya dokunamaz.
- `package.json` veya `database.sql` değişiklikleri yalnızca S5'in açık onayıyla tek bir ajana (S1 veya S2) atanır.
- Kapsam dışı bir hata fark eden ajan dosyaya dokunmaz; bulguyu S5'e raporlar.
