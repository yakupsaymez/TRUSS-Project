const pool = require('../db');

const EXPECTED_ARAC_COLUMNS = ['depo_kapasitesi_l', 'hedef_tuketim'];
const EXPECTED_INDEXES = [
  'idx_yakit_anomalileri_arac',
  'idx_yakit_anomalileri_org_durum',
  'uq_yakit_anomali_kayit_tip',
];

/**
 * V2.2-ANOMALY: araclar depo/tuketim kolonlari, CHECK kisitlari ve yakit_anomalileri tablosunu idempotent uygular.
 */
async function run() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE araclar
        ADD COLUMN IF NOT EXISTS depo_kapasitesi_l NUMERIC(6,1),
        ADD COLUMN IF NOT EXISTS hedef_tuketim NUMERIC(6,2)
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_araclar_depo_kapasitesi_pozitif') THEN
          ALTER TABLE araclar ADD CONSTRAINT chk_araclar_depo_kapasitesi_pozitif CHECK (depo_kapasitesi_l IS NULL OR depo_kapasitesi_l > 0);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_araclar_hedef_tuketim_pozitif') THEN
          ALTER TABLE araclar ADD CONSTRAINT chk_araclar_hedef_tuketim_pozitif CHECK (hedef_tuketim IS NULL OR hedef_tuketim > 0);
        END IF;
      END$$;
    `);

    await client.query(`
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
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_yakit_anomalileri_org_durum
      ON yakit_anomalileri (org_id, durum, olusturma_tarihi DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_yakit_anomalileri_arac
      ON yakit_anomalileri (arac_id)
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
       WHERE table_schema = 'public' AND table_name = 'yakit_anomalileri'`
    );
    const columnsCount = colRes.rows[0]?.cnt || 0;
    if (columnsCount < 14) {
      throw new Error(`yakit_anomalileri eksik kolon sayisi: ${columnsCount}`);
    }

    const idxRes = await pool.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'yakit_anomalileri' AND indexname = ANY($1::text[])
       ORDER BY indexname ASC`,
      [EXPECTED_INDEXES]
    );
    const indexes = idxRes.rows.map((r) => r.indexname);
    const missingIndexes = EXPECTED_INDEXES.filter((n) => !indexes.includes(n));
    if (missingIndexes.length > 0) {
      throw new Error(`Eksik indeks(ler): ${missingIndexes.join(', ')}`);
    }

    console.log(JSON.stringify({ ok: true, araclarColumns, table: 'yakit_anomalileri', columnsCount, indexes }));
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('V2.2-ANOMALY migrasyon hatasi:', err);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
