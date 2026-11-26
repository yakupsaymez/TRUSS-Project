const Joi = require('joi');
const AppError = require('../utils/AppError');
const withTransaction = require('../utils/withTransaction');
const { logAuditEvent } = require('../services/auditService');
const { vaultKeyJoiField } = require('../utils/docVaultSchema');
const { listZimmetler, getZimmetDetail } = require('../services/handoverQueryService');
const { recordHandoverInspectionTx } = require('../services/handoverWriteService');

const DURUM = Joi.string().valid('OK', 'KUSURLU', 'KRITIK').default('OK');

const listQuerySchema = Joi.object({
  arac_id: Joi.number().integer().positive().allow('', null).optional(),
  sofor_user_id: Joi.number().integer().positive().allow('', null).optional(),
  aktif: Joi.boolean().truthy('1', 'true').falsy('0', 'false').optional(),
  limit: Joi.number().integer().min(1).max(200).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

const inspectionSchema = Joi.object({
  muayene_tipi: Joi.string().valid('TESLIM_ALMA', 'TESLIM_ETME').required(),
  muayene_tarihi: Joi.alternatives().try(Joi.string().trim().min(10).max(32), Joi.date()).required(),
  sayac_degeri: Joi.number().min(0).max(2147483647).required(),
  genel_sonuc: Joi.string().valid('TEMIZ', 'KUSURLU', 'KRITIK').optional(),
  lastik_durumu: DURUM, fren_durumu: DURUM, aydinlatma_durumu: DURUM, sivi_sizinti_durumu: DURUM,
  kaporta_cam_durumu: DURUM, guvenlik_ekipman_durumu: DURUM, evrak_ruhsat_durumu: DURUM, kabin_temizlik_durumu: DURUM,
  notlar: Joi.string().max(2000).allow('', null).optional(),
  belge_anahtarlari: Joi.array().items(vaultKeyJoiField).optional(),
  kapat_zimmet: Joi.boolean().default(false),
});

const parseAtamaId = (raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'INVALID_ID', 'Geçersiz zimmet kimliği.');
  return id;
};

const handleError = (res, err, label) => {
  if (err instanceof AppError) return res.status(err.statusCode).json(err.toBody());
  console.error(`${label} hatası:`, err);
  return res.status(500).json({ message: 'Sunucu hatası' });
};

const getZimmetler = async (req, res) => {
  const { error, value } = listQuerySchema.validate(req.query || {}, { convert: true, stripUnknown: true });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try { return res.status(200).json(await listZimmetler(req.user, value)); }
  catch (err) { return handleError(res, err, 'Zimmet listeleme'); }
};

const getZimmetById = async (req, res) => {
  try { return res.status(200).json(await getZimmetDetail(req.user, parseAtamaId(req.params.atama_id))); }
  catch (err) { return handleError(res, err, 'Zimmet detay'); }
};

const createMuayene = async (req, res) => {
  let atamaId;
  try { atamaId = parseAtamaId(req.params.atama_id); }
  catch (err) { return handleError(res, err, 'Zimmet muayene'); }

  const { error, value } = inspectionSchema.validate(req.body || {}, { convert: true, stripUnknown: true });
  if (error) {
    const d = error.details[0];
    if (d?.type === 'belge.presigned') return res.status(400).json({ code: 'PRESIGNED_URL_FORBIDDEN', message: d.message });
    return res.status(400).json({ message: d.message });
  }
  try {
    const out = await withTransaction((client) => recordHandoverInspectionTx(client, req.user, { ...value, atamaId }));
    if (out.auditCtx) await logAuditEvent(req, out.auditCtx);
    if (out.woAuditCtx) await logAuditEvent(req, out.woAuditCtx);
    return res.status(201).json({
      message: 'Zimmet muayenesi kaydedildi.',
      muayene: out.row, is_emri: out.is_emri, assignment: out.assignment,
    });
  } catch (err) { return handleError(res, err, 'Zimmet muayene'); }
};

module.exports = { getZimmetler, getZimmetById, createMuayene };
