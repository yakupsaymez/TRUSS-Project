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
const { bugunTR, gunEkleTR } = require('../utils/dateUtils');

describe('FORGE-E1 V7..V12: Logic & Concurrency Torture Suite', () => {
  let srv;
  let beforeSnap;
  let org1;
  let mgr1;
  let drv1;
  let drv2;
  let drv3;
  let mgrToken;
  let drv3Token;
  let a1Id;
  let a2Id;
  let aSmhId;

  before(async () => {
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();

    org1 = await createTestOrg('tort1');
    mgr1 = await createTestUser({ orgId: org1.org_id, role: 'FLEET_MANAGER', tag: 'tMgr1' });
    drv1 = await createTestUser({ orgId: org1.org_id, role: 'DRIVER', tag: 'tDrv1' });
    drv2 = await createTestUser({ orgId: org1.org_id, role: 'DRIVER', tag: 'tDrv2' });
    drv3 = await createTestUser({ orgId: org1.org_id, role: 'DRIVER', tag: 'tDrv3' });

    mgrToken = (await loginUser(srv.baseUrl, mgr1.email)).body.token;
    drv3Token = (await loginUser(srv.baseUrl, drv3.email)).body.token;

    const ins = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, guncel_calisma_saati, sayac_tipi, org_id, kullanici_id)
       VALUES
         ('34TRT01', 'Ford', 'Transit', 2024, 10000, 0, 'KM', $1, $2),
         ('34TRT02', 'Renault', 'Master', 2024, 20000, 0, 'KM', $1, $2),
         ('34TRT03', 'CAT', '320D', 2023, 0, 500, 'SMH', $1, $2)
       RETURNING arac_id, plaka`,
      [org1.org_id, mgr1.user_id]
    );
    a1Id = ins.rows[0].arac_id;
    a2Id = ins.rows[1].arac_id;
    aSmhId = ins.rows[2].arac_id;
  });

  after(async () => {
    if (srv) await srv.close();
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('V7: Promise.all double workOrder complete -> 1 bakim + 1 409', async () => {
    const woRes = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST',
      token: mgrToken,
      body: { arac_id: a1Id, baslik: 'Paralel Tamamla Testi', kategori: 'ariza' },
    });
    assert.equal(woRes.status, 201);
    const woId = woRes.body.is_emri.is_emri_id;

    const [r1, r2] = await Promise.all([
      requestJson(srv.baseUrl, `/api/is-emirleri/${woId}/tamamla`, {
        method: 'POST',
        token: mgrToken,
        body: { tarih: '2026-01-20', sayac_degeri: 10050, tutar: 1200 },
      }),
      requestJson(srv.baseUrl, `/api/is-emirleri/${woId}/tamamla`, {
        method: 'POST',
        token: mgrToken,
        body: { tarih: '2026-01-20', sayac_degeri: 10050, tutar: 1200 },
      }),
    ]);
    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [200, 409]);

    const bCount = await pool.query('SELECT COUNT(*)::int AS c FROM bakimlar WHERE arac_id = $1', [a1Id]);
    assert.equal(bCount.rows[0].c, 1);
  });

  it('V8: concurrent assign same vehicle & same driver to 2 vehicles -> 1 active, 409 DRIVER_ALREADY_ASSIGNED', async () => {
    const [sameVeh1, sameVeh2] = await Promise.all([
      requestJson(srv.baseUrl, '/api/admin/assign', { method: 'POST', token: mgrToken, body: { arac_id: a1Id, sofor_user_id: drv1.user_id } }),
      requestJson(srv.baseUrl, '/api/admin/assign', { method: 'POST', token: mgrToken, body: { arac_id: a1Id, sofor_user_id: drv2.user_id } }),
    ]);
    assert.ok([200, 201].includes(sameVeh1.status));
    assert.ok([200, 201].includes(sameVeh2.status));
    const activeVeh = await pool.query('SELECT COUNT(*)::int AS c FROM arac_sofor_atamalari WHERE arac_id = $1 AND aktif = TRUE', [a1Id]);
    assert.equal(activeVeh.rows[0].c, 1);

    const [drvRace1, drvRace2] = await Promise.all([
      requestJson(srv.baseUrl, '/api/admin/assign', { method: 'POST', token: mgrToken, body: { arac_id: a1Id, sofor_user_id: drv3.user_id } }),
      requestJson(srv.baseUrl, '/api/admin/assign', { method: 'POST', token: mgrToken, body: { arac_id: a2Id, sofor_user_id: drv3.user_id } }),
    ]);
    const drvStatuses = [drvRace1.status, drvRace2.status].sort((a, b) => a - b);
    assert.equal(drvStatuses[0] >= 200 && drvStatuses[0] < 300, true);
    assert.equal(drvStatuses[1], 409);
    const conflictBody = drvRace1.status === 409 ? drvRace1.body : drvRace2.body;
    assert.equal(conflictBody.code, 'DRIVER_ALREADY_ASSIGNED');

    const activeDrv3 = await pool.query('SELECT COUNT(*)::int AS c FROM arac_sofor_atamalari WHERE sofor_user_id = $1 AND aktif = TRUE', [drv3.user_id]);
    assert.equal(activeDrv3.rows[0].c, 1);
  });

  it('V9: archive closes assignment & workOrder, blocks writes (409), role change revokes driver', async () => {
    const openWo = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST',
      token: mgrToken,
      body: { arac_id: a1Id, baslik: 'Arşiv Öncesi Açık İş Emri' },
    });
    assert.equal(openWo.status, 201);

    const archRes = await requestJson(srv.baseUrl, `/api/araclar/${a1Id}`, { method: 'DELETE', token: mgrToken });
    assert.equal(archRes.status, 200);

    const qVeh = await pool.query('SELECT arsivlendi_mi FROM araclar WHERE arac_id = $1', [a1Id]);
    assert.equal(qVeh.rows[0].arsivlendi_mi, true);
    const qAsg = await pool.query('SELECT COUNT(*)::int AS c FROM arac_sofor_atamalari WHERE arac_id = $1 AND aktif = TRUE', [a1Id]);
    assert.equal(qAsg.rows[0].c, 0);
    const qWo = await pool.query('SELECT durum FROM is_emirleri WHERE is_emri_id = $1', [openWo.body.is_emri.is_emri_id]);
    assert.equal(qWo.rows[0].durum, 'iptal');

    const postArch = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST',
      token: mgrToken,
      body: { arac_id: a1Id, tarih: '2026-01-21', litre: 30, tutar: 1300, km: 10100 },
    });
    assert.equal(postArch.status, 409);
    assert.equal(postArch.body.code, 'VEHICLE_ARCHIVED');

    // drv3 aktif zimmetli (a1 arşivlendiyse a2'ye ata veya aktif durumunu garantile)
    await requestJson(srv.baseUrl, '/api/admin/assign', { method: 'POST', token: mgrToken, body: { arac_id: a2Id, sofor_user_id: drv3.user_id } });
    const roleRes = await requestJson(srv.baseUrl, `/api/admin/users/${drv3.user_id}/role`, {
      method: 'PUT',
      token: mgrToken,
      body: { role: 'FLEET_MANAGER' },
    });
    assert.equal(roleRes.status, 200);
    assert.ok(roleRes.body.kapatilan_zimmet_sayisi >= 1);

    const oldTokRes = await requestJson(srv.baseUrl, '/api/araclar', { token: drv3Token });
    assert.equal(oldTokRes.status, 401);
    assert.equal(oldTokRes.body.code, 'TOKEN_REVOKED');
  });

  it('V10: SMH vs KM type lock (422) & 0-distance TCO no NaN/Infinity', async () => {
    const smhYakit = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST',
      token: mgrToken,
      body: { arac_id: aSmhId, tarih: '2026-01-10', litre: 50, tutar: 2200, km: 510 },
    });
    assert.equal(smhYakit.status, 201);

    const switchRes = await requestJson(srv.baseUrl, `/api/araclar/${aSmhId}`, {
      method: 'PUT',
      token: mgrToken,
      body: { plaka: '34TRT03', marka: 'CAT', model: '320D', yil: 2023, guncel_km: 510, sayac_tipi: 'KM' },
    });
    assert.equal(switchRes.status, 422);

    await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST',
      token: mgrToken,
      body: { arac_id: a2Id, tarih: '2026-01-10', litre: 20, tutar: 900, km: 20000 },
    });
    await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST',
      token: mgrToken,
      body: { arac_id: a2Id, tarih: '2026-01-11', litre: 25, tutar: 1100, km: 20000 },
    });

    const tcoRes = await requestJson(srv.baseUrl, '/api/raporlar/tco-analizi', { token: mgrToken });
    assert.equal(tcoRes.status, 200);
    const serialized = JSON.stringify(tcoRes.body);
    assert.ok(!serialized.includes('NaN') && !serialized.includes('Infinity'));
  });

  it('V11: UTC+3 tomorrow future date rejected', async () => {
    const tomorrow = gunEkleTR(bugunTR(), 1);
    const futRes = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST',
      token: mgrToken,
      body: { arac_id: a2Id, tarih: tomorrow, litre: 10, tutar: 500, km: 20100 },
    });
    assert.equal(futRes.status, 400);
    assert.equal(futRes.body.code, 'FUTURE_DATE');
  });

  it('V12: bulk fuel CSV rollback on archived row & OWASP formula escape on export', async () => {
    const beforeCnt = Number((await pool.query('SELECT COUNT(*)::int AS c FROM yakitlar WHERE arac_id = $1', [a2Id])).rows[0].c);
    const bulkRes = await requestJson(srv.baseUrl, '/api/yakitlar/toplu-aktar', {
      method: 'POST',
      token: mgrToken,
      body: {
        satirlar: [
          { arac_id: a2Id, tarih: '2026-01-12', litre: 30, tutar: 1400, km: 20050 },
          { arac_id: a1Id, tarih: '2026-01-12', litre: 30, tutar: 1400, km: 10200 },
        ],
      },
    });
    assert.ok(bulkRes.status >= 400);
    const afterCnt = Number((await pool.query('SELECT COUNT(*)::int AS c FROM yakitlar WHERE arac_id = $1', [a2Id])).rows[0].c);
    assert.equal(afterCnt, beforeCnt);

    await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST',
      token: mgrToken,
      body: { arac_id: a2Id, tarih: '2026-01-13', litre: 15, tutar: 700, km: 20080, notlar: '\t=1+1' },
    });
    const expRes = await fetch(`${srv.baseUrl}/api/raporlar/export/hareketler`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert.equal(expRes.status, 200);
    const csvText = await expRes.text();
    assert.ok(csvText.includes("'\t=1+1"));
  });
});
