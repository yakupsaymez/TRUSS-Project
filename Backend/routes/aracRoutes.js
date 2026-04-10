const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middlewares/authMiddleware.js');
const Joi = require('joi');

const router = express.Router();

const varsayilanParcalar = [
  { parca_adi: 'Motor Yağı', degisim_araligi_km: 10000 },
  { parca_adi: 'Yağ Filtresi', degisim_araligi_km: 10000 },
  { parca_adi: 'Hava Filtresi', degisim_araligi_km: 10000 },
  { parca_adi: 'Polen Filtresi', degisim_araligi_km: 10000 },
  { parca_adi: 'Fren Balataları', degisim_araligi_km: 30000 },
  { parca_adi: 'Triger Kayışı', degisim_araligi_km: 80000 },
  { parca_adi: 'Akü', degisim_araligi_km: null },
  { parca_adi: 'Lastikler', degisim_araligi_km: null }
];

// Merkezi Araç Gümrük Kuralları
const aracSchema = Joi.object({
  plaka: Joi.string().min(5).max(11).required(),
  marka: Joi.string().min(2).required(),
  model: Joi.string().min(2).required(),
  yil: Joi.number().integer().min(1950).max(2026).required(),
  muayene_tarihi: Joi.date().iso().optional().allow(null),
  kasko_tarihi: Joi.date().iso().optional().allow(null),
  sigorta_tarihi: Joi.date().iso().optional().allow(null),
});

// ARAÇ EKLE
router.post('/ekle', authMiddleware, async (req, res) => {
  const { error, value } = aracSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { plaka, marka, model, yil, muayene_tarihi, kasko_tarihi, sigorta_tarihi } = value;
  const kullanici_id = req.user?.user_id;

  try {
    const query = `INSERT INTO araclar (plaka, marka, model, yil, kullanici_id, muayene_tarihi, kasko_tarihi, sigorta_tarihi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
    const result = await pool.query(query, [plaka, marka, model, yil, kullanici_id, muayene_tarihi || null, kasko_tarihi || null, sigorta_tarihi || null]);

    const aracId = result.rows[0].arac_id;
    await Promise.all(varsayilanParcalar.map((parca) => pool.query(
        `INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, degisim_araligi_km, son_degisim_tarihi)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       ON CONFLICT (arac_id, parca_adi) DO NOTHING`,
        [aracId, parca.parca_adi, 0, parca.degisim_araligi_km]
    )));

    res.status(201).json({ message: 'Araç eklendi', arac: result.rows[0] });
  } catch (err) {
    console.error("Araç Ekleme Hatası:", err); // RADAR EKLENDİ
    if (err.code === '23505') return res.status(409).json({ message: 'Bu plaka zaten kayıtlı.' });
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ARAÇLARI LİSTELE (MİMAR TARAFINDAN DÜZELTİLEN KISIM BURASI)
router.get('/', authMiddleware, async (req, res) => {
  const kullanici_id = req.user?.user_id;
  try {
    const result = await pool.query(
        `SELECT a.*, u.telefon, u.email_bildirim_aktif
       FROM araclar a
       INNER JOIN users u ON u.user_id = a.kullanici_id
       WHERE a.kullanici_id = $1
       ORDER BY a.arac_id DESC`,
        [kullanici_id]
    );
    res.status(200).json({ message: 'Araçlar listelendi', araclar: result.rows });
  } catch (err) {
    console.error("Araç Listeleme Hatası (İşte Suçlu!):", err); // RADAR EKLENDİ
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
    console.error("Araç Silme Hatası:", err); // RADAR EKLENDİ
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ARAÇ GÜNCELLE
router.put('/:arac_id', authMiddleware, async (req, res) => {
  const { error, value } = aracSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { arac_id } = req.params;
  const { plaka, marka, model, yil, muayene_tarihi, kasko_tarihi, sigorta_tarihi } = value;

  try {
    const query = `UPDATE araclar SET plaka = $1, marka = $2, model = $3, yil = $4, muayene_tarihi = $5, kasko_tarihi = $6, sigorta_tarihi = $7 WHERE arac_id = $8 RETURNING *`;
    const result = await pool.query(query, [plaka, marka, model, yil, muayene_tarihi || null, kasko_tarihi || null, sigorta_tarihi || null, arac_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Araç bulunamadı' });
    res.status(200).json({ message: 'Araç güncellendi', arac: result.rows[0] });
  } catch (err) {
    console.error("Araç Güncelleme Hatası:", err); // RADAR EKLENDİ
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;