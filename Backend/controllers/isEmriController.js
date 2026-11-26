const Joi = require('joi');
const AppError = require('../utils/AppError');
const withTransaction = require('../utils/withTransaction');
const { logAuditEvent } = require('../services/auditService');
const { listWorkOrders } = require('../services/workOrderQueryService');
const {
  createWorkOrderTx, updateWorkOrderTx, completeWorkOrderTx, cancelWorkOrderTx, notifyWorkOrderRequester,
} = require('../services/workOrderWriteService');
const { belgeUrlJoiField, vaultKeyJoiField, WORKORDER_MAX_DOCS } = require('../utils/docVaultSchema');

const KATEGORI = ['ariza', 'periyodik_bakim', 'lastik', 'hasar', 'diger'];
const ONCELIK = ['dusuk', 'normal', 'yuksek', 'kritik'];
const DURUM = ['acik', 'serviste', 'tamamlandi', 'iptal'];

const baseFields = {
  baslik: Joi.string().trim().min(2).max(160),
  aciklama: Joi.string().trim().max(2000).allow('', null).optional(),
  kategori: Joi.string().valid(...KATEGORI),
  oncelik: Joi.string().valid(...ONCELIK),
  bildirilen_sayac: Joi.number().min(0).max(2147483647).allow(null, '').optional(),
  servis_adi: Joi.string().trim().max(120).allow('', null).optional(),
  tahmini_maliyet: Joi.number().min(0).max(999999999.99).allow(null, '').optional(),
  planlanan_tarih: Joi.alternatives().try(Joi.string().trim().max(32), Joi.date()).allow('', null).optional(),
};

const querySchema = Joi.object({
  durum: Joi.string().valid(...DURUM).allow('', null).optional(),
  oncelik: Joi.string().valid(...ONCELIK).allow('', null).optional(),
  kategori: Joi.string().valid(...KATEGORI).allow('', null).optional(),
  arac_id: Joi.number().integer().positive().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(200).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

const createSchema = Joi.object({
  ...baseFields,
  arac_id: Joi.number().integer().positive().required(),
  baslik: baseFields.baslik.required(),
  kategori: baseFields.kategori.default('ariza'),
  oncelik: baseFields.oncelik.default('normal'),
  belge_anahtarlari: Joi.array().items(vaultKeyJoiField).max(WORKORDER_MAX_DOCS).optional(),
});

const updateSchema = Joi.object({
  ...baseFields,
  baslik: baseFields.baslik.optional(),
  kategori: baseFields.kategori.optional(),
  oncelik: baseFields.oncelik.optional(),
  durum: Joi.string().valid(...DURUM).optional(),
}).min(1);

const completeSchema = Joi.object({
  tarih: Joi.alternatives().try(Joi.string().trim().min(10).max(32), Joi.date()).required(),
  sayac_degeri: Joi.number().min(0).max(2147483647).required(),
  tutar: Joi.number().min(0).max(999999999.99).required(),
  islem_tipi: Joi.string().trim().max(150).allow('', null).optional(),
  servis_adi: Joi.string().trim().max(120).allow('', null).optional(),
  fatura_no: Joi.string().trim().max(80).allow('', null).optional(),
  notlar: Joi.string().max(2000).allow('', null).optional(),
  sifirla_parcalar: Joi.boolean().optional(),
  belge_url: belgeUrlJoiField,
  belge_anahtarlari: Joi.array().items(vaultKeyJoiField).max(WORKORDER_MAX_DOCS).optional(),
});

const cancelSchema = Joi.object({
  red_iptal_nedeni: Joi.string().trim().max(240).allow('', null).optional(),
});

const handleError = (res, err, label) => {
  if (err instanceof AppError) return res.status(err.statusCode).json(err.toBody());
  console.error(`${label} hatası:`, err);
  return res.status(500).json({ message: 'Sunucu hatası' });
};

const runMutation = async (req, res, { schema, txFn, label, status = 200, requireId = false, buildBody }) => {
  let isEmriId;
  if (requireId) {
    isEmriId = Number(req.params.is_emri_id);
    if (!Number.isInteger(isEmriId) || isEmriId <= 0) return res.status(400).json({ message: 'Geçersiz iş emri kimliği.' });
  }
  const { error, value } = schema.validate(req.body || {}, { convert: true, stripUnknown: true });
  if (error) {
    const detail = error.details[0];
    if (detail?.type === 'belge.presigned') {
      return res.status(400).json({ code: 'PRESIGNED_URL_FORBIDDEN', message: detail.message });
    }
    return res.status(400).json({ message: detail.message });
  }
  try {
    const out = await withTransaction((client) => txFn(client, req.user, requireId ? { ...value, isEmriId } : value));
    if (out.auditCtx) await logAuditEvent(req, out.auditCtx);
    if (out.notifyCtx) await notifyWorkOrderRequester(out.notifyCtx);
    return res.status(status).json(buildBody(out));
  } catch (err) {
    return handleError(res, err, label);
  }
};

const getIsEmirleri = async (req, res) => {
  const { error, value } = querySchema.validate(req.query || {}, { convert: true, stripUnknown: true });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    return res.status(200).json(await listWorkOrders(req.user, value));
  } catch (err) {
    return handleError(res, err, 'İş emri listeleme');
  }
};

const createIsEmri = (req, res) => runMutation(req, res, {
  schema: createSchema, txFn: createWorkOrderTx, label: 'İş emri oluşturma', status: 201,
  buildBody: (out) => ({ message: 'İş emri oluşturuldu', is_emri: out.row }),
});

const updateIsEmri = (req, res) => runMutation(req, res, {
  schema: updateSchema, txFn: updateWorkOrderTx, label: 'İş emri güncelleme', requireId: true,
  buildBody: (out) => ({ message: 'İş emri güncellendi', is_emri: out.row }),
});

const completeIsEmri = (req, res) => runMutation(req, res, {
  schema: completeSchema, txFn: completeWorkOrderTx, label: 'İş emri tamamlama', requireId: true,
  buildBody: (out) => ({ message: 'İş emri tamamlandı ve bakım kaydı oluşturuldu', is_emri: out.row, bakim: out.bakim }),
});

const cancelIsEmri = (req, res) => runMutation(req, res, {
  schema: cancelSchema, txFn: cancelWorkOrderTx, label: 'İş emri iptal', requireId: true,
  buildBody: (out) => ({ message: 'İş emri iptal edildi', is_emri: out.row }),
});

module.exports = { getIsEmirleri, createIsEmri, updateIsEmri, completeIsEmri, cancelIsEmri };
