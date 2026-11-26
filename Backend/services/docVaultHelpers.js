const AppError = require('../utils/AppError');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { resolveDocVaultConfig } = require('../utils/validateEnv');
const { presignPutObject, presignGetObject, sanitizeDispositionFilename } = require('../utils/s3Presigner');
const { createLocalPutUrl, createLocalGetUrl } = require('../utils/localVaultDriver');
const { WORKORDER_MAX_DOCS, HANDOVER_MAX_DOCS } = require('../utils/docVaultSchema');

const isMgr = (a) => a?.role === 'SYSTEM_ADMIN' || a?.role === 'FLEET_MANAGER';
const hasPermission = (a, key) => isMgr(a) || a?.yetkiler?.[key] === true;
const hasFinanceAccess = (a) => isMgr(a) || a?.yetkiler?.finans === true;
const assertActor = (a) => { if (!a?.user_id) throw new AppError(401, 'TOKEN_MISSING', 'Oturum bulunamadı.'); };

const requireVaultDriver = () => {
  const cfg = resolveDocVaultConfig(process.env);
  if (cfg.driver === 'disabled') throw new AppError(503, 'DOC_VAULT_NOT_CONFIGURED', 'Belge kasası yapılandırılmamış.');
  return cfg;
};

const assertNotArchivedDoc = (arac, islem = 'işlem yapılamaz') => {
  if (arac?.arsivlendi_mi) throw new AppError(409, 'VEHICLE_ARCHIVED', `Arşivlenmiş araçta belge ${islem}.`);
};

const assertVehicleAccess = async (client, actor, aracId) => {
  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const res = await client.query(`SELECT a.arac_id, a.org_id, a.plaka, a.arsivlendi_mi FROM araclar a WHERE a.arac_id = $1 AND (${clause})`, [aracId, ...params]);
  if (res.rowCount === 0) throw new AppError(403, 'FORBIDDEN_VEHICLE_ACCESS', 'Bu araca erişim yetkiniz yoktur.');
  return res.rows[0];
};

const assertDocCap = async (client, tip, id, max, code, msg, add = 1) => {
  const cnt = await client.query("SELECT COUNT(*)::int AS c FROM belge_kasasi WHERE varlik_tipi = $1 AND varlik_id = $2 AND durum = 'aktif'", [tip, id]);
  if (cnt.rows[0].c + add > max) throw new AppError(422, code, msg);
};

const assertWoDocCapacity = (c, id, add = 1) =>
  assertDocCap(c, 'is_emri', id, WORKORDER_MAX_DOCS, 'WORKORDER_DOC_LIMIT_EXCEEDED', 'İş emrine en fazla 5 belge eklenebilir.', add);

const assertHandoverDocCapacity = (c, id, add = 1) =>
  assertDocCap(c, 'zimmet', id, HANDOVER_MAX_DOCS, 'HANDOVER_DOC_LIMIT_EXCEEDED', 'Zimmet muayenesine en fazla 4 görsel eklenebilir.', add);

const lockParentEntity = async (client, varlikTipi, varlikId) => {
  if (varlikTipi === 'is_emri') {
    const r = await client.query('SELECT is_emri_id, org_id, arac_id, acan_user_id, durum FROM is_emirleri WHERE is_emri_id = $1 FOR UPDATE', [varlikId]);
    if (r.rowCount === 0) throw new AppError(404, 'WORKORDER_NOT_FOUND', 'İş emri bulunamadı.');
    if (r.rows[0].durum === 'tamamlandi' || r.rows[0].durum === 'iptal') throw new AppError(409, 'WORKORDER_ALREADY_CLOSED', 'Kapalı iş emri değiştirilemez.');
    return r.rows[0];
  }
  if (varlikTipi === 'zimmet') {
    const r = await client.query('SELECT muayene_id, org_id, arac_id, sofor_user_id, yapan_user_id FROM zimmet_muayeneleri WHERE muayene_id = $1 FOR UPDATE', [varlikId]);
    if (r.rowCount === 0) throw new AppError(404, 'HANDOVER_NOT_FOUND', 'Zimmet muayene kaydı bulunamadı.');
    return r.rows[0];
  }
  const tbl = varlikTipi === 'yakit' ? 'yakitlar' : 'bakimlar';
  const col = varlikTipi === 'yakit' ? 'yakit_id' : 'bakim_id';
  const r = await client.query(`SELECT ${col} AS id, arac_id, olusturan_user_id, belge_url FROM ${tbl} WHERE ${col} = $1 FOR UPDATE`, [varlikId]);
  if (r.rowCount === 0) throw new AppError(404, 'RECORD_NOT_FOUND', 'Hedef kayıt bulunamadı.');
  return r.rows[0];
};

const signPutUrl = (cfg, { baseUrl, key, mime, boyut }) => (cfg.driver === 's3'
  ? presignPutObject({ ...cfg.s3, key, contentType: mime, expiresIn: 300 })
  : createLocalPutUrl({ baseUrl, key, contentType: mime, contentLength: boyut, expiresIn: 300 }));

const signGetUrl = (cfg, { baseUrl, row, indir }) => {
  const safeName = sanitizeDispositionFilename(row.orijinal_ad);
  const mode = indir ? 'attachment' : 'inline';
  return cfg.driver === 's3'
    ? presignGetObject({ ...cfg.s3, key: row.nesne_anahtari, disposition: mode, filename: safeName, expiresIn: 300 })
    : createLocalGetUrl({ baseUrl, key: row.nesne_anahtari, contentType: row.mime_tipi, disposition: `${mode}; filename="${safeName}"`, expiresIn: 300 });
};

module.exports = {
  isMgr, hasPermission, hasFinanceAccess, assertActor, requireVaultDriver, assertNotArchivedDoc,
  assertVehicleAccess, assertWoDocCapacity, assertHandoverDocCapacity, lockParentEntity, signPutUrl, signGetUrl,
};
