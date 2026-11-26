import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_BUILD_DIR = path.join(ROOT_DIR, 'Frontend', 'dist');

const require = createRequire(import.meta.url);
const { parseTrustProxy, resolveDocVaultConfig } = require('../Backend/utils/validateEnv.js');
const { Pool } = require('../Backend/node_modules/pg');

const CANONICAL_TABLES = [
  'users', 'araclar', 'parca_takip', 'bakimlar', 'yakitlar', 'organizations',
  'arac_sofor_atamalari', 'ref_kategoriler', 'ref_markalar', 'ref_kategori_marka',
  'ref_modeller', 'ref_arac_varyantlari', 'bildirim_olaylari', 'yakit_anomalileri',
  'denetim_kayitlari', 'is_emirleri', 'belge_kasasi', 'zimmet_muayeneleri',
  'geri_bildirimler', 'schema_migrations',
];
const REQUIRED_MIGRATION_PREFIXES = Array.from({ length: 12 }, (_, i) => `${String(i).padStart(3, '0')}_`);
const REQUIRED_PARTIAL_INDEXES = ['uq_arac_tek_aktif_zimmet', 'uq_sofor_tek_aktif_zimmet', 'uq_is_emirleri_bakim'];
const BRAND_ENV_KEYS = [
  'VITE_SUPPORT_EMAIL', 'VITE_SUPPORT_PHONE', 'VITE_SUPPORT_HOURS', 'VITE_COMPANY_LEGAL_NAME', 'VITE_COMPANY_ADDRESS',
  'SUPPORT_EMAIL', 'SUPPORT_PHONE', 'SUPPORT_HOURS', 'COMPANY_LEGAL_NAME', 'COMPANY_ADDRESS',
];
const WEAK_JWT_RE = /(secret|change|changeme|example|placeholder|default|test|123456|password|qwerty)/i;

function walkJsFiles(dirPath, acc = []) {
  if (!fs.existsSync(dirPath)) return acc;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) walkJsFiles(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.js')) acc.push(full);
  }
  return acc;
}

function loadEnvFile(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`Env dosyasi bulunamadi: ${filePath}`);
  const parsed = {};
  for (const rawLine of fs.readFileSync(abs, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    parsed[key] = val;
  }
  return parsed;
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  const opts = { skipBuild: false, skipDb: false, json: false, envFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--skip-build') opts.skipBuild = true;
    else if (arg === '--skip-db') opts.skipDb = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--env-file') {
      if (i + 1 >= argv.length || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('--env-file icin dosya yolu zorunludur.');
      opts.envFile = argv[++i];
    } else if (arg.startsWith('--env-file=')) {
      const val = arg.slice('--env-file='.length);
      if (!val) throw new Error('--env-file icin dosya yolu zorunludur.');
      opts.envFile = val;
    } else throw new Error(`Gecersiz bayrak: ${arg}`);
  }
  return opts;
}

