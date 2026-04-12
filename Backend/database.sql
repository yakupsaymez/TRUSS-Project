CREATE TABLE IF NOT EXISTS users ( -- Kullanıcı bilgilerini tutacak tabloyu oluşturur.
                                     user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Otomatik artan benzersiz kullanıcı kimliği.
                                     ad_soyad VARCHAR(150) NOT NULL, -- Kullanıcının ad ve soyad bilgisini tutar.
    email VARCHAR(255) NOT NULL UNIQUE, -- Kullanıcının e-posta adresini tutar ve tekrar etmesini engeller.
    sifre VARCHAR(255) NOT NULL, -- Kullanıcının şifre bilgisini tutar.
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP -- Kaydın oluşturulma tarih ve saatini tutar.
    );

ALTER TABLE users -- Kullaniciya bildirim gonderebilmek icin telefon kolonunu ekler.
    ADD COLUMN IF NOT EXISTS telefon VARCHAR(20);

ALTER TABLE users -- Kullanici e-posta bildirim tercihinin saklanmasi icin alan ekler.
    ADD COLUMN IF NOT EXISTS email_bildirim_aktif BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users -- Kullanici SMS bildirim tercihinin saklanmasi icin alan ekler.
    ADD COLUMN IF NOT EXISTS sms_bildirim_aktif BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users -- Kullanici arayuz dili tercihini saklar.
    ADD COLUMN IF NOT EXISTS dil VARCHAR(10) NOT NULL DEFAULT 'TR';

ALTER TABLE users -- Kullanici para birimi tercihini saklar.
    ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) NOT NULL DEFAULT 'TRY';

ALTER TABLE users -- Kullanici olcu birimi tercihini saklar.
    ADD COLUMN IF NOT EXISTS olcu_birimi VARCHAR(10) NOT NULL DEFAULT 'KM';

CREATE TABLE IF NOT EXISTS araclar ( -- Araç bilgilerini tutacak tabloyu oluşturur.
                                       arac_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Otomatik artan benzersiz araç kimliği.
                                       plaka VARCHAR(20) NOT NULL UNIQUE, -- Araç plakasını tutar ve tekrar etmesini engeller.
    marka VARCHAR(100) NOT NULL, -- Aracın marka bilgisini tutar.
    model VARCHAR(100) NOT NULL, -- Aracın model bilgisini tutar.
    yil INT NOT NULL, -- Aracın model yılını tutar.
    kullanici_id INT NOT NULL, -- Aracın hangi kullanıcıya ait olduğunu tutar.
    CONSTRAINT fk_araclar_kullanici -- Dış anahtar kısıtına isim verir.
    FOREIGN KEY (kullanici_id) REFERENCES users(user_id) -- kullanici_id alanını users tablosundaki user_id alanına bağlar.
    ON DELETE CASCADE -- Kullanıcı silinirse ona bağlı araç kayıtlarını da siler.
    );

CREATE TABLE IF NOT EXISTS parca_takip ( -- Araca bagli parca omur takibini tutar.
                                           parca_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Otomatik artan parca kaydi kimligi.
                                           arac_id INT NOT NULL, -- Kaydin ait oldugu aracin kimligi.
                                           parca_adi VARCHAR(120) NOT NULL, -- Takip edilen parca adini tutar.
    son_degisim_km INT, -- Parcanin en son degistigi kilometre bilgisini tutar.
    degisim_araligi_km INT, -- Parcanin kac kilometrede bir degismesi gerektigini tutar.
    son_degisim_tarihi DATE, -- Parcanin son degisim tarihini tutar.
    CONSTRAINT fk_parca_takip_arac -- Dis anahtar kisitina isim verir.
    FOREIGN KEY (arac_id) REFERENCES araclar(arac_id)
    ON DELETE CASCADE,
    CONSTRAINT uq_parca_takip_arac_parca UNIQUE (arac_id, parca_adi) -- Ayni arac ve parca icin tekrarli kaydi engeller.
    );

INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, degisim_araligi_km, son_degisim_tarihi) -- Tum araclara varsayilan parca kutuphanesini ekler.
SELECT a.arac_id, p.parca_adi, 0, p.degisim_araligi_km, CURRENT_DATE
FROM araclar a
         CROSS JOIN (
    VALUES
        ('Motor Yağı', 10000),
        ('Yağ Filtresi', 10000),
        ('Hava Filtresi', 10000),
        ('Polen Filtresi', 10000),
        ('Fren Balataları', 30000),
        ('Triger Kayışı', 80000),
        ('Akü', NULL),
        ('Lastikler', NULL)
    ) AS p(parca_adi, degisim_araligi_km)
ON CONFLICT (arac_id, parca_adi) DO NOTHING;

