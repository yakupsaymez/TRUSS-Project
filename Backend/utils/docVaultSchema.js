const Joi = require('joi');

const ALLOWED_MIME_EXT = Object.freeze({
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});

const MAX_FILE_BYTES = 10485760;
const WORKORDER_MAX_DOCS = 5;

const VAULT_KEY_RE = /^org_[1-9]\d*\/(yakit|bakim|is_emri)\/\d{4}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/i;
const PRESIGNED_URL_RE = /([?&](X-Amz-Signature|X-Amz-Credential|X-Amz-Algorithm|sig)=|\/api\/belgeler\/local-nesne\b)/i;

const isVaultKey = (val) => typeof val === 'string' && VAULT_KEY_RE.test(val.trim());
const isPresignedUrl = (val) => typeof val === 'string' && PRESIGNED_URL_RE.test(val);

const belgeUrlJoiField = Joi.string()
  .trim()
  .max(2048)
  .custom((val, helpers) => {
    if (!val) return val;
    if (PRESIGNED_URL_RE.test(val)) return helpers.error('belge.presigned');
    if (VAULT_KEY_RE.test(val) || /^(https?:\/\/|\/)/i.test(val)) return val;
    return helpers.error('belge.invalid');
  })
  .messages({
    'belge.presigned': 'Ön-imzalı belge URL’si doğrudan kaydedilemez.',
    'belge.invalid': 'Geçersiz belge anahtarı veya URL biçimi.',
  })
  .allow('', null)
  .optional();

const vaultKeyJoiField = Joi.string()
  .trim()
  .max(255)
  .custom((val, helpers) => {
    if (PRESIGNED_URL_RE.test(val)) return helpers.error('belge.presigned');
    if (VAULT_KEY_RE.test(val)) return val;
    return helpers.error('belge.invalid');
  })
  .messages({
    'belge.presigned': 'Ön-imzalı belge URL’si doğrudan kaydedilemez.',
    'belge.invalid': 'Geçersiz belge kasa anahtarı.',
  });

const presignUploadSchema = Joi.object({
  arac_id: Joi.number().integer().positive().required(),
  varlik_tipi: Joi.string().valid('yakit', 'bakim', 'is_emri').required(),
  varlik_id: Joi.number().integer().positive().allow(null, '').optional(),
  orijinal_ad: Joi.string().trim().min(1).max(180).required(),
  mime_tipi: Joi.string().trim().lowercase().max(64).required(),
  boyut_bayt: Joi.number().integer().required(),
});

const bindDocumentSchema = Joi.object({
  varlik_tipi: Joi.string().valid('yakit', 'bakim', 'is_emri').required(),
  varlik_id: Joi.number().integer().positive().required(),
});

const listDocumentsSchema = Joi.object({
  arac_id: Joi.number().integer().positive().optional(),
  varlik_tipi: Joi.string().valid('yakit', 'bakim', 'is_emri').optional(),
  varlik_id: Joi.number().integer().positive().optional(),
  durum: Joi.string().valid('yukleniyor', 'aktif').default('aktif'),
  limit: Joi.number().integer().min(1).max(200).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

const accessQuerySchema = Joi.object({
  anahtar: Joi.string().trim().max(255).optional(),
  indir: Joi.boolean().truthy('1', 'true').falsy('0', 'false').default(false),
});

module.exports = {
  ALLOWED_MIME_EXT,
  MAX_FILE_BYTES,
  WORKORDER_MAX_DOCS,
  VAULT_KEY_RE,
  PRESIGNED_URL_RE,
  isVaultKey,
  isPresignedUrl,
  belgeUrlJoiField,
  vaultKeyJoiField,
  presignUploadSchema,
  bindDocumentSchema,
  listDocumentsSchema,
  accessQuerySchema,
};
