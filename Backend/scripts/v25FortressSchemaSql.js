const V25_FORTRESS_SCHEMA_SQL = `
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
`;

module.exports = { V25_FORTRESS_SCHEMA_SQL };
