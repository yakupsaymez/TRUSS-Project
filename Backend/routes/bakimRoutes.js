const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middlewares/authMiddleware.js');

const router = express.Router();

// YENI BAKIM KAYDI EKLE
router.post('/', authMiddleware, async (req, res) => {
  const { arac_id, bakim_tipi, tarih, km, maliyet, notlar } = req.body;

  // Temel zorunlu alan kontrolu
  if (!arac_id || !bakim_tipi || !tarih || km === undefined || maliyet === undefined) {
    return res.status(400).json({ message: 'Gerekli alanlar eksik.' });
  }

  try {
    const query = `
      INSERT INTO bakimlar (arac_id, bakim_tipi, tarih, km, maliyet, notlar)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [arac_id, bakim_tipi, tarih, km, maliyet, notlar || null]);

    return res.status(201).json({ message: 'Bakim kaydi eklendi', bakim: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
});

// BELIRLI ARACIN TUM BAKIMLARINI LISTELE (TARIHE GORE AZALAN)
router.get('/arac/:arac_id', authMiddleware, async (req, res) => {
  const { arac_id } = req.params;

  try {
    const query = 'SELECT * FROM bakimlar WHERE arac_id = $1 ORDER BY tarih DESC';
    const result = await pool.query(query, [arac_id]);

    return res.status(200).json({ message: 'Bakimlar listelendi', bakimlar: result.rows });
  } catch (err) {
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
});

// BELIRLI BAKIM KAYDINI SIL
router.delete('/:bakim_id', authMiddleware, async (req, res) => {
  const { bakim_id } = req.params;

  try {
    const result = await pool.query('DELETE FROM bakimlar WHERE bakim_id = $1', [bakim_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Bakim kaydi bulunamadi' });
    }

    return res.status(200).json({ message: 'Bakim kaydi silindi' });
  } catch (err) {
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
});

module.exports = router;

