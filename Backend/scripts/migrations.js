const MIGRATIONS = [
  {
    version: '001_v21_mp1r_contract',
    sql: `
      ALTER TABLE parca_takip
        ADD COLUMN IF NOT EXISTS maliyet NUMERIC(12, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS notlar TEXT;
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS yetkiler JSONB NOT NULL DEFAULT '{}'::jsonb;
      UPDATE araclar SET sayac_tipi = 'KM'
      WHERE sayac_tipi IS NULL OR sayac_tipi NOT IN ('KM', 'SMH');
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_araclar_sayac_tipi') THEN
          ALTER TABLE araclar ADD CONSTRAINT chk_araclar_sayac_tipi CHECK (sayac_tipi IN ('KM', 'SMH'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_parca_maliyet_pozitif') THEN
          ALTER TABLE parca_takip ADD CONSTRAINT chk_parca_maliyet_pozitif CHECK (maliyet >= 0);
        END IF;
      END$$;
    `,
  },
  {
    version: '002_v21_fix1_araclar_fk',
    sql: `
      ALTER TABLE araclar ALTER COLUMN kullanici_id DROP NOT NULL;
      ALTER TABLE araclar DROP CONSTRAINT IF EXISTS fk_araclar_kullanici;
      ALTER TABLE araclar ADD CONSTRAINT fk_araclar_kullanici
        FOREIGN KEY (kullanici_id) REFERENCES users(user_id) ON DELETE SET NULL;
    `,
  },
  {
    version: '003_v22_dbperf_schema',
    sql: `
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
      WHERE a.kullanici_id = u.user_id AND a.org_id IS NULL AND u.org_id IS NOT NULL;
      ALTER TABLE yakitlar
        ADD COLUMN IF NOT EXISTS fatura_no VARCHAR(80),
        ADD COLUMN IF NOT EXISTS belge_url TEXT,
        ADD COLUMN IF NOT EXISTS olusturan_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
      ALTER TABLE bakimlar
        ADD COLUMN IF NOT EXISTS fatura_no VARCHAR(80),
        ADD COLUMN IF NOT EXISTS belge_url TEXT,
        ADD COLUMN IF NOT EXISTS olusturan_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
      UPDATE yakitlar
      SET fatura_no = LEFT(BTRIM((regexp_match(notlar, '\\[Fatura:\\s*([^\\]]+)\\]', 'i'))[1]), 80)
      WHERE fatura_no IS NULL AND notlar ~* '\\[Fatura:\\s*[^\\]]+\\]';
      UPDATE bakimlar
      SET fatura_no = LEFT(BTRIM((regexp_match(notlar, '\\[Fatura:\\s*([^\\]]+)\\]', 'i'))[1]), 80)
      WHERE fatura_no IS NULL AND notlar ~* '\\[Fatura:\\s*[^\\]]+\\]';
      CREATE INDEX IF NOT EXISTS idx_araclar_org_id ON araclar (org_id);
      CREATE INDEX IF NOT EXISTS idx_yakitlar_arac_tarih_km ON yakitlar (arac_id, tarih DESC, km DESC);
      CREATE INDEX IF NOT EXISTS idx_bakimlar_arac_tarih_km ON bakimlar (arac_id, tarih DESC, km DESC);
      CREATE INDEX IF NOT EXISTS idx_parca_takip_arac_id ON parca_takip (arac_id);
      CREATE INDEX IF NOT EXISTS idx_atamalar_aktif_arac ON arac_sofor_atamalari (arac_id) WHERE aktif = TRUE;
    `,
  },
  {
    version: '004_v22_notify_table',
    sql: `
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
    `,
  },
  {
    version: '005_v22_anomaly_table',
    sql: `
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
    `,
  },
  {
    version: '006_v22_audit_archive',
    sql: `
      ALTER TABLE araclar
        ADD COLUMN IF NOT EXISTS arsivlendi_mi BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS arsiv_tarihi TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS arsiv_nedeni VARCHAR(240);
      CREATE INDEX IF NOT EXISTS idx_araclar_org_aktif ON araclar (org_id, arsivlendi_mi);
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
      CREATE INDEX IF NOT EXISTS idx_denetim_org_tarih ON denetim_kayitlari (org_id, olusturma_tarihi DESC);
      CREATE INDEX IF NOT EXISTS idx_denetim_varlik ON denetim_kayitlari (varlik_tipi, varlik_id);
    `,
  },
  {
    version: '007_forge_m1_integrity',
    sql: `
      DO $$
      DECLARE
        r RECORD;
        v_exists BOOLEAN := FALSE;
      BEGIN
        FOR r IN
          SELECT c.conname, c.confdeltype
          FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          WHERE c.conrelid = 'denetim_kayitlari'::regclass
            AND c.contype = 'f'
            AND a.attname = 'org_id'
            AND array_length(c.conkey, 1) = 1
        LOOP
          IF r.conname = 'fk_denetim_kayitlari_org' AND r.confdeltype = 'n' THEN
            v_exists := TRUE;
          ELSE
            EXECUTE format('ALTER TABLE denetim_kayitlari DROP CONSTRAINT IF EXISTS %I', r.conname);
          END IF;
        END LOOP;
        IF NOT v_exists THEN
          ALTER TABLE denetim_kayitlari
            ADD CONSTRAINT fk_denetim_kayitlari_org
            FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL;
        END IF;
      END$$;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    version: '008_v22_work_orders',
    sql: `
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
    `,
  },
];

module.exports = { MIGRATIONS };
