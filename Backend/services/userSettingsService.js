const bcrypt = require('bcrypt');
const Joi = require('joi');
const pool = require('../db');
const AppError = require('../utils/AppError');
const { sendNotificationEmail, escapeHtml } = require('./emailService');
const { sendSMS } = require('./smsService');
const { DEFAULT_NOTIFICATION_MATRIX, normalizeNotificationMatrix } = require('./notificationService');

const preferencesSchema = Joi.object({
  dil: Joi.string().valid('TR', 'EN', 'RU').required(),
  para_birimi: Joi.string().valid('TRY', 'USD', 'EUR').required(),
  olcu_birimi: Joi.string().valid('KM', 'MI').required(),
});

const categoryToggleSchema = Joi.object({
  email: Joi.boolean().required(),
  sms: Joi.boolean().required(),
  uygulama: Joi.boolean().optional(),
  eposta: Joi.boolean().optional(),
});

const notificationsSchema = Joi.object({
  telefon: Joi.string().max(20).allow('', null),
  email_bildirim_aktif: Joi.boolean().required(),
  sms_bildirim_aktif: Joi.boolean().required(),
  bildirim_tercihleri: Joi.object({
    belge_vadesi: categoryToggleSchema.required(),
    periyodik_bakim: categoryToggleSchema.required(),
    parca_omru: categoryToggleSchema.required(),
    maliyet_ozeti: categoryToggleSchema.required(),
  }).optional(),
});

const passwordSchema = Joi.object({
  mevcut_sifre: Joi.string().required(),
  yeni_sifre: Joi.string().min(6).max(128).required(),
});

function validateBody(schema, input) {
  const { error, value } = schema.validate(input);
  if (error) throw new AppError(400, 'VALIDATION_ERROR', error.details[0].message);
  return value;
}

function buildNotificationSettingsEmailHtml(updatedUser) {
  return `<div style="margin:0;padding:0;background:#020617;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <div style="background:rgba(15,23,42,0.94);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,0.45);">
      <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">TRUSS</div>
      <h2 style="margin:0 0 16px 0;color:#f8fafc;font-size:24px;">Bildirim Tercihleriniz Güncellendi</h2>
      <p style="margin:0 0 12px 0;line-height:1.7;color:#cbd5e1;">Merhaba ${escapeHtml(updatedUser.ad_soyad || '')},</p>
      <p style="margin:0 0 12px 0;line-height:1.7;color:#cbd5e1;">TRUSS bildirim ayarlarını başarıyla güncelledik. Bu e-posta, sistemimizin test iletisi olarak gönderilmiştir.</p>
      <div style="margin-top:20px;padding:16px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(30,41,59,0.85);">
        <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.18em;">Aktif Kanallar</p>
        <p style="margin:8px 0 0 0;color:#e2e8f0;">E-posta: ${updatedUser.email_bildirim_aktif ? 'Aktif' : 'Pasif'}<br />SMS: ${updatedUser.sms_bildirim_aktif ? 'Aktif' : 'Pasif'}</p>
      </div>
    </div>
  </div>
</div>`;
}

async function getMe(actor) {
  const result = await pool.query(
    'SELECT user_id, ad_soyad, email, org_id, role, yetkiler FROM users WHERE user_id = $1 LIMIT 1',
    [actor.user_id]
  );
  if (result.rowCount === 0) throw new AppError(401, 'USER_NOT_FOUND', 'Kullanıcı bulunamadı');
  const row = result.rows[0];
  return {
    user: {
      user_id: row.user_id,
      ad_soyad: row.ad_soyad,
      email: row.email,
      org_id: row.org_id || null,
      role: row.role || 'FLEET_MANAGER',
      yetkiler: row.yetkiler || {},
    },
  };
}

async function getNotificationSettings(actor) {
  const result = await pool.query(
    `SELECT user_id, ad_soyad, email, telefon, email_bildirim_aktif, sms_bildirim_aktif, bildirim_tercihleri
     FROM users WHERE user_id = $1 LIMIT 1`,
    [actor.user_id]
  );
  if (result.rowCount === 0) throw new AppError(404, 'USER_NOT_FOUND', 'Kullanici bulunamadi.');
  const row = result.rows[0];
  return {
    message: 'Bildirim ayarlari alindi',
    user: { ...row, bildirim_tercihleri: normalizeNotificationMatrix(row.bildirim_tercihleri) },
  };
}