function checkEnvAndCrypto(env) {
  const checks = [];
  const add = (id, pass, message) => checks.push({ id, status: pass ? 'PASS' : 'FAIL', message });

  const nodeEnv = String(env.NODE_ENV || '').trim();
  add('env.node_env', nodeEnv === 'production', nodeEnv === 'production' ? 'NODE_ENV=production' : 'NODE_ENV production olmalidir.');

  const jwt = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  const jwtStrong = jwt.length >= 32 && !WEAK_JWT_RE.test(jwt) && new Set(jwt).size >= 8;
  add('env.jwt_secret', jwtStrong, jwtStrong ? 'JWT_SECRET uzunluk ve entropi gecerli.' : 'JWT_SECRET >= 32 karakter, yuksek entropili ve yer tutucusuz olmalidir.');

  const corsRaw = typeof env.CORS_ORIGIN === 'string' ? env.CORS_ORIGIN.trim() : '';
  const origins = corsRaw ? corsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  let corsOk = origins.length > 0;
  for (const origin of origins) {
    if (origin === '*') { corsOk = false; break; }
    try {
      const u = new URL(origin);
      const h = u.hostname.toLowerCase();
      if (u.protocol !== 'https:' || h === 'localhost' || h === '127.0.0.1' || h === '::1') corsOk = false;
    } catch { corsOk = false; }
  }
  add('env.cors_origin', corsOk, corsOk ? `CORS_ORIGIN (${origins.length} https origin) gecerli.` : 'CORS_ORIGIN bos, *, http:// veya localhost/127.0.0.1 iceremez.');

  const trust = parseTrustProxy(env.TRUST_PROXY, { nodeEnv: 'production' });
  add('env.trust_proxy', trust.ok, trust.ok ? `TRUST_PROXY=${String(trust.value)}` : trust.reason);

  const driverRaw = typeof env.DOC_VAULT_DRIVER === 'string' ? env.DOC_VAULT_DRIVER.trim().toLowerCase() : '';
  const vault = resolveDocVaultConfig({ ...env, NODE_ENV: 'production' });
  const s3RegionOk = typeof env.S3_REGION === 'string' && env.S3_REGION.trim().length > 0;
  const vaultOk = driverRaw === 's3' && vault.driver === 's3' && vault.errors.length === 0 && s3RegionOk;
  add('env.doc_vault', vaultOk, vaultOk ? 'DOC_VAULT_DRIVER=s3 ve tum S3 anahtarlari tanimli.' : 'Production icin DOC_VAULT_DRIVER=s3 ve S3_ENDPOINT/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY/REGION zorunludur.');
  return checks;
}

function checkBuildAndBrand(env, buildDir) {
  const checks = [];
  const add = (id, pass, message) => checks.push({ id, status: pass ? 'PASS' : 'FAIL', message });
  const indexOk = fs.existsSync(path.join(buildDir, 'index.html'));
  const robotsPath = path.join(buildDir, 'robots.txt');
  const robotsRaw = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, 'utf8') : '';
  const robotsOk = Boolean(robotsRaw) && /Disallow:\s*\/app/i.test(robotsRaw) && /Disallow:\s*\/api/i.test(robotsRaw);
  add('build.artifacts', indexOk && robotsOk, indexOk && robotsOk ? 'index.html ve robots.txt (Disallow /app,/api) mevcut.' : 'Build dizininde index.html veya gecerli robots.txt eksik.');

  const jsFiles = walkJsFiles(buildDir);
  const leaked = jsFiles.filter((f) => fs.readFileSync(f, 'utf8').includes('localhost:5001')).map((f) => path.basename(f));
  const bundleOk = jsFiles.length > 0 && leaked.length === 0;
  add('build.bundle_clean', bundleOk, bundleOk ? `${jsFiles.length} JS bundle temiz (localhost:5001 yok).` : `JS bundle icinde localhost:5001 kalintisi veya bos build: ${leaked.join(', ') || 'bundle yok'}`);

  const badBrand = BRAND_ENV_KEYS.filter((k) => {
    const val = typeof env[k] === 'string' ? env[k] : '';
    return /\.example\.com\b/i.test(val) || val.includes('000 00 00');
  });
  add('env.brand_hygiene', badBrand.length === 0, badBrand.length === 0 ? 'Kurumsal destek/kunye env yer tutucusu yok.' : `Sahte yer tutucu tespit edildi: ${badBrand.join(', ')}`);
  return checks;
}

