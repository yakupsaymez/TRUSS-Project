const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middlewares/authMiddleware.js');

const router = express.Router();

// YENI YAKIT KAYDI EKLE
router.post('/', authMiddleware, async (req, res) => {
  const { arac_id, yakit_tipi, tarih, litre, tutar, km, notlar } = req.body;

  // Temel zorunlu alan kontrolu
  if (!arac_id || !tarih || litre === undefined || tutar === undefined) {
    return res.status(400).json({ message: 'Gerekli alanlar eksik.' });
  }

  try {
    const query = `
      INSERT INTO yakitlar (arac_id, yakit_tipi, tarih, litre, tutar, km, notlar)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      arac_id,
      yakit_tipi || null,
      tarih,
      litre,
      tutar,
      km || null,
      notlar || null,
    ]);

    return res.status(201).json({ message: 'Yakit kaydi eklendi', yakit: result.rows[0] });
  } catch (err) {
    // BAŞ MİMAR DOKUNUŞU: Hatayı terminale yazdırıyoruz!
    console.error("🚨 YAKIT EKLEME HATASI DETAYI:", err);
    return res.status(500).json({ message: 'Sunucu hatasi', detay: err.message });
  }
});

// BELIRLI ARACIN TUM YAKIT KAYITLARINI LISTELE
router.get('/arac/:arac_id', authMiddleware, async (req, res) => {
  const { arac_id } = req.params;

  try {
    const query = 'SELECT * FROM yakitlar WHERE arac_id = $1 ORDER BY tarih DESC';
    const result = await pool.query(query, [arac_id]);

    return res.status(200).json({ message: 'Yakit kayitlari listelendi', yakitlar: result.rows });
  } catch (err) {
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
});

// BELIRLI YAKIT KAYDINI SIL
router.delete('/:yakit_id', authMiddleware, async (req, res) => {
  const { yakit_id } = req.params;

  try {
    const result = await pool.query('DELETE FROM yakitlar WHERE yakit_id = $1', [yakit_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Yakit kaydi bulunamadi' });
    }

    return res.status(200).json({ message: 'Yakit kaydi silindi' });
  } catch (err) {
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
});

module.exports = router;

