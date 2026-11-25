const pool = require('../../db');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const {
  USER_ID_PARAM_SCHEMA,
  PERMISSION_KEYS,
  ensureManagerOrgId,
  resolveManageableUser,
} = require('./adminHelpers');
const { logAuditEvent } = require('../../services/auditService');

// 1. GET /api/admin/users — Yöneticiyle aynı org_id'ye sahip kullanıcıları ve zimmetli araçlarını listele
const getOrgUsers = async (req, res) => {
  try {
    const orgId = await ensureManagerOrgId(req.user?.user_id);
    if (!orgId) {
      return res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    }
    const query = `
      SELECT
        u.user_id, u.ad_soyad, u.email, u.telefon, u.role, u.yetkiler, u.org_id, u.kayit_tarihi,
        COALESCE(
          json_agg(
            json_build_object(
              'atama_id', asa.atama_id, 'arac_id', a.arac_id, 'plaka', a.plaka,
              'marka', a.marka, 'model', a.model, 'atanma_tarihi', asa.atanma_tarihi
            )
          ) FILTER (WHERE asa.atama_id IS NOT NULL AND asa.aktif = TRUE),
          '[]'::json
        ) AS zimmetli_araclar
      FROM users u
      LEFT JOIN arac_sofor_atamalari asa ON asa.sofor_user_id = u.user_id AND asa.aktif = TRUE
      LEFT JOIN araclar a ON a.arac_id = asa.arac_id
      WHERE u.org_id = $1
      GROUP BY u.user_id
      ORDER BY
        CASE WHEN u.role = 'FLEET_MANAGER' THEN 1
             WHEN u.role = 'SYSTEM_ADMIN' THEN 0
             ELSE 2 END,
        u.kayit_tarihi DESC
    `;
    const result = await pool.query(query, [orgId]);
    return res.status(200).json({ message: 'Ekip üyeleri listelendi.', users: result.rows });
  } catch (err) {
    console.error('Ekip listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// 2. POST /api/admin/users — Filoya yeni bir Şoför (DRIVER rolünde) ekle
const createDriver = async (req, res) => {
  const schema = Joi.object({
    ad_soyad: Joi.string().min(3).required(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    sifre: Joi.string().min(6).required(),
    telefon: Joi.string().max(20).allow('', null).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { ad_soyad, email, sifre, telefon } = value;

  try {
    const orgId = await ensureManagerOrgId(req.user?.user_id);
    if (!orgId) {
      return res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    }
    const hashedPassword = await bcrypt.hash(sifre, 10);
    const result = await pool.query(
      `INSERT INTO users (ad_soyad, email, sifre, telefon, org_id, role)
       VALUES ($1, $2, $3, $4, $5, 'DRIVER')
       RETURNING user_id, ad_soyad, email, telefon, org_id, role, kayit_tarihi`,
      [ad_soyad.trim(), email.trim().toLowerCase(), hashedPassword, telefon || null, orgId]
    );
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

// 4. PUT /api/admin/users/:id/role — Kullanıcı rolünü güncelle
const updateUserRole = async (req, res) => {
  const paramCheck = USER_ID_PARAM_SCHEMA.validate(req.params);
  if (paramCheck.error) {
    return res.status(400).json({ message: paramCheck.error.details[0].message });
  }
  const { error, value } = Joi.object({
    role: Joi.string().valid('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER').required(),
  }).validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const targetId = paramCheck.value.id;
  let client = null;
  try {
    if (targetId === req.user?.user_id) {
      return res.status(403).json({ message: 'Kendi rolünüzü değiştiremezsiniz.' });
    }
    if (req.user.role !== 'SYSTEM_ADMIN' && value.role === 'SYSTEM_ADMIN') {
      return res.status(403).json({ message: 'SYSTEM_ADMIN rolünü yalnızca SYSTEM_ADMIN atayabilir.' });
    }
    const ctx = await resolveManageableUser(req, res, targetId);
    if (!ctx) return;

    client = await pool.connect();
    await client.query('BEGIN');

    const lockRes = await client.query(
      `SELECT user_id, ad_soyad, email, telefon, role, org_id, yetkiler
       FROM users WHERE user_id = $1 AND org_id = $2 FOR UPDATE`,
      [targetId, ctx.orgId]
    );
    if (lockRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Kullanıcı organizasyonunuzda bulunamadı.',
      });
    }

    const eskiRol = lockRes.rows[0].role;
    if (eskiRol === value.role) {
      await client.query('COMMIT');
      return res.status(200).json({
        message: 'Rol zaten güncel.',
        user: lockRes.rows[0],
        kapatilan_zimmet_sayisi: 0,
      });
    }

    const result = await client.query(
      `UPDATE users
       SET role = $1::user_role_type,
           yetkiler = CASE WHEN $1::user_role_type = 'DRIVER' THEN '{}'::jsonb ELSE yetkiler END,
           token_version = token_version + 1
       WHERE user_id = $2 AND org_id = $3
       RETURNING user_id, ad_soyad, email, telefon, role, org_id, yetkiler`,
      [value.role, targetId, ctx.orgId]
    );

    let kapatilanZimmetSayisi = 0;
    if (eskiRol === 'DRIVER' && value.role !== 'DRIVER') {
      const zimmetRes = await client.query(
        `UPDATE arac_sofor_atamalari SET aktif = FALSE, teslim_tarihi = NOW()
         WHERE sofor_user_id = $1 AND aktif = TRUE`,
        [targetId]
      );
      kapatilanZimmetSayisi = zimmetRes.rowCount;
    }

    await client.query('COMMIT');
    await logAuditEvent(req, {
      eylem: 'KULLANICI_ROL_GUNCELLENDI',
      varlik_tipi: 'user',
      varlik_id: targetId,
      org_id: ctx.orgId,
      ozet: `${result.rows[0].email} kullanıcısının rolü ${eskiRol} -> ${value.role} olarak güncellendi.`,
      detay: { email: result.rows[0].email, eski_rol: eskiRol, yeni_rol: value.role, kapatilan_zimmet_sayisi: kapatilanZimmetSayisi },
    });
    return res.status(200).json({
      message: 'Kullanıcı rolü güncellendi.',
      user: result.rows[0],
      kapatilan_zimmet_sayisi: kapatilanZimmetSayisi,
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error('Rol güncelleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  } finally {
    if (client) client.release();
  }
};

// 5. PUT /api/admin/users/:id/permissions — Kullanıcı yetki anahtarlarını güncelle
const updateUserPermissions = async (req, res) => {
  const paramCheck = USER_ID_PARAM_SCHEMA.validate(req.params);
  if (paramCheck.error) {
    return res.status(400).json({ message: paramCheck.error.details[0].message });
  }
  const permissionShape = PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Joi.boolean().optional();
    return acc;
  }, {});
  const { error, value } = Joi.object({
    yetkiler: Joi.object(permissionShape).min(1).unknown(false).required(),
  }).validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const targetId = paramCheck.value.id;
  if (targetId === req.user?.user_id) {
    return res.status(403).json({
      code: 'SELF_PERMISSION_LOCKED',
      message: 'Kendi yetkilerinizi değiştiremezsiniz.',
    });
  }

  try {
    const ctx = await resolveManageableUser(req, res, targetId);
    if (!ctx) return;

    const result = await pool.query(
      `UPDATE users SET yetkiler = COALESCE(yetkiler, '{}'::jsonb) || $1::jsonb
       WHERE user_id = $2 AND org_id = $3
       RETURNING user_id, ad_soyad, email, telefon, role, org_id, yetkiler`,
      [JSON.stringify(value.yetkiler), targetId, ctx.orgId]
    );
    await logAuditEvent(req, {
      eylem: 'KULLANICI_YETKI_GUNCELLENDI',
      varlik_tipi: 'user',
      varlik_id: targetId,
      org_id: ctx.orgId,
      ozet: `${result.rows[0].email} kullanıcısının yetkileri güncellendi.`,
      detay: { email: result.rows[0].email, degisen_yetkiler: value.yetkiler, guncel_yetkiler: result.rows[0].yetkiler },
    });
    return res.status(200).json({ message: 'Kullanıcı yetkileri güncellendi.', user: result.rows[0] });
  } catch (err) {
    console.error('Yetki güncelleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// 6. PUT /api/admin/users/:id/password — Kullanıcı şifresini yönetici tarafından sıfırla
const resetUserPassword = async (req, res) => {
  const paramCheck = USER_ID_PARAM_SCHEMA.validate(req.params);
  if (paramCheck.error) {
    return res.status(400).json({ message: paramCheck.error.details[0].message });
  }
  const { error, value } = Joi.object({
    yeni_sifre: Joi.string().min(6).max(128).required(),
  }).validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const targetId = paramCheck.value.id;
  if (targetId === req.user?.user_id) {
    return res.status(403).json({
      code: 'SELF_PASSWORD_RESET_LOCKED',
      message: 'Kendi şifrenizi Ayarlar > Güvenlik ekranından değiştirebilirsiniz.',
    });
  }

  try {
    const ctx = await resolveManageableUser(req, res, targetId);
    if (!ctx) return;

    const hashed = await bcrypt.hash(value.yeni_sifre, 10);
    const result = await pool.query(
      `UPDATE users SET sifre = $1, token_version = token_version + 1 WHERE user_id = $2 AND org_id = $3
       RETURNING user_id, ad_soyad, email, role`,
      [hashed, targetId, ctx.orgId]
    );
    return res.status(200).json({ message: 'Kullanıcı şifresi sıfırlandı.', user: result.rows[0] });
  } catch (err) {
    console.error('Şifre sıfırlama hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = {
  getOrgUsers,
  createDriver,
  updateUserRole,
  updateUserPermissions,
  resetUserPassword,
};
