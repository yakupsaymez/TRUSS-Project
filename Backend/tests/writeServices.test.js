const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const AppError = require('../utils/AppError');
const withTransaction = require('../utils/withTransaction');
const { createYakitTx, updateYakitTx } = require('../services/yakitWriteService');
const { createBakimTx, PERIYODIK_SIFIRLAMA_HARITASI } = require('../services/bakimWriteService');
const {
  pool,
  createTestOrg,
  createTestUser,
  takeExternalSnapshot,
  cleanupTestSuite,
} = require('./helpers/pgTestHarness');

describe('FORGE Write Services Direct-Client Tests (no req/res)', () => {
  let beforeSnap;
  let org;
  let mgr;
  let aracId;

  before(async () => {
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    org = await createTestOrg('ws');
    mgr = await createTestUser({ orgId: org.org_id, role: 'FLEET_MANAGER', tag: 'wsMgr' });

    const aracRes = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, sayac_tipi, org_id, kullanici_id)
       VALUES ('34FRGWS1', 'Ford', 'Transit', 2024, 1000, 'KM', $1, $2)
       RETURNING arac_id`,
      [org.org_id, mgr.user_id]
    );
    aracId = aracRes.rows[0].arac_id;

    await pool.query(
      `INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, degisim_araligi_km, son_degisim_tarihi)
       VALUES ($1, 'Motor Yağı', 500, 10000, '2025-12-01')`,
      [aracId]
    );
  });

  after(async () => {
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('createYakitTx + updateYakitTx SW-07 fatura_no korunumu', async () => {
    const created = await withTransaction((client) =>
      createYakitTx(client, mgr, {
        arac_id: aracId,
        tarih: '2026-01-10',
        litre: 40,
        tutar: 1600,
        km: 1200,
        fatura_no: 'FTR-2026-001',
        notlar: 'Ilk dolum',
      })
    );
    assert.equal(created.row.fatura_no, 'FTR-2026-001');
    assert.equal(created.anomalyCtx.mode, 'create');

    const updated = await withTransaction((client) =>
      updateYakitTx(client, mgr, {
        yakitId: created.row.yakit_id,
        arac_id: aracId,
        tarih: '2026-01-10',
        litre: 42,
        tutar: 1680,
        km: 1250,
        notlar: 'Fatura etiketi olmayan yeni not',
      })
    );
    assert.equal(updated.row.fatura_no, 'FTR-2026-001');
    assert.equal(updated.anomalyCtx.mode, 'update');
  });

  it('createBakimTx PERIYODIK_SIFIRLAMA_HARITASI ile parca_takip.son_degisim_km gunceller', async () => {
    assert.ok(PERIYODIK_SIFIRLAMA_HARITASI['Periyodik Bakım'].includes('Motor Yağı'));

    const res = await withTransaction((client) =>
      createBakimTx(client, mgr, {
        arac_id: aracId,
        bakim_tipi: 'Periyodik Bakım',
        tarih: '2026-01-15',
        km: 1500,
        maliyet: 3500,
        notlar: 'Yillik bakim',
      })
    );
    assert.equal(res.row.km, 1500);

    const parcaQ = await pool.query(
      `SELECT son_degisim_km, son_degisim_tarihi::text AS sdt
       FROM parca_takip WHERE arac_id = $1 AND parca_adi = 'Motor Yağı'`,
      [aracId]
    );
    assert.equal(parcaQ.rows[0].son_degisim_km, 1500);
    assert.equal(parcaQ.rows[0].sdt, '2026-01-15');
  });

  it('422 SAYAC_KRONOLOJI_IHLALI extra alanlari + 409 VEHICLE_ARCHIVED', async () => {
    await assert.rejects(
      () =>
        withTransaction((client) =>
          createYakitTx(client, mgr, {
            arac_id: aracId,
            tarih: '2026-01-20',
            litre: 30,
            tutar: 1200,
            km: 1400,
          })
        ),
      (err) =>
        err instanceof AppError &&
        err.statusCode === 422 &&
        err.code === 'SAYAC_KRONOLOJI_IHLALI' &&
        err.extra.alt_sinir === 1500 &&
        err.extra.ust_sinir === null &&
        err.extra.sayac_tipi === 'KM' &&
        err.extra.birim === 'km'
    );

    await pool.query(`UPDATE araclar SET arsivlendi_mi = TRUE WHERE arac_id = $1`, [aracId]);
    await assert.rejects(
      () =>
        withTransaction((client) =>
          createBakimTx(client, mgr, {
            arac_id: aracId,
            bakim_tipi: 'Fren',
            tarih: '2026-01-20',
            km: 1600,
            maliyet: 900,
          })
        ),
      (err) => err instanceof AppError && err.statusCode === 409 && err.code === 'VEHICLE_ARCHIVED'
    );
  });
});
