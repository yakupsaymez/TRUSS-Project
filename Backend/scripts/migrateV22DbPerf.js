const pool = require('../db');

const EXPECTED_INDEXES = [
  'idx_araclar_org_id',
  'idx_atamalar_aktif_arac',
  'idx_bakimlar_arac_tarih_km',
  'idx_parca_takip_arac_id',
  'idx_yakitlar_arac_tarih_km',
];

const EXPECTED_COLUMNS = [
  'araclar.org_id',
  'yakitlar.fatura_no',
  'yakitlar.belge_url',
  'yakitlar.olusturan_user_id',
  'bakimlar.fatura_no',
  'bakimlar.belge_url',
  'bakimlar.olusturan_user_id',
];

/**
 * V2.2-DBPERF: Kiraci semasi (araclar.org_id), fatura/belge/olusturan normalizasyonu,
 * eski runtime DDL kolonlarinin kalici guvencesi ve 5 performans indeksini uygular.
 */
async function run() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS aylik_yakit_butcesi NUMERIC(12, 2) NOT NULL DEFAULT 50000,
        ADD COLUMN IF NOT EXISTS aylik_bakim_butcesi NUMERIC(12, 2) NOT NULL DEFAULT 25000
    `);

    await client.query(`
      ALTER TABLE araclar
        ADD COLUMN IF NOT EXISTS son_enlem NUMERIC(9, 6),
        ADD COLUMN IF NOT EXISTS son_boylam NUMERIC(9, 6),
        ADD COLUMN IF NOT EXISTS son_konum_adi VARCHAR(160),
        ADD COLUMN IF NOT EXISTS son_konum_zamani TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(org_id) ON DELETE SET NULL
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS bildirim_tercihleri JSONB NOT NULL DEFAULT '{"belge_vadesi":{"email":true,"sms":true},"periyodik_bakim":{"email":true,"sms":true},"parca_omru":{"email":true,"sms":false},"maliyet_ozeti":{"email":true,"sms":false}}'::jsonb
    `);

    const aracOrgRes = await client.query(`
      UPDATE araclar a
      SET org_id = u.org_id
      FROM users u
      WHERE a.kullanici_id = u.user_id
        AND a.org_id IS NULL
        AND u.org_id IS NOT NULL
    `);

    await client.query(`
      ALTER TABLE yakitlar
        ADD COLUMN IF NOT EXISTS fatura_no VARCHAR(80),
        ADD COLUMN IF NOT EXISTS belge_url TEXT,
        ADD COLUMN IF NOT EXISTS olusturan_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL
    `);

    await client.query(`
      ALTER TABLE bakimlar
        ADD COLUMN IF NOT EXISTS fatura_no VARCHAR(80),
        ADD COLUMN IF NOT EXISTS belge_url TEXT,
        ADD COLUMN IF NOT EXISTS olusturan_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL
    `);

    const yakitFaturaRes = await client.query(`
      UPDATE yakitlar
      SET fatura_no = LEFT(BTRIM((regexp_match(notlar, '\\[Fatura:\\s*([^\\]]+)\\]', 'i'))[1]), 80)
      WHERE fatura_no IS NULL
        AND notlar ~* '\\[Fatura:\\s*[^\\]]+\\]'
    `);

    const bakimFaturaRes = await client.query(`
      UPDATE bakimlar
      SET fatura_no = LEFT(BTRIM((regexp_match(notlar, '\\[Fatura:\\s*([^\\]]+)\\]', 'i'))[1]), 80)
      WHERE fatura_no IS NULL
        AND notlar ~* '\\[Fatura:\\s*[^\\]]+\\]'
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_araclar_org_id ON araclar (org_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_yakitlar_arac_tarih_km ON yakitlar (arac_id, tarih DESC, km DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bakimlar_arac_tarih_km ON bakimlar (arac_id, tarih DESC, km DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parca_takip_arac_id ON parca_takip (arac_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_atamalar_aktif_arac ON arac_sofor_atamalari (arac_id) WHERE aktif = TRUE');

    await client.query('COMMIT');

    const idxRes = await pool.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname = ANY($1::text[])
       ORDER BY indexname ASC`,
      [EXPECTED_INDEXES]
    );
    const indexes = idxRes.rows.map((r) => r.indexname);
    const missingIndexes = EXPECTED_INDEXES.filter((name) => !indexes.includes(name));
    if (missingIndexes.length > 0) {
      throw new Error(`Eksik indeks(ler): ${missingIndexes.join(', ')}`);
    }

    const colRes = await pool.query(
      `SELECT table_name || '.' || column_name AS full_col
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (
           (table_name = 'araclar' AND column_name = 'org_id')
           OR (table_name IN ('yakitlar', 'bakimlar') AND column_name IN ('fatura_no', 'belge_url', 'olusturan_user_id'))
         )`
    );
    const foundColumns = colRes.rows.map((r) => r.full_col);
    const missingColumns = EXPECTED_COLUMNS.filter((col) => !foundColumns.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Eksik kolon(lar): ${missingColumns.join(', ')}`);
    }

    const nullOrgRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM araclar WHERE org_id IS NULL');
    const remainingNullOrgCount = nullOrgRes.rows[0]?.cnt ?? 0;

    console.log(
      JSON.stringify({
        ok: true,
        araclarOrgBackfilled: aracOrgRes.rowCount || 0,
        remainingNullOrgCount,
        yakitFaturaBackfilled: yakitFaturaRes.rowCount || 0,
        bakimFaturaBackfilled: bakimFaturaRes.rowCount || 0,
        indexes,
      })
    );
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('V2.2-DBPERF migrasyon hatasi:', err);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
