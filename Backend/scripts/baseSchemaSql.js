const BASE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ad_soyad VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  sifre VARCHAR(255) NOT NULL,
  kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telefon VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email_bildirim_aktif BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sms_bildirim_aktif BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS dil VARCHAR(10) NOT NULL DEFAULT 'TR',
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS olcu_birimi VARCHAR(10) NOT NULL DEFAULT 'KM';

CREATE TABLE IF NOT EXISTS araclar (
  arac_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plaka VARCHAR(20) NOT NULL UNIQUE,
  marka VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  yil INT NOT NULL,
  kullanici_id INT,
  muayene_tarihi DATE,
  kasko_tarihi DATE,
  sigorta_tarihi DATE,
  CONSTRAINT fk_araclar_kullanici FOREIGN KEY (kullanici_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS parca_takip (
  parca_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  arac_id INT NOT NULL REFERENCES araclar(arac_id) ON DELETE CASCADE,
  parca_adi VARCHAR(120) NOT NULL,
  son_degisim_km INT,
  degisim_araligi_km INT,
  son_degisim_tarihi DATE,
  maliyet NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notlar TEXT,
  CONSTRAINT uq_parca_takip_arac_parca UNIQUE (arac_id, parca_adi)
);

CREATE TABLE IF NOT EXISTS bakimlar (
  bakim_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  arac_id INT NOT NULL REFERENCES araclar(arac_id) ON DELETE CASCADE,
  bakim_tipi VARCHAR(150) NOT NULL,
  tarih DATE NOT NULL,
  km INT NOT NULL,
  maliyet NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notlar TEXT
);

CREATE TABLE IF NOT EXISTS yakitlar (
  yakit_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  arac_id INT NOT NULL REFERENCES araclar(arac_id) ON DELETE CASCADE,
  yakit_tipi VARCHAR(50),
  tarih DATE NOT NULL,
  litre NUMERIC(10, 2) NOT NULL,
  tutar NUMERIC(12, 2) NOT NULL,
  km INT,
  notlar TEXT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role_type' AND typnamespace = current_schema()::regnamespace
  ) THEN
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
CREATE UNIQUE INDEX IF NOT EXISTS uq_arac_tek_aktif_zimmet ON arac_sofor_atamalari (arac_id) WHERE aktif = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users (org_id, role);
CREATE INDEX IF NOT EXISTS idx_atamalar_sofor_aktif ON arac_sofor_atamalari (sofor_user_id) WHERE aktif = TRUE;

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
ALTER TABLE ref_markalar ADD COLUMN IF NOT EXISTS kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL;

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
ALTER TABLE ref_modeller ADD COLUMN IF NOT EXISTS kategori_id INT REFERENCES ref_kategoriler(kategori_id) ON DELETE SET NULL;

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
CREATE INDEX IF NOT EXISTS idx_ref_varyantlar_model ON ref_arac_varyantlari (model_id);`;
module.exports = { BASE_SCHEMA_SQL };
