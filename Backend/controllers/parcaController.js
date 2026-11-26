const Joi = require('joi');
const pool = require('../db');
const AppError = require('../utils/AppError');
const withTransaction = require('../utils/withTransaction');
const { logAuditEvent } = require('../services/auditService');
const { listParcalar, listParcalarByArac } = require('../services/parcaQueryService');
const { createParcaTx, updateParcaTx, deleteParcaTx } = require('../services/parcaWriteService');

const dateField = Joi.alternatives().try(Joi.string().trim().min(10).max(32), Joi.date());
const baseFields = {
  degisim_araligi_km: Joi.number().integer().min(0).allow(null, '').optional(),
  maliyet: Joi.number().min(0).optional().allow(null),
  notlar: Joi.string().max(1000).optional().allow(null, ''),
};
const parcaEkleSchema = Joi.object({
  ...baseFields,
  arac_id: Joi.number().integer().positive().required(),
  parca_adi: Joi.string().trim().min(1).max(120).required(),
  son_degisim_km: Joi.number().integer().min(0).required(),
  son_degisim_tarihi: dateField.required(),
});
const parcaGuncelleSchema = Joi.object({
  ...baseFields,
  arac_id: Joi.number().integer().optional(),
  parca_adi: Joi.string().trim().min(1).max(120).optional(),
  son_degisim_km: Joi.number().integer().min(0).optional(),
  son_degisim_tarihi: dateField.optional(),
}).min(1);

const handleError = (res, err, label, fallbackMsg) => {
  if (err instanceof AppError) return res.status(err.statusCode).json(err.toBody());
  console.error(`${label} hatası:`, err);
  return res.status(500).json({ message: fallbackMsg });
};

const getAllParcalar = async (req, res) => {
  try { return res.status(200).json({ message: 'Parçalar listelendi', parcalar: (await listParcalar(pool, req.user)).parcalar }); }
  catch (err) { return handleError(res, err, 'Parça listeleme', 'Parca listesi alinamadi'); }
};

const getParcalarByArac = async (req, res) => {
  try { return res.status(200).json({ parcalar: (await listParcalarByArac(pool, req.user, req.params.arac_id)).parcalar }); }
  catch (err) { return handleError(res, err, 'Araç parçaları listeleme', 'Parca listesi alinamadi'); }
};

const createParca = async (req, res) => {
  const { error, value } = parcaEkleSchema.validate(req.body || {});
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const out = await withTransaction((client) => createParcaTx(client, req.user, value));
    await logAuditEvent(req, out.auditCtx);
    return res.status(201).json({ message: 'Parca takibe alindi', parca: out.parca });
  } catch (err) {
    return handleError(res, err, 'Parça ekleme', 'Parca eklenemedi');
  }
};

const updateParca = async (req, res) => {
  const parcaId = Number(req.params.parca_id);
  if (!Number.isInteger(parcaId) || parcaId <= 0) return res.status(400).json({ message: 'Gecersiz parca id' });
  const { error, value } = parcaGuncelleSchema.validate(req.body || {});
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const out = await withTransaction((client) => updateParcaTx(client, req.user, { ...value, parcaId }));
    await logAuditEvent(req, out.auditCtx);
    return res.status(200).json({ message: 'Parca kaydi guncellendi', parca: out.parca });
  } catch (err) {
    return handleError(res, err, 'Parça güncelleme', 'Parca guncellenemedi');
  }
};

const deleteParca = async (req, res) => {
  const parcaId = Number(req.params.parca_id);
  if (!Number.isInteger(parcaId) || parcaId <= 0) return res.status(400).json({ message: 'Gecersiz parca id' });
  try {
    const out = await withTransaction((client) => deleteParcaTx(client, req.user, { parcaId }));
    await logAuditEvent(req, out.auditCtx);
    return res.status(200).json({ message: 'Parca kaydi silindi' });
  } catch (err) {
    return handleError(res, err, 'Parça silme', 'Parca silinemedi');
  }
};

module.exports = { getAllParcalar, getParcalarByArac, createParca, updateParca, deleteParca };
