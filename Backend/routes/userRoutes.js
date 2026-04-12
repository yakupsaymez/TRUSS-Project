const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const authMiddleware = require('../middlewares/authMiddleware');
const { sendNotificationEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

const router = express.Router();

// KAYIT ROTASI (Register)
router.post('/register', async (req, res) => {
  // 1. Joi Gümrük Kuralları
  const schema = Joi.object({
    ad_soyad: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    sifre: Joi.string().min(6).required(),
  });

  // 2. Veri Kontrolü
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { ad_soyad, email, sifre } = value;

  try {
    // 3. Şifreyi Maskeleme (Hashing)
    const hashedPassword = await bcrypt.hash(sifre, 10);

    const query = `
      INSERT INTO users (ad_soyad, email, sifre)
      VALUES ($1, $2, $3)
      RETURNING user_id, ad_soyad, email, kayit_tarihi
    `;
    const result = await pool.query(query, [ad_soyad, email, hashedPassword]);

    return res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi.', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Bu email zaten kayıtlı.' });
    }
    console.error('Kayit hatasi:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});

// GİRİŞ ROTASI (Login)
router.post('/login', async (req, res) => {
  const { email, sifre } = req.body;

  if (!email || !sifre) {
    return res.status(400).json({ message: 'Email ve şifre zorunludur.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Hatalı email veya şifre' });
    }

    const user = result.rows[0];
    // 4. Şifre Karşılaştırma
    const passwordMatch = await bcrypt.compare(sifre, user.sifre);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Hatalı email veya şifre' });
    }

    // 5. Token Oluşturma
    const payload = { user_id: user.user_id, email: user.email };
    const secret = process.env.JWT_SECRET || 'gizli_anahtar_gecici';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    return res.status(200).json({
      message: `Hoş geldin ${user.ad_soyad}`,
      token,
      user: { user_id: user.user_id, ad_soyad: user.ad_soyad, email: user.email }
    });
  } catch (err) {
    console.error('Giris hatasi:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
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
    return res.status(500).json({ message: 'Tercih ayarlari guncellenemedi' });
  }
});

// HESAP SILME (DANGER ZONE)
router.delete('/settings/account', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1', [req.user.user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Kullanici bulunamadi.' });
    }

    return res.status(200).json({ message: 'Hesabiniz silindi.' });
  } catch (err) {
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
              <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">ABTS</div>
              <h2 style="margin:0 0 16px 0;color:#f8fafc;font-size:24px;">Bildirim Tercihleriniz Güncellendi</h2>
              <p style="margin:0 0 12px 0;line-height:1.7;color:#cbd5e1;">Merhaba ${updatedUser.ad_soyad || ''},</p>
              <p style="margin:0 0 12px 0;line-height:1.7;color:#cbd5e1;">ABTS bildirim ayarlarını başarıyla güncelledik. Bu e-posta, sistemimizin test iletisi olarak gönderilmiştir.</p>
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
        'ABTS: Bildirim Tercihleriniz Güncellendi',
        htmlBody
      ));
    }

    if (updatedUser?.sms_bildirim_aktif && updatedUser?.telefon) {
      notificationTasks.push(sendSMS(
        updatedUser.telefon,
        'ABTS: Bildirim Tercihleriniz Güncellendi'
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
    return res.status(500).json({ message: 'Bildirim ayarlari guncellenemedi' });
  }
});

module.exports = router;