const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { runMigrations } = require('../scripts/migrate');
const {
  pool, startTestServer, requestJson, createTestOrg, createTestUser,
  loginUser, takeExternalSnapshot, cleanupTestSuite,
} = require('./helpers/pgTestHarness');

const loadPreflight = () =>
  import(pathToFileURL(path.resolve(__dirname, '../../scripts/preflight-prod.mjs')).href);

const VALID_PROD_ENV = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://truss:StrongDbPass99!@127.0.0.1:5432/truss_prod',
  JWT_SECRET: 'TrussV25ProdKey!9xK2mP7qR4vW8zB3nL6yC1dF5hJ0sT',
  CORS_ORIGIN: 'https://app.trussfleet.com',
  TRUST_PROXY: '1',
  DOC_VAULT_DRIVER: 's3',
  S3_ENDPOINT: 'https://acc123.r2.cloudflarestorage.com',
  S3_BUCKET: 'truss-vault-prod',
  S3_ACCESS_KEY_ID: 'AKIATESTKEY123456789',
  S3_SECRET_ACCESS_KEY: 'SuperSecretS3KeyValue!987654321',
  S3_REGION: 'auto',
  VITE_SUPPORT_EMAIL: 'destek@trussfleet.com',
  VITE_SUPPORT_PHONE: '+90 212 555 12 34',
};

