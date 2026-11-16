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

const QA_EMAIL_DOMAIN = 'qa.truss.example.com';
const QA_PASSWORD = 'QaTest!2026';
const TOKENS_FILE = '/tmp/truss_qa_tokens.env';
const API_BASE = `http://127.0.0.1:${process.env.PORT || 5001}`;

const QA_ORGS = {
  ORG_A: 'TRUSS QA Filosu',
  ORG_B: 'TRUSS QA Rakip Filo',
};

const QA_USERS = [
  { key: 'ADMIN', ad_soyad: 'QA System Admin', email: `qa.admin@${QA_EMAIL_DOMAIN}`, role: 'SYSTEM_ADMIN', orgKey: 'ORG_A' },
  { key: 'MANAGER', ad_soyad: 'QA Fleet Manager', email: `qa.manager@${QA_EMAIL_DOMAIN}`, role: 'FLEET_MANAGER', orgKey: 'ORG_A' },
  { key: 'DRIVER', ad_soyad: 'QA Driver', email: `qa.driver@${QA_EMAIL_DOMAIN}`, role: 'DRIVER', orgKey: 'ORG_A' },
  { key: 'OUTSIDER', ad_soyad: 'QA Outsider Manager', email: `qa.outsider@${QA_EMAIL_DOMAIN}`, role: 'FLEET_MANAGER', orgKey: 'ORG_B' },
];

const QA_PLATES = ['QA-KM-01', 'QA-SMH-01', 'QA-KM-02', 'QA-RAKIP-01'];

function trDateDaysAgo(daysAgo) {
  const now = new Date();
  const target = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(target);
}

async function ensureOrganization(client, unvan) {
  const existing = await client.query(
    'SELECT org_id, unvan FROM organizations WHERE unvan = $1 AND org_id <> 1 LIMIT 1',
    [unvan]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].org_id;
  }
  const inserted = await client.query(
    `INSERT INTO organizations (unvan, plan_tipi, aktif)
     VALUES ($1, 'ENTERPRISE', TRUE)
     RETURNING org_id`,
    [unvan]
  );
  return inserted.rows[0].org_id;
}

async function ensureUser(client, userDef, orgId, passwordHash) {
  const existing = await client.query(
    'SELECT user_id, email, role, org_id FROM users WHERE email = $1 LIMIT 1',
    [userDef.email]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].user_id;
  }
  const inserted = await client.query(
    `INSERT INTO users (ad_soyad, email, sifre, org_id, role)
     VALUES ($1, $2, $3, $4, $5::user_role_type)
     RETURNING user_id`,
    [userDef.ad_soyad, userDef.email, passwordHash, orgId, userDef.role]
  );
  return inserted.rows[0].user_id;
}

async function ensureVehicle(client, v) {
  const existing = await client.query(
    'SELECT arac_id FROM araclar WHERE plaka = $1 LIMIT 1',
    [v.plaka]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].arac_id;
  }
  const inserted = await client.query(
    `INSERT INTO araclar (plaka, marka, model, yil, kullanici_id, kategori, sayac_tipi, guncel_km, guncel_calisma_saati)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING arac_id`,
    [
      v.plaka,
      v.marka,
      v.model,
      v.yil,
      v.kullanici_id,
      v.kategori,
      v.sayac_tipi,
      v.guncel_km,
      v.guncel_calisma_saati,
    ]
  );
  return inserted.rows[0].arac_id;
}

async function ensureYakit(client, aracId, { yakit_tipi, tarih, litre, tutar, km, notlar }) {
  const existing = await client.query(
    'SELECT yakit_id FROM yakitlar WHERE arac_id = $1 AND km = $2 AND notlar = $3 LIMIT 1',
    [aracId, km, notlar]
  );
  if (existing.rowCount > 0) return existing.rows[0].yakit_id;
  const inserted = await client.query(
    `INSERT INTO yakitlar (arac_id, yakit_tipi, tarih, litre, tutar, km, notlar)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING yakit_id`,
    [aracId, yakit_tipi, tarih, litre, tutar, km, notlar]
  );
  return inserted.rows[0].yakit_id;
}

async function ensureBakim(client, aracId, { bakim_tipi, tarih, km, maliyet, notlar }) {
  const existing = await client.query(
    'SELECT bakim_id FROM bakimlar WHERE arac_id = $1 AND km = $2 AND notlar = $3 LIMIT 1',
    [aracId, km, notlar]
  );
  if (existing.rowCount > 0) return existing.rows[0].bakim_id;
  const inserted = await client.query(
    `INSERT INTO bakimlar (arac_id, bakim_tipi, tarih, km, maliyet, notlar)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING bakim_id`,
    [aracId, bakim_tipi, tarih, km, maliyet, notlar]
  );
  return inserted.rows[0].bakim_id;
}

