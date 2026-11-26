const crypto = require('node:crypto');
const pool = require('../db');
const AppError = require('../utils/AppError');
const { bugunTR } = require('../utils/dateUtils');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { resolveDocVaultConfig } = require('../utils/validateEnv');
const { assertLocalFileUploaded } = require('../utils/localVaultDriver');
const { ALLOWED_MIME_EXT, HANDOVER_MIME_EXT, MAX_FILE_BYTES, isVaultKey, isPresignedUrl } = require('../utils/docVaultSchema');
const {
  isMgr, hasPermission, hasFinanceAccess, assertActor, requireVaultDriver, assertNotArchivedDoc,
  assertVehicleAccess, assertWoDocCapacity, assertHandoverDocCapacity, lockParentEntity, signPutUrl, signGetUrl,
} = require('./docVaultHelpers');

const requestUploadUrlTx = async (client, actor, input, { baseUrl = '' } = {}) => {
  assertActor(actor);
  const cfg = requireVaultDriver();
  const varlikTipi = input.varlik_tipi;
  const mime = String(input.mime_tipi || '').trim().toLowerCase();
  const ext = varlikTipi === 'zimmet' ? HANDOVER_MIME_EXT[mime] : ALLOWED_MIME_EXT[mime];
  if (!ext) {
    throw new AppError(400, 'INVALID_MIME_TYPE', varlikTipi === 'zimmet' ? 'Zimmet muayenesi için yalnızca JPG, PNG veya WEBP görseli yüklenebilir.' : 'Desteklenmeyen dosya türü.');
  }
  const boyut = Number(input.boyut_bayt);
  if (!Number.isInteger(boyut) || boyut < 1 || boyut > MAX_FILE_BYTES) {
    throw new AppError(400, 'INVALID_FILE_SIZE', 'Dosya boyutu 1 bayt ile 10 MB arasında olmalıdır.');
  }
  const aracId = Number(input.arac_id);
  const arac = await assertVehicleAccess(client, actor, aracId);
  if (!arac.org_id) throw new AppError(422, 'ORG_REQUIRED', 'Belge yüklemek için aracın organizasyonu tanımlı olmalıdır.');
  assertNotArchivedDoc(arac, 'yüklenemez');

  if ((varlikTipi === 'yakit' || varlikTipi === 'bakim') && !hasPermission(actor, varlikTipi)) {
    throw new AppError(403, 'FORBIDDEN_PERMISSION', `Bu işlem için '${varlikTipi}' yetkiniz bulunmamaktadır.`);
  }
  const varlikId = input.varlik_id ? Number(input.varlik_id) : null;
  if (varlikTipi === 'is_emri' && varlikId) {
    const wo = await client.query('SELECT is_emri_id, durum FROM is_emirleri WHERE is_emri_id = $1 AND arac_id = $2', [varlikId, aracId]);
    if (wo.rowCount === 0) throw new AppError(404, 'WORKORDER_NOT_FOUND', 'İş emri bulunamadı.');
    if (wo.rows[0].durum === 'tamamlandi' || wo.rows[0].durum === 'iptal') throw new AppError(409, 'WORKORDER_ALREADY_CLOSED', 'Kapalı iş emrine belge eklenemez.');
    await assertWoDocCapacity(client, varlikId, 1);
  } else if (varlikTipi === 'zimmet' && varlikId) {
    const zm = await client.query('SELECT muayene_id, sofor_user_id FROM zimmet_muayeneleri WHERE muayene_id = $1 AND arac_id = $2', [varlikId, aracId]);
    if (zm.rowCount === 0) throw new AppError(404, 'HANDOVER_NOT_FOUND', 'Zimmet muayene kaydı bulunamadı.');
    if (!isMgr(actor) && Number(zm.rows[0].sofor_user_id) !== Number(actor.user_id)) throw new AppError(403, 'FORBIDDEN_ROLE', 'Bu zimmet muayenesine görsel ekleme yetkiniz yoktur.');
    await assertHandoverDocCapacity(client, varlikId, 1);
  }
  const key = `org_${arac.org_id}/${varlikTipi}/${bugunTR().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const orijinalAd = String(input.orijinal_ad || 'belge').trim().slice(0, 180) || 'belge';
  const ins = await client.query(
    `INSERT INTO belge_kasasi (org_id, arac_id, varlik_tipi, varlik_id, nesne_anahtari, orijinal_ad, mime_tipi, boyut_bayt, durum, yukleyen_user_id)
     VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, 'yukleniyor', $8) RETURNING belge_id`,
    [arac.org_id, aracId, varlikTipi, key, orijinalAd, mime, boyut, actor.user_id]
  );
  return {
    belge_id: ins.rows[0].belge_id, nesne_anahtari: key, durum: 'yukleniyor', surucu: cfg.driver,
    yukleme: { url: signPutUrl(cfg, { baseUrl, key, mime, boyut }), method: 'PUT', headers: { 'Content-Type': mime }, expires_in: 300 },
  };
};

const bindSingleDocumentTx = async (client, actor, { aracId, orgId, varlikTipi, varlikId, nextKey, prevKey, kaynakAracId }) => {
  const next = typeof nextKey === 'string' ? nextKey.trim() || null : null;
  const prev = typeof prevKey === 'string' ? prevKey.trim() || null : null;
  if (!next && !prev) return;
  if (next && isPresignedUrl(next)) throw new AppError(400, 'PRESIGNED_URL_FORBIDDEN', 'Ön-imzalı belge URL’si kaydedilemez.');
  if (next) {
    if (!isVaultKey(next)) {
      if (next !== prev) throw new AppError(400, 'INVALID_DOCUMENT_KEY', 'Geçersiz belge anahtarı.');
    } else if (next !== prev || (kaynakAracId !== undefined && Number(kaynakAracId) !== Number(aracId))) {
      const r = await client.query('SELECT * FROM belge_kasasi WHERE nesne_anahtari = $1 FOR UPDATE', [next]);
      if (r.rowCount === 0) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Belge kaydı bulunamadı.');
      const row = r.rows[0];
      if (row.durum === 'silindi') throw new AppError(409, 'DOCUMENT_DELETED', 'Silinmiş belge bağlanamaz.');
      if (next === prev && kaynakAracId !== undefined && Number(kaynakAracId) !== Number(aracId)) {
        if (Number(row.org_id) !== Number(orgId)) throw new AppError(422, 'DOCUMENT_ORG_MISMATCH', 'Belge farklı organizasyona ait araca taşınamaz.');
        if (row.varlik_tipi !== varlikTipi) throw new AppError(422, 'DOCUMENT_BIND_MISMATCH', 'Belge varlık tipi uyuşmuyor.');
        await client.query('UPDATE belge_kasasi SET arac_id = $2 WHERE belge_id = $1', [row.belge_id, aracId]);
      } else {
        const sameTarget = row.durum === 'aktif' && row.varlik_tipi === varlikTipi && Number(row.varlik_id) === Number(varlikId);
        if (row.durum !== 'yukleniyor' && !sameTarget) throw new AppError(409, 'DOCUMENT_ALREADY_BOUND', 'Belge başka bir kayda zaten bağlanmış.');
        if (Number(row.org_id) !== Number(orgId) || Number(row.arac_id) !== Number(aracId) || row.varlik_tipi !== varlikTipi) {
          throw new AppError(422, 'DOCUMENT_BIND_MISMATCH', 'Belge hedef araç veya varlık tipi ile uyuşmuyor.');
        }
        if (row.durum === 'yukleniyor') {
          if (resolveDocVaultConfig(process.env).driver === 'local') await assertLocalFileUploaded(next, row.boyut_bayt);
          await client.query("UPDATE belge_kasasi SET durum = 'aktif', varlik_id = $2 WHERE belge_id = $1", [row.belge_id, varlikId]);
        }
      }
    }
  }
  if (prev && isVaultKey(prev) && prev !== next) {
    await client.query("UPDATE belge_kasasi SET durum = 'silindi' WHERE nesne_anahtari = $1 AND durum <> 'silindi'", [prev]);
  }
};

const bindMultiKeysTx = async (client, { varlikTipi, varlikId, aracId, orgId, keys, assertCap }) => {
  const uniqueKeys = Array.isArray(keys) ? [...new Set(keys.map((k) => String(k || '').trim()).filter(Boolean))] : [];
  if (uniqueKeys.length === 0) return [];
  for (const k of uniqueKeys) {
    if (isPresignedUrl(k)) throw new AppError(400, 'PRESIGNED_URL_FORBIDDEN', 'Ön-imzalı belge URL’si kaydedilemez.');
    if (!isVaultKey(k)) throw new AppError(400, 'INVALID_DOCUMENT_KEY', 'Geçersiz belge anahtarı.');
  }
  await assertCap(client, varlikId, uniqueKeys.length);
  const isLocal = resolveDocVaultConfig(process.env).driver === 'local';
  const bound = [];
  for (const key of uniqueKeys) {
    const r = await client.query('SELECT * FROM belge_kasasi WHERE nesne_anahtari = $1 FOR UPDATE', [key]);
    if (r.rowCount === 0) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Belge kaydı bulunamadı.');
    const row = r.rows[0];
    if (row.durum === 'silindi') throw new AppError(409, 'DOCUMENT_DELETED', 'Silinmiş belge bağlanamaz.');
    if (row.durum !== 'yukleniyor') throw new AppError(409, 'DOCUMENT_ALREADY_BOUND', 'Belge başka bir kayda zaten bağlanmış.');
    if (Number(row.org_id) !== Number(orgId) || Number(row.arac_id) !== Number(aracId) || row.varlik_tipi !== varlikTipi) {
      throw new AppError(422, 'DOCUMENT_BIND_MISMATCH', 'Belge hedef kayıt veya araç ile uyuşmuyor.');
    }
    if (varlikTipi === 'zimmet' && !HANDOVER_MIME_EXT[row.mime_tipi]) throw new AppError(400, 'INVALID_MIME_TYPE', 'Zimmet muayenesine yalnızca görsel bağlanabilir.');
    if (isLocal) await assertLocalFileUploaded(key, row.boyut_bayt);
    const upd = await client.query(
      "UPDATE belge_kasasi SET durum = 'aktif', varlik_id = $2 WHERE belge_id = $1 RETURNING belge_id, varlik_id, nesne_anahtari, orijinal_ad, mime_tipi, boyut_bayt, olusturma_tarihi",
      [row.belge_id, varlikId]
    );
    bound.push(upd.rows[0]);
  }
  return bound;
};

const bindWorkOrderKeysTx = (c, _a, { isEmriId, aracId, orgId, keys }) =>
  bindMultiKeysTx(c, { varlikTipi: 'is_emri', varlikId: isEmriId, aracId, orgId, keys, assertCap: assertWoDocCapacity });
const bindHandoverKeysTx = (c, _a, { muayeneId, aracId, orgId, keys }) =>
  bindMultiKeysTx(c, { varlikTipi: 'zimmet', varlikId: muayeneId, aracId, orgId, keys, assertCap: assertHandoverDocCapacity });

const bindDocumentEndpointTx = async (client, actor, { belgeId, varlikTipi, varlikId }) => {
  assertActor(actor);
  const preQ = await client.query('SELECT belge_id, org_id, arac_id, varlik_tipi, durum FROM belge_kasasi WHERE belge_id = $1', [belgeId]);
  if (preQ.rowCount === 0) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Belge kaydı bulunamadı.');
  const pre = preQ.rows[0];
  const arac = await assertVehicleAccess(client, actor, pre.arac_id);
  await client.query('SELECT arac_id FROM araclar WHERE arac_id = $1 FOR UPDATE', [pre.arac_id]);
  assertNotArchivedDoc(arac, 'bağlanamaz');

  const parent = await lockParentEntity(client, varlikTipi, varlikId);
  if (varlikTipi === 'is_emri' && actor.role === 'DRIVER' && parent.durum !== 'acik') {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Şoförler yalnızca açık iş emirlerine belge bağlayabilir.');
  } else if (varlikTipi === 'zimmet' && !isMgr(actor) && Number(parent.sofor_user_id) !== Number(actor.user_id)) {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Bu zimmet muayenesine görsel bağlama yetkiniz yoktur.');
  } else if (varlikTipi !== 'is_emri' && varlikTipi !== 'zimmet' && !isMgr(actor) && (!hasPermission(actor, varlikTipi) || Number(parent.olusturan_user_id) !== Number(actor.user_id))) {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Bu kayda belge bağlama yetkiniz yoktur.');
  }
  const bk = (await client.query('SELECT * FROM belge_kasasi WHERE belge_id = $1 FOR UPDATE', [belgeId])).rows[0];
  if (bk.varlik_tipi !== varlikTipi || Number(bk.arac_id) !== Number(parent.arac_id) || Number(bk.org_id) !== Number(arac.org_id)) {
    throw new AppError(422, 'DOCUMENT_BIND_MISMATCH', 'Belge hedef kayıt veya araç ile uyuşmuyor.');
  }
  if (bk.durum === 'silindi') throw new AppError(409, 'DOCUMENT_DELETED', 'Silinmiş belge bağlanamaz.');
  if (bk.durum !== 'yukleniyor') throw new AppError(409, 'DOCUMENT_ALREADY_BOUND', 'Belge zaten bağlanmış.');
  if (varlikTipi === 'is_emri') await assertWoDocCapacity(client, varlikId, 1);
  if (varlikTipi === 'zimmet') {
    if (!HANDOVER_MIME_EXT[bk.mime_tipi]) throw new AppError(400, 'INVALID_MIME_TYPE', 'Zimmet muayenesine yalnızca görsel bağlanabilir.');
    await assertHandoverDocCapacity(client, varlikId, 1);
  }
  if (resolveDocVaultConfig(process.env).driver === 'local') await assertLocalFileUploaded(bk.nesne_anahtari, bk.boyut_bayt);

  const upd = await client.query("UPDATE belge_kasasi SET durum = 'aktif', varlik_id = $2 WHERE belge_id = $1 RETURNING *", [belgeId, varlikId]);
  if (varlikTipi === 'yakit' || varlikTipi === 'bakim') {
    if (parent.belge_url && isVaultKey(parent.belge_url) && parent.belge_url !== bk.nesne_anahtari) {
      await client.query("UPDATE belge_kasasi SET durum = 'silindi' WHERE nesne_anahtari = $1 AND durum <> 'silindi'", [parent.belge_url]);
    }
    const tbl = varlikTipi === 'yakit' ? 'yakitlar' : 'bakimlar';
    const col = varlikTipi === 'yakit' ? 'yakit_id' : 'bakim_id';
    await client.query(`UPDATE ${tbl} SET belge_url = $1 WHERE ${col} = $2`, [bk.nesne_anahtari, varlikId]);
  }
  return upd.rows[0];
};

const listDocuments = async (actor, filters = {}) => {
  assertActor(actor);
  if ((filters.varlik_tipi === 'yakit' || filters.varlik_tipi === 'bakim') && !hasFinanceAccess(actor)) {
    throw new AppError(403, 'FORBIDDEN_FINANCE_ACCESS', 'Finansal belgelere erişim yetkiniz bulunmamaktadır.');
  }
  const access = buildVehicleAccessFilter(actor, 1);
  const params = [...access.params, filters.durum || 'aktif'];
  const conds = [`bk.durum = $${params.length}`];
  if (isMgr(actor)) conds.push(`(${access.clause})`);
  else {
    params.push(actor.user_id);
    const u = params.length;
    const baseWo = hasFinanceAccess(actor)
      ? `((${access.clause}) AND bk.varlik_tipi IN ('yakit','bakim','is_emri'))`
      : `((${access.clause}) AND bk.varlik_tipi = 'is_emri' AND NOT EXISTS (SELECT 1 FROM bakimlar b WHERE b.belge_url = bk.nesne_anahtari))`;
    conds.push(`(${baseWo} OR (bk.varlik_tipi = 'zimmet' AND ((bk.durum = 'aktif' AND zm.sofor_user_id = $${u}) OR (bk.durum = 'yukleniyor' AND bk.yukleyen_user_id = $${u}))))`);
    if (actor.org_id) { params.push(actor.org_id); conds.push(`a.org_id = $${params.length}`); }
  }
  for (const k of ['arac_id', 'varlik_tipi', 'varlik_id']) {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
      params.push(k === 'varlik_tipi' ? filters[k] : Number(filters[k]));
      conds.push(`bk.${k} = $${params.length}`);
    }
  }
  const res = await pool.query(
    `SELECT bk.belge_id, bk.org_id, bk.arac_id, bk.varlik_tipi, bk.varlik_id, bk.nesne_anahtari, bk.orijinal_ad, bk.mime_tipi,
            bk.boyut_bayt, bk.durum, bk.yukleyen_user_id, bk.olusturma_tarihi, a.plaka, a.arsivlendi_mi, u.ad_soyad AS yukleyen_ad
     FROM belge_kasasi bk INNER JOIN araclar a ON a.arac_id = bk.arac_id LEFT JOIN users u ON u.user_id = bk.yukleyen_user_id
     LEFT JOIN zimmet_muayeneleri zm ON bk.varlik_tipi = 'zimmet' AND zm.muayene_id = bk.varlik_id
     WHERE ${conds.join(' AND ')} ORDER BY bk.olusturma_tarihi DESC, bk.belge_id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, Number(filters.limit || 100), Number(filters.offset || 0)]
  );
  return res.rows;
};

