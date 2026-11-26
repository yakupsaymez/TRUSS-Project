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

describe('FORGE-D4: V2.4-SEAL Finans Maskeleme, IDOR & Arşiv Matrisi (ADR-37)', () => {
  let srv;
  let beforeSnap;
  let org1;
  let org2;
  let mgr1;
  let mgr2;
  let driver1;
  let token1;
  let token2;
  let driverToken;
  let arac1Id;
  let arsivAracId;
  let arsivAtamaId;

  before(async () => {
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();

    org1 = await createTestOrg('seal1');
    org2 = await createTestOrg('seal2');
    mgr1 = await createTestUser({ orgId: org1.org_id, role: 'FLEET_MANAGER', tag: 'sMgr1' });
    mgr2 = await createTestUser({ orgId: org2.org_id, role: 'FLEET_MANAGER', tag: 'sMgr2' });
    driver1 = await createTestUser({ orgId: org1.org_id, role: 'DRIVER', tag: 'sDrv1', yetkiler: {} });

    token1 = (await loginUser(srv.baseUrl, mgr1.email)).body.token;
    token2 = (await loginUser(srv.baseUrl, mgr2.email)).body.token;
    driverToken = (await loginUser(srv.baseUrl, driver1.email)).body.token;

    const a1 = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, sayac_tipi, org_id, kullanici_id)
       VALUES ('34SEAL01', 'Ford', 'Transit', 2024, 15000, 'KM', $1, $2) RETURNING arac_id`,
      [org1.org_id, mgr1.user_id]
    );
    arac1Id = a1.rows[0].arac_id;

    const arch = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, sayac_tipi, org_id, kullanici_id, arsivlendi_mi)
       VALUES ('34SEAL99', 'Iveco', 'Daily', 2023, 22000, 'KM', $1, $2, TRUE) RETURNING arac_id`,
      [org1.org_id, mgr1.user_id]
    );
    arsivAracId = arch.rows[0].arac_id;

    await pool.query(
      `INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif) VALUES ($1, $2, TRUE)`,
      [arac1Id, driver1.user_id]
    );
    const atamaRes = await pool.query(
      `INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif) VALUES ($1, $2, FALSE) RETURNING atama_id`,
      [arsivAracId, driver1.user_id]
    );
    arsivAtamaId = atamaRes.rows[0].atama_id;
  });

  after(async () => {
    if (srv) await srv.close();
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('a) is_emirleri !hasFinanceAccess okuma/yazma maliyet maskeleme & koruma vs hasFinanceAccess', async () => {
    const drvCreate = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST',
      token: driverToken,
      body: { arac_id: arac1Id, baslik: 'Şoför Fren Talebi', kategori: 'ariza', oncelik: 'yuksek' },
    });
    assert.equal(drvCreate.status, 201);
    assert.equal(drvCreate.body.is_emri.tahmini_maliyet, null);
    assert.equal(drvCreate.body.is_emri.gerceklesen_maliyet, null);
    const drvWoId = drvCreate.body.is_emri.is_emri_id;

    const mgrUpd = await requestJson(srv.baseUrl, `/api/is-emirleri/${drvWoId}`, {
      method: 'PATCH',
      token: token1,
      body: { tahmini_maliyet: 3400, servis_adi: 'Anadolu Servis' },
    });
    assert.equal(mgrUpd.status, 200);
    assert.equal(Number(mgrUpd.body.is_emri.tahmini_maliyet), 3400);

    const drvList = await requestJson(srv.baseUrl, '/api/is-emirleri', { token: driverToken });
    assert.equal(drvList.status, 200);
    assert.ok(drvList.body.is_emirleri.length >= 1);
    assert.ok(drvList.body.is_emirleri.every((r) => r.tahmini_maliyet === null && r.gerceklesen_maliyet === null && r.bakim_belge_url === null));

    const mgrList = await requestJson(srv.baseUrl, '/api/is-emirleri', { token: token1 });
    assert.equal(mgrList.status, 200);
    const foundMgr = mgrList.body.is_emirleri.find((r) => r.is_emri_id === drvWoId);
    assert.equal(Number(foundMgr.tahmini_maliyet), 3400);

    // Şoför kendi açık iş emrini iptal ettiğinde tahmini_maliyet sızmamalı ve DB'de korunmalı
    const drvCancel = await requestJson(srv.baseUrl, `/api/is-emirleri/${drvWoId}/iptal`, {
      method: 'POST',
      token: driverToken,
      body: { red_iptal_nedeni: 'Vazgeçildi' },
    });
    assert.equal(drvCancel.status, 200);
    assert.equal(drvCancel.body.is_emri.tahmini_maliyet, null);
    assert.equal(drvCancel.body.is_emri.gerceklesen_maliyet, null);

    const dbCost = await pool.query('SELECT tahmini_maliyet FROM is_emirleri WHERE is_emri_id = $1', [drvWoId]);
    assert.equal(Number(dbCost.rows[0].tahmini_maliyet), 3400);

    // Yönetici iş emri açıp tamamladığında gerçekleşen maliyet yöneticiye görünür, şoföre gizlenir
    const mgrWo = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST',
      token: token1,
      body: { arac_id: arac1Id, baslik: 'Periyodik Bakım', kategori: 'periyodik_bakim', tahmini_maliyet: 2000 },
    });
    assert.equal(mgrWo.status, 201);
    const wo2Id = mgrWo.body.is_emri.is_emri_id;

    const comp = await requestJson(srv.baseUrl, `/api/is-emirleri/${wo2Id}/tamamla`, {
      method: 'POST',
      token: token1,
      body: { tarih: '2026-01-20', sayac_degeri: 15000, tutar: 2750 },
    });
    assert.equal(comp.status, 200);
    assert.equal(Number(comp.body.is_emri.gerceklesen_maliyet), 2750);

    const drvAfterComp = await requestJson(srv.baseUrl, '/api/is-emirleri', { token: driverToken });
    const drvRow = drvAfterComp.body.is_emirleri.find((r) => r.is_emri_id === wo2Id);
    assert.equal(drvRow.tahmini_maliyet, null);
    assert.equal(drvRow.gerceklesen_maliyet, null);
  });

  it('b) org1 vs org2 çapraz-kiracı IDOR (404/403) matrisi', async () => {
    const woCross = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST',
      token: token2,
      body: { arac_id: arac1Id, baslik: 'IDOR Is Emri' },
    });
    assert.equal(woCross.status, 404);

    const yakitCross = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST',
      token: token2,
      body: { arac_id: arac1Id, tarih: '2026-01-20', litre: 40, tutar: 1800, km: 15000 },
    });
    assert.ok([403, 404].includes(yakitCross.status));

    const bakimCross = await requestJson(srv.baseUrl, '/api/bakimlar', {
      method: 'POST',
      token: token2,
      body: { arac_id: arac1Id, bakim_tipi: 'IDOR Bakim', tarih: '2026-01-20', km: 15000, maliyet: 1000 },
    });
    assert.ok([403, 404].includes(bakimCross.status));

    const listOrg2 = await requestJson(srv.baseUrl, '/api/is-emirleri', { token: token2 });
    assert.equal(listOrg2.status, 200);
    assert.ok(listOrg2.body.is_emirleri.every((r) => r.org_id === org2.org_id));
  });

  it('c) 409 VEHICLE_ARCHIVED mutasyon matrisi (is_emirleri, yakitlar, bakimlar, zimmet)', async () => {
    const woArch = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST',
      token: token1,
      body: { arac_id: arsivAracId, baslik: 'Arsiv Is Emri' },
    });
    assert.equal(woArch.status, 409);
    assert.equal(woArch.body.code, 'VEHICLE_ARCHIVED');

    const yakitArch = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST',
      token: token1,
      body: { arac_id: arsivAracId, tarih: '2026-01-20', litre: 30, tutar: 1400, km: 22000 },
    });
    assert.equal(yakitArch.status, 409);
    assert.equal(yakitArch.body.code, 'VEHICLE_ARCHIVED');

    const bakimArch = await requestJson(srv.baseUrl, '/api/bakimlar', {
      method: 'POST',
      token: token1,
      body: { arac_id: arsivAracId, bakim_tipi: 'Arsiv Bakim', tarih: '2026-01-20', km: 22000, maliyet: 900 },
    });
    assert.equal(bakimArch.status, 409);
    assert.equal(bakimArch.body.code, 'VEHICLE_ARCHIVED');

    const zimmetArch = await requestJson(srv.baseUrl, `/api/zimmetler/${arsivAtamaId}/muayeneler`, {
      method: 'POST',
      token: token1,
      body: { muayene_tipi: 'TESLIM_ALMA', muayene_tarihi: '2026-01-20', sayac_degeri: 22000 },
    });
    assert.equal(zimmetArch.status, 409);
    assert.equal(zimmetArch.body.code, 'VEHICLE_ARCHIVED');
  });
});
