const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const { getJwtSecret } = require('../utils/jwtSecret');

// KAYIT METODU (Register - Multi-Tenant & RBAC)
const register = async (req, res) => {
  const schema = Joi.object({
    ad_soyad: Joi.string().min(3).required(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    sifre: Joi.string().min(6).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { ad_soyad, email, sifre } = value;
  let client = null;
  let settled = false;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(sifre, 10);
    const varsayilanFiloAdi = `${ad_soyad.trim()} Filosu`;

    // 1. Varsayılan organizasyonu (filoyu) oluştur
    const orgResult = await client.query(
      `INSERT INTO organizations (unvan, plan_tipi, aktif)
       VALUES ($1, 'ENTERPRISE', TRUE)
       RETURNING org_id, unvan`,
      [varsayilanFiloAdi]
    );
    const org_id = orgResult.rows[0].org_id;

    // 2. Kullanıcıyı FLEET_MANAGER rolü ve org_id ile kaydet
    const normalizedEmail = email.trim().toLowerCase();
    const userResult = await client.query(
      `INSERT INTO users (ad_soyad, email, sifre, org_id, role)
       VALUES ($1, $2, $3, $4, 'FLEET_MANAGER')
       RETURNING user_id, ad_soyad, email, org_id, role, kayit_tarihi`,
      [ad_soyad.trim(), normalizedEmail, hashedPassword, org_id]
    );

    await client.query('COMMIT');
    settled = true;

    return res.status(201).json({
      message: 'Kullanıcı ve filo başarıyla kaydedildi.',
      user: userResult.rows[0],
      organization: orgResult.rows[0],
    });
  } catch (err) {
    if (client && !settled) {
      await client.query('ROLLBACK').catch(() => null);
      settled = true;
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Bu email zaten kayıtlı.' });
    }
    console.error('Kayıt hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  } finally {
    if (client) {
      if (!settled) await client.query('ROLLBACK').catch(() => null);
      client.release();
    }
  }
};

// GİRİŞ METODU (Login - RBAC JWT Payload)
const login = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    sifre: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, sifre } = value;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [normalizedEmail]);

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Hatalı email veya şifre' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(sifre, user.sifre);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Hatalı email veya şifre' });
    }

    const payload = {
      user_id: user.user_id,
      email: user.email,
      org_id: user.org_id || null,
      role: user.role || 'FLEET_MANAGER',
      tv: Number(user.token_version ?? 0),
    };
    const secret = getJwtSecret();
    const token = jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });

    return res.status(200).json({
      message: `Hoş geldin ${user.ad_soyad}`,
      token,
      user: {
        user_id: user.user_id,
        ad_soyad: user.ad_soyad,
        email: user.email,
        org_id: user.org_id || null,
        role: user.role || 'FLEET_MANAGER',
        yetkiler: user.yetkiler || {},
      },
    });
  } catch (err) {
    console.error('Giriş hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = {
  register,
  login,
};
