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
    kullanici_id INT, -- Aracın hangi kullanıcıya ait olduğunu tutar.
    muayene_tarihi DATE, -- Muayene bitiş tarihi.
    kasko_tarihi DATE, -- Kasko bitiş tarihi.
    sigorta_tarihi DATE, -- Trafik sigortası bitiş tarihi.
    CONSTRAINT fk_araclar_kullanici -- Dış anahtar kısıtına isim verir.
    FOREIGN KEY (kullanici_id) REFERENCES users(user_id) -- kullanici_id alanını users tablosundaki user_id alanına bağlar.
    ON DELETE SET NULL -- Kullanıcı silinirse aracın sahibi NULL olur, araç ve geçmişi korunur.
    );

CREATE TABLE IF NOT EXISTS parca_takip ( -- Araca bagli parca omur takibini tutar.
                                           parca_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Otomatik artan parca kaydi kimligi.
                                           arac_id INT NOT NULL, -- Kaydin ait oldugu aracin kimligi.
                                           parca_adi VARCHAR(120) NOT NULL, -- Takip edilen parca adini tutar.
    son_degisim_km INT, -- Parcanin en son degistigi kilometre bilgisini tutar.
    degisim_araligi_km INT, -- Parcanin kac kilometrede bir degismesi gerektigini tutar.
    son_degisim_tarihi DATE, -- Parcanin son degisim tarihini tutar.
    maliyet NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Parca degisim maliyetini tutar.
    notlar TEXT, -- Ek aciklama ve notlari tutar.
    CONSTRAINT fk_parca_takip_arac -- Dis anahtar kisitina isim verir.
    FOREIGN KEY (arac_id) REFERENCES araclar(arac_id)
    ON DELETE CASCADE,
    CONSTRAINT uq_parca_takip_arac_parca UNIQUE (arac_id, parca_adi) -- Ayni arac ve parca icin tekrarli kaydi engeller.
    );

