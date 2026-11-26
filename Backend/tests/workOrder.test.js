const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { runMigrations } = require('../scripts/migrate');
const { bugunTR } = require('../utils/dateUtils');
const {
  pool, startTestServer, requestJson, createTestOrg, createTestUser,
  loginUser, takeExternalSnapshot, cleanupTestSuite,
} = require('./helpers/pgTestHarness');

describe('FORGE Work Orders (is_emirleri) E2E Tests', () => {
  let srv;
  let beforeSnap;
  let orgA;
  let orgB;
  let mgrA;
  let drvA;
  let tokMgrA;
  let tokDrvA;
  let aracAssigned;
  let aracUnassigned;
  let aracOrgB;
  let aracSmh;

  const addArac = async (token, body) => {
    const res = await requestJson(srv.baseUrl, '/api/araclar/ekle', { method: 'POST', token, body });
    assert.equal(res.status, 201);
    return res.body.arac.arac_id;
  };

  before(async () => {
    await runMigrations(pool);
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();
    orgA = await createTestOrg('woA');
    orgB = await createTestOrg('woB');
    mgrA = await createTestUser({ orgId: orgA.org_id, role: 'FLEET_MANAGER', tag: 'woMgrA' });
    const mgrB = await createTestUser({ orgId: orgB.org_id, role: 'FLEET_MANAGER', tag: 'woMgrB' });
    drvA = await createTestUser({ orgId: orgA.org_id, role: 'DRIVER', tag: 'woDrvA', yetkiler: { bakim: false } });
    const drvSmh = await createTestUser({ orgId: orgA.org_id, role: 'DRIVER', tag: 'woDrvSmh', yetkiler: { bakim: false } });
    tokMgrA = (await loginUser(srv.baseUrl, mgrA.email)).body.token;
    const tokMgrB = (await loginUser(srv.baseUrl, mgrB.email)).body.token;
    tokDrvA = (await loginUser(srv.baseUrl, drvA.email)).body.token;
    const tokDrvSmh = (await loginUser(srv.baseUrl, drvSmh.email)).body.token;

    aracAssigned = await addArac(tokMgrA, { plaka: '34WO0001', marka: 'Ford', model: 'Transit', yil: 2024, guncel_km: 1000, sayac_tipi: 'KM' });
    aracUnassigned = await addArac(tokMgrA, { plaka: '34WO0002', marka: 'Fiat', model: 'Doblo', yil: 2024, guncel_km: 2000, sayac_tipi: 'KM' });
    aracSmh = await addArac(tokMgrA, { plaka: '34WOSMH1', marka: 'CAT', model: '320', yil: 2023, guncel_km: 100, sayac_tipi: 'SMH' });
    aracOrgB = await addArac(tokMgrB, { plaka: '34WOB001', marka: 'Renault', model: 'Master', yil: 2024, guncel_km: 500, sayac_tipi: 'KM' });

    await pool.query(
      `INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif) VALUES ($1, $2, TRUE), ($3, $4, TRUE)`,
      [aracAssigned, drvA.user_id, aracSmh, drvSmh.user_id]
    );
    srv._tokDrvSmh = tokDrvSmh;
    await pool.query(
      `INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, degisim_araligi_km, son_degisim_tarihi)
       VALUES ($1, 'Motor Yağı', 500, 10000, '2025-12-01') ON CONFLICT (arac_id, parca_adi) DO NOTHING`,
      [aracAssigned]
    );
  });

  after(async () => {
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    if (srv) await srv.close();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('1) 008 idempotency + is_emirleri tablosu ve 3 indeks', async () => {
    const r = await runMigrations(pool);
    assert.equal(r.ok, true);
    assert.equal(r.applied.length, 0);
    const idx = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'is_emirleri'`
    );
    const names = idx.rows.map((x) => x.indexname);
    assert.ok(names.includes('idx_is_emirleri_org_durum'));
    assert.ok(names.includes('idx_is_emirleri_arac_durum'));
    assert.ok(names.includes('uq_is_emirleri_bakim'));
  });

  it('2) DRIVER RBAC, zimmet, capraz kurum 404 ve kendi acik talebini iptal', async () => {
    const ok = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST', token: tokDrvA,
      body: { arac_id: aracAssigned, baslik: 'Fren sesi', kategori: 'ariza', oncelik: 'yuksek', bildirilen_sayac: 1100.5 },
    });
    assert.equal(ok.status, 201);
    const woId = ok.body.is_emri.is_emri_id;

    const mgrField = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST', token: tokDrvA,
      body: { arac_id: aracAssigned, baslik: 'Yetkisiz servis', servis_adi: 'ABC' },
    });
    assert.equal(mgrField.status, 403);
    assert.equal(mgrField.body.code, 'FORBIDDEN_ROLE');

    const unass = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST', token: tokDrvA, body: { arac_id: aracUnassigned, baslik: 'Zimmetsiz' },
    });
    assert.equal(unass.status, 403);
    assert.equal(unass.body.code, 'FORBIDDEN_VEHICLE_ACCESS');

    const cross = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST', token: tokDrvA, body: { arac_id: aracOrgB, baslik: 'Yabanci org' },
    });
    assert.equal(cross.status, 404);
    assert.equal(cross.body.code, 'VEHICLE_NOT_FOUND');

    const comp = await requestJson(srv.baseUrl, `/api/is-emirleri/${woId}/tamamla`, {
      method: 'POST', token: tokDrvA, body: { tarih: '2026-01-15', sayac_degeri: 1150, tutar: 500 },
    });
    assert.equal(comp.status, 403);
    assert.equal(comp.body.code, 'FORBIDDEN_ROLE');

    const cancel = await requestJson(srv.baseUrl, `/api/is-emirleri/${woId}/iptal`, {
      method: 'POST', token: tokDrvA, body: { red_iptal_nedeni: 'Yanlış açıldı' },
    });
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.is_emri.durum, 'iptal');
  });

  it('3) Yonetici tamamlama -> bakimlar, guncel_km, parca_takip, audit, bildirim, planlanan_tarih, aksiyon merkezi', async () => {
    const cr = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST', token: tokDrvA,
      body: { arac_id: aracAssigned, baslik: '10 bin bakimi', kategori: 'periyodik_bakim', oncelik: 'kritik' },
    });
    assert.equal(cr.status, 201);
    const woId = cr.body.is_emri.is_emri_id;

    const ac = await requestJson(srv.baseUrl, '/api/bildirimler/aksiyon-merkezi', { token: tokMgrA });
    assert.equal(ac.status, 200);
    assert.ok(ac.body.ozet.is_emri_sayisi >= 1);
    assert.ok(ac.body.ogeler.some((x) => x.kategori === 'is_emri' && x.meta?.is_emri_id === woId));

    const today = bugunTR();
    const badKm = await requestJson(srv.baseUrl, `/api/is-emirleri/${woId}/tamamla`, {
      method: 'POST', token: tokMgrA, body: { tarih: today, sayac_degeri: 500, tutar: 3000 },
    });
    assert.equal(badKm.status, 422);
    assert.equal(badKm.body.code, 'SAYAC_KRONOLOJI_IHLALI');
    const stillOpen = await pool.query('SELECT durum FROM is_emirleri WHERE is_emri_id = $1', [woId]);
    assert.equal(stillOpen.rows[0].durum, 'acik');

    const badPatch = await requestJson(srv.baseUrl, `/api/is-emirleri/${woId}`, {
      method: 'PATCH', token: tokMgrA, body: { durum: 'tamamlandi' },
    });
    assert.equal(badPatch.status, 400);
    assert.equal(badPatch.body.code, 'INVALID_TRANSITION');

    const patch = await requestJson(srv.baseUrl, `/api/is-emirleri/${woId}`, {
      method: 'PATCH', token: tokMgrA,
      body: { durum: 'serviste', servis_adi: 'Yetkili Servis', planlanan_tarih: '2026-02-15' },
    });
    assert.equal(patch.status, 200);
    assert.equal(patch.body.is_emri.planlanan_tarih, '2026-02-15');

    const decKm = await requestJson(srv.baseUrl, `/api/is-emirleri/${woId}/tamamla`, {
      method: 'POST', token: tokMgrA, body: { tarih: today, sayac_degeri: 1500.5, tutar: 3000 },
    });
    assert.equal(decKm.status, 400);
    assert.equal(decKm.body.code, 'INVALID_ODOMETER');

    const ok = await requestJson(srv.baseUrl, `/api/is-emirleri/${woId}/tamamla`, {
      method: 'POST', token: tokMgrA, body: { tarih: today, sayac_degeri: 1500, tutar: 4200, fatura_no: 'WO-FTR-1' },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.is_emri.durum, 'tamamlandi');
    assert.equal(ok.body.bakim.km, 1500);

    const [aQ, pQ, dQ, nQ] = await Promise.all([
      pool.query('SELECT guncel_km FROM araclar WHERE arac_id = $1', [aracAssigned]),
      pool.query(`SELECT son_degisim_km FROM parca_takip WHERE arac_id = $1 AND parca_adi = 'Motor Yağı'`, [aracAssigned]),
      pool.query(`SELECT 1 FROM denetim_kayitlari WHERE eylem = 'IS_EMRI_TAMAMLANDI' AND varlik_id = $1`, [woId]),
      pool.query(`SELECT 1 FROM bildirim_olaylari WHERE user_id = $1 AND referans_anahtar = $2`, [drvA.user_id, `is_emri:${woId}:tamamlandi`]),
    ]);
    assert.equal(aQ.rows[0].guncel_km, 1500);
    assert.equal(pQ.rows[0].son_degisim_km, 1500);
    assert.equal(dQ.rowCount, 1);
    assert.equal(nQ.rowCount, 1);
  });

  it('4) SMH ondalikli tamamlama + Promise.all eszamanli cift tamamlama + arsivleme oto-iptal', async () => {
    const smhWo = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST', token: srv._tokDrvSmh, body: { arac_id: aracSmh, baslik: 'Hidrolik kontrol' },
    });
    const smhId = smhWo.body.is_emri.is_emri_id;
    const [r1, r2] = await Promise.all([
      requestJson(srv.baseUrl, `/api/is-emirleri/${smhId}/tamamla`, { method: 'POST', token: tokMgrA, body: { tarih: '2026-01-21', sayac_degeri: 125.5, tutar: 1800 } }),
      requestJson(srv.baseUrl, `/api/is-emirleri/${smhId}/tamamla`, { method: 'POST', token: tokMgrA, body: { tarih: '2026-01-21', sayac_degeri: 125.5, tutar: 1800 } }),
    ]);
    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [200, 409]);
    const conflict = r1.status === 409 ? r1 : r2;
    assert.equal(conflict.body.code, 'WORKORDER_ALREADY_CLOSED');
    const bCount = await pool.query('SELECT km, notlar FROM bakimlar WHERE arac_id = $1', [aracSmh]);
    assert.equal(bCount.rowCount, 1);
    assert.equal(bCount.rows[0].km, 126);
    assert.ok(bCount.rows[0].notlar.includes('125.5'));

    const openBeforeArc = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracUnassigned, baslik: 'Arsiv oncesi acik' },
    });
    assert.equal(openBeforeArc.status, 201);
    const arcRes = await requestJson(srv.baseUrl, `/api/araclar/${aracUnassigned}/arsiv`, {
      method: 'PATCH', token: tokMgrA, body: { arsiv_nedeni: 'Satildi' },
    });
    assert.equal(arcRes.status, 200);
    assert.equal(arcRes.body.kapatilan_is_emri_sayisi, 1);
    const closedQ = await pool.query('SELECT durum, red_iptal_nedeni FROM is_emirleri WHERE is_emri_id = $1', [openBeforeArc.body.is_emri.is_emri_id]);
    assert.equal(closedQ.rows[0].durum, 'iptal');
    assert.equal(closedQ.rows[0].red_iptal_nedeni, 'Araç arşivlendi');

    const arcBlocked = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracUnassigned, baslik: 'Arsivli arac' },
    });
    assert.equal(arcBlocked.status, 409);
    assert.equal(arcBlocked.body.code, 'VEHICLE_ARCHIVED');
  });
});
