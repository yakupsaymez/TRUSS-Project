const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { runMigrations } = require('../scripts/migrate');
const { MIGRATIONS } = require('../scripts/migrations');
const { CRON_LOCKS, withAdvisoryLock, runNotificationChecks } = require('../services/notificationScheduler');
const {
  pool, startTestServer, requestJson, createTestOrg, createTestUser,
  loginUser, takeExternalSnapshot, cleanupTestSuite,
} = require('./helpers/pgTestHarness');

describe('FORGE Core DB & API Integrity Tests', () => {
  let srv;
  let beforeSnap;

  before(async () => {
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();
  });

  after(async () => {
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    if (srv) await srv.close();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('1) runMigrations 2x idempotent + denetim FK confdeltype=n + token_version', async () => {
    const r1 = await runMigrations(pool);
    const r2 = await runMigrations(pool);
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    assert.equal(r2.applied.length, 0);
    assert.equal(r2.skipped.length, MIGRATIONS.length);

    const fk = await pool.query(
      `SELECT conname, confdeltype::text AS dt FROM pg_constraint
       WHERE conrelid = 'denetim_kayitlari'::regclass AND conname = 'fk_denetim_kayitlari_org'`
    );
    assert.equal(fk.rowCount, 1);
    assert.equal(fk.rows[0].dt, 'n');

    const tv = await pool.query(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'token_version'`
    );
    assert.equal(tv.rowCount, 1);
    assert.equal(tv.rows[0].is_nullable, 'NO');
  });

  it('2) CRON_LOCKS.daily 2 ayri PG baglantisiyla kilit carpismasi + unlock', async () => {
    const holder = await pool.connect();
    const contender = await pool.connect();
    let held = false;
    try {
      const l1 = await holder.query('SELECT pg_try_advisory_lock($1, $2) AS ok', CRON_LOCKS.daily);
      held = l1.rows[0].ok === true;
      assert.equal(held, true);
      const l2 = await contender.query('SELECT pg_try_advisory_lock($1, $2) AS ok', CRON_LOCKS.daily);
      assert.equal(l2.rows[0].ok, false);
      const cronRes = await runNotificationChecks({ skipEmail: true });
      assert.deepEqual(cronRes, { belge: 0, parca: 0, bakim: 0, skipped: true });
    } finally {
      if (held) await holder.query('SELECT pg_advisory_unlock($1, $2)', CRON_LOCKS.daily).catch(() => null);
      holder.release();
      contender.release();
    }
    const reacquired = await withAdvisoryLock(CRON_LOCKS.daily, async () => 'ok');
    assert.deepEqual(reacquired, { skipped: false, result: 'ok' });
  });

  it('3) ADR-13 SYSTEM_ADMIN org_id capraz kiraci izolasyonu', async () => {
    const orgA = await createTestOrg('isoA');
    const orgB = await createTestOrg('isoB');
    const adminA = await createTestUser({ orgId: orgA.org_id, role: 'SYSTEM_ADMIN', tag: 'saA' });
    const mgrB = await createTestUser({ orgId: orgB.org_id, role: 'FLEET_MANAGER', tag: 'mgB' });
    const tokA = (await loginUser(srv.baseUrl, adminA.email)).body.token;
    const tokB = (await loginUser(srv.baseUrl, mgrB.email)).body.token;

    const vA = await requestJson(srv.baseUrl, '/api/araclar/ekle', {
      method: 'POST', token: tokA,
      body: { plaka: '34FRG001', marka: 'Ford', model: 'Transit', yil: 2024, guncel_km: 1000, sayac_tipi: 'KM' },
    });
    const vB = await requestJson(srv.baseUrl, '/api/araclar/ekle', {
      method: 'POST', token: tokB,
      body: { plaka: '34FRG002', marka: 'Fiat', model: 'Doblo', yil: 2024, guncel_km: 1000, sayac_tipi: 'KM' },
    });
    assert.equal(vA.status, 201);
    assert.equal(vB.status, 201);

    const listA = await requestJson(srv.baseUrl, '/api/araclar', { token: tokA });
    const plakalarA = listA.body.araclar.map((a) => a.plaka);
    assert.ok(plakalarA.includes('34FRG001'));
    assert.ok(!plakalarA.includes('34FRG002'));
    assert.equal((await requestJson(srv.baseUrl, `/api/yakitlar/arac/${vA.body.arac.arac_id}`, { token: tokB })).status, 403);
  });

  it('4) ADR-23 arsiv 409 mutasyon tamligi + deleteParca audit + org silinince org_id NULL', async () => {
    const org = await createTestOrg('arc');
    const mgr = await createTestUser({ orgId: org.org_id, role: 'FLEET_MANAGER', tag: 'arcMgr' });
    const tok = (await loginUser(srv.baseUrl, mgr.email)).body.token;

    const aracRes = await requestJson(srv.baseUrl, '/api/araclar/ekle', {
      method: 'POST', token: tok,
      body: { plaka: '34FRG003', marka: 'Renault', model: 'Megane', yil: 2024, guncel_km: 5000, sayac_tipi: 'KM' },
    });
    const aracId = aracRes.body.arac.arac_id;
    const yRes = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST', token: tok, body: { arac_id: aracId, tarih: '2026-01-10', litre: 40, tutar: 1600, km: 5100 },
    });
    const bRes = await requestJson(srv.baseUrl, '/api/bakimlar', {
      method: 'POST', token: tok, body: { arac_id: aracId, bakim_tipi: 'Periyodik Bakım', tarih: '2026-01-11', km: 5200, maliyet: 2500 },
    });
    const pRes = await requestJson(srv.baseUrl, '/api/parcalar', {
      method: 'POST', token: tok, body: { arac_id: aracId, parca_adi: 'Test Silecek', son_degisim_km: 5200, son_degisim_tarihi: '2026-01-11', maliyet: 350 },
    });
    assert.equal(yRes.status, 201);
    assert.equal(bRes.status, 201);
    assert.equal(pRes.status, 201);
    const [yakitId, bakimId, parcaId] = [yRes.body.yakit.yakit_id, bRes.body.bakim.bakim_id, pRes.body.parca.parca_id];

    assert.equal((await requestJson(srv.baseUrl, `/api/araclar/${aracId}/arsiv`, { method: 'PATCH', token: tok, body: { arsiv_nedeni: 'Test' } })).status, 200);
    const checks = await Promise.all([
      requestJson(srv.baseUrl, '/api/yakitlar', { method: 'POST', token: tok, body: { arac_id: aracId, tarih: '2026-01-12', litre: 10, tutar: 400, km: 5300 } }),
      requestJson(srv.baseUrl, `/api/yakitlar/${yakitId}`, { method: 'PUT', token: tok, body: { arac_id: aracId, tarih: '2026-01-10', litre: 41, tutar: 1640, km: 5100 } }),
      requestJson(srv.baseUrl, `/api/yakitlar/${yakitId}`, { method: 'DELETE', token: tok }),
      requestJson(srv.baseUrl, '/api/bakimlar', { method: 'POST', token: tok, body: { arac_id: aracId, bakim_tipi: 'Fren', tarih: '2026-01-12', km: 5300, maliyet: 1000 } }),
      requestJson(srv.baseUrl, `/api/bakimlar/${bakimId}`, { method: 'PUT', token: tok, body: { arac_id: aracId, bakim_tipi: 'Periyodik Bakım', tarih: '2026-01-11', km: 5200, maliyet: 2600 } }),
      requestJson(srv.baseUrl, `/api/bakimlar/${bakimId}`, { method: 'DELETE', token: tok }),
      requestJson(srv.baseUrl, '/api/parcalar', { method: 'POST', token: tok, body: { arac_id: aracId, parca_adi: 'Yeni', son_degisim_km: 5200, son_degisim_tarihi: '2026-01-11' } }),
      requestJson(srv.baseUrl, `/api/parcalar/${parcaId}`, { method: 'PUT', token: tok, body: { maliyet: 400 } }),
      requestJson(srv.baseUrl, `/api/parcalar/${parcaId}`, { method: 'DELETE', token: tok }),
    ]);
    for (const r of checks) {
      assert.equal(r.status, 409);
      assert.equal(r.body.code, 'VEHICLE_ARCHIVED');
    }

    const parcalarRes = await requestJson(srv.baseUrl, '/api/parcalar', { token: tok });
    assert.equal(parcalarRes.status, 200);
    assert.equal(parcalarRes.body.parcalar.some((p) => p.arac_id === aracId), false);

    await pool.query(
      `INSERT INTO yakit_anomalileri (org_id, arac_id, yakit_id, tip, seviye, aciklama, durum)
       VALUES ($1, $2, $3, 'depo_asimi', 'kritik', 'QA arsiv dislama', 'acik')`,
      [org.org_id, aracId, yakitId]
    );
    const anomRes = await requestJson(srv.baseUrl, '/api/yakitlar/anomaliler?durum=acik', { token: tok });
    assert.equal(anomRes.status, 200);
    assert.equal(anomRes.body.ozet.acik, 0);
    assert.equal(anomRes.body.anomaliler.some((a) => a.arac_id === aracId), false);

    const konumSelf = await requestJson(srv.baseUrl, `/api/araclar/${aracId}/konum`, {
      method: 'PUT', token: tok, body: { enlem: 41.01, boylam: 28.97 },
    });
    assert.equal(konumSelf.status, 409);
    assert.equal(konumSelf.body.code, 'VEHICLE_ARCHIVED');

    const updSelf = await requestJson(srv.baseUrl, `/api/araclar/${aracId}`, {
      method: 'PUT', token: tok, body: { plaka: '34FRG003', marka: 'Renault', model: 'Megane', yil: 2024 },
    });
    assert.equal(updSelf.status, 409);
    assert.equal(updSelf.body.code, 'VEHICLE_ARCHIVED');

    const orgB = await createTestOrg('arcB');
    const mgrB = await createTestUser({ orgId: orgB.org_id, role: 'FLEET_MANAGER', tag: 'arcMgrB' });
    const tokB = (await loginUser(srv.baseUrl, mgrB.email)).body.token;
    const konumOther = await requestJson(srv.baseUrl, `/api/araclar/${aracId}/konum`, {
      method: 'PUT', token: tokB, body: { enlem: 41.01, boylam: 28.97 },
    });
    assert.equal(konumOther.status, 404);
    const updOther = await requestJson(srv.baseUrl, `/api/araclar/${aracId}`, {
      method: 'PUT', token: tokB, body: { plaka: '34FRG003', marka: 'Renault', model: 'Megane', yil: 2024 },
    });
    assert.equal(updOther.status, 404);

    assert.equal((await requestJson(srv.baseUrl, `/api/araclar/${aracId}/geri-yukle`, { method: 'PATCH', token: tok })).status, 200);
    assert.equal((await requestJson(srv.baseUrl, `/api/parcalar/${parcaId}`, { method: 'DELETE', token: tok })).status, 200);

    const audit = await pool.query(
      `SELECT denetim_id, org_id FROM denetim_kayitlari WHERE eylem = 'PARCA_SILINDI' AND varlik_tipi = 'parca' AND varlik_id = $1`,
      [parcaId]
    );
    assert.equal(audit.rowCount, 1);
    assert.equal(audit.rows[0].org_id, org.org_id);
    await pool.query('DELETE FROM organizations WHERE org_id = $1', [org.org_id]);
    const afterDel = await pool.query('SELECT org_id FROM denetim_kayitlari WHERE denetim_id = $1', [audit.rows[0].denetim_id]);
    assert.equal(afterDel.rowCount, 1);
    assert.equal(afterDel.rows[0].org_id, null);
  });

  it('5) Gercek /api/yakitlar/toplu-aktar ters-sirali ayni gun CSV kronoloji + dedup', async () => {
    const org = await createTestOrg('csv');
    const mgr = await createTestUser({ orgId: org.org_id, role: 'FLEET_MANAGER', tag: 'csvMgr' });
    const tok = (await loginUser(srv.baseUrl, mgr.email)).body.token;
    await requestJson(srv.baseUrl, '/api/araclar/ekle', {
      method: 'POST', token: tok,
      body: { plaka: '34FRGCSV1', marka: 'VW', model: 'Caddy', yil: 2024, guncel_km: 1000, sayac_tipi: 'KM' },
    });
    const csvText = 'plaka;tarih;litre;tutar;km\n34FRGCSV1;10.01.2026;30;1200;1500\n34FRGCSV1;10.01.2026;25;1000;1200';
    const imp1 = await requestJson(srv.baseUrl, '/api/yakitlar/toplu-aktar', { method: 'POST', token: tok, body: { csv_text: csvText } });
    assert.equal(imp1.status, 201);
    assert.equal(imp1.body.ozet.eklenen, 2);
    const imp2 = await requestJson(srv.baseUrl, '/api/yakitlar/toplu-aktar', { method: 'POST', token: tok, body: { csv_text: csvText } });
    assert.equal(imp2.status, 201);
    assert.equal(imp2.body.ozet.eklenen, 0);
    assert.equal(imp2.body.ozet.mukerrer, 2);
  });

  it('6) token_version iptali (self password, admin reset, role change) + DRIVER yetki sifirlama', async () => {
    const org = await createTestOrg('auth');
    const admin = await createTestUser({ orgId: org.org_id, role: 'FLEET_MANAGER', tag: 'authAdm' });
    const target = await createTestUser({ orgId: org.org_id, role: 'FLEET_MANAGER', tag: 'authUsr', yetkiler: { yakit: true, finans: true } });
    const tokAdm = (await loginUser(srv.baseUrl, admin.email)).body.token;
    const tokSelf1 = (await loginUser(srv.baseUrl, target.email)).body.token;

    const selfPwd = await requestJson(srv.baseUrl, '/api/users/settings/password', {
      method: 'PUT', token: tokSelf1, body: { mevcut_sifre: target.rawPassword, yeni_sifre: 'NewPass123!' },
    });
    assert.equal(selfPwd.status, 200);
    const rev1 = await requestJson(srv.baseUrl, '/api/araclar', { token: tokSelf1 });
    assert.equal(rev1.status, 401);
    assert.equal(rev1.body.code, 'TOKEN_REVOKED');

    const tokSelf2 = (await loginUser(srv.baseUrl, target.email, 'NewPass123!')).body.token;
    assert.equal((await requestJson(srv.baseUrl, `/api/admin/users/${target.user_id}/password`, { method: 'PUT', token: tokAdm, body: { yeni_sifre: 'ResetPass123!' } })).status, 200);
    const rev2 = await requestJson(srv.baseUrl, '/api/araclar', { token: tokSelf2 });
    assert.equal(rev2.status, 401);
    assert.equal(rev2.body.code, 'TOKEN_REVOKED');

    const tokSelf3 = (await loginUser(srv.baseUrl, target.email, 'ResetPass123!')).body.token;
    const roleRes = await requestJson(srv.baseUrl, `/api/admin/users/${target.user_id}/role`, { method: 'PUT', token: tokAdm, body: { role: 'DRIVER' } });
    assert.equal(roleRes.status, 200);
    assert.deepEqual(roleRes.body.user.yetkiler, {});
    const rev3 = await requestJson(srv.baseUrl, '/api/araclar', { token: tokSelf3 });
    assert.equal(rev3.status, 401);
    assert.equal(rev3.body.code, 'TOKEN_REVOKED');
  });
});