const getDocumentAccess = async (actor, lookup, { indir = false, baseUrl = '' } = {}) => {
  assertActor(actor);
  const byId = lookup.belgeId !== undefined;
  const res = await pool.query(
    `SELECT bk.*, a.plaka, a.org_id AS arac_org_id, zm.sofor_user_id AS zm_sofor_user_id FROM belge_kasasi bk
     INNER JOIN araclar a ON a.arac_id = bk.arac_id LEFT JOIN zimmet_muayeneleri zm ON bk.varlik_tipi = 'zimmet' AND zm.muayene_id = bk.varlik_id
     WHERE ${byId ? 'bk.belge_id = $1' : 'bk.nesne_anahtari = $1'}`,
    [byId ? Number(lookup.belgeId) : String(lookup.anahtar)]
  );
  if (res.rowCount === 0 || res.rows[0].durum === 'silindi') throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Belge bulunamadı.');
  const bk = res.rows[0];
  if (bk.varlik_tipi === 'zimmet' && !isMgr(actor)) {
    if (actor.org_id && Number(bk.arac_org_id) !== Number(actor.org_id)) throw new AppError(403, 'FORBIDDEN_VEHICLE_ACCESS', 'Bu belgeye erişim yetkiniz yoktur.');
    if (bk.durum !== 'aktif') throw new AppError(409, 'DOCUMENT_NOT_READY', 'Belge henüz bağlanmamış.');
    if (Number(bk.zm_sofor_user_id) !== Number(actor.user_id)) throw new AppError(403, 'FORBIDDEN_VEHICLE_ACCESS', 'Bu zimmet görseline erişim yetkiniz yoktur.');
  } else {
    await assertVehicleAccess(pool, actor, bk.arac_id);
    if (bk.durum !== 'aktif') throw new AppError(409, 'DOCUMENT_NOT_READY', 'Belge henüz bağlanmamış.');
    const bakimLinked = (await pool.query('SELECT 1 FROM bakimlar b WHERE b.belge_url = $1 LIMIT 1', [bk.nesne_anahtari])).rowCount > 0;
    if ((bk.varlik_tipi === 'yakit' || bk.varlik_tipi === 'bakim' || bakimLinked) && !hasFinanceAccess(actor)) {
      throw new AppError(403, 'FORBIDDEN_FINANCE_ACCESS', 'Finansal belgelere erişim yetkiniz bulunmamaktadır.');
    }
  }
  const cfg = requireVaultDriver();
  return {
    belge_id: bk.belge_id, nesne_anahtari: bk.nesne_anahtari, orijinal_ad: bk.orijinal_ad,
    mime_tipi: bk.mime_tipi, boyut_bayt: bk.boyut_bayt, erisim_url: signGetUrl(cfg, { baseUrl, row: bk, indir }), expires_in: 300,
  };
};

