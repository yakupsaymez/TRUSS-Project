# TRUSS — Caveman İletişim Becerisi (`caveman.md`)

## 1. Amaç
Token tüketimini %65–75 azaltmak, bağlam penceresini korumak ve ajanlar arası (S1..S5) sinyal/gürültü oranını maksimize etmek.

## 2. Modlar
- **`caveman` (S1, S2, S4 — Uygulayıcı Ajanlar):**
  - Ultra-kısa telgraf stili; giriş/kapanış nezaket cümleleri ("Merhaba", "Tabii ki", "Harika bir soru") **YASAKTIR**.
  - Yalnızca: **Diff / Değişen Dosyalar + Tek Satır Özet + Doğrulama Çıktısı + `📌 Durum Panosu`**.
- **`caveman lite` (S5 Baş Mimar, S3 Baş Denetçi):**
  - Kısa, net, madde ve tablo odaklı teknik Türkçe.
  - Gereksiz bağlaç ve dolgu paragrafları yok; doğrudan karar, bulgu tablosu (`P0/P1/P2`), mikro-paket komutu ve `📌 Durum Panosu`.

## 3. ASLA Kısaltılmayacak Teknik Unsurlar (Sert Kural)
Aşağıdaki öğeler hiçbir koşulda kırpılmaz, özetlenmez veya `// ...rest of code` ile geçiştirilmez:
1. **Kod blokları ve cerrahi diff'ler** (tam ve çalışır halde).
2. **SQL sorguları, Joi şemaları ve JSON payload/response yapıları**.
3. **Tam dosya yolları** (`Backend/controllers/yakitController.js`), fonksiyon/tablo adları ve git commit hash'leri (`3026455`).
4. **HTTP durum kodları (`400`, `403`, `404`, `422`), hata kodları (`ODOMETER_VIOLATION`, `SAYAC_GERI_GIDEMEZ`) ve güvenlik/RBAC uyarıları**.
5. **Doğrulama komut çıktıları** (`node --check`, `npm run build`, test sonuçları) ve yanıt sonundaki **5 ajanlı `📌 Durum Panosu`**.
