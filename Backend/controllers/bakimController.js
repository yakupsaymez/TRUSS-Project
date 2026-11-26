const pool = require('../db');
const Joi = require('joi');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const AppError = require('../utils/AppError');
const withTransaction = require('../utils/withTransaction');
const { createBakimTx, updateBakimTx, deleteBakimTx } = require('../services/bakimWriteService');
const { logAuditEvent } = require('../services/auditService');
const { belgeUrlJoiField } = require('../utils/docVaultSchema');
const { hasFinanceAccess } = require('../services/docVaultService');

const bakimBaseFields = {
  bakim_tipi: Joi.string().trim().min(1).max(150).required(),
  tarih: Joi.alternatives().try(Joi.string().trim().min(10).max(32), Joi.date()).required(),
  km: Joi.number().integer().min(0).max(2147483647).required(),
  maliyet: Joi.number().greater(0).max(9999999999.99).required(),
  notlar: Joi.string().max(2000).allow('', null).optional(),
  aciklama: Joi.string().max(2000).allow('', null).optional(),
  sifirla_parcalar: Joi.boolean().optional(),
  fatura_no: Joi.string().trim().max(80).allow('', null).optional(),
  belge_url: belgeUrlJoiField,
};

const sendJoiError = (res, error) => {
  const detail = error.details[0];
  if (detail?.type === 'belge.presigned') {
    return res.status(400).json({ code: 'PRESIGNED_URL_FORBIDDEN', message: detail.message });
  }
  return res.status(400).json({ message: detail.message });
};

const maskBakimRows = (user, rows) =>
  hasFinanceAccess(user) ? rows : rows.map((r) => ({ ...r, belge_url: null }));

const bakimCreateSchema = Joi.object({
  ...bakimBaseFields,
  arac_id: Joi.number().integer().positive().required(),
});

const bakimUpdateSchema = Joi.object({
  ...bakimBaseFields,
  arac_id: Joi.number().integer().positive().allow(null, '').optional(),
});

const handleWriteError = (res, err, label) => {
  if (err instanceof AppError) return res.status(err.statusCode).json(err.toBody());
  console.error(`${label} hatası:`, err);
  return res.status(500).json({ message: 'Sunucu hatasi' });
};

// KULLANICININ ERİŞEBİLDİĞİ TÜM BAKIMLARI LİSTELE (RBAC Filtreli)
const getAllBakimlar = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const result = await pool.query(
      `SELECT b.*, ou.ad_soyad AS olusturan_ad, a.plaka, a.marka, a.model, a.sayac_tipi
       FROM bakimlar b
       INNER JOIN araclar a ON a.arac_id = b.arac_id
       LEFT JOIN users ou ON ou.user_id = b.olusturan_user_id
       WHERE ${clause}
       ORDER BY b.tarih DESC, b.bakim_id DESC`,
      params
    );
    return res.status(200).json({ message: 'Bakımlar listelendi', bakimlar: maskBakimRows(req.user, result.rows) });
  } catch (err) {
    console.error('Bakım listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// BELİRLİ ARACIN TÜM BAKIMLARINI LİSTELE (RBAC Filtreli)
const getBakimlarByArac = async (req, res) => {
  const aracId = Number(req.params.arac_id);
  if (!Number.isInteger(aracId) || aracId <= 0) {
    return res.status(400).json({ message: 'Geçersiz araç kimliği.' });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const sahiplik = await pool.query(
      `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [aracId, ...params]
    );
    if (sahiplik.rowCount === 0) {
      return res.status(403).json({ message: 'Bu araca erişim yetkiniz yoktur.' });
    }

    const result = await pool.query(
      `SELECT b.*, ou.ad_soyad AS olusturan_ad, a.plaka, a.marka, a.model, a.sayac_tipi
       FROM bakimlar b
       INNER JOIN araclar a ON a.arac_id = b.arac_id
       LEFT JOIN users ou ON ou.user_id = b.olusturan_user_id
       WHERE b.arac_id = $1 AND (${clause})
       ORDER BY b.tarih DESC, b.bakim_id DESC`,
      [aracId, ...params]
    );
    return res.status(200).json({ message: 'Bakimlar listelendi', bakimlar: maskBakimRows(req.user, result.rows) });
  } catch (err) {
    console.error('Araç bakımları listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// YENİ BAKIM KAYDI EKLE
const createBakim = async (req, res) => {
  const { error, value } = bakimCreateSchema.validate(req.body || {}, { convert: true, stripUnknown: true });
  if (error) return sendJoiError(res, error);

  try {
    const out = await withTransaction((client) => createBakimTx(client, req.user, value));
    return res.status(201).json({ message: 'Bakim kaydi eklendi', bakim: out.row });
  } catch (err) {
    return handleWriteError(res, err, 'Bakım ekleme');
  }
};

// BELİRLİ BAKIM KAYDINI GÜNCELLE
const updateBakim = async (req, res) => {
  const bakimId = Number(req.params.bakim_id);
  if (!Number.isInteger(bakimId) || bakimId <= 0) {
    return res.status(400).json({ message: 'Geçersiz bakım kimliği.' });
  }
  const { error, value } = bakimUpdateSchema.validate(req.body || {}, { convert: true, stripUnknown: true });
  if (error) return sendJoiError(res, error);

  try {
    const out = await withTransaction((client) => updateBakimTx(client, req.user, { ...value, bakimId }));
    return res.status(200).json({ message: 'Bakim kaydi guncellendi', bakim: out.row });
  } catch (err) {
    return handleWriteError(res, err, 'Bakım güncelleme');
  }
};

// BELİRLİ BAKIM KAYDINI SİL
const deleteBakim = async (req, res) => {
  const bakimId = Number(req.params.bakim_id);
  if (!Number.isInteger(bakimId) || bakimId <= 0) {
    return res.status(400).json({ message: 'Geçersiz bakım kimliği.' });
  }

  try {
    const out = await withTransaction((client) => deleteBakimTx(client, req.user, { bakimId }));
    await logAuditEvent(req, out.auditCtx);
    return res.status(200).json({ message: 'Bakim kaydi silindi' });
  } catch (err) {
    return handleWriteError(res, err, 'Bakım silme');
  }
};

module.exports = { getAllBakimlar, getBakimlarByArac, createBakim, updateBakim, deleteBakim };
