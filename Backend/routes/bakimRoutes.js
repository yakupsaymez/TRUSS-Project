const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middlewares/authMiddleware.js');

const router = express.Router();

// YENI BAKIM KAYDI EKLE
router.post('/', authMiddleware, async (req, res) => {
  const { arac_id, bakim_tipi, tarih, km, maliyet, notlar } = req.body;
  const kullanici_id = req.user?.user_id;

  // Temel zorunlu alan kontrolu
  if (!arac_id || !bakim_tipi || !tarih || km === undefined || maliyet === undefined) {
    return res.status(400).json({ message: 'Gerekli alanlar eksik.' });
  }

  try {
    // SAHİPLİK KONTROL: Araç bu kullanıcıya ait mi?
    const aracOwnershipCheck = await pool.query(
      'SELECT arac_id FROM araclar WHERE arac_id = $1 AND kullanici_id = $2',
      [arac_id, kullanici_id]
    );

    if (aracOwnershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Bu aracı duzenlemek icin yetkiniz yoktur.' });
    }

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
  const kullanici_id = req.user?.user_id;

  try {
    // SAHİPLİK KONTROL: Silinecek bakım bu kullanıcıya ait aracın mı?
    const bakimOwnershipCheck = await pool.query(
      'SELECT b.bakim_id FROM bakimlar b INNER JOIN araclar a ON b.arac_id = a.arac_id WHERE b.bakim_id = $1 AND a.kullanici_id = $2',
      [bakim_id, kullanici_id]
    );

    if (bakimOwnershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Bu kayidi silmek icin yetkiniz yoktur.' });
    }

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

