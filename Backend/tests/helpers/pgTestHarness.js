const http = require('node:http');
const bcrypt = require('bcrypt');
const app = require('../../server');
const pool = require('../../db');

const TEST_ORG_PREFIX = '__forge_test_suite__';
const TEST_EMAIL_SUFFIX = '@forge-test.local';

let cachedHash = null;
async function getFastTestHash() {
  if (!cachedHash) cachedHash = await bcrypt.hash('ForgeTest123!', 4);
  return cachedHash;
}

async function startTestServer() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const close = () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  return { server, baseUrl, close };
}

async function requestJson(baseUrl, reqPath, { method = 'GET', token = null, body = undefined } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${reqPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

async function createTestOrg(suffix = 'main') {
  const unvan = `${TEST_ORG_PREFIX}_${suffix}_${Date.now()}`;
  const res = await pool.query(
    `INSERT INTO organizations (unvan, plan_tipi, aktif) VALUES ($1, 'ENTERPRISE', TRUE) RETURNING *`,
    [unvan]
  );
  return res.rows[0];
}

async function createTestUser({ orgId = null, role = 'FLEET_MANAGER', tag = 'u', yetkiler = {} } = {}) {
  const email = `forge_${tag}_${Date.now()}_${Math.floor(Math.random() * 10000)}${TEST_EMAIL_SUFFIX}`;
  const hash = await getFastTestHash();
  const res = await pool.query(
    `INSERT INTO users (ad_soyad, email, sifre, org_id, role, yetkiler)
     VALUES ($1, $2, $3, $4, $5::user_role_type, $6::jsonb)
     RETURNING user_id, ad_soyad, email, org_id, role, yetkiler, token_version`,
    [`Forge ${tag}`, email, hash, orgId, role, JSON.stringify(yetkiler)]
  );
  return { ...res.rows[0], rawPassword: 'ForgeTest123!' };
}

async function loginUser(baseUrl, email, sifre = 'ForgeTest123!') {
  const res = await requestJson(baseUrl, '/api/users/login', {
    method: 'POST',
    body: { email, sifre },
  });
  return res;
}

async function takeExternalSnapshot() {
  const q = async (sql) => Number((await pool.query(sql)).rows[0]?.c || 0);
  const testOrgSub = `SELECT org_id FROM organizations WHERE unvan LIKE '${TEST_ORG_PREFIX}%'`;
  const testUserSub = `SELECT user_id FROM users WHERE email LIKE '%${TEST_EMAIL_SUFFIX}'`;
  const testAracSub = `SELECT arac_id FROM araclar WHERE org_id IN (${testOrgSub}) OR kullanici_id IN (${testUserSub})`;
  const hasWorkOrders = Boolean((await pool.query(`SELECT to_regclass('public.is_emirleri') AS t`)).rows[0]?.t);
  return {
    organizations: await q(`SELECT COUNT(*)::int AS c FROM organizations WHERE unvan NOT LIKE '${TEST_ORG_PREFIX}%'`),
    users: await q(`SELECT COUNT(*)::int AS c FROM users WHERE email NOT LIKE '%${TEST_EMAIL_SUFFIX}'`),
    araclar_1_2: await q(`SELECT COUNT(*)::int AS c FROM araclar WHERE org_id IN (1, 2)`),
    araclar_ext: await q(`SELECT COUNT(*)::int AS c FROM araclar WHERE arac_id NOT IN (${testAracSub})`),
    yakitlar_ext: await q(`SELECT COUNT(*)::int AS c FROM yakitlar WHERE arac_id NOT IN (${testAracSub})`),
    bakimlar_ext: await q(`SELECT COUNT(*)::int AS c FROM bakimlar WHERE arac_id NOT IN (${testAracSub})`),
    parca_ext: await q(`SELECT COUNT(*)::int AS c FROM parca_takip WHERE arac_id NOT IN (${testAracSub})`),
    is_emirleri_ext: hasWorkOrders ? await q(`SELECT COUNT(*)::int AS c FROM is_emirleri WHERE arac_id NOT IN (${testAracSub})`) : 0,
    denetim_ext: await q(`SELECT COUNT(*)::int AS c FROM denetim_kayitlari WHERE COALESCE(kullanici_eposta, '') NOT LIKE '%${TEST_EMAIL_SUFFIX}'`),
  };
}

async function cleanupTestSuite() {
  let client = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const orgIds = (await client.query(`SELECT org_id FROM organizations WHERE unvan LIKE $1`, [`${TEST_ORG_PREFIX}%`])).rows.map((r) => r.org_id);
    const userIds = (await client.query(`SELECT user_id FROM users WHERE email LIKE $1`, [`%${TEST_EMAIL_SUFFIX}`])).rows.map((r) => r.user_id);
    const aracIds = (await client.query(
      `SELECT arac_id FROM araclar WHERE org_id = ANY($1::int[]) OR kullanici_id = ANY($2::int[])`,
      [orgIds, userIds]
    )).rows.map((r) => r.arac_id);

    await client.query(
      `DELETE FROM denetim_kayitlari WHERE kullanici_eposta LIKE $1 OR org_id = ANY($2::int[]) OR user_id = ANY($3::int[])`,
      [`%${TEST_EMAIL_SUFFIX}`, orgIds, userIds]
    );
    await client.query(`DELETE FROM bildirim_olaylari WHERE user_id = ANY($1::int[]) OR org_id = ANY($2::int[])`, [userIds, orgIds]);
    await client.query(`DELETE FROM yakit_anomalileri WHERE arac_id = ANY($1::int[])`, [aracIds]);
    await client.query(`DELETE FROM arac_sofor_atamalari WHERE arac_id = ANY($1::int[]) OR sofor_user_id = ANY($2::int[])`, [aracIds, userIds]);
    const hasWo = Boolean((await client.query(`SELECT to_regclass('public.is_emirleri') AS t`)).rows[0]?.t);
    if (hasWo) {
      await client.query(`DELETE FROM is_emirleri WHERE arac_id = ANY($1::int[]) OR org_id = ANY($2::int[])`, [aracIds, orgIds]);
    }
    await client.query(`DELETE FROM parca_takip WHERE arac_id = ANY($1::int[])`, [aracIds]);
    await client.query(`DELETE FROM yakitlar WHERE arac_id = ANY($1::int[])`, [aracIds]);
    await client.query(`DELETE FROM bakimlar WHERE arac_id = ANY($1::int[])`, [aracIds]);
    await client.query(`DELETE FROM araclar WHERE arac_id = ANY($1::int[])`, [aracIds]);
    await client.query(`DELETE FROM users WHERE user_id = ANY($1::int[]) OR org_id = ANY($2::int[])`, [userIds, orgIds]);
    await client.query(`DELETE FROM organizations WHERE org_id = ANY($1::int[])`, [orgIds]);
    await client.query('COMMIT');
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  pool,
  startTestServer,
  requestJson,
  createTestOrg,
  createTestUser,
  loginUser,
  takeExternalSnapshot,
  cleanupTestSuite,
};
