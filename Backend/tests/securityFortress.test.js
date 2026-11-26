const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const {
  pool, startTestServer, requestJson, createTestOrg, createTestUser,
  loginUser, takeExternalSnapshot, cleanupTestSuite, resetAllRateLimiters,
} = require('./helpers/pgTestHarness');
const { validateEnv, parseTrustProxy } = require('../utils/validateEnv');
const { requestIdMiddleware } = require('../middlewares/requestIdMiddleware');
const { errorHandler } = require('../middlewares/errorHandler');
const { updateBakimTx } = require('../services/bakimWriteService');
const withTransaction = require('../utils/withTransaction');

describe('FORGE-E1 V1..V6: Security Fortress Torture Suite', () => {
  let srv, beforeSnap, org1, org2, sys1, mgr1, equip1, drv1, drv2;
  let sysToken, mgrToken, equipToken, drvToken, a1Id, a2Id, bakim1Id;

  before(async () => {
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();

    org1 = await createTestOrg('fort1');
    org2 = await createTestOrg('fort2');
    sys1 = await createTestUser({ orgId: org1.org_id, role: 'SYSTEM_ADMIN', tag: 'fSys1' });
    mgr1 = await createTestUser({ orgId: org1.org_id, role: 'FLEET_MANAGER', tag: 'fMgr1' });
    equip1 = await createTestUser({ orgId: org1.org_id, role: 'DRIVER', tag: 'fEq1', yetkiler: { finans: true, bakim: true, yakit: true } });
    drv1 = await createTestUser({ orgId: org1.org_id, role: 'DRIVER', tag: 'fDrv1' });
    drv2 = await createTestUser({ orgId: org2.org_id, role: 'DRIVER', tag: 'fDrv2' });

    sysToken = (await loginUser(srv.baseUrl, sys1.email)).body.token;
    mgrToken = (await loginUser(srv.baseUrl, mgr1.email)).body.token;
    equipToken = (await loginUser(srv.baseUrl, equip1.email)).body.token;
    drvToken = (await loginUser(srv.baseUrl, drv1.email)).body.token;

    const ins = await pool.query(
      `INSERT INTO araclar (plaka, marka, model, yil, guncel_km, sayac_tipi, org_id, kullanici_id)
       VALUES ('34FRT01', 'Ford', 'Focus', 2024, 10000, 'KM', $1, $3),
              ('34FRT02', 'Fiat', 'Egea', 2024, 12000, 'KM', $2, $3) RETURNING arac_id`,
      [org1.org_id, org2.org_id, mgr1.user_id]
    );
    a1Id = ins.rows[0].arac_id;
    a2Id = ins.rows[1].arac_id;

    const b1 = await requestJson(srv.baseUrl, '/api/bakimlar', {
      method: 'POST', token: mgrToken,
      body: { arac_id: a1Id, bakim_tipi: 'Yağ & Filtre Bakımı', tarih: '2026-01-15', km: 10000, maliyet: 1500 },
    });
    assert.equal(b1.status, 201);
    bakim1Id = b1.body.bakim?.bakim_id ?? b1.body.bakim_id;
  });

  after(async () => {
    if (srv) await srv.close();
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('V1: org FK IDOR & SYSTEM_ADMIN cross-tenant move/assign rejection', async () => {
    const moveHttp = await requestJson(srv.baseUrl, `/api/bakimlar/${bakim1Id}`, {
      method: 'PUT', token: sysToken,
      body: { arac_id: a2Id, bakim_tipi: 'Yağ & Filtre Bakımı', tarih: '2026-01-15', km: 12000, maliyet: 1500 },
    });
    assert.equal(moveHttp.status, 403);

    await assert.rejects(
      () => withTransaction((client) => updateBakimTx(client, { user_id: sys1.user_id, role: 'SYSTEM_ADMIN', org_id: null }, {
        bakimId: bakim1Id, arac_id: a2Id, bakim_tipi: 'Yağ & Filtre Bakımı', tarih: '2026-01-15', km: 12000, maliyet: 1500,
      })),
      (err) => err.statusCode === 403 && err.code === 'CROSS_TENANT_FORBIDDEN'
    );

    const assignCross = await requestJson(srv.baseUrl, '/api/admin/assign', {
      method: 'POST', token: sysToken, body: { arac_id: a1Id, sofor_user_id: drv2.user_id },
    });
    assert.equal(assignCross.status, 404);
    assert.equal(assignCross.body.code, 'DRIVER_NOT_FOUND');
  });

  it('V2: live JWT immediate revocation on permission downgrade & token_version bump', async () => {
    const okCsv = await fetch(`${srv.baseUrl}/api/raporlar/export/filo-maliyet`, { headers: { Authorization: `Bearer ${equipToken}` } });
    assert.equal(okCsv.status, 200);

    await pool.query(`UPDATE users SET yetkiler = '{}'::jsonb WHERE user_id = $1`, [equip1.user_id]);
    const deniedCsv = await fetch(`${srv.baseUrl}/api/raporlar/export/filo-maliyet`, { headers: { Authorization: `Bearer ${equipToken}` } });
    assert.equal(deniedCsv.status, 403);

    await pool.query(`UPDATE users SET token_version = token_version + 1 WHERE user_id = $1`, [equip1.user_id]);
    const revokedCsv = await fetch(`${srv.baseUrl}/api/raporlar/export/filo-maliyet`, { headers: { Authorization: `Bearer ${equipToken}` } });
    assert.equal(revokedCsv.status, 401);
    assert.equal((await revokedCsv.json()).code, 'TOKEN_REVOKED');
  });

  it('V3: TRUST_PROXY=true prod fail-fast & spoofed X-Forwarded-For rate-limit', async () => {
    assert.throws(
      () => validateEnv({
        NODE_ENV: 'production', DATABASE_URL: 'postgres://u:p@localhost:5432/truss',
        JWT_SECRET: 's'.repeat(32), CORS_ORIGIN: 'https://app.truss.local', TRUST_PROXY: 'true',
      }),
      (err) => err.code === 'ENV_VALIDATION_FAILED' && err.invalidKeys.includes('TRUST_PROXY')
    );
    assert.equal(parseTrustProxy('6', { nodeEnv: 'production' }).ok, false);
    assert.equal(parseTrustProxy('127.0.0.1, 10.0.0.0/8', { nodeEnv: 'production' }).ok, true);

    resetAllRateLimiters();
    let hit429 = false;
    for (let i = 1; i <= 15; i += 1) {
      const r = await fetch(`${srv.baseUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.0.${i}` },
        body: JSON.stringify({ email: mgr1.email, sifre: 'WrongPass!' }),
      });
      if (r.status === 429) {
        hit429 = true;
        assert.equal((await r.json()).code, 'RATE_LIMITED');
        break;
      }
    }
    assert.equal(hit429, true);
    resetAllRateLimiters();
  });

  it('V4: docVault .svg rejection, ../ traversal, expired sig & !hasFinanceAccess', async () => {
    const svgRes = await requestJson(srv.baseUrl, '/api/belgeler/yukleme-url', {
      method: 'POST', token: mgrToken,
      body: { varlik_tipi: 'bakim', arac_id: a1Id, dosya_adi: 'xss.svg', mime_tipi: 'image/svg+xml', boyut_byte: 512 },
    });
    assert.equal(svgRes.status, 400);

    const travRes = await fetch(`${srv.baseUrl}/api/belgeler/local-nesne?key=../../etc/passwd&exp=9999999999&sig=deadbeef`);
    assert.ok([400, 403, 404].includes(travRes.status));

    const expRes = await fetch(`${srv.baseUrl}/api/belgeler/local-nesne?key=org_${org1.org_id}/bakim/2026-01/a.pdf&exp=1000&sig=0000`);
    assert.ok([403, 404].includes(expRes.status));

    const drvDoc = await requestJson(srv.baseUrl, `/api/belgeler?varlik_tipi=bakim&varlik_id=${bakim1Id}`, { token: drvToken });
    assert.equal(drvDoc.status, 403);
  });

  it('V5: Express 5 HPP array query, malformed JSON 400 & >100kb JSON 413 with requestId', async () => {
    const hppRes = await requestJson(srv.baseUrl, `/api/is-emirleri?arac_id=${a1Id}&arac_id=${a2Id}`, { token: mgrToken });
    assert.equal(hppRes.status, 400);
    assert.ok(hppRes.body.requestId);

    const badJson = await fetch(`${srv.baseUrl}/api/yakitlar`, {
      method: 'POST', headers: { Authorization: `Bearer ${mgrToken}`, 'Content-Type': 'application/json' },
      body: '{"broken":',
    });
    assert.equal(badJson.status, 400);
    const badBody = await badJson.json();
    assert.equal(badBody.code, 'INVALID_JSON');
    assert.ok(badBody.requestId);

    const bigRes = await fetch(`${srv.baseUrl}/api/yakitlar`, {
      method: 'POST', headers: { Authorization: `Bearer ${mgrToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ arac_id: a1Id, notlar: 'X'.repeat(110 * 1024) }),
    });
    assert.equal(bigRes.status, 413);
    const bigBody = await bigRes.json();
    assert.equal(bigBody.code, 'PAYLOAD_TOO_LARGE');
    assert.ok(bigBody.requestId);
  });

  it('V6: 500 PG error sterilization, X-Request-Id, CORS expose & /api 404', async () => {
    const nfRes = await fetch(`${srv.baseUrl}/api/olmayan-endpoint`, {
      headers: { Origin: 'http://localhost:5173', 'X-Request-Id': 'req-fortress-1234' },
    });
    assert.equal(nfRes.status, 404);
    assert.equal(nfRes.headers.get('x-request-id'), 'req-fortress-1234');
    const expose = nfRes.headers.get('access-control-expose-headers') || '';
    assert.ok(expose.includes('X-Request-Id') && expose.includes('Content-Disposition'));
    const nfBody = await nfRes.json();
    assert.equal(nfBody.code, 'ENDPOINT_NOT_FOUND');
    assert.equal(nfBody.requestId, 'req-fortress-1234');

    const mini = express();
    mini.use(requestIdMiddleware);
    mini.get('/boom', () => {
      const e = new Error('relation "araclar" does not exist');
      e.code = '42P01';
      e.detail = 'secret_pg_detail';
      e.table = 'araclar';
      throw e;
    });
    mini.use(errorHandler);
    const miniSrv = http.createServer(mini);
    await new Promise((r) => miniSrv.listen(0, '127.0.0.1', r));
    try {
      const boomRes = await fetch(`http://127.0.0.1:${miniSrv.address().port}/boom`);
      assert.equal(boomRes.status, 500);
      const raw = await boomRes.text();
      const parsed = JSON.parse(raw);
      assert.equal(parsed.code, 'INTERNAL_ERROR');
      assert.ok(parsed.requestId);
      assert.ok(!raw.includes('42P01') && !raw.includes('araclar') && !raw.includes('secret_pg_detail'));
    } finally {
      await new Promise((r) => miniSrv.close(r));
    }
  });
});
