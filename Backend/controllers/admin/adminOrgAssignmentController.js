const pool = require('../../db');
const Joi = require('joi');
const { buildVehicleAccessFilter } = require('../../middlewares/rbacMiddleware');
const { ileriTarihMi, tarihStr } = require('../../utils/dateUtils');
const { ensureManagerOrgId } = require('./adminHelpers');

// 3. POST /api/admin/assign — Şoföre araç zimmetle
const assignVehicleToDriver = async (req, res) => {
  const schema = Joi.object({
    arac_id: Joi.number().integer().positive().required(),
    sofor_user_id: Joi.number().integer().positive().required(),
    atanma_tarihi: Joi.string().trim().optional().allow(null, ''),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { arac_id, sofor_user_id } = value;
  let atanmaTarihi = null;
  if (value.atanma_tarihi) {
    const gun = tarihStr(value.atanma_tarihi);
    if (!gun) {
      return res.status(400).json({ message: 'Geçersiz atanma tarihi formatı.' });
    }
    if (ileriTarihMi(value.atanma_tarihi)) {
      return res.status(400).json({ message: 'İleri tarihli zimmet ataması yapılamaz.' });
    }
    atanmaTarihi = gun;
  }

  let client = null;
  try {
    const managerId = req.user?.user_id;
    const orgId = await ensureManagerOrgId(managerId);

    if (!orgId) {
      return res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Araç erişimi RBAC filtresiyle; ek olarak aracın sahibi aynı organizasyonda olmalı (çapraz kurum atamasını engeller)
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const orgParamIdx = 2 + params.length;
    const aracCheck = await client.query(
      `SELECT a.arac_id, a.plaka, a.marka, a.model, a.arsivlendi_mi
       FROM araclar a
       WHERE a.arac_id = $1
         AND (${clause})
         AND a.org_id = $${orgParamIdx}
       FOR UPDATE OF a`,
      [arac_id, ...params, orgId]
    );
    if (aracCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Bu araç filonuza ait değil veya yetkiniz yok.' });
    }
    if (aracCheck.rows[0].arsivlendi_mi) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        code: 'VEHICLE_ARCHIVED',
        message: 'Arşivlenmiş araca şoför zimmetlenemez.',
      });
    }

    // Şoförün aynı organizasyonda olduğunu doğrula; satır kilitlenir (eşzamanlı rol değişimi araya giremez)
    const driverCheck = await client.query(
      'SELECT user_id, ad_soyad, role FROM users WHERE user_id = $1 AND org_id = $2 FOR UPDATE',
      [sofor_user_id, orgId]
    );
    if (driverCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Şoför filonuzda bulunamadı.' });
    }
    if (driverCheck.rows[0].role !== 'DRIVER') {
      await client.query('ROLLBACK');
      return res.status(422).json({
        code: 'ASSIGNEE_NOT_DRIVER',
        message: 'Araç yalnızca Şoför rolündeki kullanıcılara zimmetlenebilir.',
      });
    }

    // Aynı araçta önceki aktif zimmeti pasife çek ve yeni zimmet oluştur
    await client.query(
      `UPDATE arac_sofor_atamalari
       SET aktif = FALSE, teslim_tarihi = NOW()
       WHERE arac_id = $1 AND aktif = TRUE`,
      [arac_id]
    );

    const assignResult = await client.query(
      `INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif, atanma_tarihi)
       VALUES ($1, $2, TRUE, COALESCE($3::timestamptz, NOW()))
       ON CONFLICT (arac_id) WHERE aktif = TRUE
       DO UPDATE SET sofor_user_id = EXCLUDED.sofor_user_id,
                     atanma_tarihi = EXCLUDED.atanma_tarihi,
                     teslim_tarihi = NULL
       RETURNING *`,
      [arac_id, sofor_user_id, atanmaTarihi]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Araç şoföre başarıyla zimmetlendi.',
      assignment: assignResult.rows[0],
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error('Araç zimmetleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  } finally {
    if (client) client.release();
  }
};

// 7. DELETE /api/admin/assign/:arac_id — Araç üzerindeki aktif zimmeti kaldır
const unassignVehicle = async (req, res) => {
  const paramCheck = Joi.object({
    arac_id: Joi.number().integer().positive().required(),
  }).validate(req.params);
  if (paramCheck.error) {
    return res.status(400).json({ message: paramCheck.error.details[0].message });
  }

  const { arac_id } = paramCheck.value;

  try {
    const managerId = req.user?.user_id;
    const orgId = await ensureManagerOrgId(managerId);

    if (!orgId) {
      return res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    }

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const orgParamIdx = 2 + params.length;
    const aracCheck = await pool.query(
      `SELECT a.arac_id
       FROM araclar a
       WHERE a.arac_id = $1
         AND (${clause})
         AND a.org_id = $${orgParamIdx}`,
      [arac_id, ...params, orgId]
    );
    if (aracCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Bu araç filonuza ait değil veya yetkiniz yok.' });
    }

    const result = await pool.query(
      `UPDATE arac_sofor_atamalari
       SET aktif = FALSE, teslim_tarihi = NOW()
       WHERE arac_id = $1 AND aktif = TRUE
       RETURNING *`,
      [arac_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        code: 'ACTIVE_ASSIGNMENT_NOT_FOUND',
        message: 'Bu araçta aktif zimmet bulunamadı.',
      });
    }

    return res.status(200).json({
      message: 'Araç zimmeti kaldırıldı.',
      assignment: result.rows[0],
    });
  } catch (err) {
    console.error('Araç zimmet kaldırma hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// 8. GET /api/admin/organization — Yönetici organizasyon profilini ve özet sayılarını getir
const getOrganization = async (req, res) => {
  try {
    const orgId = await ensureManagerOrgId(req.user?.user_id);
    if (!orgId) {
      return res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    }

    const result = await pool.query(
      `SELECT
         o.org_id,
         o.unvan,
         o.vergi_no,
         o.plan_tipi,
         o.aktif,
         o.olusturulma_tarihi,
         (SELECT COUNT(*)::int FROM users u WHERE u.org_id = o.org_id) AS uye_sayisi,
         (SELECT COUNT(*)::int FROM araclar a WHERE a.org_id = o.org_id AND a.arsivlendi_mi = FALSE) AS arac_sayisi
       FROM organizations o
       WHERE o.org_id = $1
       LIMIT 1`,
      [orgId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Organizasyon bulunamadı.' });
    }

    return res.status(200).json({
      message: 'Organizasyon bilgisi alındı.',
      organization: result.rows[0],
    });
  } catch (err) {
    console.error('Organizasyon okuma hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// 9. PUT /api/admin/organization — Organizasyon ünvan ve vergi numarasını güncelle
const updateOrganization = async (req, res) => {
  const schema = Joi.object({
    unvan: Joi.string().trim().min(2).max(200).required(),
    vergi_no: Joi.string()
      .trim()
      .pattern(/^\d{10,11}$/)
      .allow('', null)
      .optional()
      .messages({
        'string.pattern.base': 'Vergi numarası 10 veya 11 haneli rakamlardan oluşmalıdır.',
      }),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const orgId = await ensureManagerOrgId(req.user?.user_id);
    if (!orgId) {
      return res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    }

    const vergiNo = value.vergi_no ? value.vergi_no.trim() : null;

    const result = await pool.query(
      `UPDATE organizations
       SET unvan = $1,
           vergi_no = $2
       WHERE org_id = $3
       RETURNING org_id, unvan, vergi_no, plan_tipi, aktif, olusturulma_tarihi`,
      [value.unvan.trim(), vergiNo, orgId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Organizasyon bulunamadı.' });
    }

    return res.status(200).json({
      message: 'Organizasyon profili güncellendi.',
      organization: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        code: 'TAX_NUMBER_EXISTS',
        message: 'Bu vergi numarası başka bir organizasyonda kayıtlı.',
      });
    }
    console.error('Organizasyon güncelleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = {
  assignVehicleToDriver,
  unassignVehicle,
  getOrganization,
  updateOrganization,
};
