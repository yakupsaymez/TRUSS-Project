const pool = require('../db');

const EXPECTED_ARAC_COLUMNS = ['arsiv_nedeni', 'arsiv_tarihi', 'arsivlendi_mi'];
const EXPECTED_INDEXES = [
  'idx_araclar_org_aktif',
  'idx_denetim_org_tarih',
  'idx_denetim_varlik',
];

/**
 * V2.2-AUDIT: araclar soft-archive kolonlari ve degismez denetim_kayitlari tablosunu idempotent uygular.
 */
async function run() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE araclar
        ADD COLUMN IF NOT EXISTS arsivlendi_mi BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS arsiv_tarihi TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS arsiv_nedeni VARCHAR(240)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_araclar_org_aktif
      ON araclar (org_id, arsivlendi_mi)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS denetim_kayitlari (
        denetim_id BIGSERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(org_id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        kullanici_eposta VARCHAR(160),
        kullanici_rol VARCHAR(40),
        eylem VARCHAR(60) NOT NULL,
        varlik_tipi VARCHAR(40) NOT NULL,
        varlik_id INTEGER,
        ozet TEXT NOT NULL,
        detay_json JSONB,
        ip_adresi VARCHAR(64),
        olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_denetim_org_tarih
      ON denetim_kayitlari (org_id, olusturma_tarihi DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_denetim_varlik
      ON denetim_kayitlari (varlik_tipi, varlik_id)
    `);

    await client.query('COMMIT');

    const aracColRes = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'araclar' AND column_name = ANY($1::text[])
       ORDER BY column_name ASC`,
      [EXPECTED_ARAC_COLUMNS]
    );
    const araclarColumns = aracColRes.rows.map((r) => r.column_name);
    const missingAracCols = EXPECTED_ARAC_COLUMNS.filter((c) => !araclarColumns.includes(c));
    if (missingAracCols.length > 0) {
      throw new Error(`Eksik araclar kolonlari: ${missingAracCols.join(', ')}`);
    }

    const colRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'denetim_kayitlari'`
    );
    const columnsCount = colRes.rows[0]?.cnt || 0;
    if (columnsCount < 12) {
      throw new Error(`denetim_kayitlari eksik kolon sayisi: ${columnsCount}`);
    }

    const idxRes = await pool.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename IN ('araclar', 'denetim_kayitlari')
         AND indexname = ANY($1::text[])
       ORDER BY indexname ASC`,
      [EXPECTED_INDEXES]
    );
    const indexes = idxRes.rows.map((r) => r.indexname);
    const missingIndexes = EXPECTED_INDEXES.filter((n) => !indexes.includes(n));
    if (missingIndexes.length > 0) {
      throw new Error(`Eksik indeks(ler): ${missingIndexes.join(', ')}`);
    }

    console.log(JSON.stringify({ ok: true, araclarColumns, table: 'denetim_kayitlari', columnsCount, indexes }));
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('V2.2-AUDIT migrasyon hatasi:', err);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
