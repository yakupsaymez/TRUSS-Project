/*
 * YALNIZCA LOKAL QA İÇİNDİR
 * TRUSS Gate Testleri için izole ve tekrar çalıştırılabilir (idempotent) QA veri tohumlama aracı.
 * Gerçek organizasyonlara (org_id=1) ve gerçek kullanıcılara (user_id=1, 6) ASLA dokunmaz.
 *
 * Kullanım:
 *   node scripts/qaSeed.js            -> QA verisini oluşturur / korur, 4 rol için login olup /tmp/truss_qa_tokens.env yazar
 *   node scripts/qaSeed.js --cleanup  -> Yalnızca QA verisini temizler
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../db');
const {
  QA_EMAIL_DOMAIN,
  QA_PASSWORD,
  TOKENS_FILE,
  QA_ORGS,
  QA_USERS,
  QA_PLATES,
  ensureOrganization,
  ensureUser,
  ensureVehicle,
  ensureYakit,
  ensureBakim,
  ensureAssignment,
  loginUser,
  buildQaSeedVehicles,
  buildQaSeedLogs,
} = require('./qaSeedHelpers');

async function seed() {
  const client = await pool.connect();
  const ids = { orgs: {}, users: {}, vehicles: {} };

  try {
    await client.query('BEGIN');

    ids.orgs.ORG_A = await ensureOrganization(client, QA_ORGS.ORG_A);
    ids.orgs.ORG_B = await ensureOrganization(client, QA_ORGS.ORG_B);

    const passwordHash = await bcrypt.hash(QA_PASSWORD, 10);
    for (const u of QA_USERS) {
      ids.users[u.key] = await ensureUser(client, u, ids.orgs[u.orgKey], passwordHash);
    }

    const vSpecs = buildQaSeedVehicles(ids);
    const logs = buildQaSeedLogs();

    ids.vehicles.QA_KM_01 = await ensureVehicle(client, vSpecs.QA_KM_01);
    for (const y of logs.km01Yakitlar) {
      await ensureYakit(client, ids.vehicles.QA_KM_01, y);
    }
    await ensureBakim(client, ids.vehicles.QA_KM_01, logs.km01Bakim);

    ids.vehicles.QA_SMH_01 = await ensureVehicle(client, vSpecs.QA_SMH_01);
    ids.vehicles.QA_KM_02 = await ensureVehicle(client, vSpecs.QA_KM_02);
    await ensureYakit(client, ids.vehicles.QA_KM_02, logs.km02Yakit);

    await ensureAssignment(client, ids.vehicles.QA_KM_01, ids.users.DRIVER);
    ids.vehicles.QA_RAKIP_01 = await ensureVehicle(client, vSpecs.QA_RAKIP_01);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    client.release();
  }

  // 4 kullanıcı için POST /api/users/login ve /tmp/truss_qa_tokens.env çıktısı
  const envLines = [
    `# TRUSS QA Tokens (generated ${new Date().toISOString()})`,
    `QA_ORG_A_ID=${ids.orgs.ORG_A}`,
    `QA_ORG_B_ID=${ids.orgs.ORG_B}`,
    `QA_ADMIN_USER_ID=${ids.users.ADMIN}`,
    `QA_MANAGER_USER_ID=${ids.users.MANAGER}`,
    `QA_DRIVER_USER_ID=${ids.users.DRIVER}`,
    `QA_OUTSIDER_USER_ID=${ids.users.OUTSIDER}`,
    `QA_KM_01_ID=${ids.vehicles.QA_KM_01}`,
    `QA_SMH_01_ID=${ids.vehicles.QA_SMH_01}`,
    `QA_KM_02_ID=${ids.vehicles.QA_KM_02}`,
    `QA_RAKIP_01_ID=${ids.vehicles.QA_RAKIP_01}`,
  ];

  const loginResults = {};
  for (const u of QA_USERS) {
    const res = await loginUser(u.email, QA_PASSWORD);
    loginResults[u.key] = { email: u.email, status: res.status, hasToken: Boolean(res.body?.token) };
    if (!res.body?.token) {
      throw new Error(`Login başarısız (${u.email}): HTTP ${res.status} - ${JSON.stringify(res.body)}`);
    }
    envLines.push(`QA_${u.key}_TOKEN='${res.body.token}'`);
  }

  fs.writeFileSync(TOKENS_FILE, `${envLines.join('\n')}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ mode: 'seed', ids, loginResults, tokensFile: TOKENS_FILE }, null, 2));
}

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const emailPattern = `%@${QA_EMAIL_DOMAIN}`;
    const qaUsersRes = await client.query(
      'SELECT user_id, email, org_id FROM users WHERE email LIKE $1 AND user_id NOT IN (1, 6)',
      [emailPattern]
    );
    const qaUserIds = qaUsersRes.rows.map((r) => r.user_id);

    const qaOrgsRes = await client.query(
      'SELECT org_id FROM organizations WHERE unvan = ANY($1::text[]) AND org_id <> 1',
      [[QA_ORGS.ORG_A, QA_ORGS.ORG_B]]
    );
    const qaOrgIds = qaOrgsRes.rows.map((r) => r.org_id);

    const qaVehiclesRes = await client.query(
      'SELECT arac_id FROM araclar WHERE plaka = ANY($1::text[]) OR kullanici_id = ANY($2::int[]) OR org_id = ANY($3::int[])',
      [QA_PLATES, qaUserIds.length > 0 ? qaUserIds : [-1], qaOrgIds.length > 0 ? qaOrgIds : [-1]]
    );
    const qaVehicleIds = qaVehiclesRes.rows.map((r) => r.arac_id);

    const deleted = {
      atamalar: 0, yakitlar: 0, bakimlar: 0, parcalar: 0, araclar: 0, denetim: 0, users: 0, organizations: 0,
    };

    if (qaVehicleIds.length > 0 || qaUserIds.length > 0) {
      const r1 = await client.query(
        'DELETE FROM arac_sofor_atamalari WHERE arac_id = ANY($1::int[]) OR sofor_user_id = ANY($2::int[])',
        [qaVehicleIds.length > 0 ? qaVehicleIds : [-1], qaUserIds.length > 0 ? qaUserIds : [-1]]
      );
      deleted.atamalar = r1.rowCount;
    }

    if (qaVehicleIds.length > 0) {
      deleted.yakitlar = (await client.query('DELETE FROM yakitlar WHERE arac_id = ANY($1::int[])', [qaVehicleIds])).rowCount;
      deleted.bakimlar = (await client.query('DELETE FROM bakimlar WHERE arac_id = ANY($1::int[])', [qaVehicleIds])).rowCount;
      deleted.parcalar = (await client.query('DELETE FROM parca_takip WHERE arac_id = ANY($1::int[])', [qaVehicleIds])).rowCount;
      deleted.araclar = (await client.query('DELETE FROM araclar WHERE arac_id = ANY($1::int[])', [qaVehicleIds])).rowCount;
    }

    deleted.denetim = (await client.query(
      'DELETE FROM denetim_kayitlari WHERE org_id = ANY($1::int[]) OR user_id = ANY($2::int[]) OR kullanici_eposta LIKE $3',
      [qaOrgIds.length > 0 ? qaOrgIds : [-1], qaUserIds.length > 0 ? qaUserIds : [-1], emailPattern]
    )).rowCount;

    if (qaUserIds.length > 0) {
      deleted.users = (
        await client.query('DELETE FROM users WHERE user_id = ANY($1::int[]) AND email LIKE $2 AND user_id NOT IN (1, 6)', [qaUserIds, emailPattern])
      ).rowCount;
    }

    if (qaOrgIds.length > 0) {
      deleted.organizations = (
        await client.query('DELETE FROM organizations WHERE org_id = ANY($1::int[]) AND org_id <> 1', [qaOrgIds])
      ).rowCount;
    }

    await client.query('COMMIT');

    if (fs.existsSync(TOKENS_FILE)) {
      fs.unlinkSync(TOKENS_FILE);
    }

    console.log(JSON.stringify({ mode: 'cleanup', deleted }, null, 2));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  if (process.argv.includes('--cleanup')) {
    await cleanup();
  } else {
    await seed();
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('qaSeed hatası:', err);
    await pool.end().catch(() => null);
    process.exit(1);
  });
