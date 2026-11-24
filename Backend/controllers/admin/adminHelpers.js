const pool = require('../../db');
const Joi = require('joi');

const USER_ID_PARAM_SCHEMA = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const PERMISSION_KEYS = ['yakit', 'bakim', 'finans', 'zimmet', 'envanter', 'ekip'];

// Yöneticinin org_id bilgisini getirir (eski kayıtlar için otomatik organizasyon oluşturur)
const ensureManagerOrgId = async (userId) => {
  let client = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT user_id, ad_soyad, org_id, role FROM users WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    if (userRes.rowCount === 0) {
      await client.query('COMMIT');
      return null;
    }

    const user = userRes.rows[0];
    if (user.org_id) {
      await client.query('COMMIT');
      return user.org_id;
    }

    const orgRes = await client.query(
      `INSERT INTO organizations (unvan, plan_tipi, aktif)
       VALUES ($1, 'ENTERPRISE', TRUE)
       RETURNING org_id`,
      [`${(user.ad_soyad || 'TRUSS').trim()} Filosu`]
    );
    const newOrgId = orgRes.rows[0].org_id;

    await client.query(
      'UPDATE users SET org_id = $1 WHERE user_id = $2',
      [newOrgId, userId]
    );

    await client.query(
      'UPDATE araclar SET org_id = $1 WHERE kullanici_id = $2 AND org_id IS NULL',
      [newOrgId, userId]
    );

    await client.query('COMMIT');
    return newOrgId;
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    if (client) client.release();
  }
};

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

module.exports = {
  USER_ID_PARAM_SCHEMA,
  PERMISSION_KEYS,
  ensureManagerOrgId,
  resolveManageableUser,
};
