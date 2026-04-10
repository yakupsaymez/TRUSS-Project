const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const authMiddleware = require('../middlewares/authMiddleware');

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
router.put('/settings/notifications', authMiddleware, async (req, res) => {
  const schema = Joi.object({
    telefon: Joi.string().max(20).allow('', null),
    email_bildirim_aktif: Joi.boolean().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET telefon = $1,
           email_bildirim_aktif = $2
       WHERE user_id = $3
       RETURNING user_id, ad_soyad, email, telefon, email_bildirim_aktif`,
      [value.telefon || null, value.email_bildirim_aktif, req.user.user_id]
    );

    return res.status(200).json({ message: 'Bildirim ayarlari guncellendi', user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ message: 'Bildirim ayarlari guncellenemedi' });
  }
});

module.exports = router;