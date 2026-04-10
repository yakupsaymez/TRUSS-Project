const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middlewares/authMiddleware.js');
const Joi = require('joi');

const router = express.Router();

// Merkezi Araç Gümrük Kuralları
const aracSchema = Joi.object({
  plaka: Joi.string().min(5).max(11).required(),
  marka: Joi.string().min(2).required(),
  model: Joi.string().min(2).required(),
  yil: Joi.number().integer().min(1950).max(2026).required(),
});

// ARAÇ EKLE
router.post('/ekle', authMiddleware, async (req, res) => {
  const { error, value } = aracSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { plaka, marka, model, yil } = value;
  const kullanici_id = req.user?.user_id;

  try {
    const query = `INSERT INTO araclar (plaka, marka, model, yil, kullanici_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await pool.query(query, [plaka, marka, model, yil, kullanici_id]);
    res.status(201).json({ message: 'Araç eklendi', arac: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Bu plaka zaten kayıtlı.' });
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ARAÇLARI LİSTELE (MİMAR TARAFINDAN DÜZELTİLEN KISIM BURASI)
router.get('/', authMiddleware, async (req, res) => {
  // Frontend URL'den ID göndermez. Güvenlik bekçimiz (authMiddleware) kimliği zaten Token'dan okur.
  const kullanici_id = req.user?.user_id;
  try {
    const result = await pool.query('SELECT * FROM araclar WHERE kullanici_id = $1 ORDER BY arac_id DESC', [kullanici_id]);
    res.status(200).json({ message: 'Araçlar listelendi', araclar: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ARAÇ SİL
router.delete('/:arac_id', authMiddleware, async (req, res) => {
  const { arac_id } = req.params;
  try {
    const result = await pool.query('DELETE FROM araclar WHERE arac_id = $1', [arac_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Araç bulunamadı' });
    res.status(200).json({ message: 'Araç başarıyla silindi' });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ARAÇ GÜNCELLE
router.put('/:arac_id', authMiddleware, async (req, res) => {
  const { error, value } = aracSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { arac_id } = req.params;
  const { plaka, marka, model, yil } = value;

  try {
    const query = `UPDATE araclar SET plaka = $1, marka = $2, model = $3, yil = $4 WHERE arac_id = $5 RETURNING *`;
    const result = await pool.query(query, [plaka, marka, model, yil, arac_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Araç bulunamadı' });
    res.status(200).json({ message: 'Araç güncellendi', arac: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;