async function updateNotificationSettings(actor, input) {
  const value = validateBody(notificationsSchema, input);
  const hasMatrix = value.bildirim_tercihleri !== undefined;
  const matrixPayload = JSON.stringify(
    hasMatrix ? normalizeNotificationMatrix(value.bildirim_tercihleri) : DEFAULT_NOTIFICATION_MATRIX
  );

  const result = await pool.query(
    `UPDATE users
     SET telefon = $1, email_bildirim_aktif = $2, sms_bildirim_aktif = $3,
         bildirim_tercihleri = ${hasMatrix ? '$4::jsonb' : 'COALESCE(bildirim_tercihleri, $4::jsonb)'}
     WHERE user_id = $5
     RETURNING user_id, ad_soyad, email, telefon, email_bildirim_aktif, sms_bildirim_aktif, bildirim_tercihleri`,
    [value.telefon || null, value.email_bildirim_aktif, value.sms_bildirim_aktif, matrixPayload, actor.user_id]
  );

  const updatedUser = result.rows[0]
    ? { ...result.rows[0], bildirim_tercihleri: normalizeNotificationMatrix(result.rows[0].bildirim_tercihleri) }
    : null;

  const notificationTasks = [];
  if (updatedUser?.email_bildirim_aktif && updatedUser?.email) {
    notificationTasks.push(
      sendNotificationEmail(
        updatedUser.email,
        'TRUSS: Bildirim Tercihleriniz Güncellendi',
        buildNotificationSettingsEmailHtml(updatedUser)
      )
    );
  }
  if (updatedUser?.sms_bildirim_aktif && updatedUser?.telefon) {
    notificationTasks.push(sendSMS(updatedUser.telefon, 'TRUSS: Bildirim Tercihleriniz Güncellendi'));
  }
  if (notificationTasks.length) {
    const notificationResults = await Promise.allSettled(notificationTasks);
    notificationResults
      .filter((item) => item.status === 'rejected')
      .forEach((item) => console.error('Bildirim testi gönderilirken hata:', item.reason?.message || item.reason));
  }

  return { message: 'Bildirim ayarlari guncellendi', user: updatedUser };
}

async function getPreferences(actor) {
  const result = await pool.query(
    'SELECT user_id, dil, para_birimi, olcu_birimi FROM users WHERE user_id = $1 LIMIT 1',
    [actor.user_id]
  );
  if (result.rowCount === 0) throw new AppError(404, 'USER_NOT_FOUND', 'Kullanici bulunamadi.');
  return { message: 'Tercih ayarlari alindi', preferences: result.rows[0] };
}

async function updatePreferences(actor, input) {
  const value = validateBody(preferencesSchema, input);
  const result = await pool.query(
    `UPDATE users SET dil = $1, para_birimi = $2, olcu_birimi = $3
     WHERE user_id = $4
     RETURNING user_id, dil, para_birimi, olcu_birimi`,
    [value.dil, value.para_birimi, value.olcu_birimi, actor.user_id]
  );
  if (result.rowCount === 0) throw new AppError(404, 'USER_NOT_FOUND', 'Kullanici bulunamadi.');
  return { message: 'Tercih ayarlari guncellendi', preferences: result.rows[0] };
}

async function changePassword(actor, input) {
  const value = validateBody(passwordSchema, input);
  if (value.mevcut_sifre === value.yeni_sifre) {
    throw new AppError(400, 'PASSWORD_SAME_AS_OLD', 'Yeni şifre mevcut şifrenizle aynı olamaz.');
  }
  const userRes = await pool.query('SELECT user_id, sifre FROM users WHERE user_id = $1 LIMIT 1', [actor.user_id]);
  if (userRes.rowCount === 0) throw new AppError(404, 'USER_NOT_FOUND', 'Kullanıcı bulunamadı.');

  const isMatch = await bcrypt.compare(value.mevcut_sifre, userRes.rows[0].sifre);
  if (!isMatch) throw new AppError(401, 'CURRENT_PASSWORD_INVALID', 'Mevcut şifreniz hatalı.');

  const hashed = await bcrypt.hash(value.yeni_sifre, 10);
  await pool.query('UPDATE users SET sifre = $1, token_version = token_version + 1 WHERE user_id = $2', [
    hashed,
    actor.user_id,
  ]);
  return { message: 'Şifreniz başarıyla güncellendi.' };
}

async function deleteAccount(actor) {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const aracCountRes = await client.query('SELECT COUNT(*)::int AS cnt FROM araclar WHERE kullanici_id = $1', [
      actor.user_id,
    ]);
    const cnt = aracCountRes.rows[0]?.cnt || 0;

    if (cnt > 0) {
      let yeniSahipId = null;
      if (actor.org_id) {
        const adayRes = await client.query(
          `SELECT user_id FROM users
           WHERE org_id = $1 AND user_id <> $2 AND role IN ('SYSTEM_ADMIN', 'FLEET_MANAGER')
           ORDER BY CASE WHEN role = 'SYSTEM_ADMIN' THEN 0 ELSE 1 END, user_id ASC
           LIMIT 1`,
          [actor.org_id, actor.user_id]
        );
        yeniSahipId = adayRes.rows[0]?.user_id || null;
      }

      if (!yeniSahipId) {
        throw new AppError(
          409,
          'OWNED_VEHICLES_EXIST',
          'Üzerinizde kayıtlı araçlar bulunduğu için hesabınız silinemez. Önce başka bir yönetici atayın veya araçları kaldırın.'
        );
      }
      await client.query('UPDATE araclar SET kullanici_id = $1 WHERE kullanici_id = $2', [yeniSahipId, actor.user_id]);
    }

    const result = await client.query('DELETE FROM users WHERE user_id = $1', [actor.user_id]);
    if (result.rowCount === 0) throw new AppError(404, 'USER_NOT_FOUND', 'Kullanici bulunamadi.');

    await client.query('COMMIT');
    return { message: 'Hesabiniz silindi.' };
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    throw err;
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  getMe,
  getNotificationSettings,
  updateNotificationSettings,
  getPreferences,
  updatePreferences,
  changePassword,
  deleteAccount,
};