CREATE TABLE IF NOT EXISTS bakimlar ( -- Araclarin bakim gecmisini tutar.
    bakim_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Otomatik artan bakim kimligi.
    arac_id INT NOT NULL, -- Bakimin ait oldugu aracin kimligi.
    bakim_tipi VARCHAR(150) NOT NULL, -- Yapilan bakimin turunu tutar.
    tarih DATE NOT NULL, -- Bakim tarihini tutar.
    km INT NOT NULL, -- Bakim yapildigi andaki kilometreyi tutar.
    maliyet NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Bakim maliyetini tutar.
    notlar TEXT, -- Ek aciklama ve notlari tutar.
    CONSTRAINT fk_bakimlar_arac
    FOREIGN KEY (arac_id) REFERENCES araclar(arac_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS yakitlar ( -- Araclarin yakit alim gecmisini tutar.
    yakit_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Otomatik artan yakit kaydi kimligi.
    arac_id INT NOT NULL, -- Yakit aliminin ait oldugu aracin kimligi.
    yakit_tipi VARCHAR(50), -- Alinan yakitin tipini tutar.
    tarih DATE NOT NULL, -- Yakit alim tarihini tutar.
    litre NUMERIC(10, 2) NOT NULL, -- Alinan yakit miktarini (litre) tutar.
    tutar NUMERIC(12, 2) NOT NULL, -- Odenen toplam tutari tutar.
    km INT, -- Yakit alindigi andaki kilometreyi tutar.
    notlar TEXT, -- Ek aciklama ve notlari tutar.
    CONSTRAINT fk_yakitlar_arac
    FOREIGN KEY (arac_id) REFERENCES araclar(arac_id)
    ON DELETE CASCADE
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

-- FAZ 2: GELISMIS RBAC VE MULTI-TENANT MIMARISI
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type' AND typnamespace = current_schema()::regnamespace) THEN
        CREATE TYPE user_role_type AS ENUM ('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS organizations (
    org_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unvan VARCHAR(200) NOT NULL,
    vergi_no VARCHAR(20) UNIQUE,
    plan_tipi VARCHAR(30) NOT NULL DEFAULT 'ENTERPRISE',
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    olusturulma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS org_id INT REFERENCES organizations(org_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS role user_role_type NOT NULL DEFAULT 'FLEET_MANAGER';

CREATE TABLE IF NOT EXISTS arac_sofor_atamalari (
    atama_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    arac_id INT NOT NULL REFERENCES araclar(arac_id) ON DELETE CASCADE,
    sofor_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    atanma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    teslim_tarihi TIMESTAMPTZ,
    aktif BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE arac_sofor_atamalari
    DROP CONSTRAINT IF EXISTS uq_aktif_arac_sofor;

CREATE UNIQUE INDEX IF NOT EXISTS uq_arac_tek_aktif_zimmet
    ON arac_sofor_atamalari (arac_id)
    WHERE aktif = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_org_role ON users (org_id, role);
CREATE INDEX IF NOT EXISTS idx_atamalar_sofor_aktif ON arac_sofor_atamalari (sofor_user_id) WHERE aktif = TRUE;

-- FAZ 3: 4 KADEMELİ KURUMSAL ARAÇ KATALOG TABLOLARI (ref_kategoriler -> ref_markalar -> ref_modeller -> ref_arac_varyantlari)
CREATE TABLE IF NOT EXISTS ref_kategoriler (
    kategori_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ad VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    sira_no SMALLINT NOT NULL DEFAULT 1,
    aktif BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ref_markalar (
    marka_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL,
    ad VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE ref_markalar
    ADD COLUMN IF NOT EXISTS kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ref_kategori_marka (
    kategori_id INT NOT NULL REFERENCES ref_kategoriler(kategori_id) ON DELETE CASCADE,
    marka_id INT NOT NULL REFERENCES ref_markalar(marka_id) ON DELETE CASCADE,
    PRIMARY KEY (kategori_id, marka_id)
);

CREATE TABLE IF NOT EXISTS ref_modeller (
    model_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    marka_id INT NOT NULL REFERENCES ref_markalar(marka_id) ON DELETE CASCADE,
    kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL,
    ad VARCHAR(120) NOT NULL,
    arac_sinifi VARCHAR(50) DEFAULT 'Binek',
    baslangic_yili SMALLINT NOT NULL DEFAULT 1990,
    bitis_yili SMALLINT,
    CONSTRAINT uq_marka_model UNIQUE (marka_id, ad)
);

ALTER TABLE ref_modeller
    ADD COLUMN IF NOT EXISTS kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ref_arac_varyantlari (
    varyant_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_id INT NOT NULL REFERENCES ref_modeller(model_id) ON DELETE CASCADE,
    uretim_yili_baslangic SMALLINT NOT NULL DEFAULT 2015,
    uretim_yili_bitis SMALLINT,
    kasa_tipi VARCHAR(80) NOT NULL,
    motor_adi VARCHAR(120) NOT NULL,
    yakit_tipi VARCHAR(50) NOT NULL,
    sanziman_tipi VARCHAR(50) NOT NULL,
    beygir_gucu_hp SMALLINT,
    onerilen_bakim_km INT DEFAULT 15000,
    triger_degisim_km INT DEFAULT 90000,
    calisma_saati_bakim INT,
    CONSTRAINT uq_model_varyant UNIQUE (model_id, kasa_tipi, motor_adi, sanziman_tipi)
);

ALTER TABLE ref_arac_varyantlari
    ALTER COLUMN kasa_tipi TYPE VARCHAR(80),
    ALTER COLUMN motor_adi TYPE VARCHAR(120),
    ALTER COLUMN yakit_tipi TYPE VARCHAR(50),
    ALTER COLUMN sanziman_tipi TYPE VARCHAR(50),
    ADD COLUMN IF NOT EXISTS calisma_saati_bakim INT;

ALTER TABLE araclar
    ADD COLUMN IF NOT EXISTS kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS kategori VARCHAR(100) DEFAULT 'Otomobil',
    ADD COLUMN IF NOT EXISTS guncel_km INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS guncel_calisma_saati INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sayac_tipi VARCHAR(10) DEFAULT 'KM',
    ADD COLUMN IF NOT EXISTS varyant_id INT REFERENCES ref_arac_varyantlari(varyant_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS onerilen_bakim_km INT,
    ADD COLUMN IF NOT EXISTS triger_degisim_km INT,
    ADD COLUMN IF NOT EXISTS calisma_saati_bakim INT;

CREATE INDEX IF NOT EXISTS idx_ref_kategori_marka_kat ON ref_kategori_marka (kategori_id);
CREATE INDEX IF NOT EXISTS idx_ref_kategori_marka_marka ON ref_kategori_marka (marka_id);
CREATE INDEX IF NOT EXISTS idx_ref_modeller_marka ON ref_modeller (marka_id);
CREATE INDEX IF NOT EXISTS idx_ref_modeller_kategori_marka ON ref_modeller (kategori_id, marka_id);
CREATE INDEX IF NOT EXISTS idx_ref_varyantlar_model ON ref_arac_varyantlari (model_id);




-- MIGRATION: Kontrat Kilidi (MP-1R)
-- Bu blok tekrar tekrar calistirilabilir (idempotent).

-- Parca maliyet ve not kolonlarini canli tabloya ekler.
ALTER TABLE parca_takip
    ADD COLUMN IF NOT EXISTS maliyet NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Parca degisim maliyetini tutar.
    ADD COLUMN IF NOT EXISTS notlar TEXT; -- Parca ek aciklamasini tutar.

-- Kullanici yetki anahtarlari kolonunu ekler.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS yetkiler JSONB NOT NULL DEFAULT '{}'::jsonb; -- Yetki toggle'larini JSON olarak tutar.

-- Gecersiz veya bos sayac tiplerini KM'ye cevirir.
UPDATE araclar SET sayac_tipi = 'KM'
WHERE sayac_tipi IS NULL OR sayac_tipi NOT IN ('KM', 'SMH');

-- Sayac tipi CHECK kisitini yoksa ekler.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_araclar_sayac_tipi') THEN -- Kisit var mi bakar.
        ALTER TABLE araclar ADD CONSTRAINT chk_araclar_sayac_tipi CHECK (sayac_tipi IN ('KM', 'SMH')); -- Sadece KM/SMH'ye izin verir.
    END IF;
END$$;

-- Parca maliyeti CHECK kisitini yoksa ekler.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_parca_maliyet_pozitif') THEN -- Kisit var mi bakar.
        ALTER TABLE parca_takip ADD CONSTRAINT chk_parca_maliyet_pozitif CHECK (maliyet >= 0); -- Negatif maliyeti engeller.
    END IF;
END$$;

-- MIGRATION: FIX-1 (fk_araclar_kullanici ON DELETE SET NULL)
ALTER TABLE araclar ALTER COLUMN kullanici_id DROP NOT NULL;
ALTER TABLE araclar DROP CONSTRAINT IF EXISTS fk_araclar_kullanici;
ALTER TABLE araclar ADD CONSTRAINT fk_araclar_kullanici FOREIGN KEY (kullanici_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- MIGRATION: V2.2-DBPERF (Kiraci Semasi, Kompozit Indeksler & Fatura/Olusturan Normalizasyonu)
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS aylik_yakit_butcesi NUMERIC(12, 2) NOT NULL DEFAULT 50000,
    ADD COLUMN IF NOT EXISTS aylik_bakim_butcesi NUMERIC(12, 2) NOT NULL DEFAULT 25000;

ALTER TABLE araclar
    ADD COLUMN IF NOT EXISTS son_enlem NUMERIC(9, 6),
    ADD COLUMN IF NOT EXISTS son_boylam NUMERIC(9, 6),
    ADD COLUMN IF NOT EXISTS son_konum_adi VARCHAR(160),
    ADD COLUMN IF NOT EXISTS son_konum_zamani TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(org_id) ON DELETE SET NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bildirim_tercihleri JSONB NOT NULL DEFAULT '{"belge_vadesi":{"email":true,"sms":true},"periyodik_bakim":{"email":true,"sms":true},"parca_omru":{"email":true,"sms":false},"maliyet_ozeti":{"email":true,"sms":false}}'::jsonb;

UPDATE araclar a
SET org_id = u.org_id
FROM users u
WHERE a.kullanici_id = u.user_id
  AND a.org_id IS NULL
  AND u.org_id IS NOT NULL;

ALTER TABLE yakitlar
    ADD COLUMN IF NOT EXISTS fatura_no VARCHAR(80),
    ADD COLUMN IF NOT EXISTS belge_url TEXT,
    ADD COLUMN IF NOT EXISTS olusturan_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE bakimlar
    ADD COLUMN IF NOT EXISTS fatura_no VARCHAR(80),
    ADD COLUMN IF NOT EXISTS belge_url TEXT,
    ADD COLUMN IF NOT EXISTS olusturan_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

UPDATE yakitlar
SET fatura_no = LEFT(BTRIM((regexp_match(notlar, '\[Fatura:\s*([^\]]+)\]', 'i'))[1]), 80)
WHERE fatura_no IS NULL
  AND notlar ~* '\[Fatura:\s*[^\]]+\]';

UPDATE bakimlar
SET fatura_no = LEFT(BTRIM((regexp_match(notlar, '\[Fatura:\s*([^\]]+)\]', 'i'))[1]), 80)
WHERE fatura_no IS NULL
  AND notlar ~* '\[Fatura:\s*[^\]]+\]';

CREATE INDEX IF NOT EXISTS idx_araclar_org_id ON araclar (org_id);
CREATE INDEX IF NOT EXISTS idx_yakitlar_arac_tarih_km ON yakitlar (arac_id, tarih DESC, km DESC);
CREATE INDEX IF NOT EXISTS idx_bakimlar_arac_tarih_km ON bakimlar (arac_id, tarih DESC, km DESC);
CREATE INDEX IF NOT EXISTS idx_parca_takip_arac_id ON parca_takip (arac_id);
CREATE INDEX IF NOT EXISTS idx_atamalar_aktif_arac ON arac_sofor_atamalari (arac_id) WHERE aktif = TRUE;

-- MIGRATION: V2.2-NOTIFY (Bildirim & Uyari Motoru, Dedup & Aksiyon Merkezi)
CREATE TABLE IF NOT EXISTS bildirim_olaylari (
    bildirim_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_id INT REFERENCES organizations(org_id) ON DELETE SET NULL,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    arac_id INT REFERENCES araclar(arac_id) ON DELETE CASCADE,
    kategori VARCHAR(30) NOT NULL CHECK (kategori IN ('belge', 'bakim', 'parca', 'maliyet_ozeti', 'sistem')),
    seviye VARCHAR(20) NOT NULL CHECK (seviye IN ('kritik', 'uyari', 'bilgi')),
    referans_anahtar VARCHAR(120) NOT NULL,
    baslik VARCHAR(200) NOT NULL,
    mesaj TEXT NOT NULL,
    link_url VARCHAR(255),
    meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    okundu_mu BOOLEAN NOT NULL DEFAULT FALSE,
    eposta_gonderildi BOOLEAN NOT NULL DEFAULT FALSE,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    okunma_tarihi TIMESTAMPTZ,
    CONSTRAINT uq_bildirim_user_kat_ref UNIQUE (user_id, kategori, referans_anahtar)
);

CREATE INDEX IF NOT EXISTS idx_bildirim_user_okundu
    ON bildirim_olaylari (user_id, okundu_mu, olusturma_tarihi DESC);

-- MIGRATION: V2.2-ANOMALY (Yakit Suistimal & Tuketim Anomali Motoru)
ALTER TABLE araclar
    ADD COLUMN IF NOT EXISTS depo_kapasitesi_l NUMERIC(6,1),
    ADD COLUMN IF NOT EXISTS hedef_tuketim NUMERIC(6,2);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_araclar_depo_kapasitesi_pozitif') THEN
        ALTER TABLE araclar ADD CONSTRAINT chk_araclar_depo_kapasitesi_pozitif CHECK (depo_kapasitesi_l IS NULL OR depo_kapasitesi_l > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_araclar_hedef_tuketim_pozitif') THEN
        ALTER TABLE araclar ADD CONSTRAINT chk_araclar_hedef_tuketim_pozitif CHECK (hedef_tuketim IS NULL OR hedef_tuketim > 0);
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS yakit_anomalileri (
    anomali_id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(org_id) ON DELETE CASCADE,
    arac_id INTEGER NOT NULL REFERENCES araclar(arac_id) ON DELETE CASCADE,
    yakit_id INTEGER NOT NULL REFERENCES yakitlar(yakit_id) ON DELETE CASCADE,
    tip VARCHAR(40) NOT NULL CHECK (tip IN ('depo_asimi','ardisik_dolum','birim_fiyat_sapma','yuksek_tuketim')),
    seviye VARCHAR(20) NOT NULL CHECK (seviye IN ('kritik','uyari')),
    olculen_deger NUMERIC(12,2),
    beklenen_esik NUMERIC(12,2),
    aciklama TEXT NOT NULL,
    durum VARCHAR(20) NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik','incelendi','yoksayildi')),
    inceleyen_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    inceleme_notu VARCHAR(500),
    olusturma_tarihi TIMESTAMPTZ DEFAULT NOW(),
    inceleme_tarihi TIMESTAMPTZ,
    CONSTRAINT uq_yakit_anomali_kayit_tip UNIQUE (yakit_id, tip)
);

CREATE INDEX IF NOT EXISTS idx_yakit_anomalileri_org_durum
    ON yakit_anomalileri (org_id, durum, olusturma_tarihi DESC);

CREATE INDEX IF NOT EXISTS idx_yakit_anomalileri_arac
    ON yakit_anomalileri (arac_id);

-- MIGRATION: V2.2-AUDIT
ALTER TABLE araclar
    ADD COLUMN IF NOT EXISTS arsivlendi_mi BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS arsiv_tarihi TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS arsiv_nedeni VARCHAR(240);

CREATE INDEX IF NOT EXISTS idx_araclar_org_aktif
    ON araclar (org_id, arsivlendi_mi);

CREATE TABLE IF NOT EXISTS denetim_kayitlari (
    denetim_id BIGSERIAL PRIMARY KEY,
    org_id INTEGER,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    kullanici_eposta VARCHAR(160),
    kullanici_rol VARCHAR(40),
    eylem VARCHAR(60) NOT NULL,
    varlik_tipi VARCHAR(40) NOT NULL,
    varlik_id INTEGER,
    ozet TEXT NOT NULL,
    detay_json JSONB,
    ip_adresi VARCHAR(64),
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_denetim_kayitlari_org FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_denetim_org_tarih
    ON denetim_kayitlari (org_id, olusturma_tarihi DESC);

CREATE INDEX IF NOT EXISTS idx_denetim_varlik
    ON denetim_kayitlari (varlik_tipi, varlik_id);

-- MIGRATION: FORGE-M1
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(80) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum VARCHAR(64) NOT NULL
);

-- MIGRATION: V2.2-WORK-ORDERS
CREATE TABLE IF NOT EXISTS is_emirleri (
    is_emri_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    arac_id INTEGER NOT NULL REFERENCES araclar(arac_id) ON DELETE CASCADE,
    acan_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    onaylayan_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    olusulan_bakim_id INTEGER REFERENCES bakimlar(bakim_id) ON DELETE SET NULL,
    baslik VARCHAR(160) NOT NULL,
    aciklama TEXT,
    kategori VARCHAR(40) NOT NULL DEFAULT 'ariza' CHECK (kategori IN ('ariza', 'periyodik_bakim', 'lastik', 'hasar', 'diger')),
    oncelik VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (oncelik IN ('dusuk', 'normal', 'yuksek', 'kritik')),
    durum VARCHAR(20) NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik', 'serviste', 'tamamlandi', 'iptal')),
    bildirilen_sayac NUMERIC(12, 1) CHECK (bildirilen_sayac IS NULL OR bildirilen_sayac >= 0),
    servis_adi VARCHAR(120),
    tahmini_maliyet NUMERIC(12, 2) CHECK (tahmini_maliyet IS NULL OR (tahmini_maliyet >= 0 AND tahmini_maliyet <= 999999999.99)),
    gerceklesen_maliyet NUMERIC(12, 2) CHECK (gerceklesen_maliyet IS NULL OR (gerceklesen_maliyet >= 0 AND gerceklesen_maliyet <= 999999999.99)),
    planlanan_tarih DATE,
    red_iptal_nedeni VARCHAR(240),
    kapanis_tarihi TIMESTAMPTZ,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_is_emirleri_org_durum
    ON is_emirleri (org_id, durum, olusturma_tarihi DESC);

CREATE INDEX IF NOT EXISTS idx_is_emirleri_arac_durum
    ON is_emirleri (arac_id, durum);

CREATE UNIQUE INDEX IF NOT EXISTS uq_is_emirleri_bakim
    ON is_emirleri (olusulan_bakim_id)
    WHERE olusulan_bakim_id IS NOT NULL;

-- MIGRATION: V2.3-DOC-VAULT
CREATE TABLE IF NOT EXISTS belge_kasasi (
    belge_id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES organizations(org_id) ON DELETE RESTRICT,
    arac_id INT NOT NULL REFERENCES araclar(arac_id) ON DELETE CASCADE,
    varlik_tipi VARCHAR(24) NOT NULL CHECK (varlik_tipi IN ('yakit', 'bakim', 'is_emri')),
    varlik_id INT NULL,
    nesne_anahtari VARCHAR(255) NOT NULL UNIQUE,
    orijinal_ad VARCHAR(180) NOT NULL,
    mime_tipi VARCHAR(64) NOT NULL CHECK (mime_tipi IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
    boyut_bayt INT NOT NULL CHECK (boyut_bayt >= 1 AND boyut_bayt <= 10485760),
    durum VARCHAR(16) NOT NULL DEFAULT 'yukleniyor' CHECK (durum IN ('yukleniyor', 'aktif', 'silindi')),
    yukleyen_user_id INT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_belge_kasasi_org_durum ON belge_kasasi (org_id, durum);
CREATE INDEX IF NOT EXISTS idx_belge_kasasi_varlik ON belge_kasasi (varlik_tipi, varlik_id) WHERE durum = 'aktif';
CREATE INDEX IF NOT EXISTS idx_belge_kasasi_arac ON belge_kasasi (arac_id) WHERE durum = 'aktif';

-- MIGRATION: V2.3-HANDOVER-INSPECTION
ALTER TABLE arac_sofor_atamalari
    DROP CONSTRAINT IF EXISTS uq_aktif_arac_sofor,
    DROP CONSTRAINT IF EXISTS arac_sofor_atamalari_arac_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_arac_tek_aktif_zimmet
    ON arac_sofor_atamalari (arac_id)
    WHERE aktif = TRUE;

DO $$
DECLARE
    r RECORD;
    v_exists BOOLEAN := FALSE;
BEGIN
    FOR r IN
        SELECT c.conname, pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'belge_kasasi'::regclass
          AND c.contype = 'c'
          AND a.attname = 'varlik_tipi'
          AND array_length(c.conkey, 1) = 1
    LOOP
        IF r.conname = 'chk_belge_kasasi_varlik_tipi' AND r.def LIKE '%zimmet%' THEN
            v_exists := TRUE;
        ELSE
            EXECUTE format('ALTER TABLE belge_kasasi DROP CONSTRAINT IF EXISTS %I', r.conname);
        END IF;
    END LOOP;
    IF NOT v_exists THEN
        ALTER TABLE belge_kasasi
            ADD CONSTRAINT chk_belge_kasasi_varlik_tipi
            CHECK (varlik_tipi IN ('yakit', 'bakim', 'is_emri', 'zimmet'));
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS zimmet_muayeneleri (
    muayene_id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES organizations(org_id) ON DELETE RESTRICT,
    atama_id INT NOT NULL REFERENCES arac_sofor_atamalari(atama_id) ON DELETE CASCADE,
    arac_id INT NOT NULL REFERENCES araclar(arac_id) ON DELETE CASCADE,
    sofor_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    yapan_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    muayene_tipi VARCHAR(20) NOT NULL CHECK (muayene_tipi IN ('TESLIM_ALMA', 'TESLIM_ETME')),
    muayene_tarihi DATE NOT NULL,
    sayac_degeri NUMERIC(12, 1) NOT NULL CHECK (sayac_degeri >= 0),
    genel_sonuc VARCHAR(20) NOT NULL CHECK (genel_sonuc IN ('TEMIZ', 'KUSURLU', 'KRITIK')),
    lastik_durumu VARCHAR(16) NOT NULL DEFAULT 'OK' CHECK (lastik_durumu IN ('OK', 'KUSURLU', 'KRITIK')),
    fren_durumu VARCHAR(16) NOT NULL DEFAULT 'OK' CHECK (fren_durumu IN ('OK', 'KUSURLU', 'KRITIK')),
    aydinlatma_durumu VARCHAR(16) NOT NULL DEFAULT 'OK' CHECK (aydinlatma_durumu IN ('OK', 'KUSURLU', 'KRITIK')),
    sivi_sizinti_durumu VARCHAR(16) NOT NULL DEFAULT 'OK' CHECK (sivi_sizinti_durumu IN ('OK', 'KUSURLU', 'KRITIK')),
    kaporta_cam_durumu VARCHAR(16) NOT NULL DEFAULT 'OK' CHECK (kaporta_cam_durumu IN ('OK', 'KUSURLU', 'KRITIK')),
    guvenlik_ekipman_durumu VARCHAR(16) NOT NULL DEFAULT 'OK' CHECK (guvenlik_ekipman_durumu IN ('OK', 'KUSURLU', 'KRITIK')),
    evrak_ruhsat_durumu VARCHAR(16) NOT NULL DEFAULT 'OK' CHECK (evrak_ruhsat_durumu IN ('OK', 'KUSURLU', 'KRITIK')),
    kabin_temizlik_durumu VARCHAR(16) NOT NULL DEFAULT 'OK' CHECK (kabin_temizlik_durumu IN ('OK', 'KUSURLU', 'KRITIK')),
    notlar TEXT,
    olusmus_is_emri_id INT REFERENCES is_emirleri(is_emri_id) ON DELETE SET NULL,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_zimmet_muayene_atama_tip UNIQUE (atama_id, muayene_tipi)
);

CREATE INDEX IF NOT EXISTS idx_zimmet_muayeneleri_org_tarih ON zimmet_muayeneleri (org_id, muayene_tarihi DESC);
CREATE INDEX IF NOT EXISTS idx_zimmet_muayeneleri_arac ON zimmet_muayeneleri (arac_id);
CREATE INDEX IF NOT EXISTS idx_zimmet_muayeneleri_sofor ON zimmet_muayeneleri (sofor_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_zimmet_muayeneleri_is_emri
    ON zimmet_muayeneleri (olusmus_is_emri_id) WHERE olusmus_is_emri_id IS NOT NULL;

-- MIGRATION: V2.5-SUPPORT-AND-ACCOUNT-FORTRESS
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS aktif_mi BOOLEAN NOT NULL DEFAULT TRUE;

WITH sirali AS (
    SELECT atama_id,
           ROW_NUMBER() OVER (
               PARTITION BY sofor_user_id
               ORDER BY atanma_tarihi DESC, atama_id DESC
           ) AS rn
    FROM arac_sofor_atamalari
    WHERE aktif = TRUE
)
UPDATE arac_sofor_atamalari a
SET aktif = FALSE,
    teslim_tarihi = COALESCE(a.teslim_tarihi, NOW())
FROM sirali s
WHERE a.atama_id = s.atama_id
  AND s.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sofor_tek_aktif_zimmet
    ON arac_sofor_atamalari (sofor_user_id)
    WHERE aktif = TRUE;

CREATE TABLE IF NOT EXISTS geri_bildirimler (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_id INT REFERENCES organizations(org_id) ON DELETE SET NULL,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    rol VARCHAR(32) NOT NULL,
    kategori VARCHAR(24) NOT NULL CHECK (kategori IN ('HATA', 'ONERI', 'DESTEK')),
    baslik VARCHAR(140) NOT NULL,
    mesaj TEXT NOT NULL CHECK (char_length(mesaj) BETWEEN 10 AND 2000),
    sayfa_yolu VARCHAR(160),
    son_istek_id VARCHAR(64),
    durum VARCHAR(24) NOT NULL DEFAULT 'ACIK' CHECK (durum IN ('ACIK', 'INCELENIYOR', 'COZULDU')),
    yonetici_notu VARCHAR(500),
    olusturulma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guncellenme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geri_bildirimler_org_tarih
    ON geri_bildirimler (org_id, olusturulma_tarihi DESC);

CREATE INDEX IF NOT EXISTS idx_geri_bildirimler_durum_tarih
    ON geri_bildirimler (durum, olusturulma_tarihi DESC);


