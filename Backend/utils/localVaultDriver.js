const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const AppError = require('./AppError');
const { getJwtSecret } = require('./jwtSecret');

const getVaultRoot = () =>
  path.resolve(process.env.DOC_VAULT_LOCAL_DIR || path.resolve(__dirname, '../.local-vault'));

const deriveVaultKey = () =>
  crypto.createHmac('sha256', getJwtSecret()).update('truss-local-vault-v1').digest();

const signPayload = (message) =>
  crypto.createHmac('sha256', deriveVaultKey()).update(message, 'utf8').digest('hex');

const verifySignature = (message, providedSig) => {
  if (typeof providedSig !== 'string' || !/^[0-9a-f]{64}$/i.test(providedSig)) {
    return false;
  }
  const expectedBuf = Buffer.from(signPayload(message), 'hex');
  const providedBuf = Buffer.from(providedSig, 'hex');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
};

/**
 * Yol geçişi (path traversal) saldırılarını önleyerek yerel kasa dosya yolunu çözer.
 */
function resolveSafeVaultPath(key) {
  if (typeof key !== 'string' || !key || key.includes('\0') || key.includes('\\') || key.startsWith('/')) {
    throw new AppError(400, 'INVALID_KEY', 'Geçersiz belge anahtarı.');
  }
  const segments = key.split('/');
  if (segments.some((s) => !s || s === '.' || s === '..')) {
    throw new AppError(400, 'INVALID_KEY', 'Geçersiz belge anahtarı.');
  }
  const root = getVaultRoot();
  const resolved = path.resolve(root, key);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (!resolved.startsWith(rootWithSep)) {
    throw new AppError(400, 'INVALID_KEY', 'Geçersiz belge anahtarı.');
  }
  return resolved;
}

function createLocalPutUrl({ baseUrl = '', key, contentType, contentLength, expiresIn = 300, nowMs = Date.now() }) {
  const exp = Math.floor(nowMs / 1000) + Math.max(1, Math.trunc(Number(expiresIn) || 300));
  const len = Number(contentLength);
  const ct = String(contentType || '').trim().toLowerCase();
  const sig = signPayload(`PUT\n${key}\n${exp}\n${ct}\n${len}`);
  const prefix = String(baseUrl || '').replace(/\/+$/, '');
  const q = new URLSearchParams({ key, exp: String(exp), ct, len: String(len), sig });
  return `${prefix}/api/belgeler/local-nesne?${q.toString()}`;
}

function createLocalGetUrl({ baseUrl = '', key, contentType, disposition = 'inline', expiresIn = 300, nowMs = Date.now() }) {
  const exp = Math.floor(nowMs / 1000) + Math.max(1, Math.trunc(Number(expiresIn) || 300));
  const ct = String(contentType || '').trim().toLowerCase();
  const disp = String(disposition || 'inline');
  const sig = signPayload(`GET\n${key}\n${exp}\n${ct}\n${disp}`);
  const prefix = String(baseUrl || '').replace(/\/+$/, '');
  const q = new URLSearchParams({ key, exp: String(exp), ct, disp, sig });
  return `${prefix}/api/belgeler/local-nesne?${q.toString()}`;
}

function verifyLocalPutQuery(query = {}, nowMs = Date.now()) {
  const { key, exp, ct, len, sig } = query;
  if (
    typeof key !== 'string' || typeof exp !== 'string' || typeof ct !== 'string'
    || typeof len !== 'string' || typeof sig !== 'string'
    || !/^\d+$/.test(exp) || !/^\d+$/.test(len)
  ) {
    throw new AppError(403, 'INVALID_SIGNATURE', 'Geçersiz yükleme imzası.');
  }
  if (!verifySignature(`PUT\n${key}\n${exp}\n${ct}\n${len}`, sig)) {
    throw new AppError(403, 'INVALID_SIGNATURE', 'Geçersiz yükleme imzası.');
  }
  if (Number(exp) < Math.floor(nowMs / 1000)) {
    throw new AppError(403, 'URL_EXPIRED', 'Yükleme bağlantısının süresi dolmuştur.');
  }
  resolveSafeVaultPath(key);
  return { key, exp: Number(exp), ct: ct.toLowerCase(), len: Number(len) };
}

function verifyLocalGetQuery(query = {}, nowMs = Date.now()) {
  const { key, exp, ct, disp, sig } = query;
  if (
    typeof key !== 'string' || typeof exp !== 'string' || typeof ct !== 'string'
    || typeof disp !== 'string' || typeof sig !== 'string' || !/^\d+$/.test(exp)
  ) {
    throw new AppError(403, 'INVALID_SIGNATURE', 'Geçersiz erişim imzası.');
  }
  if (!verifySignature(`GET\n${key}\n${exp}\n${ct}\n${disp}`, sig)) {
    throw new AppError(403, 'INVALID_SIGNATURE', 'Geçersiz erişim imzası.');
  }
  if (Number(exp) < Math.floor(nowMs / 1000)) {
    throw new AppError(403, 'URL_EXPIRED', 'Erişim bağlantısının süresi dolmuştur.');
  }
  resolveSafeVaultPath(key);
  return { key, exp: Number(exp), ct, disp };
}

async function assertLocalFileUploaded(key, expectedBytes) {
  const filePath = resolveSafeVaultPath(key);
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile() || stat.size !== Number(expectedBytes)) {
      throw new AppError(422, 'DOCUMENT_UPLOAD_INCOMPLETE', 'Belge yüklemesi tamamlanmamış veya dosya boyutu uyuşmuyor.');
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(422, 'DOCUMENT_UPLOAD_INCOMPLETE', 'Belge henüz depolama alanına yüklenmemiş.');
  }
}

async function writeLocalObject(key, buffer) {
  const filePath = resolveSafeVaultPath(key);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, buffer);
}

async function readLocalObject(key) {
  const filePath = resolveSafeVaultPath(key);
  try {
    return await fs.promises.readFile(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new AppError(404, 'OBJECT_NOT_FOUND', 'Belge dosyası bulunamadı.');
    }
    throw err;
  }
}

module.exports = {
  getVaultRoot,
  resolveSafeVaultPath,
  createLocalPutUrl,
  createLocalGetUrl,
  verifyLocalPutQuery,
  verifyLocalGetQuery,
  assertLocalFileUploaded,
  writeLocalObject,
  readLocalObject,
};
