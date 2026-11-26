const HANDOVER_SCHEMA_SQL = `
  ALTER TABLE arac_sofor_atamalari
    DROP CONSTRAINT IF EXISTS uq_aktif_arac_sofor,
    DROP CONSTRAINT IF EXISTS arac_sofor_atamalari_arac_id_key;
  CREATE UNIQUE INDEX IF NOT EXISTS uq_arac_tek_aktif_zimmet
    ON arac_sofor_atamalari (arac_id) WHERE aktif = TRUE;

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
`;

module.exports = { HANDOVER_SCHEMA_SQL };