describe('FORGE-E4 V2.5 Launch-Fortress Seal Tests', () => {
  let srv, beforeSnap, preflight;
  let orgA, mgrA, sysAdm, drvA, tokMgrA, tmpBuildDir;

  before(async () => {
    await runMigrations(pool);
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();
    preflight = await loadPreflight();

    orgA = await createTestOrg('e4A');
    sysAdm = await createTestUser({ orgId: orgA.org_id, role: 'SYSTEM_ADMIN', tag: 'e4Sys' });
    mgrA = await createTestUser({ orgId: orgA.org_id, role: 'FLEET_MANAGER', tag: 'e4Mgr' });
    drvA = await createTestUser({ orgId: orgA.org_id, role: 'DRIVER', tag: 'e4Drv' });
    tokMgrA = (await loginUser(srv.baseUrl, mgrA.email)).body.token;

    tmpBuildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'truss-e4-build-'));
    fs.mkdirSync(path.join(tmpBuildDir, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(tmpBuildDir, 'index.html'), '<!doctype html><html></html>');
    fs.writeFileSync(path.join(tmpBuildDir, 'robots.txt'), 'User-agent: *\nDisallow: /app\nDisallow: /api\n');
    fs.writeFileSync(path.join(tmpBuildDir, 'assets', 'index-clean.js'), 'console.log("/api");');
  });

  after(async () => {
    if (tmpBuildDir && fs.existsSync(tmpBuildDir)) {
      fs.rmSync(tmpBuildDir, { recursive: true, force: true });
    }
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    if (srv) await srv.close();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('1) auditProdReadiness negatif matris: zayif JWT, CORS, TRUST_PROXY=true, local vault, sahte kunye & sir maskeleme', async () => {
    const weakJwtRes = await preflight.auditProdReadiness({
      env: { ...VALID_PROD_ENV, JWT_SECRET: 'a'.repeat(40) },
      skipBuild: true,
      skipDb: true,
    });
    assert.equal(weakJwtRes.ok, false);
    assert.equal(weakJwtRes.checks.find((c) => c.id === 'env.jwt_secret').status, 'FAIL');

    const placeholderJwtRes = await preflight.auditProdReadiness({
      env: { ...VALID_PROD_ENV, JWT_SECRET: 'this-is-a-secret-example-key-1234567890' },
      skipBuild: true,
      skipDb: true,
    });
    assert.equal(placeholderJwtRes.checks.find((c) => c.id === 'env.jwt_secret').status, 'FAIL');

    const badCorsRes = await preflight.auditProdReadiness({
      env: { ...VALID_PROD_ENV, CORS_ORIGIN: 'http://localhost:5173' },
      skipBuild: true,
      skipDb: true,
    });
    assert.equal(badCorsRes.checks.find((c) => c.id === 'env.cors_origin').status, 'FAIL');

    const badProxyRes = await preflight.auditProdReadiness({
      env: { ...VALID_PROD_ENV, TRUST_PROXY: 'true' },
      skipBuild: true,
      skipDb: true,
    });
    assert.equal(badProxyRes.checks.find((c) => c.id === 'env.trust_proxy').status, 'FAIL');

    const localVaultRes = await preflight.auditProdReadiness({
      env: { ...VALID_PROD_ENV, DOC_VAULT_DRIVER: 'local' },
      skipBuild: true,
      skipDb: true,
    });
    assert.equal(localVaultRes.checks.find((c) => c.id === 'env.doc_vault').status, 'FAIL');

    const fakeBrandRes = await preflight.auditProdReadiness({
      env: { ...VALID_PROD_ENV, VITE_SUPPORT_EMAIL: 'destek@truss.example.com', VITE_SUPPORT_PHONE: '+90 212 000 00 00' },
      buildDir: tmpBuildDir,
      skipDb: true,
    });
    assert.equal(fakeBrandRes.checks.find((c) => c.id === 'env.brand_hygiene').status, 'FAIL');

    const serialized = JSON.stringify(fakeBrandRes);
    assert.equal(serialized.includes(VALID_PROD_ENV.JWT_SECRET), false);
    assert.equal(serialized.includes(VALID_PROD_ENV.S3_SECRET_ACCESS_KEY), false);
    assert.equal(serialized.includes('StrongDbPass99!'), false);
  });

  it('2) auditProdReadiness build matrisi: eksik robots.txt ve bundle localhost:5001 kalintisini yakalar', async () => {
    const dirtyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'truss-e4-dirty-'));
    try {
      fs.mkdirSync(path.join(dirtyDir, 'assets'), { recursive: true });
      fs.writeFileSync(path.join(dirtyDir, 'index.html'), '<html></html>');
      fs.writeFileSync(path.join(dirtyDir, 'assets', 'app.js'), 'const u="http://localhost:5001/api";');

      const res = await preflight.auditProdReadiness({ env: VALID_PROD_ENV, buildDir: dirtyDir, skipDb: true });
      assert.equal(res.ok, false);
      assert.equal(res.checks.find((c) => c.id === 'build.artifacts').status, 'FAIL');
      assert.equal(res.checks.find((c) => c.id === 'build.bundle_clean').status, 'FAIL');
    } finally {
      fs.rmSync(dirtyDir, { recursive: true, force: true });
    }
  });

  it('3) auditProdReadiness pozitif matris: gecerli prod env + temiz build + canli PG 16 (20 tablo, 000..011, aktif SYSTEM_ADMIN)', async () => {
    const res = await preflight.auditProdReadiness({
      env: VALID_PROD_ENV,
      buildDir: tmpBuildDir,
      pool,
    });
    assert.equal(res.ok, true);
    assert.equal(res.status, 'PASS');
    assert.equal(res.summary.failed, 0);
    assert.equal(res.checks.find((c) => c.id === 'db.pg_version').status, 'PASS');
    assert.equal(res.checks.find((c) => c.id === 'db.migrations').status, 'PASS');
    assert.equal(res.checks.find((c) => c.id === 'db.tables').status, 'PASS');
    assert.equal(res.checks.find((c) => c.id === 'db.partial_indexes').status, 'PASS');
    assert.equal(res.checks.find((c) => c.id === 'db.system_admin').status, 'PASS');
  });

  it('4) E1..E3 red-team regresyon: PATCH status "false" string reddi, gecersiz CLI bayragi & geri bildirim dogrulamasi', async () => {
    const strBoolRes = await requestJson(srv.baseUrl, `/api/admin/users/${drvA.user_id}/status`, {
      method: 'PATCH',
      token: tokMgrA,
      body: { aktif_mi: 'false' },
    });
    assert.equal(strBoolRes.status, 400);

    const badFeedback = await requestJson(srv.baseUrl, '/api/geri-bildirim', {
      method: 'POST',
      token: tokMgrA,
      body: { kategori: 'HATA', baslik: 'Ab', mesaj: 'kisa' },
    });
    assert.equal(badFeedback.status, 422);

    assert.throws(() => preflight.parseCliArgs(['--unknown-flag']), /Gecersiz bayrak/);
    assert.throws(() => preflight.parseCliArgs(['--env-file']), /dosya yolu zorunludur/);
  });
});
