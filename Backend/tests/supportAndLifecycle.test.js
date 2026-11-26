const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { runMigrations } = require('../scripts/migrate');
const { toggleUserStatusTx } = require('../services/adminUserStatusService');
const {
  pool, startTestServer, requestJson, createTestOrg, createTestUser,
  loginUser, takeExternalSnapshot, cleanupTestSuite,
} = require('./helpers/pgTestHarness');

describe('FORGE-E2 Support Feedback & Account Lifecycle Tests', () => {
  let srv, beforeSnap;
  let orgA, orgB, sysAdm, mgrA, mgrB, drvA, drvB;
  let tokSys, tokMgrA, tokMgrB, tokDrvA, tokDrvB;
  let aracA;
  const createdFeedbackIds = [];

  before(async () => {
    await runMigrations(pool);
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();

    orgA = await createTestOrg('e2A');
    orgB = await createTestOrg('e2B');
    sysAdm = await createTestUser({ orgId: orgA.org_id, role: 'SYSTEM_ADMIN', tag: 'e2Sys' });
    mgrA = await createTestUser({ orgId: orgA.org_id, role: 'FLEET_MANAGER', tag: 'e2MgrA' });
    mgrB = await createTestUser({ orgId: orgB.org_id, role: 'FLEET_MANAGER', tag: 'e2MgrB' });
    drvA = await createTestUser({ orgId: orgA.org_id, role: 'DRIVER', tag: 'e2DrvA' });
    drvB = await createTestUser({ orgId: orgB.org_id, role: 'DRIVER', tag: 'e2DrvB' });

    tokSys = (await loginUser(srv.baseUrl, sysAdm.email)).body.token;
    tokMgrA = (await loginUser(srv.baseUrl, mgrA.email)).body.token;
    tokMgrB = (await loginUser(srv.baseUrl, mgrB.email)).body.token;
    tokDrvA = (await loginUser(srv.baseUrl, drvA.email)).body.token;
    tokDrvB = (await loginUser(srv.baseUrl, drvB.email)).body.token;

    const aracRes = await requestJson(srv.baseUrl, '/api/araclar/ekle', {
      method: 'POST',
      token: tokMgrA,
      body: { plaka: '34E20001', marka: 'Ford', model: 'Focus', yil: 2024, guncel_km: 1200, sayac_tipi: 'KM' },
    });
    assert.equal(aracRes.status, 201);
    aracA = aracRes.body.arac.arac_id;
  });

  after(async () => {
    if (createdFeedbackIds.length > 0) {
      await pool.query('DELETE FROM geri_bildirimler WHERE id = ANY($1::int[])', [createdFeedbackIds]);
    }
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    if (srv) await srv.close();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('1) 011 migrasyon idempotensi + uq_sofor_tek_aktif_zimmet tekilligi', async () => {
    const r = await runMigrations(pool);
    assert.equal(r.ok, true);
    assert.equal(r.applied.length, 0);

    const idxRes = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('uq_sofor_tek_aktif_zimmet', 'idx_geri_bildirimler_org_tarih', 'idx_geri_bildirimler_durum_tarih')"
    );
    assert.equal(idxRes.rowCount, 3);

    const colRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'aktif_mi'"
    );
    assert.equal(colRes.rowCount, 1);

    const a2Res = await requestJson(srv.baseUrl, '/api/araclar/ekle', {
      method: 'POST',
      token: tokMgrA,
      body: { plaka: '34E20002', marka: 'Renault', model: 'Megane', yil: 2024, guncel_km: 500, sayac_tipi: 'KM' },
    });
    assert.equal(a2Res.status, 201);
    const aracA2 = a2Res.body.arac.arac_id;

    await pool.query('INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif) VALUES ($1, $2, TRUE)', [aracA, drvA.user_id]);
    await assert.rejects(
      () => pool.query('INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif) VALUES ($1, $2, TRUE)', [aracA2, drvA.user_id]),
      (err) => err.code === '23505'
    );
    await pool.query('UPDATE arac_sofor_atamalari SET aktif = FALSE, teslim_tarihi = NOW() WHERE sofor_user_id = $1 AND aktif = TRUE', [drvA.user_id]);
  });

  it('2) Pasif hesapta login/JWT 403 ACCOUNT_DISABLED, yanlis sifre 401, zimmet kapanisi & DRIVER_INACTIVE', async () => {
    // Kendini pasife alma engeli
    const selfRes = await requestJson(srv.baseUrl, `/api/admin/users/${mgrA.user_id}/status`, {
      method: 'PATCH', token: tokMgrA, body: { aktif_mi: false },
    });
    assert.equal(selfRes.status, 400);
    assert.equal(selfRes.body.code, 'SELF_ACTION_FORBIDDEN');

    // Aktif zimmet ver
    const assignRes = await requestJson(srv.baseUrl, '/api/admin/assign', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracA, sofor_user_id: drvA.user_id },
    });
    assert.equal(assignRes.status, 201);

    // Soforu pasife cek -> aktif zimmet kapanmali
    const disableRes = await requestJson(srv.baseUrl, `/api/admin/users/${drvA.user_id}/status`, {
      method: 'PATCH', token: tokMgrA, body: { aktif_mi: false },
    });
    assert.equal(disableRes.status, 200);
    assert.equal(disableRes.body.user.aktif_mi, false);
    assert.equal(disableRes.body.kapatilan_zimmet_sayisi, 1);

    // Yanlis sifre -> 401 (sifre oncesi ACCOUNT_DISABLED sizmaz)
    const wrongPass = await loginUser(srv.baseUrl, drvA.email, 'YanlisSifre999!');
    assert.equal(wrongPass.status, 401);

    // Dogru sifre -> 403 ACCOUNT_DISABLED
    const disabledLogin = await loginUser(srv.baseUrl, drvA.email);
    assert.equal(disabledLogin.status, 403);
    assert.equal(disabledLogin.body.code, 'ACCOUNT_DISABLED');

    // Mevcut JWT -> 403 ACCOUNT_DISABLED
    const jwtCheck = await requestJson(srv.baseUrl, '/api/geri-bildirim', { method: 'GET', token: tokDrvA });
    assert.equal(jwtCheck.status, 403);
    assert.equal(jwtCheck.body.code, 'ACCOUNT_DISABLED');

    // Pasif sofore zimmet atama -> 409 DRIVER_INACTIVE
    const assignInactive = await requestJson(srv.baseUrl, '/api/admin/assign', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracA, sofor_user_id: drvA.user_id },
    });
    assert.equal(assignInactive.status, 409);
    assert.equal(assignInactive.body.code, 'DRIVER_INACTIVE');

    // Aktife geri al -> login & denetim kaydi
    const enableRes = await requestJson(srv.baseUrl, `/api/admin/users/${drvA.user_id}/status`, {
      method: 'PATCH', token: tokMgrA, body: { aktif_mi: true },
    });
    assert.equal(enableRes.status, 200);
    assert.equal(enableRes.body.user.aktif_mi, true);
    tokDrvA = (await loginUser(srv.baseUrl, drvA.email)).body.token;

    const auditRes = await pool.query(
      "SELECT COUNT(*)::int AS c FROM denetim_kayitlari WHERE varlik_tipi = 'user' AND varlik_id = $1 AND eylem = 'KULLANICI_DURUM_GUNCELLENDI'",
      [drvA.user_id]
    );
    assert.equal(auditRes.rows[0].c, 2);
  });

  it('3) Son aktif SYSTEM_ADMIN pasife cekilemez (409 LAST_SYSTEM_ADMIN) & cross-tenant korumasi', async () => {
    const crossRes = await requestJson(srv.baseUrl, `/api/admin/users/${drvA.user_id}/status`, {
      method: 'PATCH', token: tokMgrB, body: { aktif_mi: false },
    });
    assert.equal(crossRes.status, 404);

    const mgrSysRes = await requestJson(srv.baseUrl, `/api/admin/users/${sysAdm.user_id}/status`, {
      method: 'PATCH', token: tokMgrA, body: { aktif_mi: false },
    });
    assert.equal(mgrSysRes.status, 403);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE users SET aktif_mi = FALSE WHERE role = 'SYSTEM_ADMIN' AND user_id <> $1", [sysAdm.user_id]);
      await assert.rejects(
        () => toggleUserStatusTx(client, { user_id: sysAdm.user_id + 9999, role: 'SYSTEM_ADMIN', org_id: null }, sysAdm.user_id, false),
        (err) => err.statusCode === 409 && err.code === 'LAST_SYSTEM_ADMIN'
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('4) geri_bildirimler 3 rol RBAC, kontrol karakteri/uzunluk dogrulamasi ve durum guncelleme', async () => {
    const badCtrl = await requestJson(srv.baseUrl, '/api/geri-bildirim', {
      method: 'POST',
      token: tokDrvA,
      body: { kategori: 'HATA', baslik: '\x00\x07ab ', mesaj: '\x00\x01kisa\x07' },
    });
    assert.equal(badCtrl.status, 422);

    const drvPost = await requestJson(srv.baseUrl, '/api/geri-bildirim', {
      method: 'POST',
      token: tokDrvA,
      body: {
        org_id: orgB.org_id, // JWT'deki orgA ezilmeli
        kategori: 'HATA',
        baslik: '  \x00Km sayaci gorunmuyor  ',
        mesaj: '  \x07Arac detay ekraninda km sayaci yuklenmiyor, kontrol edilmeli.  ',
        sayfa_yolu: '/araclar',
      },
    });
    assert.equal(drvPost.status, 201);
    const fbDrv = drvPost.body.geri_bildirim;
    createdFeedbackIds.push(fbDrv.id);
    assert.equal(fbDrv.org_id, orgA.org_id);
    assert.equal(fbDrv.user_id, drvA.user_id);
    assert.equal(fbDrv.rol, 'DRIVER');
    assert.equal(fbDrv.baslik, 'Km sayaci gorunmuyor');

    const mgrBPost = await requestJson(srv.baseUrl, '/api/geri-bildirim', {
      method: 'POST',
      token: tokMgrB,
      body: { kategori: 'ONERI', baslik: 'Yeni rapor filtresi', mesaj: 'Tarih araligi filtresi eklenmesini talep ediyoruz.' },
    });
    assert.equal(mgrBPost.status, 201);
    createdFeedbackIds.push(mgrBPost.body.geri_bildirim.id);

    // DRIVER yalniz kendi kaydini gorur, PATCH 403 alir
    const drvList = await requestJson(srv.baseUrl, '/api/geri-bildirim', { method: 'GET', token: tokDrvB });
    assert.equal(drvList.status, 200);
    assert.ok(!drvList.body.geri_bildirimler.some((x) => x.id === fbDrv.id || x.id === mgrBPost.body.geri_bildirim.id));
    assert.equal((await requestJson(srv.baseUrl, `/api/geri-bildirim/${fbDrv.id}/durum`, { method: 'PATCH', token: tokDrvA, body: { durum: 'COZULDU' } })).status, 403);

    // FLEET_MANAGER yalniz kendi orgunu gorur, PATCH 403 alir
    const mgrAList = await requestJson(srv.baseUrl, '/api/geri-bildirim', { method: 'GET', token: tokMgrA });
    assert.equal(mgrAList.status, 200);
    assert.ok(mgrAList.body.geri_bildirimler.some((x) => x.id === fbDrv.id && x.org_ad === orgA.unvan));
    assert.ok(!mgrAList.body.geri_bildirimler.some((x) => x.id === mgrBPost.body.geri_bildirim.id));
    assert.equal((await requestJson(srv.baseUrl, `/api/geri-bildirim/${fbDrv.id}/durum`, { method: 'PATCH', token: tokMgrA, body: { durum: 'COZULDU' } })).status, 403);

    // SYSTEM_ADMIN tumunu gorur, filtreler ve gunceller
    const sysList = await requestJson(srv.baseUrl, '/api/geri-bildirim?durum=ACIK&kategori=HATA', { method: 'GET', token: tokSys });
    assert.equal(sysList.status, 200);
    assert.ok(sysList.body.geri_bildirimler.some((x) => x.id === fbDrv.id));

    const sysPatch = await requestJson(srv.baseUrl, `/api/geri-bildirim/${fbDrv.id}/durum`, {
      method: 'PATCH', token: tokSys, body: { durum: 'COZULDU', yonetici_notu: 'Duzeltildi.' },
    });
    assert.equal(sysPatch.status, 200);
    assert.equal(sysPatch.body.geri_bildirim.durum, 'COZULDU');
    assert.equal(sysPatch.body.geri_bildirim.yonetici_notu, 'Duzeltildi.');
  });
});
