const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { serializeCsv } = require('../utils/csvSerializer');
const {
  pool, startTestServer, requestJson, createTestOrg, createTestUser,
  loginUser, takeExternalSnapshot, cleanupTestSuite,
} = require('./helpers/pgTestHarness');

const fetchCsv = async (baseUrl, reqPath, token) => {
  const res = await fetch(`${baseUrl}${reqPath}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, buf, text: buf.toString('utf8') };
};

describe('FORGE-C3 Rapor CSV Export & Backward Compatibility Tests', () => {
  let srv;
  let beforeSnap;
  let orgA;
  let orgB;
  let tokMgrA;
  let tokAdminB;
  let tokDrvA;
  let aracA1;
  let aracB1;

  before(async () => {
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();

    orgA = await createTestOrg('expA');
    orgB = await createTestOrg('expB');
    const mgrA = await createTestUser({ orgId: orgA.org_id, role: 'FLEET_MANAGER', tag: 'expMgrA' });
    const adminB = await createTestUser({ orgId: orgB.org_id, role: 'SYSTEM_ADMIN', tag: 'expAdmB' });
    const drvA = await createTestUser({ orgId: orgA.org_id, role: 'DRIVER', tag: 'expDrvA', yetkiler: {} });

    tokMgrA = (await loginUser(srv.baseUrl, mgrA.email)).body.token;
    tokAdminB = (await loginUser(srv.baseUrl, adminB.email)).body.token;
    tokDrvA = (await loginUser(srv.baseUrl, drvA.email)).body.token;

    const a1 = await requestJson(srv.baseUrl, '/api/araclar/ekle', {
      method: 'POST', token: tokMgrA,
      body: { plaka: '34EXP001', marka: 'Ford', model: 'Transit', yil: 2024, guncel_km: 1000, sayac_tipi: 'KM' },
    });
    const b1 = await requestJson(srv.baseUrl, '/api/araclar/ekle', {
      method: 'POST', token: tokAdminB,
      body: { plaka: '34EXP999', marka: 'Fiat', model: 'Doblo', yil: 2024, guncel_km: 2000, sayac_tipi: 'KM' },
    });
    assert.equal(a1.status, 201);
    assert.equal(b1.status, 201);
    aracA1 = a1.body.arac.arac_id;
    aracB1 = b1.body.arac.arac_id;

    assert.equal((await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST', token: tokMgrA,
      body: { arac_id: aracA1, tarih: '2026-01-10', litre: 45.5, tutar: 1820.25, km: 1200, fatura_no: '00421', notlar: '  =CMD()' },
    })).status, 201);
    assert.equal((await requestJson(srv.baseUrl, '/api/bakimlar', {
      method: 'POST', token: tokMgrA,
      body: { arac_id: aracA1, bakim_tipi: 'Fren, "Ön"\nSet', tarih: '2026-01-12', km: 1300, maliyet: 3200, fatura_no: '+SUM(1,2)' },
    })).status, 201);
    assert.equal((await requestJson(srv.baseUrl, '/api/yakitlar', {
      method: 'POST', token: tokAdminB,
      body: { arac_id: aracB1, tarih: '2026-01-11', litre: 30, tutar: 1200, km: 2100, fatura_no: '99881' },
    })).status, 201);

    await pool.query(
      `INSERT INTO is_emirleri (org_id, arac_id, baslik, durum, planlanan_tarih, kapanis_tarihi, olusturma_tarihi)
       VALUES
         ($1, $2, 'Gece sonu dahil', 'tamamlandi', '2026-01-18', '2026-01-15T23:45:00+03:00', '2026-01-15T23:30:00+03:00'),
         ($1, $2, 'Ertesi gun haric', 'acik', NULL, NULL, '2026-01-16T00:05:00+03:00'),
         ($3, $4, 'Rakip kurum isi', 'acik', NULL, NULL, '2026-01-15T12:00:00+03:00')`,
      [orgA.org_id, aracA1, orgB.org_id, aracB1]
    );
  });

  after(async () => {
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    if (srv) await srv.close();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('1) csvSerializer: BOM, CRLF, sayi koruma (-12.5), sifirli metin (00421), OWASP & RFC4180', () => {
    const csv = serializeCsv(
      [
        { header: 'Fatura No', key: 'fatura_no', type: 'string' },
        { header: 'Sapma', key: 'sapma', type: 'number' },
        { header: 'Not', key: 'not', type: 'string' },
      ],
      [
        { fatura_no: '00421', sapma: -12.5, not: '  =CMD()' },
        { fatura_no: '+SUM()', sapma: null, not: '@evil' },
        { fatura_no: '\t01', sapma: 0, not: 'a, "b"\nc' },
      ]
    );
    assert.equal(csv.startsWith('\uFEFF'), true);
    const lines = csv.slice(1).split('\r\n');
    assert.equal(lines[0], 'Fatura No,Sapma,Not');
    assert.equal(lines[1], "00421,-12.5,'  =CMD()");
    assert.equal(lines[2], "'+SUM(),,'@evil");
    assert.equal(lines[3], "'\t01,0,\"a, \"\"b\"\"\nc\"");
  });

  it('2) Hareketler CSV: BOM, 00421, OWASP kacisi, RFC4180, basliklar ve tarih filtresi', async () => {
    const res = await fetchCsv(srv.baseUrl, '/api/raporlar/export/hareketler?tip=TUMU', tokMgrA);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/csv; charset=utf-8/i);
    assert.match(res.headers.get('content-disposition'), /^attachment; filename="hareketler-\d{4}-\d{2}-\d{2}\.csv"; filename\*=UTF-8''/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-export-limit'), '10000');
    assert.equal(res.headers.get('x-export-count'), '2');
    assert.equal(res.headers.get('x-export-truncated'), 'false');
    assert.equal(
      res.headers.get('access-control-expose-headers'),
      'Content-Disposition, X-Export-Truncated, X-Export-Limit, X-Export-Count'
    );
    assert.deepEqual([...res.buf.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    assert.equal(res.text.startsWith('\uFEFF'), true);
    assert.ok(res.text.includes('\r\n'));
    assert.ok(res.text.includes(',00421,'));
    assert.ok(res.text.includes("'  =CMD()"));
    assert.ok(res.text.includes("'+SUM(1,2)"));
    assert.ok(res.text.includes('"Fren, ""Ön""\nSet"'));
    assert.ok(!res.text.includes('34EXP999'));

    const onlyFuel = await fetchCsv(srv.baseUrl, '/api/raporlar/export/hareketler?tip=YAKIT', tokMgrA);
    assert.equal(onlyFuel.status, 200);
    assert.equal(onlyFuel.headers.get('x-export-count'), '1');
    assert.ok(onlyFuel.text.includes('YAKIT') && !onlyFuel.text.includes('BAKIM'));
  });

  it('3) Is emirleri CSV: TR 23:30+03 gun sonu dahil, planlanan/kapanis YYYY-MM-DD ve 422/400 dogrulama', async () => {
    const res = await fetchCsv(
      srv.baseUrl,
      '/api/raporlar/export/is-emirleri?baslangic=2026-01-15&bitis=2026-01-15',
      tokMgrA
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-export-count'), '1');
    assert.ok(res.text.includes('Gece sonu dahil'));
    assert.ok(res.text.includes(',2026-01-18,2026-01-15,2026-01-15,'));
    assert.ok(!res.text.includes('Ertesi gun haric'));
    assert.ok(!res.text.includes('Rakip kurum isi'));

    const badRange = await requestJson(
      srv.baseUrl,
      '/api/raporlar/export/hareketler?baslangic=2026-02-10&bitis=2026-02-01',
      { token: tokMgrA }
    );
    assert.equal(badRange.status, 422);
    assert.equal(badRange.body.code, 'INVALID_DATE_RANGE');

    const badRangeWo = await requestJson(
      srv.baseUrl,
      '/api/raporlar/export/is-emirleri?baslangic=2026-02-10&bitis=2026-02-01',
      { token: tokMgrA }
    );
    assert.equal(badRangeWo.status, 422);
    assert.equal(badRangeWo.body.code, 'INVALID_DATE_RANGE');

    const badDate = await requestJson(
      srv.baseUrl,
      '/api/raporlar/export/hareketler?baslangic=2026-02-30',
      { token: tokMgrA }
    );
    assert.equal(badDate.status, 400);
    assert.equal(badDate.body.code, 'INVALID_EXPORT_PARAMS');

    const badPeriod = await requestJson(
      srv.baseUrl,
      '/api/raporlar/export/filo-maliyet?donem_gun=45',
      { token: tokMgrA }
    );
    assert.equal(badPeriod.status, 400);
    assert.equal(badPeriod.body.code, 'INVALID_PERIOD');
  });

  it('4) Filo maliyet CSV + DRIVER 403 engeli + kiraci izolasyonu + JSON geriye uyumluluk', async () => {
    const filoCsv = await fetchCsv(srv.baseUrl, '/api/raporlar/export/filo-maliyet?donem_gun=90', tokMgrA);
    assert.equal(filoCsv.status, 200);
    assert.equal(filoCsv.headers.get('x-export-count'), '1');
    assert.ok(filoCsv.text.includes('34EXP001'));
    assert.ok(!filoCsv.text.includes('34EXP999'));

    const driverBlockedPaths = [
      '/api/raporlar/genel-ozet',
      '/api/raporlar/aylik-trend',
      '/api/raporlar/aylik-ozet',
      '/api/raporlar/arac-maliyet',
      '/api/raporlar/arac-giderleri',
      '/api/raporlar/butce',
      '/api/raporlar/tco-analizi',
      '/api/raporlar/export/filo-maliyet',
      '/api/raporlar/export/hareketler',
      '/api/raporlar/export/is-emirleri',
    ];
    for (const p of driverBlockedPaths) {
      const r = await requestJson(srv.baseUrl, p, { token: tokDrvA });
      assert.equal(r.status, 403, `Expected 403 for DRIVER on ${p}`);
    }

    const isoCheck = await fetchCsv(srv.baseUrl, '/api/raporlar/export/hareketler', tokAdminB);
    assert.equal(isoCheck.status, 200);
    assert.equal(isoCheck.headers.get('x-export-count'), '1');
    assert.ok(isoCheck.text.includes('34EXP999') && !isoCheck.text.includes('34EXP001'));

    const ozet = await requestJson(srv.baseUrl, '/api/raporlar/genel-ozet', { token: tokMgrA });
    assert.equal(ozet.status, 200);
    for (const k of ['toplam_arac', 'toplam_yakit_gideri', 'toplam_litre', 'toplam_bakim_gideri', 'toplam_bakim_sayisi', 'toplam_gider', 'yaklasan_parca_sayisi']) {
      assert.ok(Object.prototype.hasOwnProperty.call(ozet.body, k));
    }
    const aracMal = await requestJson(srv.baseUrl, '/api/raporlar/arac-maliyet', { token: tokMgrA });
    assert.equal(aracMal.status, 200);
    assert.equal(aracMal.body.length, 1);
    assert.equal(aracMal.body[0].plaka, '34EXP001');

    const trend = await requestJson(srv.baseUrl, '/api/raporlar/aylik-ozet', { token: tokMgrA });
    assert.equal(trend.status, 200);
    assert.equal(trend.body.length, 6);

    const putButce = await requestJson(srv.baseUrl, '/api/raporlar/butce', {
      method: 'PUT', token: tokMgrA, body: { aylik_yakit_butcesi: 60000, aylik_bakim_butcesi: 30000 },
    });
    assert.equal(putButce.status, 200);
    assert.equal(putButce.body.butce.toplam_butce, 90000);
  });
});
