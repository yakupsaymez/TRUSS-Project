const pool = require('../db');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');

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
        u.yetkiler,
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
    atanma_tarihi: Joi.date().iso().max('now').optional().allow(null, ''),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { arac_id, sofor_user_id } = value;
  const atanmaTarihi = value.atanma_tarihi ? value.atanma_tarihi : null;

  const client = await pool.connect();
  try {
    const managerId = req.user?.user_id;
    const orgId = await ensureManagerOrgId(managerId);

    if (!orgId) {
      return res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    }

    // Araç erişimi RBAC filtresiyle; ek olarak aracın sahibi aynı organizasyonda olmalı (çapraz kurum atamasını engeller)
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const orgParamIdx = 2 + params.length;
    const aracCheck = await client.query(
      `SELECT a.arac_id, a.plaka, a.marka, a.model
       FROM araclar a
       WHERE a.arac_id = $1
         AND (${clause})
         AND EXISTS (
           SELECT 1 FROM users o
           WHERE o.user_id = a.kullanici_id AND o.org_id = $${orgParamIdx}
         )`,
      [arac_id, ...params, orgId]
    );
    if (aracCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Bu araç filonuza ait değil veya yetkiniz yok.' });
    }

    await client.query('BEGIN');

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
    await client.query('ROLLBACK').catch(() => null);
    console.error('Araç zimmetleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  } finally {
    client.release();
  }
};

const USER_ID_PARAM_SCHEMA = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const PERMISSION_KEYS = ['yakit', 'bakim', 'finans', 'zimmet', 'envanter', 'ekip'];

// Hedef kullanıcıyı aynı organizasyon içinde bulur ve yetki hiyerarşisini doğrular
const resolveManageableUser = async (req, res, targetId) => {
  const orgId = await ensureManagerOrgId(req.user?.user_id);
  if (!orgId) {
    res.status(404).json({ message: 'Yönetici organizasyonu bulunamadı.' });
    return null;
  }

  const targetRes = await pool.query(
    'SELECT user_id, role FROM users WHERE user_id = $1 AND org_id = $2 LIMIT 1',
    [targetId, orgId]
  );
  if (targetRes.rowCount === 0) {
    res.status(404).json({ message: 'Kullanıcı organizasyonunuzda bulunamadı.' });
    return null;
  }

  const target = targetRes.rows[0];
  // FLEET_MANAGER, SYSTEM_ADMIN hesaplarını yönetemez
  if (req.user.role !== 'SYSTEM_ADMIN' && target.role === 'SYSTEM_ADMIN') {
    res.status(403).json({ message: 'SYSTEM_ADMIN hesabını yönetme yetkiniz yok.' });
    return null;
  }

  return { orgId, target };
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

    // Hedefi kilitle: eşzamanlı rol/zimmet değişimi araya giremez
    const lockRes = await client.query(
      `SELECT user_id, ad_soyad, email, telefon, role, org_id, yetkiler
       FROM users
       WHERE user_id = $1 AND org_id = $2
       FOR UPDATE`,
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
       SET role = $1::user_role_type
       WHERE user_id = $2 AND org_id = $3
       RETURNING user_id, ad_soyad, email, telefon, role, org_id, yetkiler`,
      [value.role, targetId, ctx.orgId]
    );

    // DRIVER rolünden çıkışta aktif zimmetler kapatılır (DRIVER'a dönüşte geri açılmaz)
    let kapatilanZimmetSayisi = 0;
    if (eskiRol === 'DRIVER' && value.role !== 'DRIVER') {
      const zimmetRes = await client.query(
        `UPDATE arac_sofor_atamalari
         SET aktif = FALSE, teslim_tarihi = NOW()
         WHERE sofor_user_id = $1 AND aktif = TRUE`,
        [targetId]
      );
      kapatilanZimmetSayisi = zimmetRes.rowCount;
    }

    await client.query('COMMIT');

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

// 5. PUT /api/admin/users/:id/permissions — Kullanıcı yetki anahtarlarını güncelle (mevcut yetkilerle birleştirir)
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
      `UPDATE users
       SET yetkiler = COALESCE(yetkiler, '{}'::jsonb) || $1::jsonb
       WHERE user_id = $2 AND org_id = $3
       RETURNING user_id, ad_soyad, email, telefon, role, org_id, yetkiler`,
      [JSON.stringify(value.yetkiler), targetId, ctx.orgId]
    );

    return res.status(200).json({
      message: 'Kullanıcı yetkileri güncellendi.',
      user: result.rows[0],
    });
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
      `UPDATE users
       SET sifre = $1
       WHERE user_id = $2 AND org_id = $3
       RETURNING user_id, ad_soyad, email, role`,
      [hashed, targetId, ctx.orgId]
    );

    return res.status(200).json({
      message: 'Kullanıcı şifresi sıfırlandı.',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Şifre sıfırlama hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
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
         AND EXISTS (
           SELECT 1 FROM users o
           WHERE o.user_id = a.kullanici_id AND o.org_id = $${orgParamIdx}
         )`,
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
         (SELECT COUNT(*)::int FROM araclar a JOIN users u ON u.user_id = a.kullanici_id WHERE u.org_id = o.org_id) AS arac_sayisi
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
  getOrgUsers,
  createDriver,
  assignVehicleToDriver,
  updateUserRole,
  updateUserPermissions,
  resetUserPassword,
  unassignVehicle,
  getOrganization,
  updateOrganization,
};
