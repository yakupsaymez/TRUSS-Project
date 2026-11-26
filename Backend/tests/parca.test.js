const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
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

describe('FORGE-D0: Parça Takip Çekirdeği (ADR-33)', () => {
  let srv;
  let beforeSnap;
  let org1;
  let org2;
  let mgr1;
  let mgr2;
  let token1;
  let token2;
  let arac1Id;
  let arac1BId;
  let arsivAracId;

  before(async () => {
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();

    org1 = await createTestOrg('parca1');
    org2 = await createTestOrg('parca2');
    mgr1 = await createTestUser({ orgId: org1.org_id, role: 'FLEET_MANAGER', tag: 'pMgr1' });
    mgr2 = await createTestUser({ orgId: org2.org_id, role: 'FLEET_MANAGER', tag: 'pMgr2' });

    token1 = (await loginUser(srv.baseUrl, mgr1.email)).body.token;
    token2 = (await loginUser(srv.baseUrl, mgr2.email)).body.token;

    const a1 = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, sayac_tipi, org_id, kullanici_id)
       VALUES ('34PRCA01', 'Ford', 'Transit', 2024, 10000, 'KM', $1, $2) RETURNING arac_id`,
      [org1.org_id, mgr1.user_id]
    );
    arac1Id = a1.rows[0].arac_id;

    const a1b = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, sayac_tipi, org_id, kullanici_id)
       VALUES ('34PRCA02', 'Fiat', 'Doblo', 2024, 8000, 'KM', $1, $2) RETURNING arac_id`,
      [org1.org_id, mgr1.user_id]
    );
    arac1BId = a1b.rows[0].arac_id;

    const arsiv = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, sayac_tipi, org_id, kullanici_id, arsivlendi_mi)
       VALUES ('34PRCA99', 'Iveco', 'Daily', 2022, 12000, 'KM', $1, $2, TRUE) RETURNING arac_id`,
      [org1.org_id, mgr1.user_id]
    );
    arsivAracId = arsiv.rows[0].arac_id;
  });

  after(async () => {
    if (srv) await srv.close();
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('1) org_id IDOR korumasi (404)', async () => {
    const postCross = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token2,
      body: {
        arac_id: arac1Id,
        parca_adi: 'IDOR Parca',
        son_degisim_km: 1000,
        son_degisim_tarihi: '2026-01-10',
      },
    });
    assert.equal(postCross.status, 404);

    const created = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token1,
      body: {
        arac_id: arac1Id,
        parca_adi: 'Hava Filtresi',
        son_degisim_km: 9000,
        degisim_araligi_km: 15000,
        son_degisim_tarihi: '2026-01-10',
        maliyet: 1200,
      },
    });
    assert.equal(created.status, 201);
    const parcaId = created.body.parca.parca_id;

    const getCross = await requestJson(srv.baseUrl, `/api/parcalar/arac/${arac1Id}`, { token: token2 });
    assert.equal(getCross.status, 404);

    const putCross = await requestJson(srv.baseUrl, `/api/parcalar/${parcaId}`, {
      method: 'PUT',
      token: token2,
      body: { parca_adi: 'Degisti' },
    });
    assert.equal(putCross.status, 404);

    const delCross = await requestJson(srv.baseUrl, `/api/parcalar/${parcaId}`, {
      method: 'DELETE',
      token: token2,
    });
    assert.equal(delCross.status, 404);
  });

  it('2) 409 VEHICLE_ARCHIVED arsivli aracta POST/PUT/DELETE engeli', async () => {
    const postArch = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token1,
      body: {
        arac_id: arsivAracId,
        parca_adi: 'Arsiv Parca',
        son_degisim_km: 5000,
        son_degisim_tarihi: '2026-01-10',
      },
    });
    assert.equal(postArch.status, 409);
    assert.equal(postArch.body.code, 'VEHICLE_ARCHIVED');

    const seedArch = await pool.query(
      `INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, son_degisim_tarihi)
       VALUES ($1, 'Mevcut Arsiv Parca', 5000, '2026-01-05') RETURNING parca_id`,
      [arsivAracId]
    );
    const archParcaId = seedArch.rows[0].parca_id;

    const putArch = await requestJson(srv.baseUrl, `/api/parcalar/${archParcaId}`, {
      method: 'PUT',
      token: token1,
      body: { son_degisim_km: 6000 },
    });
    assert.equal(putArch.status, 409);
    assert.equal(putArch.body.code, 'VEHICLE_ARCHIVED');

    const delArch = await requestJson(srv.baseUrl, `/api/parcalar/${archParcaId}`, {
      method: 'DELETE',
      token: token1,
    });
    assert.equal(delArch.status, 409);
    assert.equal(delArch.body.code, 'VEHICLE_ARCHIVED');
  });

  it('3) ADR-09 PUT arac_id degismezligi (400 PARCA_ARAC_DEGISTIRILEMEZ)', async () => {
    const created = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token1,
      body: {
        arac_id: arac1Id,
        parca_adi: 'Fren Balatasi',
        son_degisim_km: 9500,
        son_degisim_tarihi: '2026-01-12',
      },
    });
    assert.equal(created.status, 201);
    const parcaId = created.body.parca.parca_id;

    const putMove = await requestJson(srv.baseUrl, `/api/parcalar/${parcaId}`, {
      method: 'PUT',
      token: token1,
      body: { arac_id: arac1BId, parca_adi: 'Fren Balatasi' },
    });
    assert.equal(putMove.status, 400);
    assert.equal(putMove.body.code, 'PARCA_ARAC_DEGISTIRILEMEZ');

    const check = await pool.query('SELECT arac_id FROM parca_takip WHERE parca_id = $1', [parcaId]);
    assert.equal(check.rows[0].arac_id, arac1Id);
  });

  it('4) OID 1082 saf tarih string & 400 INVALID_DATE / FUTURE_DATE', async () => {
    const invalidRes = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token1,
      body: {
        arac_id: arac1Id,
        parca_adi: 'Gecersiz Tarih Parca',
        son_degisim_km: 9000,
        son_degisim_tarihi: '2026-02-30',
      },
    });
    assert.equal(invalidRes.status, 400);
    assert.equal(invalidRes.body.code, 'INVALID_DATE');

    const futureRes = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token1,
      body: {
        arac_id: arac1Id,
        parca_adi: 'Gelecek Tarih Parca',
        son_degisim_km: 9000,
        son_degisim_tarihi: '2099-01-01',
      },
    });
    assert.equal(futureRes.status, 400);
    assert.equal(futureRes.body.code, 'FUTURE_DATE');

    const validRes = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST',
      token: token1,
      body: {
        arac_id: arac1Id,
        parca_adi: 'Yag Filtresi',
        son_degisim_km: 10000,
        son_degisim_tarihi: '2026-01-15',
      },
    });
    assert.equal(validRes.status, 201);
    assert.equal(validRes.body.parca.son_degisim_tarihi, '2026-01-15');
  });
});
