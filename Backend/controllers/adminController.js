const pool = require('../db');
const bcrypt = require('bcrypt');
const Joi = require('joi');

// Yöneticinin org_id bilgisini getirir (eski kayıtlar için otomatik organizasyon oluşturur)
const ensureManagerOrgId = async (userId) => {
  const userRes = await pool.query(
    'SELECT user_id, ad_soyad, org_id, role FROM users WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  if (userRes.rowCount === 0) return null;

  const user = userRes.rows[0];
  if (user.org_id) return user.org_id;

  const orgRes = await pool.query(
    `INSERT INTO organizations (unvan, plan_tipi, aktif)
     VALUES ($1, 'ENTERPRISE', TRUE)
     RETURNING org_id`,
    [`${(user.ad_soyad || 'TRUSS').trim()} Filosu`]
  );
  const newOrgId = orgRes.rows[0].org_id;

  await pool.query(
    'UPDATE users SET org_id = $1 WHERE user_id = $2',
    [newOrgId, userId]
  );

  return newOrgId;
};

// 1. GET /api/admin/users — Yöneticiyle aynı org_id'ye sahip kullanıcıları ve zimmetli araçlarını listele
const getOrgUsers = async (req, res) => {
  try {
    const managerId = req.user?.user_id;
    const orgId = await ensureManagerOrgId(managerId);

    if (!orgId) {
      return res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    }

    const query = `
      SELECT
        u.user_id,
        u.ad_soyad,
        u.email,
        u.telefon,
        u.role,
        u.org_id,
        u.kayit_tarihi,
        COALESCE(
          json_agg(
            json_build_object(
              'atama_id', asa.atama_id,
              'arac_id', a.arac_id,
              'plaka', a.plaka,
              'marka', a.marka,
              'model', a.model,
              'atanma_tarihi', asa.atanma_tarihi
            )
          ) FILTER (WHERE asa.atama_id IS NOT NULL AND asa.aktif = TRUE),
          '[]'::json
        ) AS zimmetli_araclar
      FROM users u
      LEFT JOIN arac_sofor_atamalari asa
        ON asa.sofor_user_id = u.user_id AND asa.aktif = TRUE
      LEFT JOIN araclar a
        ON a.arac_id = asa.arac_id
      WHERE u.org_id = $1
      GROUP BY u.user_id
      ORDER BY
        CASE WHEN u.role = 'FLEET_MANAGER' THEN 1
             WHEN u.role = 'SYSTEM_ADMIN' THEN 0
             ELSE 2 END,
        u.kayit_tarihi DESC
    `;

    const result = await pool.query(query, [orgId]);
    return res.status(200).json({
      message: 'Ekip üyeleri listelendi.',
      users: result.rows,
    });
  } catch (err) {
    console.error('Ekip listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// 2. POST /api/admin/users — Filoya yeni bir Şoför (DRIVER rolünde) ekle
const createDriver = async (req, res) => {
  const schema = Joi.object({
    ad_soyad: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    sifre: Joi.string().min(6).required(),
    telefon: Joi.string().max(20).allow('', null).optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { ad_soyad, email, sifre, telefon } = value;

  try {
    const managerId = req.user?.user_id;
    const orgId = await ensureManagerOrgId(managerId);

    if (!orgId) {
      return res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    }

    const hashedPassword = await bcrypt.hash(sifre, 10);

    const insertQuery = `
      INSERT INTO users (ad_soyad, email, sifre, telefon, org_id, role)
      VALUES ($1, $2, $3, $4, $5, 'DRIVER')
      RETURNING user_id, ad_soyad, email, telefon, org_id, role, kayit_tarihi
    `;

    const result = await pool.query(insertQuery, [
      ad_soyad.trim(),
      email.trim().toLowerCase(),
      hashedPassword,
      telefon || null,
      orgId,
    ]);

    return res.status(201).json({
      message: 'Şoför başarıyla filoya eklendi.',
      user: { ...result.rows[0], zimmetli_araclar: [] },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Bu e-posta adresi zaten kayıtlı.' });
    }
    console.error('Şoför ekleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// 3. POST /api/admin/assign — Şoföre araç zimmetle
const assignVehicleToDriver = async (req, res) => {
  const schema = Joi.object({
    arac_id: Joi.number().integer().positive().required(),
    sofor_user_id: Joi.number().integer().positive().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { arac_id, sofor_user_id } = value;

  try {
    const managerId = req.user?.user_id;
    const orgId = await ensureManagerOrgId(managerId);

    // Aracın yöneticiye ait olduğunu doğrula
    const aracCheck = await pool.query(
      'SELECT arac_id, plaka, marka, model FROM araclar WHERE arac_id = $1 AND kullanici_id = $2',
      [arac_id, managerId]
    );
    if (aracCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Bu araç filonuza ait değil veya yetkiniz yok.' });
    }

    // Şoförün aynı organizasyonda olduğunu doğrula
    const driverCheck = await pool.query(
      'SELECT user_id, ad_soyad, role FROM users WHERE user_id = $1 AND org_id = $2',
      [sofor_user_id, orgId]
    );
    if (driverCheck.rowCount === 0) {
      return res.status(404).json({ message: 'Şoför filonuzda bulunamadı.' });
    }

    // Aynı araçta önceki aktif zimmeti pasife çek ve yeni zimmet oluştur
    await pool.query(
      `UPDATE arac_sofor_atamalari
       SET aktif = FALSE, teslim_tarihi = NOW()
       WHERE arac_id = $1 AND aktif = TRUE`,
      [arac_id]
    );

    const assignResult = await pool.query(
      `INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (arac_id) WHERE aktif = TRUE
       DO UPDATE SET sofor_user_id = EXCLUDED.sofor_user_id, atanma_tarihi = NOW(), teslim_tarihi = NULL
       RETURNING *`,
      [arac_id, sofor_user_id]
    );

    return res.status(201).json({
      message: 'Araç şoföre başarıyla zimmetlendi.',
      assignment: assignResult.rows[0],
    });
  } catch (err) {
    console.error('Araç zimmetleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = {
  getOrgUsers,
  createDriver,
  assignVehicleToDriver,
};
