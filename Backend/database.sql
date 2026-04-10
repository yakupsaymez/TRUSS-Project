CREATE TABLE IF NOT EXISTS users ( -- Kullanıcı bilgilerini tutacak tabloyu oluşturur.
                                     user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Otomatik artan benzersiz kullanıcı kimliği.
                                     ad_soyad VARCHAR(150) NOT NULL, -- Kullanıcının ad ve soyad bilgisini tutar.
    email VARCHAR(255) NOT NULL UNIQUE, -- Kullanıcının e-posta adresini tutar ve tekrar etmesini engeller.
    sifre VARCHAR(255) NOT NULL, -- Kullanıcının şifre bilgisini tutar.
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP -- Kaydın oluşturulma tarih ve saatini tutar.
    );

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
