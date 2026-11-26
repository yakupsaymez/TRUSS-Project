const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runMigrations } = require('../scripts/migrate');
const { bugunTR, gunEkleTR } = require('../utils/dateUtils');
const {
  pool, startTestServer, requestJson, createTestOrg, createTestUser,
  loginUser, takeExternalSnapshot, cleanupTestSuite,
} = require('./helpers/pgTestHarness');

describe('FORGE-C2 Handover & Inspection E2E Tests', () => {
  let srv, beforeSnap, tmpVaultDir, prevVaultDir;
  let orgA, orgB, mgrA, mgrB, drv1, drv2, tokMgrA, tokMgrB, tokDrv1, tokDrv2;
  let aracKm, aracSmh, aracArch;

  const addArac = async (token, body) => {
    const r = await requestJson(srv.baseUrl, '/api/araclar/ekle', { method: 'POST', token, body });
    assert.equal(r.status, 201);
    return r.body.arac.arac_id;
  };
  const uploadImg = async (token, aracId, name = 'foto.jpg', mime = 'image/jpeg') => {
    const buf = Buffer.from('FAKE_IMG_DATA');
    const pre = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
      method: 'POST', token, body: { arac_id: aracId, varlik_tipi: 'zimmet', orijinal_ad: name, mime_tipi: mime, boyut_bayt: buf.byteLength },
    });
    if (pre.status !== 201) return { pre, putStatus: null };
    const putRes = await fetch(pre.body.yukleme.url, { method: 'PUT', headers: { 'Content-Type': mime }, body: buf });
    return { pre, putStatus: putRes.status };
  };

  before(async () => {
    await runMigrations(pool);
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    prevVaultDir = process.env.DOC_VAULT_LOCAL_DIR;
    tmpVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'truss-handover-test-'));
    process.env.DOC_VAULT_LOCAL_DIR = tmpVaultDir;

    srv = await startTestServer();
    orgA = await createTestOrg('hoA');
    orgB = await createTestOrg('hoB');
    mgrA = await createTestUser({ orgId: orgA.org_id, role: 'FLEET_MANAGER', tag: 'hoMgrA' });
    mgrB = await createTestUser({ orgId: orgB.org_id, role: 'FLEET_MANAGER', tag: 'hoMgrB' });
    drv1 = await createTestUser({ orgId: orgA.org_id, role: 'DRIVER', tag: 'hoDrv1', yetkiler: { yakit: true, finans: false } });
    drv2 = await createTestUser({ orgId: orgA.org_id, role: 'DRIVER', tag: 'hoDrv2' });
    tokMgrA = (await loginUser(srv.baseUrl, mgrA.email)).body.token;
    tokMgrB = (await loginUser(srv.baseUrl, mgrB.email)).body.token;
    tokDrv1 = (await loginUser(srv.baseUrl, drv1.email)).body.token;
    tokDrv2 = (await loginUser(srv.baseUrl, drv2.email)).body.token;

    aracKm = await addArac(tokMgrA, { plaka: '34HO0001', marka: 'Ford', model: 'Transit', yil: 2024, guncel_km: 5000, sayac_tipi: 'KM' });
    aracSmh = await addArac(tokMgrA, { plaka: '34HOSMH1', marka: 'CAT', model: '320', yil: 2023, guncel_km: 100, sayac_tipi: 'SMH' });
    aracArch = await addArac(tokMgrA, { plaka: '34HOARCH', marka: 'Fiat', model: 'Doblo', yil: 2022, guncel_km: 2000, sayac_tipi: 'KM' });
    assert.equal((await requestJson(srv.baseUrl, `/api/araclar/${aracArch}/arsiv`, { method: 'PATCH', token: tokMgrA, body: { arsiv_nedeni: 'Satildi' } })).status, 200);
  });

  after(async () => {
    if (prevVaultDir === undefined) delete process.env.DOC_VAULT_LOCAL_DIR;
    else process.env.DOC_VAULT_LOCAL_DIR = prevVaultDir;
    if (tmpVaultDir && fs.existsSync(tmpVaultDir)) fs.rmSync(tmpVaultDir, { recursive: true, force: true });
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    if (srv) await srv.close();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('1) 010 idempotensi + indeksler + arsivli aracta 409 VEHICLE_ARCHIVED', async () => {
    const r = await runMigrations(pool);
    assert.equal(r.ok, true);
    assert.equal(r.applied.length, 0);

    const idx = await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'zimmet_muayeneleri'");
    const names = idx.rows.map((x) => x.indexname);
    for (const reqIdx of ['idx_zimmet_muayeneleri_org_tarih', 'idx_zimmet_muayeneleri_arac', 'idx_zimmet_muayeneleri_sofor', 'uq_zimmet_muayeneleri_is_emri']) {
      assert.ok(names.includes(reqIdx));
    }

    const archAssign = await requestJson(srv.baseUrl, '/api/admin/assign', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracArch, sofor_user_id: drv1.user_id },
    });
    assert.equal(archAssign.status, 409);
    assert.equal(archAssign.body.code, 'VEHICLE_ARCHIVED');

    // Aktif atama varken arac sonradan arsivlenirse muayene 409 vermeli
    const asg = await requestJson(srv.baseUrl, '/api/admin/assign', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracKm, sofor_user_id: drv1.user_id },
    });
    assert.equal(asg.status, 201);
    const aid = asg.body.assignment.atama_id;
    await pool.query('UPDATE araclar SET arsivlendi_mi = TRUE WHERE arac_id = $1', [aracKm]);
    const archInsp = await requestJson(srv.baseUrl, `/api/zimmetler/${aid}/muayeneler`, {
      method: 'POST', token: tokMgrA, body: { muayene_tipi: 'TESLIM_ALMA', muayene_tarihi: bugunTR(), sayac_degeri: 5100 },
    });
    assert.equal(archInsp.status, 409);
    assert.equal(archInsp.body.code, 'VEHICLE_ARCHIVED');
    await pool.query('UPDATE araclar SET arsivlendi_mi = FALSE WHERE arac_id = $1', [aracKm]);
  });

  it('2) Geri sayac 422, ileri tarih 400, ileri sayac senkronu & SMH ondalik hassasiyeti', async () => {
    const list = await requestJson(srv.baseUrl, `/api/zimmetler?arac_id=${aracKm}&aktif=true`, { token: tokMgrA });
    assert.equal(list.status, 200);
    const atamaId = list.body.zimmetler[0].atama_id;

    const future = await requestJson(srv.baseUrl, `/api/zimmetler/${atamaId}/muayeneler`, {
      method: 'POST', token: tokDrv1, body: { muayene_tipi: 'TESLIM_ALMA', muayene_tarihi: gunEkleTR(bugunTR(), 1), sayac_degeri: 5100 },
    });
    assert.equal(future.status, 400);
    assert.equal(future.body.code, 'FUTURE_DATE');

    const backKm = await requestJson(srv.baseUrl, `/api/zimmetler/${atamaId}/muayeneler`, {
      method: 'POST', token: tokDrv1, body: { muayene_tipi: 'TESLIM_ALMA', muayene_tarihi: bugunTR(), sayac_degeri: 4500 },
    });
    assert.equal(backKm.status, 422);
    assert.equal(backKm.body.code, 'SAYAC_KRONOLOJI_IHLALI');
    assert.equal(backKm.body.alt_sinir, 5000);

    const okKm = await requestJson(srv.baseUrl, `/api/zimmetler/${atamaId}/muayeneler`, {
      method: 'POST', token: tokDrv1, body: { muayene_tipi: 'TESLIM_ALMA', muayene_tarihi: bugunTR(), sayac_degeri: 5250 },
    });
    assert.equal(okKm.status, 201);
    assert.equal(okKm.body.muayene.genel_sonuc, 'TEMIZ');
    assert.equal(okKm.body.is_emri, null);

    const dup = await requestJson(srv.baseUrl, `/api/zimmetler/${atamaId}/muayeneler`, {
      method: 'POST', token: tokDrv1, body: { muayene_tipi: 'TESLIM_ALMA', muayene_tarihi: bugunTR(), sayac_degeri: 5260 },
    });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, 'HANDOVER_ALREADY_RECORDED');

    const kmRow = await pool.query('SELECT guncel_km FROM araclar WHERE arac_id = $1', [aracKm]);
    assert.equal(kmRow.rows[0].guncel_km, 5250);

    // SMH ondalik testi (once onceki KM zimmetini kapat)
    await requestJson(srv.baseUrl, `/api/admin/assign/${aracKm}`, { method: 'DELETE', token: tokMgrA });
    const smhAsg = await requestJson(srv.baseUrl, '/api/admin/assign', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracSmh, sofor_user_id: drv1.user_id },
    });
    const smhId = smhAsg.body.assignment.atama_id;
    const okSmh = await requestJson(srv.baseUrl, `/api/zimmetler/${smhId}/muayeneler`, {
      method: 'POST', token: tokDrv1, body: { muayene_tipi: 'TESLIM_ALMA', muayene_tarihi: bugunTR(), sayac_degeri: 125.5 },
    });
    assert.equal(okSmh.status, 201);
    assert.equal(okSmh.body.muayene.sayac_degeri, 125.5);

    const backSmh = await requestJson(srv.baseUrl, `/api/zimmetler/${smhId}/muayeneler`, {
      method: 'POST', token: tokDrv1, body: { muayene_tipi: 'TESLIM_ETME', muayene_tarihi: bugunTR(), sayac_degeri: 125.2 },
    });
    assert.equal(backSmh.status, 422);
    assert.equal(backSmh.body.alt_sinir, 125.5);
    await requestJson(srv.baseUrl, `/api/admin/assign/${aracSmh}`, { method: 'DELETE', token: tokMgrA });
    await requestJson(srv.baseUrl, '/api/admin/assign', { method: 'POST', token: tokMgrA, body: { arac_id: aracKm, sofor_user_id: drv1.user_id } });
  });

  it('3) PDF reddi, >4 gorsel 422, DRIVER zimmet gorsel okuma/taslak silme vs yakit 403 & aktif silme 403', async () => {
    const pdfReject = await uploadImg(tokDrv1, aracKm, 'ruhsat.pdf', 'application/pdf');
    assert.equal(pdfReject.pre.status, 400);
    assert.equal(pdfReject.pre.body.code, 'INVALID_MIME_TYPE');

    const draft = await uploadImg(tokDrv1, aracKm, 'taslak.png', 'image/png');
    assert.equal(draft.pre.status, 201);
    assert.equal((await requestJson(srv.baseUrl, `/api/belgeler/${draft.pre.body.belge_id}`, { method: 'DELETE', token: tokDrv1 })).status, 200);

    const keys = [];
    for (let i = 0; i < 5; i += 1) {
      const up = await uploadImg(tokMgrA, aracKm, `hasar${i}.webp`, 'image/webp');
      assert.equal(up.putStatus, 200);
      keys.push(up.pre.body.nesne_anahtari);
    }

    const active = await requestJson(srv.baseUrl, `/api/zimmetler?arac_id=${aracKm}&aktif=true`, { token: tokMgrA });
    const atamaId = active.body.zimmetler[0].atama_id;

    // DRIVER kapat_zimmet: true gonderemez
    const drvClose = await requestJson(srv.baseUrl, `/api/zimmetler/${atamaId}/muayeneler`, {
      method: 'POST', token: tokDrv1, body: { muayene_tipi: 'TESLIM_ETME', muayene_tarihi: bugunTR(), sayac_degeri: 5300, kapat_zimmet: true },
    });
    assert.equal(drvClose.status, 403);
    assert.equal(drvClose.body.code, 'FORBIDDEN_ROLE');

    // >4 gorsel 422
    const overLimit = await requestJson(srv.baseUrl, `/api/zimmetler/${atamaId}/muayeneler`, {
      method: 'POST', token: tokMgrA,
      body: { muayene_tipi: 'TESLIM_ETME', muayene_tarihi: bugunTR(), sayac_degeri: 5300, belge_anahtarlari: keys },
    });
    assert.equal(overLimit.status, 422);
    assert.equal(overLimit.body.code, 'HANDOVER_DOC_LIMIT_EXCEEDED');

    // Coklu kusur + 4 gorsel + kapat_zimmet: true -> tek konsolide ariza is emri (KRITIK -> kritik)
    const okClose = await requestJson(srv.baseUrl, `/api/zimmetler/${atamaId}/muayeneler`, {
      method: 'POST', token: tokMgrA,
      body: {
        muayene_tipi: 'TESLIM_ETME', muayene_tarihi: bugunTR(), sayac_degeri: 5350,
        lastik_durumu: 'KUSURLU', fren_durumu: 'KRITIK', kaporta_cam_durumu: 'KUSURLU',
        notlar: 'Sol on lastik asinmis, fren uyarisi var', belge_anahtarlari: keys.slice(0, 4), kapat_zimmet: true,
      },
    });
    assert.equal(okClose.status, 201);
    assert.equal(okClose.body.muayene.genel_sonuc, 'KRITIK');
    assert.equal(okClose.body.muayene.belgeler.length, 4);
    assert.equal(okClose.body.assignment.aktif, false);
    assert.ok(okClose.body.is_emri);
    assert.equal(okClose.body.is_emri.kategori, 'ariza');
    assert.equal(okClose.body.is_emri.oncelik, 'kritik');
    assert.equal(Number(okClose.body.is_emri.bildirilen_sayac), 5350);
    assert.equal(okClose.body.muayene.olusmus_is_emri_id, okClose.body.is_emri.is_emri_id);

    const woCnt = await pool.query('SELECT COUNT(*)::int AS c FROM is_emirleri WHERE arac_id = $1', [aracKm]);
    assert.equal(woCnt.rows[0].c, 1);

    // DRIVER zimmet gorsel erisimi & listeleme OK (kapatilmis olsa bile kendi zimmeti), yakit/bakim 403, aktif zimmet silme 403
    const zmDocs = await requestJson(srv.baseUrl, `/api/belgeler?varlik_tipi=zimmet&varlik_id=${okClose.body.muayene.muayene_id}`, { token: tokDrv1 });
    assert.equal(zmDocs.status, 200);
    assert.equal(zmDocs.body.belgeler.length, 4);

    const firstDocId = okClose.body.muayene.belgeler[0].belge_id;
    assert.equal((await requestJson(srv.baseUrl, `/api/belgeler/${firstDocId}/erisim`, { token: tokDrv1 })).status, 200);
    assert.equal((await requestJson(srv.baseUrl, '/api/belgeler?varlik_tipi=yakit', { token: tokDrv1 })).status, 403);
    const delActiveDrv = await requestJson(srv.baseUrl, `/api/belgeler/${firstDocId}`, { method: 'DELETE', token: tokDrv1 });
    assert.equal(delActiveDrv.status, 403);
    assert.equal(delActiveDrv.body.code, 'FORBIDDEN_ROLE');

    // Yönetici aktif zimmet görselini silebilir (bakimlar dalina dusmez)
    assert.equal((await requestJson(srv.baseUrl, `/api/belgeler/${firstDocId}`, { method: 'DELETE', token: tokMgrA })).status, 200);
  });

  it('4) Ikinci zimmette yeni atama_id + KUSURLU->yuksek + DRIVER kisiti + kiraci izolasyonu', async () => {
    const firstList = await requestJson(srv.baseUrl, `/api/zimmetler?arac_id=${aracKm}`, { token: tokMgrA });
    const firstAtamaId = firstList.body.zimmetler[0].atama_id;

    // Ayni araci drv2'ye zimmetle -> yeni atama_id uretilmeli
    const secondAssign = await requestJson(srv.baseUrl, '/api/admin/assign', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracKm, sofor_user_id: drv2.user_id },
    });
    assert.equal(secondAssign.status, 201);
    const secondAtamaId = secondAssign.body.assignment.atama_id;
    assert.ok(secondAtamaId > firstAtamaId);

    // drv1 eski kapatilmis atamasina muayene giremez & drv2'nin gorsellerini/detayini goremez
    const drv1Closed = await requestJson(srv.baseUrl, `/api/zimmetler/${firstAtamaId}/muayeneler`, {
      method: 'POST', token: tokDrv1, body: { muayene_tipi: 'TESLIM_ALMA', muayene_tarihi: bugunTR(), sayac_degeri: 5400 },
    });
    assert.equal(drv1Closed.status, 403);
    assert.equal((await requestJson(srv.baseUrl, `/api/zimmetler/${secondAtamaId}`, { token: tokDrv1 })).status, 403);

    // drv2 KUSURLU muayene -> yuksek oncelikli ariza is emri
    const drv2Insp = await requestJson(srv.baseUrl, `/api/zimmetler/${secondAtamaId}/muayeneler`, {
      method: 'POST', token: tokDrv2,
      body: { muayene_tipi: 'TESLIM_ALMA', muayene_tarihi: bugunTR(), sayac_degeri: 5400, aydinlatma_durumu: 'KUSURLU' },
    });
    assert.equal(drv2Insp.status, 201);
    assert.equal(drv2Insp.body.muayene.genel_sonuc, 'KUSURLU');
    assert.equal(drv2Insp.body.is_emri.oncelik, 'yuksek');

    // drv2, drv1'in onceki zimmet gorselini okuyamaz
    const drv1Detail = await requestJson(srv.baseUrl, `/api/zimmetler/${firstAtamaId}`, { token: tokDrv1 });
    assert.equal(drv1Detail.status, 200);
    const drv1DocId = drv1Detail.body.zimmet.teslim_etme.belgeler[0].belge_id;
    assert.equal((await requestJson(srv.baseUrl, `/api/belgeler/${drv1DocId}/erisim`, { token: tokDrv2 })).status, 403);

    // Kiraci izolasyonu (Org B -> 404/403)
    assert.equal((await requestJson(srv.baseUrl, `/api/zimmetler/${secondAtamaId}`, { token: tokMgrB })).status, 404);
    assert.equal((await requestJson(srv.baseUrl, `/api/zimmetler/${secondAtamaId}/muayeneler`, {
      method: 'POST', token: tokMgrB, body: { muayene_tipi: 'TESLIM_ETME', muayene_tarihi: bugunTR(), sayac_degeri: 5500 },
    })).status, 404);
    assert.equal((await requestJson(srv.baseUrl, `/api/belgeler/${drv1DocId}/erisim`, { token: tokMgrB })).status, 403);
    const listB = await requestJson(srv.baseUrl, '/api/zimmetler', { token: tokMgrB });
    assert.equal(listB.status, 200);
    assert.equal(listB.body.zimmetler.length, 0);
  });
});
