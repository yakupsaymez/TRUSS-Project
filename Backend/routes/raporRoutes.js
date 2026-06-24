const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/raporlar/arac-giderleri
// Kullanıcının tüm araçları için toplam yakıt ve bakım giderlerini tek sorguda döner.
router.get('/arac-giderleri', authMiddleware, async (req, res) => {
  const kullanici_id = req.user?.user_id;

  try {
    const query = `
      SELECT
        a.arac_id,
        a.plaka,
        COALESCE(y.toplam_yakit, 0) AS toplam_yakit,
        COALESCE(b.toplam_bakim, 0) AS toplam_bakim
      FROM araclar a
      LEFT JOIN (
        SELECT arac_id, SUM(tutar) AS toplam_yakit
        FROM yakitlar
        GROUP BY arac_id
      ) y ON y.arac_id = a.arac_id
      LEFT JOIN (
        SELECT arac_id, SUM(maliyet) AS toplam_bakim
        FROM bakimlar
        GROUP BY arac_id
      ) b ON b.arac_id = a.arac_id
      WHERE a.kullanici_id = $1
      ORDER BY a.plaka
    `;

    const result = await pool.query(query, [kullanici_id]);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('RAPOR ARAC-GIDERLERI HATASI:', err);
    return res.status(500).json({ message: 'Sunucu hatası', detay: err.message });
  }
});

// GET /api/raporlar/aylik-ozet
// Son 6 aya ait toplam yakıt ve bakım giderlerini ay bazında döner.
router.get('/aylik-ozet', authMiddleware, async (req, res) => {
  const kullanici_id = req.user?.user_id;

  try {
    const query = `
      WITH months AS (
        SELECT TO_CHAR(date_trunc('month', CURRENT_DATE - (n || ' months')::interval), 'YYYY-MM') AS ay
        FROM generate_series(0, 5) AS n
      ),
      yakit_aylik AS (
        SELECT TO_CHAR(date_trunc('month', y.tarih), 'YYYY-MM') AS ay,
               SUM(y.tutar) AS toplam_yakit
        FROM yakitlar y
        JOIN araclar a ON a.arac_id = y.arac_id
        WHERE a.kullanici_id = $1
          AND y.tarih >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY 1
      ),
      bakim_aylik AS (
        SELECT TO_CHAR(date_trunc('month', b.tarih), 'YYYY-MM') AS ay,
               SUM(b.maliyet) AS toplam_bakim
        FROM bakimlar b
        JOIN araclar a ON a.arac_id = b.arac_id
        WHERE a.kullanici_id = $1
          AND b.tarih >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY 1
      )
      SELECT m.ay,
             COALESCE(y.toplam_yakit, 0) AS toplam_yakit,
             COALESCE(b.toplam_bakim, 0) AS toplam_bakim
      FROM months m
      LEFT JOIN yakit_aylik y ON y.ay = m.ay
      LEFT JOIN bakim_aylik b ON b.ay = m.ay
      ORDER BY m.ay ASC
    `;

    const result = await pool.query(query, [kullanici_id]);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('RAPOR AYLIK-OZET HATASI:', err);
    return res.status(500).json({ message: 'Sunucu hatası', detay: err.message });
  }
});

module.exports = router;
