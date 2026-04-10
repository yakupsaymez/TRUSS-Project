const express = require('express');
const Joi = require('joi');
const pool = require('../db');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

const parcaEkleSchema = Joi.object({
  arac_id: Joi.number().integer().required(),
  parca_adi: Joi.string().min(2).max(120).required(),
  son_degisim_km: Joi.number().integer().min(0).required(),
  degisim_araligi_km: Joi.number().integer().min(0).allow(null),
  son_degisim_tarihi: Joi.date().iso().required()
});

const parcaGuncelleSchema = Joi.object({
  son_degisim_km: Joi.number().integer().min(0).required(),
  son_degisim_tarihi: Joi.date().iso().required()
});

router.post('/', authMiddleware, async (req, res) => {
  const { error, value } = parcaEkleSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const sahiplik = await pool.query(
      'SELECT 1 FROM araclar WHERE arac_id = $1 AND kullanici_id = $2',
      [value.arac_id, req.user.user_id]
    );

    if (sahiplik.rowCount === 0) {
      return res.status(404).json({ message: 'Arac bulunamadi' });
    }

    const result = await pool.query(
      `INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, degisim_araligi_km, son_degisim_tarihi)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [value.arac_id, value.parca_adi, value.son_degisim_km, value.degisim_araligi_km ?? null, value.son_degisim_tarihi]
    );

    return res.status(201).json({ message: 'Parca takibe alindi', parca: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Bu parca zaten takipte.' });
    }
    return res.status(500).json({ message: 'Parca eklenemedi' });
  }
});

router.get('/arac/:arac_id', authMiddleware, async (req, res) => {
  const aracId = Number(req.params.arac_id);
  if (!Number.isInteger(aracId)) {
    return res.status(400).json({ message: 'Gecersiz arac id' });
  }

  try {
    const sahiplik = await pool.query(
      'SELECT 1 FROM araclar WHERE arac_id = $1 AND kullanici_id = $2',
      [aracId, req.user.user_id]
    );

    if (sahiplik.rowCount === 0) {
      return res.status(404).json({ message: 'Arac bulunamadi' });
    }

    const result = await pool.query(
      'SELECT * FROM parca_takip WHERE arac_id = $1 ORDER BY parca_adi ASC',
      [aracId]
    );

    return res.status(200).json({ parcalar: result.rows });
  } catch (err) {
    return res.status(500).json({ message: 'Parca listesi alinamadi' });
  }
});

router.put('/:parca_id', authMiddleware, async (req, res) => {
  const parcaId = Number(req.params.parca_id);
  if (!Number.isInteger(parcaId)) {
    return res.status(400).json({ message: 'Gecersiz parca id' });
  }

  const { error, value } = parcaGuncelleSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const sahiplik = await pool.query(
      `SELECT p.parca_id
       FROM parca_takip p
       INNER JOIN araclar a ON a.arac_id = p.arac_id
       WHERE p.parca_id = $1 AND a.kullanici_id = $2`,
      [parcaId, req.user.user_id]
    );

    if (sahiplik.rowCount === 0) {
      return res.status(404).json({ message: 'Parca bulunamadi' });
    }

    const result = await pool.query(
      `UPDATE parca_takip
       SET son_degisim_km = $1, son_degisim_tarihi = $2
       WHERE parca_id = $3
       RETURNING *`,
      [value.son_degisim_km, value.son_degisim_tarihi, parcaId]
    );

    return res.status(200).json({ message: 'Parca kaydi guncellendi', parca: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ message: 'Parca guncellenemedi' });
  }
});

module.exports = router;