async function checkDatabase(env, externalPool) {
  const checks = [];
  const add = (id, pass, message) => checks.push({ id, status: pass ? 'PASS' : 'FAIL', message });
  const dbUrl = typeof env.DATABASE_URL === 'string' ? env.DATABASE_URL.trim() : '';
  let pool = externalPool || null;
  let ownsPool = false;
  try {
    if (!pool) {
      if (!dbUrl && !env.DB_HOST) {
        add('db.connection', false, 'DATABASE_URL veya DB_HOST tanimli degil.');
        return checks;
      }
      pool = dbUrl
        ? new Pool({ connectionString: dbUrl })
        : new Pool({ host: env.DB_HOST, port: Number(env.DB_PORT || 5432), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME });
      ownsPool = true;
    }
    const verNum = Number((await pool.query('SHOW server_version_num')).rows[0]?.server_version_num || 0);
    add('db.pg_version', verNum >= 160000, `PostgreSQL version_num=${verNum} (min 160000).`);

    const migVersions = (await pool.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version);
    const missingMig = REQUIRED_MIGRATION_PREFIXES.filter((p) => !migVersions.some((v) => v.startsWith(p)));
    add('db.migrations', missingMig.length === 0, missingMig.length === 0 ? 'schema_migrations 000..011 eksiksiz.' : `Eksik migrasyonlar: ${missingMig.join(', ')}`);

    const tblSet = new Set((await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")).rows.map((r) => r.table_name));
    const missingTbl = CANONICAL_TABLES.filter((t) => !tblSet.has(t));
    add('db.tables', missingTbl.length === 0, missingTbl.length === 0 ? '20 kanonik tablo mevcut.' : `Eksik tablolar: ${missingTbl.join(', ')}`);

    const idxRes = await pool.query("SELECT c.relname, i.indisvalid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])", [REQUIRED_PARTIAL_INDEXES]);
    const validIdx = new Set(idxRes.rows.filter((r) => r.indisvalid === true).map((r) => r.relname));
    const badIdx = REQUIRED_PARTIAL_INDEXES.filter((name) => !validIdx.has(name));
    add('db.partial_indexes', badIdx.length === 0, badIdx.length === 0 ? 'Kismi tekil indeksler gecerli (indisvalid=true).' : `Eksik/gecersiz indeksler: ${badIdx.join(', ')}`);

    const admCount = (await pool.query("SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'SYSTEM_ADMIN' AND aktif_mi = TRUE")).rows[0]?.cnt || 0;
    add('db.system_admin', admCount >= 1, admCount >= 1 ? `Aktif SYSTEM_ADMIN sayisi: ${admCount}` : 'Aktif SYSTEM_ADMIN bulunamadi.');
  } catch (err) {
    add('db.connection', false, `Veritabani dogrulama hatasi: ${err.code || 'DB_ERROR'}`);
  } finally {
    if (ownsPool && pool) await pool.end().catch(() => null);
  }
  return checks;
}

export async function auditProdReadiness(options = {}) {
  const env = options.env || process.env;
  const buildDir = options.buildDir || DEFAULT_BUILD_DIR;
  const checks = [...checkEnvAndCrypto(env)];
  if (options.skipBuild) checks.push({ id: 'build.skipped', status: 'SKIP', message: '--skip-build aktif.' });
  else checks.push(...checkBuildAndBrand(env, buildDir));
  if (options.skipDb) checks.push({ id: 'db.skipped', status: 'SKIP', message: '--skip-db aktif.' });
  else checks.push(...(await checkDatabase(env, options.pool || null)));

  const failed = checks.filter((c) => c.status === 'FAIL').length;
  const passed = checks.filter((c) => c.status === 'PASS').length;
  const skipped = checks.filter((c) => c.status === 'SKIP').length;
  return { ok: failed === 0, status: failed === 0 ? 'PASS' : 'FAIL', summary: { passed, failed, skipped }, checks };
}

async function runCli() {
  try {
    const opts = parseCliArgs(process.argv.slice(2));
    const fileEnv = opts.envFile ? loadEnvFile(opts.envFile) : {};
    const report = await auditProdReadiness({ env: { ...process.env, ...fileEnv }, skipBuild: opts.skipBuild, skipDb: opts.skipDb });
    if (opts.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log('\n=== TRUSS PRODUCTION PREFLIGHT ===');
      for (const c of report.checks) console.log(`[${c.status}] ${c.id.padEnd(20)} | ${c.message}`);
      console.log(`RESULT: ${report.status} (${report.summary.passed} pass, ${report.summary.failed} fail, ${report.summary.skipped} skip)\n`);
    }
    process.exitCode = report.ok ? 0 : 1;
  } catch (err) {
    console.error(`PREFLIGHT ERROR: ${err.message}`);
    process.exitCode = 2;
  }
}

const isMain = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) runCli();
