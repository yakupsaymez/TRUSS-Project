const pool = require('../db');
const Joi = require('joi');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const AppError = require('../utils/AppError');
const withTransaction = require('../utils/withTransaction');
const { createYakitTx, updateYakitTx, deleteYakitTx } = require('../services/yakitWriteService');
const { evaluateFuelRecordAnomalies } = require('../services/fuelAnomalyService');
const { logAuditEvent } = require('../services/auditService');

const yakitBaseFields = {
  yakit_tipi: Joi.string().trim().max(50).allow('', null).optional(),
  tarih: Joi.alternatives().try(Joi.string().trim().min(10).max(32), Joi.date()).required(),
  litre: Joi.number().greater(0).max(99999999.99).required(),
  tutar: Joi.number().greater(0).max(9999999999.99).required(),
  km: Joi.number().integer().min(0).max(2147483647).allow(null, '').optional(),
  notlar: Joi.string().max(2000).allow('', null).optional(),
  fatura_no: Joi.string().trim().max(80).allow('', null).optional(),
  belge_url: Joi.string().trim().max(2048).pattern(/^(https?:\/\/|\/)/i).allow('', null).optional(),
};

const yakitCreateSchema = Joi.object({ ...yakitBaseFields, arac_id: Joi.number().integer().positive().required() });

const yakitUpdateSchema = Joi.object({ ...yakitBaseFields, arac_id: Joi.number().integer().positive().allow(null, '').optional() });

const handleWriteError = (res, err, label) => {
  if (err instanceof AppError) return res.status(err.statusCode).json(err.toBody());
  console.error(`${label} hatası:`, err);
  return res.status(500).json({ message: 'Sunucu hatasi' });
};

const evaluateAnomaliesSafe = async (anomalyCtx) => {
  try {
    return await evaluateFuelRecordAnomalies(anomalyCtx.yakitId, { mode: anomalyCtx.mode });
  } catch (anomErr) {
    console.error(`Yakıt anomali değerlendirme hatası (${anomalyCtx.mode}):`, anomErr);
    return [];
  }
};

// KULLANICININ ERİŞEBİLDİĞİ TÜM YAKIT KAYITLARINI LİSTELE (RBAC Filtreli)
const getAllYakitlar = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const result = await pool.query(
      `SELECT y.*, ou.ad_soyad AS olusturan_ad, a.plaka, a.marka, a.model, a.sayac_tipi
       FROM yakitlar y
       INNER JOIN araclar a ON a.arac_id = y.arac_id
       LEFT JOIN users ou ON ou.user_id = y.olusturan_user_id
       WHERE ${clause}
       ORDER BY y.tarih DESC, y.yakit_id DESC`,
      params
    );
    return res.status(200).json({ message: 'Yakit kayitlari listelendi', yakitlar: result.rows });
  } catch (err) {
    console.error('Yakıt listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// BELİRLİ ARACIN TÜM YAKIT KAYITLARINI LİSTELE (RBAC Filtreli)
const getYakitlarByArac = async (req, res) => {
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
      `SELECT y.*, ou.ad_soyad AS olusturan_ad, a.plaka, a.marka, a.model, a.sayac_tipi
       FROM yakitlar y
       INNER JOIN araclar a ON a.arac_id = y.arac_id
       LEFT JOIN users ou ON ou.user_id = y.olusturan_user_id
       WHERE y.arac_id = $1 AND (${clause})
       ORDER BY y.tarih DESC, y.yakit_id DESC`,
      [aracId, ...params]
    );
    return res.status(200).json({ message: 'Yakit kayitlari listelendi', yakitlar: result.rows });
  } catch (err) {
    console.error('Araç yakıt kayıtları listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// YENİ YAKIT KAYDI EKLE
const createYakit = async (req, res) => {
  const { error, value } = yakitCreateSchema.validate(req.body || {}, { convert: true, stripUnknown: true });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const out = await withTransaction((client) => createYakitTx(client, req.user, value));
    const anomaliler = await evaluateAnomaliesSafe(out.anomalyCtx);
    return res.status(201).json({ message: 'Yakit kaydi eklendi', yakit: out.row, anomaliler });
  } catch (err) {
    return handleWriteError(res, err, 'Yakıt ekleme');
  }
};

// BELİRLİ YAKIT KAYDINI GÜNCELLE
const updateYakit = async (req, res) => {
  const yakitId = Number(req.params.yakit_id);
  if (!Number.isInteger(yakitId) || yakitId <= 0) {
    return res.status(400).json({ message: 'Geçersiz yakıt kimliği.' });
  }
  const { error, value } = yakitUpdateSchema.validate(req.body || {}, { convert: true, stripUnknown: true });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const out = await withTransaction((client) => updateYakitTx(client, req.user, { ...value, yakitId }));
    const anomaliler = await evaluateAnomaliesSafe(out.anomalyCtx);
    return res.status(200).json({ message: 'Yakit kaydi guncellendi', yakit: out.row, anomaliler });
  } catch (err) {
    return handleWriteError(res, err, 'Yakıt güncelleme');
  }
};

// BELİRLİ YAKIT KAYDINI SİL
const deleteYakit = async (req, res) => {
  const yakitId = Number(req.params.yakit_id);
  if (!Number.isInteger(yakitId) || yakitId <= 0) {
    return res.status(400).json({ message: 'Geçersiz yakıt kimliği.' });
  }

  try {
    const out = await withTransaction((client) => deleteYakitTx(client, req.user, { yakitId }));
    await logAuditEvent(req, out.auditCtx);
    return res.status(200).json({ message: 'Yakit kaydi silindi' });
  } catch (err) {
    return handleWriteError(res, err, 'Yakıt silme');
  }
};

module.exports = { getAllYakitlar, getYakitlarByArac, createYakit, updateYakit, deleteYakit };
