const pool = require('../../db');
const Joi = require('joi');
const AppError = require('../../utils/AppError');
const withTransaction = require('../../utils/withTransaction');
const { logAuditEvent } = require('../../services/auditService');
const { assignVehicleTx, unassignVehicleTx } = require('../../services/handoverWriteService');
const { ensureManagerOrgId } = require('./adminHelpers');

const DURUM_VAL = ['OK', 'KUSURLU', 'KRITIK'];
const assignSchema = Joi.object({
  arac_id: Joi.number().integer().positive().required(),
  sofor_user_id: Joi.number().integer().positive().required(),
  atanma_tarihi: Joi.string().trim().optional().allow(null, ''),
  muayene: Joi.object({
    muayene_tarihi: Joi.alternatives().try(Joi.string().trim().min(10).max(32), Joi.date()).required(),
    sayac_degeri: Joi.number().min(0).max(2147483647).required(),
    genel_sonuc: Joi.string().valid('TEMIZ', 'KUSURLU', 'KRITIK').optional(),
    lastik_durumu: Joi.string().valid(...DURUM_VAL).default('OK'),
    fren_durumu: Joi.string().valid(...DURUM_VAL).default('OK'),
    aydinlatma_durumu: Joi.string().valid(...DURUM_VAL).default('OK'),
    sivi_sizinti_durumu: Joi.string().valid(...DURUM_VAL).default('OK'),
    kaporta_cam_durumu: Joi.string().valid(...DURUM_VAL).default('OK'),
    guvenlik_ekipman_durumu: Joi.string().valid(...DURUM_VAL).default('OK'),
    evrak_ruhsat_durumu: Joi.string().valid(...DURUM_VAL).default('OK'),
    kabin_temizlik_durumu: Joi.string().valid(...DURUM_VAL).default('OK'),
    notlar: Joi.string().max(2000).allow('', null).optional(),
    belge_anahtarlari: Joi.array().items(Joi.string().trim().max(255)).optional(),
  }).optional(),
});

const handleErr = (res, err, label) => {
  if (err instanceof AppError) return res.status(err.statusCode).json(err.toBody());
  if (err.code === '23505') {
    return res.status(409).json({ code: 'TAX_NUMBER_EXISTS', message: 'Bu vergi numarası başka bir organizasyonda kayıtlı.' });
  }
  console.error(`${label} hatası:`, err);
  return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
};

const resolveActorWithOrg = async (req) => {
  const orgId = req.user?.org_id || (await ensureManagerOrgId(req.user?.user_id));
  if (!orgId) throw new AppError(404, 'ORG_NOT_FOUND', 'Yönetici organizasyonu bulunamadı.');
  return { ...req.user, org_id: orgId };
};

// POST /api/admin/assign — Şoföre araç zimmetle
const assignVehicleToDriver = async (req, res) => {
  const { error, value } = assignSchema.validate(req.body || {}, { convert: true, stripUnknown: true });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const actor = await resolveActorWithOrg(req);
    const out = await withTransaction((client) => assignVehicleTx(client, actor, value));
    if (out.auditCtx) await logAuditEvent(req, out.auditCtx);
    if (out.woAuditCtx) await logAuditEvent(req, out.woAuditCtx);
    const body = { message: 'Araç şoföre başarıyla zimmetlendi.', assignment: out.assignment };
    if (out.muayene) body.muayene = out.muayene;
    if (out.is_emri) body.is_emri = out.is_emri;
    return res.status(201).json(body);
  } catch (err) {
    return handleErr(res, err, 'Araç zimmetleme');
  }
};

// DELETE /api/admin/assign/:arac_id — Araç üzerindeki aktif zimmeti kaldır
const unassignVehicle = async (req, res) => {
  const paramCheck = Joi.object({ arac_id: Joi.number().integer().positive().required() }).validate(req.params);
  if (paramCheck.error) return res.status(400).json({ message: paramCheck.error.details[0].message });
  try {
    const actor = await resolveActorWithOrg(req);
    const out = await withTransaction((client) => unassignVehicleTx(client, actor, paramCheck.value));
    if (out.auditCtx) await logAuditEvent(req, out.auditCtx);
    return res.status(200).json({ message: 'Araç zimmeti kaldırıldı.', assignment: out.assignment });
  } catch (err) {
    return handleErr(res, err, 'Araç zimmet kaldırma');
  }
};

// GET /api/admin/organization — Yönetici organizasyon profilini ve özet sayılarını getir
const getOrganization = async (req, res) => {
  try {
    const actor = await resolveActorWithOrg(req);
    const result = await pool.query(
      `SELECT o.org_id, o.unvan, o.vergi_no, o.plan_tipi, o.aktif, o.olusturulma_tarihi,
              (SELECT COUNT(*)::int FROM users u WHERE u.org_id = o.org_id) AS uye_sayisi,
              (SELECT COUNT(*)::int FROM araclar a WHERE a.org_id = o.org_id AND a.arsivlendi_mi = FALSE) AS arac_sayisi
       FROM organizations o WHERE o.org_id = $1 LIMIT 1`,
      [actor.org_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Organizasyon bulunamadı.' });
    return res.status(200).json({ message: 'Organizasyon bilgisi alındı.', organization: result.rows[0] });
  } catch (err) {
    return handleErr(res, err, 'Organizasyon okuma');
  }
};

// PUT /api/admin/organization — Organizasyon ünvan ve vergi numarasını güncelle
const updateOrganization = async (req, res) => {
  const schema = Joi.object({
    unvan: Joi.string().trim().min(2).max(200).required(),
    vergi_no: Joi.string().trim().pattern(/^\d{10,11}$/).allow('', null).optional()
      .messages({ 'string.pattern.base': 'Vergi numarası 10 veya 11 haneli rakamlardan oluşmalıdır.' }),
  });
  const { error, value } = schema.validate(req.body || {});
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const actor = await resolveActorWithOrg(req);
    const vergiNo = value.vergi_no ? value.vergi_no.trim() : null;
    const result = await pool.query(
      `UPDATE organizations SET unvan = $1, vergi_no = $2 WHERE org_id = $3
       RETURNING org_id, unvan, vergi_no, plan_tipi, aktif, olusturulma_tarihi`,
      [value.unvan.trim(), vergiNo, actor.org_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Organizasyon bulunamadı.' });
    return res.status(200).json({ message: 'Organizasyon profili güncellendi.', organization: result.rows[0] });
  } catch (err) {
    return handleErr(res, err, 'Organizasyon güncelleme');
  }
};

module.exports = { assignVehicleToDriver, unassignVehicle, getOrganization, updateOrganization };
