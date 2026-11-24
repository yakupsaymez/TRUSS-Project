const pool = require('../db');

const EXPECTED_INDEXES = [
  'idx_bildirim_user_okundu',
  'uq_bildirim_user_kat_ref',
];

/**
 * V2.2-NOTIFY: bildirim_olaylari tablosu, dedup kisiti ve okunma performans indeksini idempotent uygular.
 */
async function run() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    await client.query(`
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
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bildirim_user_okundu
      ON bildirim_olaylari (user_id, okundu_mu, olusturma_tarihi DESC)
    `);

    await client.query('COMMIT');

    const tblRes = await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'bildirim_olaylari'
       LIMIT 1`
    );
    if (tblRes.rowCount === 0) {
      throw new Error('bildirim_olaylari tablosu olusturulamadi.');
    }

    const colRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'bildirim_olaylari'`
    );
    const columnsCount = colRes.rows[0]?.cnt || 0;
    if (columnsCount < 15) {
      throw new Error(`Eksik kolon sayisi: ${columnsCount}`);
    }

    const idxRes = await pool.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'bildirim_olaylari'
         AND indexname = ANY($1::text[])
       ORDER BY indexname ASC`,
      [EXPECTED_INDEXES]
    );
    const indexes = idxRes.rows.map((r) => r.indexname);
    const missingIndexes = EXPECTED_INDEXES.filter((name) => !indexes.includes(name));
    if (missingIndexes.length > 0) {
      throw new Error(`Eksik indeks(ler): ${missingIndexes.join(', ')}`);
    }

    console.log(
      JSON.stringify({
        ok: true,
        table: 'bildirim_olaylari',
        columnsCount,
        indexes,
      })
    );
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('V2.2-NOTIFY migrasyon hatasi:', err);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
