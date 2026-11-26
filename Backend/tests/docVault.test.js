const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { runMigrations } = require('../scripts/migrate');
const { presignPutObject, presignGetObject, rfc3986Encode } = require('../utils/s3Presigner');
const { resolveSafeVaultPath, createLocalPutUrl } = require('../utils/localVaultDriver');
const {
  pool, startTestServer, requestJson, createTestOrg, createTestUser,
  loginUser, takeExternalSnapshot, cleanupTestSuite,
} = require('./helpers/pgTestHarness');

describe('FORGE-C1 DOC-VAULT Unit & E2E Tests', () => {
  let srv, beforeSnap, tmpVaultDir, prevVaultDir;
  let orgA, orgB, tokMgrA, tokMgrB, tokDrvA, aracA1, aracA2, aracArchived;

  const addArac = async (token, plaka) => {
    const r = await requestJson(srv.baseUrl, '/api/araclar/ekle', {
      method: 'POST', token, body: { plaka, marka: 'Ford', model: 'Transit', yil: 2024, guncel_km: 1000, sayac_tipi: 'KM' },
    });
    assert.equal(r.status, 201);
    return r.body.arac.arac_id;
  };
  const presignAndPut = async (token, { arac_id, varlik_tipi, varlik_id = null, orijinal_ad = 'fatura.pdf', mime_tipi = 'application/pdf', bytes = Buffer.from('%PDF-1.4\ntest') }) => {
    const pre = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
      method: 'POST', token, body: { arac_id, varlik_tipi, varlik_id, orijinal_ad, mime_tipi, boyut_bayt: bytes.byteLength },
    });
    if (pre.status !== 201) return { pre, putStatus: null };
    const putRes = await fetch(pre.body.yukleme.url, { method: 'PUT', headers: { 'Content-Type': mime_tipi }, body: bytes });
    return { pre, putStatus: putRes.status };
  };

  before(async () => {
    await runMigrations(pool);
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    prevVaultDir = process.env.DOC_VAULT_LOCAL_DIR;
    tmpVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'truss-vault-test-'));
    process.env.DOC_VAULT_LOCAL_DIR = tmpVaultDir;

    srv = await startTestServer();
    orgA = await createTestOrg('dvA');
    orgB = await createTestOrg('dvB');
    const mgrA = await createTestUser({ orgId: orgA.org_id, role: 'FLEET_MANAGER', tag: 'dvMgrA' });
    const mgrB = await createTestUser({ orgId: orgB.org_id, role: 'FLEET_MANAGER', tag: 'dvMgrB' });
    const drvA = await createTestUser({ orgId: orgA.org_id, role: 'DRIVER', tag: 'dvDrvA', yetkiler: { yakit: true, bakim: false, finans: false } });
    tokMgrA = (await loginUser(srv.baseUrl, mgrA.email)).body.token;
    tokMgrB = (await loginUser(srv.baseUrl, mgrB.email)).body.token;
    tokDrvA = (await loginUser(srv.baseUrl, drvA.email)).body.token;

    aracA1 = await addArac(tokMgrA, '34DV0001');
    aracA2 = await addArac(tokMgrA, '34DV0002');
    aracArchived = await addArac(tokMgrA, '34DVARCH');
    await pool.query('INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif) VALUES ($1, $2, TRUE)', [aracA1, drvA.user_id]);
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

  it('1) SigV4 unit: ASCII sirali response-content-disposition, UNSIGNED-PAYLOAD, R2/S3, custom port & RFC-3986', () => {
    const fixedNow = () => new Date('2026-11-26T12:00:00.000Z');
    const urlStr = presignGetObject({
      endpoint: 'https://acc.r2.cloudflarestorage.com:8443', bucket: 'truss-docs',
      key: "org_1/yakit/2026-11/fatura!(1)'*.pdf", accessKeyId: 'AKIA123', secretAccessKey: 'SECRET456',
      disposition: 'attachment', filename: 'fiş "test";1.pdf', nowFn: fixedNow,
    });
    const parsed = new URL(urlStr);
    assert.equal(parsed.port, '8443');
    assert.ok(parsed.pathname.includes('%21%281%29%27%2A.pdf'));
    assert.equal(rfc3986Encode("a!'()*"), 'a%21%27%28%29%2A');

    // X-Amz-* (ASCII 'X'=88) must sort BEFORE response-content-disposition (ASCII 'r'=114)
    const keys = [...parsed.searchParams.keys()];
    assert.ok(keys.indexOf('response-content-disposition') > keys.indexOf('X-Amz-SignedHeaders'));
    assert.match(parsed.searchParams.get('X-Amz-Credential'), /20261126\/auto\/s3\/aws4_request$/);

    const qPairs = [];
    for (const [k, v] of parsed.searchParams.entries()) {
      if (k !== 'X-Amz-Signature') qPairs.push(`${rfc3986Encode(k)}=${rfc3986Encode(v)}`);
    }
    qPairs.sort();
    const canonReq = `GET\n${parsed.pathname}\n${qPairs.join('&')}\nhost:acc.r2.cloudflarestorage.com:8443\n\nhost\nUNSIGNED-PAYLOAD`;
    const sts = `AWS4-HMAC-SHA256\n20261126T120000Z\n20261126/auto/s3/aws4_request\n${crypto.createHash('sha256').update(canonReq).digest('hex')}`;
    const hm = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
    const sk = hm(hm(hm(hm('AWS4SECRET456', '20261126'), 'auto'), 's3'), 'aws4_request');
    assert.equal(parsed.searchParams.get('X-Amz-Signature'), crypto.createHmac('sha256', sk).update(sts).digest('hex'));

    const putUrl = new URL(presignPutObject({
      endpoint: 'https://s3.eu-central-1.amazonaws.com', bucket: 'b', key: 'k.pdf',
      accessKeyId: 'A', secretAccessKey: 'S', region: 'eu-central-1', contentType: 'application/pdf', nowFn: fixedNow,
    }));
    assert.equal(putUrl.searchParams.get('X-Amz-SignedHeaders'), 'content-type;host');
  });

  it('2) local-nesne HMAC, Content-Type, boyut, path-traversal ve gecersiz MIME/boyut', async () => {
    assert.throws(() => resolveSafeVaultPath('../etc/passwd'), (e) => e.statusCode === 400 && e.code === 'INVALID_KEY');
    assert.throws(() => resolveSafeVaultPath('org_1/../../x.pdf'), (e) => e.statusCode === 400 && e.code === 'INVALID_KEY');

    for (const [ad, mime, sz, code] of [['x.svg', 'image/svg+xml', 100, 'INVALID_MIME_TYPE'], ['x.html', 'text/html', 100, 'INVALID_MIME_TYPE'], ['big.pdf', 'application/pdf', 10485761, 'INVALID_FILE_SIZE']]) {
      const r = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
        method: 'POST', token: tokMgrA, body: { arac_id: aracA1, varlik_tipi: 'yakit', orijinal_ad: ad, mime_tipi: mime, boyut_bayt: sz },
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.code, code);
    }

    const pre = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracA1, varlik_tipi: 'yakit', orijinal_ad: 'f.pdf', mime_tipi: 'application/pdf', boyut_bayt: 5 },
    });
    assert.equal(pre.status, 201);
    const badSig = await fetch(`${srv.baseUrl}/api/belgeler/local-nesne?key=a&exp=9999999999&ct=application/pdf&len=5&sig=${'0'.repeat(64)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: Buffer.from('12345'),
    });
    assert.equal(badSig.status, 403);
    const expUrl = createLocalPutUrl({ baseUrl: srv.baseUrl, key: pre.body.nesne_anahtari, contentType: 'application/pdf', contentLength: 5, expiresIn: 1, nowMs: Date.now() - 10000 });
    assert.equal((await fetch(expUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: Buffer.from('12345') })).status, 403);
    const wrongCt = await fetch(pre.body.yukleme.url, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: Buffer.from('12345') });
    assert.equal(wrongCt.status, 400);
    assert.equal((await wrongCt.json()).code, 'CONTENT_TYPE_MISMATCH');
    const wrongLen = await fetch(pre.body.yukleme.url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: Buffer.from('123') });
    assert.equal(wrongLen.status, 400);
    assert.equal((await wrongLen.json()).code, 'INVALID_FILE_SIZE');
  });

  it('3) Hayalet anahtar 422, presigned URL 400, arac swap 422, capraz kiraci 403', async () => {
    const ghost = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracA1, varlik_tipi: 'yakit', orijinal_ad: 'ghost.pdf', mime_tipi: 'application/pdf', boyut_bayt: 10 },
    });
    const ghostPost = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracA1, tarih: '2026-11-26', litre: 20, tutar: 900, km: 1050, belge_url: ghost.body.nesne_anahtari },
    });
    assert.equal(ghostPost.status, 422);
    assert.equal(ghostPost.body.code, 'DOCUMENT_UPLOAD_INCOMPLETE');

    const presignedReject = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracA1, tarih: '2026-11-26', litre: 20, tutar: 900, km: 1050, belge_url: ghost.body.yukleme.url },
    });
    assert.equal(presignedReject.status, 400);
    assert.equal(presignedReject.body.code, 'PRESIGNED_URL_FORBIDDEN');

    const crossPresign = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
      method: 'POST', token: tokMgrB, body: { arac_id: aracA1, varlik_tipi: 'yakit', orijinal_ad: 'b.pdf', mime_tipi: 'application/pdf', boyut_bayt: 10 },
    });
    assert.equal(crossPresign.status, 403);

    const { pre, putStatus } = await presignAndPut(tokMgrA, { arac_id: aracA1, varlik_tipi: 'yakit' });
    assert.equal(putStatus, 200);
    const swap = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracA2, tarih: '2026-11-26', litre: 20, tutar: 900, km: 1050, belge_url: pre.body.nesne_anahtari },
    });
    assert.equal(swap.status, 422);
    assert.equal(swap.body.code, 'DOCUMENT_BIND_MISMATCH');
  });

  it('4) DRIVER yakit yukleme + taslak silme vs aktif indirme 403 FORBIDDEN_FINANCE_ACCESS + maskeleme', async () => {
    const draft = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
      method: 'POST', token: tokDrvA, body: { arac_id: aracA1, varlik_tipi: 'yakit', orijinal_ad: 'taslak.pdf', mime_tipi: 'application/pdf', boyut_bayt: 10 },
    });
    assert.equal(draft.status, 201);
    assert.equal((await requestJson(srv.baseUrl, `/api/belgeler/${draft.body.belge_id}`, { method: 'DELETE', token: tokDrvA })).status, 200);

    const payload = Buffer.from('%PDF-1.4\ndriver-fuel');
    const { pre, putStatus } = await presignAndPut(tokDrvA, { arac_id: aracA1, varlik_tipi: 'yakit', bytes: payload });
    assert.equal(putStatus, 200);
    const yRes = await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST', token: tokDrvA, body: { arac_id: aracA1, tarih: '2026-11-26', litre: 30, tutar: 1200, km: 1100, belge_url: pre.body.nesne_anahtari },
    });
    assert.equal(yRes.status, 201);

    const drvAccess = await requestJson(srv.baseUrl, `/api/belgeler/${pre.body.belge_id}/erisim`, { token: tokDrvA });
    assert.equal(drvAccess.status, 403);
    assert.equal(drvAccess.body.code, 'FORBIDDEN_FINANCE_ACCESS');
    assert.equal((await requestJson(srv.baseUrl, '/api/belgeler?varlik_tipi=yakit', { token: tokDrvA })).status, 403);
    assert.equal((await requestJson(srv.baseUrl, `/api/belgeler/${pre.body.belge_id}`, { method: 'DELETE', token: tokDrvA })).status, 403);

    const drvFuelList = await requestJson(srv.baseUrl, `/api/yakitlar/arac/${aracA1}`, { token: tokDrvA });
    assert.equal(drvFuelList.status, 200);
    assert.equal(drvFuelList.body.yakitlar[0].belge_url, null);

    const mgrAccess = await requestJson(srv.baseUrl, `/api/belgeler/${pre.body.belge_id}/erisim?indir=1`, { token: tokMgrA });
    assert.equal(mgrAccess.status, 200);
    const dl = await fetch(mgrAccess.body.erisim_url);
    assert.equal(dl.status, 200);
    assert.equal(dl.headers.get('cache-control'), 'no-store');
    assert.equal(dl.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await dl.arrayBuffer()), payload);
    assert.equal((await requestJson(srv.baseUrl, `/api/belgeler/${pre.body.belge_id}/erisim`, { token: tokMgrB })).status, 403);
  });

  it('5) Arsivli arac upload 409 vs indirme 200 + is_emri 5 belge/6. 422/iptal 409/completeWorkOrderTx', async () => {
    const { pre: archPre, putStatus: archPut } = await presignAndPut(tokMgrA, { arac_id: aracArchived, varlik_tipi: 'bakim' });
    assert.equal(archPut, 200);
    const bRes = await requestJson(srv.baseUrl, '/api/bakimlar', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracArchived, bakim_tipi: 'Genel', tarih: '2026-11-26', km: 1050, maliyet: 500, belge_url: archPre.body.nesne_anahtari },
    });
    assert.equal(bRes.status, 201);
    assert.equal((await requestJson(srv.baseUrl, `/api/araclar/${aracArchived}`, { method: 'DELETE', token: tokMgrA })).status, 200);

    const archUp = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
      method: 'POST', token: tokMgrA, body: { arac_id: aracArchived, varlik_tipi: 'bakim', orijinal_ad: 'x.pdf', mime_tipi: 'application/pdf', boyut_bayt: 10 },
    });
    assert.equal(archUp.status, 409);
    assert.equal(archUp.body.code, 'VEHICLE_ARCHIVED');
    assert.equal((await requestJson(srv.baseUrl, `/api/belgeler/${archPre.body.belge_id}/erisim`, { token: tokMgrA })).status, 200);

    const keys = [];
    for (let i = 0; i < 5; i += 1) {
      const up = await presignAndPut(tokDrvA, { arac_id: aracA1, varlik_tipi: 'is_emri', orijinal_ad: `foto${i}.jpg`, mime_tipi: 'image/jpeg' });
      assert.equal(up.putStatus, 200);
      keys.push(up.pre.body.nesne_anahtari);
    }
    const woRes = await requestJson(srv.baseUrl, '/api/is-emirleri', {
      method: 'POST', token: tokDrvA, body: { arac_id: aracA1, baslik: 'Hasar fotolu', belge_anahtarlari: keys },
    });
    assert.equal(woRes.status, 201);
    assert.equal(woRes.body.is_emri.belgeler.length, 5);
    const woId = woRes.body.is_emri.is_emri_id;

    const sixth = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
      method: 'POST', token: tokDrvA, body: { arac_id: aracA1, varlik_tipi: 'is_emri', varlik_id: woId, orijinal_ad: '6.jpg', mime_tipi: 'image/jpeg', boyut_bayt: 10 },
    });
    assert.equal(sixth.status, 422);
    assert.equal(sixth.body.code, 'WORKORDER_DOC_LIMIT_EXCEEDED');

    const faturaUp = await presignAndPut(tokMgrA, { arac_id: aracA1, varlik_tipi: 'bakim', orijinal_ad: 'wo-fatura.pdf' });
    assert.equal(faturaUp.putStatus, 200);
    const comp = await requestJson(srv.baseUrl, `/api/is-emirleri/${woId}/tamamla`, {
      method: 'POST', token: tokMgrA, body: { tarih: '2026-11-26', sayac_degeri: 1200, tutar: 3500, belge_url: faturaUp.pre.body.nesne_anahtari },
    });
    assert.equal(comp.status, 200);
    assert.equal(comp.body.bakim.belge_url, faturaUp.pre.body.nesne_anahtari);

    const woListDrv = await requestJson(srv.baseUrl, `/api/is-emirleri?arac_id=${aracA1}`, { token: tokDrvA });
    assert.equal(woListDrv.body.is_emirleri[0].bakim_belge_url, null);
    assert.equal(woListDrv.body.is_emirleri[0].belgeler.length, 5);

    const woCancel = await requestJson(srv.baseUrl, '/api/is-emirleri', { method: 'POST', token: tokMgrA, body: { arac_id: aracA1, baslik: 'Iptal test' } });
    const cancelId = woCancel.body.is_emri.is_emri_id;
    const orphan = await presignAndPut(tokMgrA, { arac_id: aracA1, varlik_tipi: 'is_emri' });
    assert.equal((await requestJson(srv.baseUrl, `/api/is-emirleri/${cancelId}/iptal`, { method: 'POST', token: tokMgrA, body: { red_iptal_nedeni: 'vazgecildi' } })).status, 200);
    const closedBind = await requestJson(srv.baseUrl, `/api/belgeler/${orphan.pre.body.belge_id}/bagla`, {
      method: 'POST', token: tokMgrA, body: { varlik_tipi: 'is_emri', varlik_id: cancelId },
    });
    assert.equal(closedBind.status, 409);
    assert.equal(closedBind.body.code, 'WORKORDER_ALREADY_CLOSED');
  });
});
