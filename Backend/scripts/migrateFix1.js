const pool = require('../db');

/**
 * FIX-1: fk_araclar_kullanici kisitini ON DELETE SET NULL yapar ve dogrular.
 */
async function run() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('ALTER TABLE araclar ALTER COLUMN kullanici_id DROP NOT NULL');
    await client.query('ALTER TABLE araclar DROP CONSTRAINT IF EXISTS fk_araclar_kullanici');
    await client.query(
      'ALTER TABLE araclar ADD CONSTRAINT fk_araclar_kullanici FOREIGN KEY (kullanici_id) REFERENCES users(user_id) ON DELETE SET NULL'
    );
    await client.query('COMMIT');

    const fkRes = await pool.query(
      `SELECT confdeltype::text AS confdeltype
       FROM pg_constraint
       WHERE conname = 'fk_araclar_kullanici' AND conrelid = 'araclar'::regclass`
    );
    const colRes = await pool.query(
      `SELECT is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'araclar' AND column_name = 'kullanici_id'`
    );

    const confdeltype = fkRes.rows[0]?.confdeltype || null;
    const is_nullable = colRes.rows[0]?.is_nullable || null;
    if (confdeltype !== 'n' || is_nullable !== 'YES') {
      throw new Error(`Dogrulama basarisiz: confdeltype=${confdeltype}, is_nullable=${is_nullable}`);
    }
    console.log(JSON.stringify({ ok: true, confdeltype, is_nullable }));
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('FIX-1 migrasyon hatasi:', err);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