async function ensureAssignment(client, aracId, driverUserId) {
  const existing = await client.query(
    'SELECT atama_id, sofor_user_id FROM arac_sofor_atamalari WHERE arac_id = $1 AND aktif = TRUE LIMIT 1',
    [aracId]
  );
  if (existing.rowCount > 0 && existing.rows[0].sofor_user_id === driverUserId) {
    return existing.rows[0].atama_id;
  }
  await client.query(
    'UPDATE arac_sofor_atamalari SET aktif = FALSE, teslim_tarihi = NOW() WHERE arac_id = $1 AND aktif = TRUE',
    [aracId]
  );
  const inserted = await client.query(
    `INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif)
     VALUES ($1, $2, TRUE)
     RETURNING atama_id`,
    [aracId, driverUserId]
  );
  return inserted.rows[0].atama_id;
}

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, sifre: password }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

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

    ids.vehicles.QA_KM_01 = await ensureVehicle(client, {
      plaka: 'QA-KM-01',
      marka: 'Ford',
      model: 'Transit',
      yil: 2023,
      kullanici_id: ids.users.MANAGER,
      kategori: 'Ticari / Hafif Ticari',
      sayac_tipi: 'KM',
      guncel_km: 11000,
      guncel_calisma_saati: 0,
    });

    await ensureYakit(client, ids.vehicles.QA_KM_01, {
      yakit_tipi: 'Dizel',
      tarih: trDateDaysAgo(10),
      litre: 50,
      tutar: 2150,
      km: 10000,
      notlar: '[QA-SEED] Yakıt-1 (T-10g)',
    });

    await ensureYakit(client, ids.vehicles.QA_KM_01, {
      yakit_tipi: 'Dizel',
      tarih: trDateDaysAgo(5),
      litre: 45,
      tutar: 1950,
      km: 10500,
      notlar: '[QA-SEED] Yakıt-2 (T-5g)',
    });

    await ensureBakim(client, ids.vehicles.QA_KM_01, {
      bakim_tipi: 'Periyodik Bakım',
      tarih: trDateDaysAgo(3),
      km: 10800,
      maliyet: 2500,
      notlar: '[QA-SEED] Bakım-1 (T-3g)',
    });

    ids.vehicles.QA_SMH_01 = await ensureVehicle(client, {
      plaka: 'QA-SMH-01',
      marka: 'Caterpillar',
      model: '320 GC',
      yil: 2022,
      kullanici_id: ids.users.MANAGER,
      kategori: 'İş Makinesi',
      sayac_tipi: 'SMH',
      guncel_km: 0,
      guncel_calisma_saati: 1200,
    });

    ids.vehicles.QA_KM_02 = await ensureVehicle(client, {
      plaka: 'QA-KM-02',
      marka: 'Renault',
      model: 'Clio',
      yil: 2024,
      kullanici_id: ids.users.MANAGER,
      kategori: 'Otomobil',
      sayac_tipi: 'KM',
      guncel_km: 5000,
      guncel_calisma_saati: 0,
    });

    await ensureYakit(client, ids.vehicles.QA_KM_02, {
      yakit_tipi: 'Benzin',
      tarih: trDateDaysAgo(2),
      litre: 35,
      tutar: 1500,
      km: 4800,
      notlar: '[QA-SEED] QA-KM-02 Yakıt-1',
    });

    await ensureAssignment(client, ids.vehicles.QA_KM_01, ids.users.DRIVER);

    ids.vehicles.QA_RAKIP_01 = await ensureVehicle(client, {
      plaka: 'QA-RAKIP-01',
      marka: 'Fiat',
      model: 'Doblo',
      yil: 2023,
      kullanici_id: ids.users.OUTSIDER,
      kategori: 'Ticari / Hafif Ticari',
      sayac_tipi: 'KM',
      guncel_km: 3000,
      guncel_calisma_saati: 0,
    });

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
      'SELECT arac_id FROM araclar WHERE plaka = ANY($1::text[]) OR kullanici_id = ANY($2::int[])',
      [QA_PLATES, qaUserIds.length > 0 ? qaUserIds : [-1]]
    );
    const qaVehicleIds = qaVehiclesRes.rows.map((r) => r.arac_id);

    const deleted = {
      atamalar: 0,
      yakitlar: 0,
      bakimlar: 0,
      parcalar: 0,
      araclar: 0,
      users: 0,
      organizations: 0,
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
  const isCleanup = process.argv.includes('--cleanup');
  if (isCleanup) {
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
