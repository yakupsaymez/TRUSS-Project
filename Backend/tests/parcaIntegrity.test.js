const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const AppError = require('../utils/AppError');
const withTransaction = require('../utils/withTransaction');
const { listParcalar } = require('../services/parcaQueryService');
const { createParcaTx, updateParcaTx } = require('../services/parcaWriteService');
const {
  pool,
  startTestServer,
  requestJson,
  createTestOrg,
  createTestUser,
  loginUser,
  takeExternalSnapshot,
  cleanupTestSuite,
} = require('./helpers/pgTestHarness');

describe('FORGE-D0: Parça Bütünlük & Finans İzolasyonu (ADR-33)', () => {
  let srv;
  let beforeSnap;
  let org1;
  let mgr1;
  let driver1;
  let token1;
  let driverToken;
  let arac1Id;
  let arac1BId;

  before(async () => {
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();

    org1 = await createTestOrg('parcaInt1');
    mgr1 = await createTestUser({ orgId: org1.org_id, role: 'FLEET_MANAGER', tag: 'piMgr1' });
    driver1 = await createTestUser({ orgId: org1.org_id, role: 'DRIVER', tag: 'piDrv1', yetkiler: {} });

    token1 = (await loginUser(srv.baseUrl, mgr1.email)).body.token;
    driverToken = (await loginUser(srv.baseUrl, driver1.email)).body.token;

    const a1 = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, sayac_tipi, org_id, kullanici_id)
       VALUES ('34PRCI01', 'Ford', 'Transit', 2024, 10000, 'KM', $1, $2) RETURNING arac_id`,
      [org1.org_id, mgr1.user_id]
    );
    arac1Id = a1.rows[0].arac_id;

    const a1b = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, sayac_tipi, org_id, kullanici_id)
       VALUES ('34PRCI02', 'Fiat', 'Doblo', 2024, 8000, 'KM', $1, $2) RETURNING arac_id`,
      [org1.org_id, mgr1.user_id]
    );
    arac1BId = a1b.rows[0].arac_id;

    await pool.query(
      `INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif) VALUES ($1, $2, TRUE)`,
      [arac1Id, driver1.user_id]
    );
  });

  after(async () => {
    if (srv) await srv.close();
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('5) Sayac semantigi (<= guncel_sayac gecerli, > guncel_sayac 422 SAYAC_KRONOLOJI_IHLALI)', async () => {
    const overRes = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token1,
      body: {
        arac_id: arac1Id,
        parca_adi: 'Triger Kayisi',
        son_degisim_km: 10500,
        son_degisim_tarihi: '2026-01-15',
      },
    });
    assert.equal(overRes.status, 422);
    assert.equal(overRes.body.code, 'SAYAC_KRONOLOJI_IHLALI');
    assert.equal(overRes.body.guncel_sayac, 10000);
    assert.equal(overRes.body.sayac_tipi, 'KM');
    assert.equal(overRes.body.birim, 'km');

    const okRes = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token1,
      body: {
        arac_id: arac1Id,
        parca_adi: 'Triger Kayisi',
        son_degisim_km: 10000,
        son_degisim_tarihi: '2026-01-15',
      },
    });
    assert.equal(okRes.status, 201);

    const aracKm = await pool.query('SELECT guncel_km FROM araclar WHERE arac_id = $1', [arac1Id]);
    assert.equal(aracKm.rows[0].guncel_km, 10000);
  });

  it('6) denetim_kayitlari (PARCA_OLUSTURULDU, PARCA_GUNCELLENDI, PARCA_SILINDI)', async () => {
    const postRes = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token1,
      body: {
        arac_id: arac1BId,
        parca_adi: 'Aku',
        son_degisim_km: 7500,
        son_degisim_tarihi: '2026-01-10',
        maliyet: 4500,
      },
    });
    assert.equal(postRes.status, 201);
    const parcaId = postRes.body.parca.parca_id;

    const putRes = await requestJson(srv.baseUrl, `/api/parcalar/${parcaId}`, {
      method: 'PUT',
      token: token1,
      body: { son_degisim_km: 7800, maliyet: 4800 },
    });
    assert.equal(putRes.status, 200);

    const delRes = await requestJson(srv.baseUrl, `/api/parcalar/${parcaId}`, {
      method: 'DELETE',
      token: token1,
    });
    assert.equal(delRes.status, 200);

    const auditQ = await pool.query(
      `SELECT eylem, varlik_tipi, varlik_id, org_id
       FROM denetim_kayitlari
       WHERE varlik_tipi = 'parca' AND varlik_id = $1
       ORDER BY denetim_id ASC`,
      [parcaId]
    );
    assert.deepEqual(
      auditQ.rows.map((r) => r.eylem),
      ['PARCA_OLUSTURULDU', 'PARCA_GUNCELLENDI', 'PARCA_SILINDI']
    );
    assert.ok(auditQ.rows.every((r) => r.org_id === org1.org_id));
  });

  it('7) !hasFinanceAccess maliyet korumasi + maskeleme ve 23505 (arac_id, parca_adi) 409', async () => {
    const created = await withTransaction((client) =>
      createParcaTx(client, mgr1, {
        arac_id: arac1Id,
        parca_adi: 'Polen Filtresi',
        son_degisim_km: 8500,
        son_degisim_tarihi: '2026-01-10',
        maliyet: 5000,
      })
    );
    const parcaId = created.parca.parca_id;

    const updatedByNoFinance = await withTransaction((client) =>
      updateParcaTx(client, driver1, {
        parcaId,
        son_degisim_km: 8600,
        maliyet: 1,
        notlar: 'Finans yetkisiz guncelleme',
      })
    );
    assert.equal(updatedByNoFinance.parca.maliyet, null);
    assert.equal(updatedByNoFinance.auditCtx.detay.maliyet, undefined);

    const dbCheck = await pool.query('SELECT maliyet FROM parca_takip WHERE parca_id = $1', [parcaId]);
    assert.equal(Number(dbCheck.rows[0].maliyet), 5000);

    const driverGet = await requestJson(srv.baseUrl, '/api/parcalar', { token: driverToken });
    assert.equal(driverGet.status, 200);
    assert.ok(driverGet.body.parcalar.every((p) => p.maliyet === null));

    const svcList = await listParcalar(pool, driver1);
    assert.ok(svcList.parcalar.every((p) => p.maliyet === null));

    await assert.rejects(
      () =>
        withTransaction((client) =>
          createParcaTx(client, mgr1, {
            arac_id: arac1Id,
            parca_adi: '  Polen Filtresi  ',
            son_degisim_km: 9000,
            son_degisim_tarihi: '2026-01-15',
          })
        ),
      (err) => err instanceof AppError && err.statusCode === 409
    );
  });
});