const deleteDocumentTx = async (client, actor, { belgeId }) => {
  assertActor(actor);
  const preQ = await client.query(
    'SELECT bk.belge_id, bk.org_id, bk.arac_id, bk.varlik_tipi, bk.varlik_id, bk.durum, bk.yukleyen_user_id, a.plaka, a.arsivlendi_mi FROM belge_kasasi bk INNER JOIN araclar a ON a.arac_id = bk.arac_id WHERE bk.belge_id = $1',
    [belgeId]
  );
  if (preQ.rowCount === 0 || preQ.rows[0].durum === 'silindi') throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Belge bulunamadı.');
  const pre = preQ.rows[0];
  const sameOrg = !actor.org_id || Number(actor.org_id) === Number(pre.org_id);
  const isOwnZimmetDraft = pre.varlik_tipi === 'zimmet' && pre.durum === 'yukleniyor' && Number(pre.yukleyen_user_id) === Number(actor.user_id) && sameOrg;
  if (pre.varlik_tipi === 'zimmet' && pre.durum === 'aktif' && !isMgr(actor)) {
    if (!sameOrg) throw new AppError(403, 'FORBIDDEN_VEHICLE_ACCESS', 'Bu araca erişim yetkiniz yoktur.');
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Aktif zimmet görsellerini yalnız yöneticiler silebilir.');
  }
  if (!isOwnZimmetDraft) await assertVehicleAccess(client, actor, pre.arac_id);
  await client.query('SELECT arac_id FROM araclar WHERE arac_id = $1 FOR UPDATE', [pre.arac_id]);
  assertNotArchivedDoc(pre, 'silinemez');
  const parent = pre.varlik_id ? await lockParentEntity(client, pre.varlik_tipi, pre.varlik_id) : null;
  const bk = (await client.query('SELECT * FROM belge_kasasi WHERE belge_id = $1 FOR UPDATE', [belgeId])).rows[0];
  if (bk.durum === 'silindi') throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Belge bulunamadı.');

  const isOwnDraft = Number(bk.yukleyen_user_id) === Number(actor.user_id) && bk.durum === 'yukleniyor';
  if (!isOwnDraft) {
    if (bk.varlik_tipi === 'is_emri') {
      const driverOk = Number(bk.yukleyen_user_id) === Number(actor.user_id) && (!parent || parent.durum === 'acik');
      if (!isMgr(actor) && !driverOk) throw new AppError(403, 'FORBIDDEN_ROLE', 'Bu belgeyi silme yetkiniz yoktur.');
    } else if (bk.varlik_tipi === 'zimmet') {
      if (!isMgr(actor)) throw new AppError(403, 'FORBIDDEN_ROLE', 'Aktif zimmet görsellerini yalnız yöneticiler silebilir.');
    } else if (!isMgr(actor)) {
      throw new AppError(403, 'FORBIDDEN_ROLE', 'Aktif yakıt/bakım belgelerini yalnız yöneticiler silebilir.');
    } else {
      const tbl = bk.varlik_tipi === 'yakit' ? 'yakitlar' : 'bakimlar';
      await client.query(`UPDATE ${tbl} SET belge_url = NULL WHERE belge_url = $1`, [bk.nesne_anahtari]);
    }
  }
  await client.query("UPDATE belge_kasasi SET durum = 'silindi' WHERE belge_id = $1", [belgeId]);
  return {
    row: bk,
    auditCtx: { eylem: 'BELGE_SILINDI', varlik_tipi: 'belge', varlik_id: bk.belge_id, org_id: bk.org_id, ozet: `${pre.plaka} aracı için "${bk.orijinal_ad}" belgesi silindi.`, detay: { plaka: pre.plaka, varlik_tipi: bk.varlik_tipi, varlik_id: bk.varlik_id, nesne_anahtari: bk.nesne_anahtari } },
  };
};

const softDeleteEntityDocumentsTx = async (client, { varlikTipi, varlikId }) => {
  await client.query("UPDATE belge_kasasi SET durum = 'silindi' WHERE varlik_tipi = $1 AND varlik_id = $2 AND durum <> 'silindi'", [varlikTipi, varlikId]);
};

module.exports = {
  hasPermission, hasFinanceAccess, requestUploadUrlTx, bindSingleDocumentTx, bindWorkOrderKeysTx, bindHandoverKeysTx,
  bindDocumentEndpointTx, listDocuments, getDocumentAccess, deleteDocumentTx, softDeleteEntityDocumentsTx,
};
