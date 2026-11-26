const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { validateEnv, parseTrustProxy } = require('../utils/validateEnv');
const { createGracefulShutdown } = require('../utils/gracefulShutdown');
const { createRateLimiter, normalizeEmailKey, stopAllRateLimiterCleanups } = require('../middlewares/rateLimiter');
const { runMigrations } = require('../scripts/migrate');
const { MIGRATIONS } = require('../scripts/migrations');
const { createApp } = require('../server');
const {
  pool, startTestServer, createTestOrg, createTestUser,
  takeExternalSnapshot, cleanupTestSuite, resetAllRateLimiters,
} = require('./helpers/pgTestHarness');

const listenTempApp = async (customApp) => {
  const server = http.createServer(customApp);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  };
};

describe('FORGE-C0 Production Shield & Bootstrap Tests', () => {
  let srv;
  let beforeSnap;

  before(async () => {
    await cleanupTestSuite();
    beforeSnap = await takeExternalSnapshot();
    srv = await startTestServer();
  });

  beforeEach(() => {
    resetAllRateLimiters();
  });

  after(async () => {
    await cleanupTestSuite();
    const afterSnap = await takeExternalSnapshot();
    if (srv) await srv.close();
    stopAllRateLimiterCleanups();
    await pool.end();
    assert.deepEqual(afterSnap, beforeSnap);
  });

  it('1) validateEnv & parseTrustProxy: tum gecersiz anahtarlari tek seferde raporlar', () => {
    assert.deepEqual(parseTrustProxy(undefined), { ok: true, value: false });
    assert.deepEqual(parseTrustProxy('0'), { ok: true, value: false });
    assert.deepEqual(parseTrustProxy('true'), { ok: true, value: true });
    assert.deepEqual(parseTrustProxy('2'), { ok: true, value: 2 });
    assert.deepEqual(parseTrustProxy('loopback'), { ok: true, value: 'loopback' });
    assert.equal(parseTrustProxy('11').ok, false);
    assert.equal(parseTrustProxy('evil').ok, false);

    assert.throws(
      () => validateEnv({ NODE_ENV: 'production', JWT_SECRET: 'short', PORT: '99999', TRUST_PROXY: 'bad', CORS_ORIGIN: '*' }),
      (err) => err.code === 'ENV_VALIDATION_FAILED'
        && ['DB_HOST', 'DB_USER', 'DB_NAME', 'DB_PORT', 'JWT_SECRET', 'PORT', 'TRUST_PROXY', 'CORS_ORIGIN'].every((k) => err.invalidKeys.includes(k))
    );

    const okUrl = validateEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://u:p@db.internal:5432/truss',
      JWT_SECRET: 'a'.repeat(32),
      CORS_ORIGIN: 'https://app.truss.io,https://admin.truss.io',
      TRUST_PROXY: '1',
    });
    assert.equal(okUrl.hasDatabaseUrl, true);
    assert.equal(okUrl.trustProxy, 1);
    assert.equal(okUrl.corsOrigins.length, 2);
    assert.equal(okUrl.docVaultDriver, 'disabled');

    assert.throws(
      () => validateEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@db.internal:5432/truss', JWT_SECRET: 'a'.repeat(32), CORS_ORIGIN: 'https://app.truss.io', DOC_VAULT_DRIVER: 'local' }),
      (err) => err.code === 'ENV_VALIDATION_FAILED' && err.invalidKeys.includes('DOC_VAULT_DRIVER')
    );
    assert.throws(
      () => validateEnv({ NODE_ENV: 'development', DB_HOST: 'localhost', DB_USER: 'u', DB_NAME: 'd', DB_PORT: '5432', JWT_SECRET: 'devsecret', S3_ENDPOINT: 'not-a-url', S3_BUCKET: 'b' }),
      (err) => err.code === 'ENV_VALIDATION_FAILED' && ['S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'].every((k) => err.invalidKeys.includes(k))
    );
    const s3Cfg = validateEnv({
      NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@db.internal:5432/truss', JWT_SECRET: 'a'.repeat(32),
      CORS_ORIGIN: 'https://app.truss.io', S3_ENDPOINT: 'https://acc.r2.cloudflarestorage.com',
      S3_BUCKET: 'truss-docs', S3_ACCESS_KEY_ID: 'key123', S3_SECRET_ACCESS_KEY: 'sec123',
    });
    assert.equal(s3Cfg.docVaultDriver, 's3');
    const devLocal = validateEnv({ NODE_ENV: 'development', DB_HOST: 'localhost', DB_USER: 'u', DB_NAME: 'd', DB_PORT: '5432', JWT_SECRET: 'devsecret' });
    assert.equal(devLocal.docVaultDriver, 'local');
  });

  it('2) securityHeaders: x-powered-by yok, CSP, no-store ve dev vs prod/secure HSTS', async () => {
    const devRes = await fetch(`${srv.baseUrl}/api/health`);
    assert.equal(devRes.headers.get('x-powered-by'), null);
    assert.equal(devRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(devRes.headers.get('x-frame-options'), 'DENY');
    assert.equal(devRes.headers.get('permissions-policy'), 'geolocation=(self), camera=(), microphone=()');
    assert.equal(devRes.headers.get('content-security-policy'), "default-src 'none'; frame-ancestors 'none'");
    assert.equal(devRes.headers.get('strict-transport-security'), null);

    const prodSrv = await listenTempApp(createApp({ nodeEnv: 'production', trustProxyRaw: 'true', corsOriginRaw: 'https://app.truss.io' }));
    try {
      const loginRes = await fetch(`${prodSrv.baseUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' },
        body: JSON.stringify({}),
      });
      assert.equal(loginRes.headers.get('cache-control'), 'no-store');
      assert.equal(loginRes.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
    } finally {
      await prodSrv.close();
    }
  });

  it('3) rateLimiter: NAT izolasyonu, tip guvenligi, 200 reset, XFF reddi, register & maxEntries', async () => {
    assert.equal(normalizeEmailKey(['a']), '__invalid__');
    assert.equal(normalizeEmailKey({ a: 1 }), '__invalid__');
    assert.equal(normalizeEmailKey(null), '__invalid__');

    const org = await createTestOrg('rl');
    const user = await createTestUser({ orgId: org.org_id, tag: 'rl' });

    const postLogin = (body, extraHeaders = {}) => fetch(`${srv.baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
    });

    for (let i = 0; i < 6; i += 1) {
      const r = await postLogin({ email: user.email, sifre: 'wrong' });
      assert.equal(r.status, 401);
    }
    const blocked = await postLogin({ email: user.email, sifre: 'wrong' });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
    assert.ok(blocked.headers.get('ratelimit-limit'));
    assert.equal(blocked.headers.get('cache-control'), 'no-store');
    assert.equal((await blocked.json()).code, 'RATE_LIMITED');

    // X-Forwarded-For spoof reddi + baska e-posta NAT izolasyonu
    const spoofed = await postLogin({ email: user.email, sifre: 'wrong' }, { 'X-Forwarded-For': '10.99.99.99' });
    assert.equal(spoofed.status, 429);
    const otherEmail = await postLogin({ email: 'other@forge-test.local', sifre: 'wrong' });
    assert.equal(otherEmail.status, 401);

    // String-disi email 500 TypeError firlatmaz, __invalid__ kovasinda 429 yer
    resetAllRateLimiters();
    for (const payload of [['a'], {}, null, 123, '', '  ']) {
      const r = await postLogin({ email: payload, sifre: 'wrong' });
      assert.notEqual(r.status, 500);
    }
    assert.equal((await postLogin({ email: ['x'], sifre: 'wrong' })).status, 429);

    // 200 login yalniz ip+email kovasini sifirlar
    resetAllRateLimiters();
    for (let i = 0; i < 5; i += 1) await postLogin({ email: user.email, sifre: 'wrong' });
    assert.equal((await postLogin({ email: user.email, sifre: user.rawPassword })).status, 200);
    for (let i = 0; i < 6; i += 1) assert.equal((await postLogin({ email: user.email, sifre: 'wrong' })).status, 401);
    assert.equal((await postLogin({ email: user.email, sifre: 'wrong' })).status, 429);

    // Register 8/15dk limiti
    resetAllRateLimiters();
    const regReq = () => fetch(`${srv.baseUrl}/api/users/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    for (let i = 0; i < 8; i += 1) assert.notEqual((await regReq()).status, 429);
    const regBlocked = await regReq();
    assert.equal(regBlocked.status, 429);
    assert.equal((await regBlocked.json()).code, 'RATE_LIMITED');

    // maxEntries sweep + FIFO tahliye
    let now = 1000;
    const bounded = createRateLimiter({ windowMs: 100, max: 5, maxEntries: 2, nowFn: () => now, cleanupIntervalMs: 0 });
    bounded.consume('k1');
    bounded.consume('k2');
    assert.equal(bounded.size(), 2);
    bounded.consume('k3'); // FIFO k1 tahliye
    assert.equal(bounded.size(), 2);
    assert.equal(bounded.peek('k1').count, 0);
    now += 200;
    bounded.consume('k4'); // k2 & k3 sweep
    assert.equal(bounded.size(), 1);
  });

  it('4) /api/health: 200 ok, shutting_down 503, single-flight & timeout/hata 503 degraded', async () => {
    const okRes = await fetch(`${srv.baseUrl}/api/health`);
    assert.equal(okRes.status, 200);
    assert.equal(okRes.headers.get('cache-control'), 'no-store');
    assert.equal((await okRes.json()).db, 'up');

    let calls = 0;
    const sfApp = createApp({
      dbPool: {
        query: async () => {
          calls += 1;
          await new Promise((r) => setTimeout(r, 40));
          return { rows: [{ '?column?': 1 }] };
        },
      },
    });
    const sfSrv = await listenTempApp(sfApp);
    try {
      const five = await Promise.all(Array.from({ length: 5 }, () => fetch(`${sfSrv.baseUrl}/api/health`)));
      for (const r of five) assert.equal(r.status, 200);
      assert.equal(calls, 1);

      sfApp.setShuttingDown(true);
      try {
        const downRes = await fetch(`${sfSrv.baseUrl}/api/health`);
        assert.equal(downRes.status, 503);
        assert.equal((await downRes.json()).status, 'shutting_down');
        assert.equal(calls, 1);
      } finally {
        sfApp.setShuttingDown(false);
      }
    } finally {
      await sfSrv.close();
    }

    const slowSrv = await listenTempApp(createApp({
      healthTimeoutMs: 30,
      dbPool: { query: () => new Promise((_, rej) => setTimeout(() => rej(new Error('SECRET_DB_ERR')), 80)) },
    }));
    try {
      const degRes = await fetch(`${slowSrv.baseUrl}/api/health`);
      assert.equal(degRes.status, 503);
      const body = await degRes.json();
      assert.deepEqual({ status: body.status, db: body.db }, { status: 'degraded', db: 'down' });
      assert.equal(JSON.stringify(body).includes('SECRET_DB_ERR'), false);
    } finally {
      await slowSrv.close();
    }
  });

  it('5) gracefulShutdown DI: sira, idempotensi ve mock kaynak kapatma', async () => {
    const events = [];
    const shutdown = createGracefulShutdown({
      setShuttingDown: (v) => events.push(`down:${v}`),
      stopScheduler: () => events.push('sched'),
      stopRateLimiters: () => events.push('rl'),
      httpServer: {
        close: (cb) => { events.push('http:close'); cb(); },
        closeIdleConnections: () => events.push('http:idle'),
      },
      pool: { end: async () => events.push('pool:end') },
      exitFn: (code) => events.push(`exit:${code}`),
      logger: { log: () => {}, error: () => {} },
    });

    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);
    assert.deepEqual(events, ['down:true', 'sched', 'rl', 'http:close', 'http:idle', 'pool:end', 'exit:0']);
  });

  it('6) Izole bos-sema bootstrap: 000..010 2x idempotent, 19 tablo ve FK/indeks dogrulamasi', async () => {
    const tmpSchema = `forge_ci_boot_${Date.now()}`;
    await pool.query(`CREATE SCHEMA "${tmpSchema}"`);
    try {
      const r1 = await runMigrations(pool, { schema: tmpSchema });
      assert.equal(r1.applied.length, MIGRATIONS.length);
      assert.equal(r1.applied[0], '000_base_schema');

      const r2 = await runMigrations(pool, { schema: tmpSchema });
      assert.equal(r2.applied.length, 0);
      assert.equal(r2.skipped.length, MIGRATIONS.length);

      const tblRes = await pool.query(
        `SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
        [tmpSchema]
      );
      assert.equal(tblRes.rows[0].c, 19);

      const fkRes = await pool.query(
        `SELECT c.conname, c.confdeltype::text AS dt
         FROM pg_constraint c
         JOIN pg_namespace n ON n.oid = c.connamespace
         WHERE n.nspname = $1 AND c.conname IN ('fk_araclar_kullanici', 'fk_denetim_kayitlari_org')
         ORDER BY c.conname`,
        [tmpSchema]
      );
      assert.deepEqual(fkRes.rows, [
        { conname: 'fk_araclar_kullanici', dt: 'n' },
        { conname: 'fk_denetim_kayitlari_org', dt: 'n' },
      ]);

      const idxRes = await pool.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND indexname IN ('uq_is_emirleri_bakim', 'idx_belge_kasasi_org_durum', 'idx_belge_kasasi_varlik', 'idx_belge_kasasi_arac')`,
        [tmpSchema]
      );
      assert.equal(idxRes.rowCount, 4);
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS "${tmpSchema}" CASCADE`);
    }
  });
});
