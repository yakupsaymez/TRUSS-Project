const express = require('express');
const pool = require('../db');
const Joi = require('joi');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const userController = require('../controllers/userController');
const { sendNotificationEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

const router = express.Router();

// KAYIT ROTASI (Register)
router.post('/register', userController.register);

// GİRİŞ ROTASI (Login)
router.post('/login', userController.login);

// MEVCUT KULLANICI (Frontend refreshUser için; login cevabındaki user ile aynı şekil)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, ad_soyad, email, org_id, role, yetkiler
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı', code: 'USER_NOT_FOUND' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      user: {
        user_id: row.user_id,
        ad_soyad: row.ad_soyad,
        email: row.email,
        org_id: row.org_id || null,
        role: row.role || 'FLEET_MANAGER',
        yetkiler: row.yetkiler || {},
      },
    });
  } catch (err) {
    console.error('Mevcut kullanıcı okuma hatası:', err);
    return res.status(500).json({ message: 'Kullanıcı bilgisi alınamadı' });
  }
});

// BILDIRIM AYARLARI GUNCELLEME
router.get('/settings/notifications', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, ad_soyad, email, telefon, email_bildirim_aktif, sms_bildirim_aktif
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Kullanici bulunamadi.' });
    }

    return res.status(200).json({ message: 'Bildirim ayarlari alindi', user: result.rows[0] });
  } catch (err) {
    console.error('Bildirim ayarları okuma hatası:', err);
    return res.status(500).json({ message: 'Bildirim ayarlari alinamadi' });
  }
});

// TERCIH AYARLARI OKUMA
router.get('/settings/preferences', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, dil, para_birimi, olcu_birimi
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Kullanici bulunamadi.' });
    }

    return res.status(200).json({ message: 'Tercih ayarlari alindi', preferences: result.rows[0] });
  } catch (err) {
    console.error('Tercih ayarları okuma hatası:', err);
    return res.status(500).json({ message: 'Tercih ayarlari alinamadi' });
  }
});

// TERCIH AYARLARI GUNCELLEME
router.put('/settings/preferences', authMiddleware, async (req, res) => {
  const schema = Joi.object({
    dil: Joi.string().valid('TR', 'EN', 'RU').required(),
    para_birimi: Joi.string().valid('TRY', 'USD', 'EUR').required(),
    olcu_birimi: Joi.string().valid('KM', 'MI').required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET dil = $1,
           para_birimi = $2,
           olcu_birimi = $3
       WHERE user_id = $4
       RETURNING user_id, dil, para_birimi, olcu_birimi`,
      [value.dil, value.para_birimi, value.olcu_birimi, req.user.user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Kullanici bulunamadi.' });
    }

    return res.status(200).json({ message: 'Tercih ayarlari guncellendi', preferences: result.rows[0] });
  } catch (err) {
    console.error('Tercih ayarları güncelleme hatası:', err);
    return res.status(500).json({ message: 'Tercih ayarlari guncellenemedi' });
  }
});

// HESAP SILME (DANGER ZONE - Yalnızca SYSTEM_ADMIN)
router.delete('/settings/account', authMiddleware, authorizeRoles('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1', [req.user.user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Kullanici bulunamadi.' });
    }

    return res.status(200).json({ message: 'Hesabiniz silindi.' });
  } catch (err) {
    console.error('Hesap silme hatası:', err);
    return res.status(500).json({ message: 'Hesap silinemedi' });
  }
});

router.put('/settings/notifications', authMiddleware, async (req, res) => {
  const schema = Joi.object({
    telefon: Joi.string().max(20).allow('', null),
    email_bildirim_aktif: Joi.boolean().required(),
    sms_bildirim_aktif: Joi.boolean().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET telefon = $1,
           email_bildirim_aktif = $2,
           sms_bildirim_aktif = $3
       WHERE user_id = $4
       RETURNING user_id, ad_soyad, email, telefon, email_bildirim_aktif, sms_bildirim_aktif`,
      [value.telefon || null, value.email_bildirim_aktif, value.sms_bildirim_aktif, req.user.user_id]
    );

    const updatedUser = result.rows[0];
    const notificationTasks = [];

    if (updatedUser?.email_bildirim_aktif && updatedUser?.email) {
      const htmlBody = `
        <div style="margin:0;padding:0;background:#020617;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;">
          <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
            <div style="background:rgba(15,23,42,0.94);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,0.45);">
              <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">TRUSS</div>
              <h2 style="margin:0 0 16px 0;color:#f8fafc;font-size:24px;">Bildirim Tercihleriniz Güncellendi</h2>
              <p style="margin:0 0 12px 0;line-height:1.7;color:#cbd5e1;">Merhaba ${updatedUser.ad_soyad || ''},</p>
              <p style="margin:0 0 12px 0;line-height:1.7;color:#cbd5e1;">TRUSS bildirim ayarlarını başarıyla güncelledik. Bu e-posta, sistemimizin test iletisi olarak gönderilmiştir.</p>
              <div style="margin-top:20px;padding:16px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(30,41,59,0.85);">
                <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.18em;">Aktif Kanallar</p>
                <p style="margin:8px 0 0 0;color:#e2e8f0;">E-posta: ${updatedUser.email_bildirim_aktif ? 'Aktif' : 'Pasif'}<br />SMS: ${updatedUser.sms_bildirim_aktif ? 'Aktif' : 'Pasif'}</p>
              </div>
            </div>
          </div>
        </div>
      `;

      notificationTasks.push(sendNotificationEmail(
        updatedUser.email,
        'TRUSS: Bildirim Tercihleriniz Güncellendi',
        htmlBody
      ));
    }

    if (updatedUser?.sms_bildirim_aktif && updatedUser?.telefon) {
      notificationTasks.push(sendSMS(
        updatedUser.telefon,
        'TRUSS: Bildirim Tercihleriniz Güncellendi'
      ));
    }

    if (notificationTasks.length) {
      const notificationResults = await Promise.allSettled(notificationTasks);
      notificationResults
        .filter((item) => item.status === 'rejected')
        .forEach((item) => console.error('Bildirim testi gönderilirken hata:', item.reason?.message || item.reason));
    }

    return res.status(200).json({ message: 'Bildirim ayarlari guncellendi', user: result.rows[0] });
  } catch (err) {
    console.error('Bildirim ayarları güncelleme hatası:', err);
    return res.status(500).json({ message: 'Bildirim ayarlari guncellenemedi' });
  }
});

module.exports = router;