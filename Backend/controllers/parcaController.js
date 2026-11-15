const Joi = require('joi');
const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');

const parcaEkleSchema = Joi.object({
  arac_id: Joi.number().integer().required(),
  parca_adi: Joi.string().min(2).max(120).required(),
  son_degisim_km: Joi.number().integer().min(0).required(),
  degisim_araligi_km: Joi.number().integer().min(0).allow(null, '').optional(),
  son_degisim_tarihi: Joi.date().iso().required(),
});

const parcaGuncelleSchema = Joi.object({
  arac_id: Joi.number().integer().optional(),
  parca_adi: Joi.string().min(2).max(120).optional(),
  son_degisim_km: Joi.number().integer().min(0).required(),
  degisim_araligi_km: Joi.number().integer().min(0).allow(null, '').optional(),
  son_degisim_tarihi: Joi.date().iso().required(),
});

// KULLANICININ ERİŞEBİLDİĞİ TÜM PARÇA TAKİP KAYITLARINI LİSTELE (RBAC Filtreli)
const getAllParcalar = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const query = `
      SELECT
        p.*,
        a.plaka,
        a.marka,
        a.model,
        a.sayac_tipi,
        GREATEST(
          COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
          COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = a.arac_id), 0),
          COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0),
          COALESCE(p.son_degisim_km, 0)
        ) AS guncel_km
      FROM parca_takip p
      INNER JOIN araclar a ON a.arac_id = p.arac_id
      WHERE ${clause}
      ORDER BY a.plaka ASC, p.parca_adi ASC
    `;
    const result = await pool.query(query, params);
    return res.status(200).json({ message: 'Parçalar listelendi', parcalar: result.rows });
  } catch (err) {
    console.error('Parça listeleme hatası:', err);
    return res.status(500).json({ message: 'Parca listesi alinamadi' });
  }
};

// BELİRLİ ARACIN PARÇA TAKİP KAYITLARINI LİSTELE (RBAC Filtreli)
const getParcalarByArac = async (req, res) => {
  const aracId = Number(req.params.arac_id);
  if (!Number.isInteger(aracId)) {
    return res.status(400).json({ message: 'Gecersiz arac id' });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const sahiplik = await pool.query(
      `SELECT 1 FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [aracId, ...params]
    );

    if (sahiplik.rowCount === 0) {
      return res.status(404).json({ message: 'Arac bulunamadi' });
    }

    const query = `
      SELECT
        p.*,
        a.plaka,
        a.marka,
        a.model,
        a.sayac_tipi,
        GREATEST(
          COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
          COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = a.arac_id), 0),
          COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0),
          COALESCE(p.son_degisim_km, 0)
        ) AS guncel_km
      FROM parca_takip p
      INNER JOIN araclar a ON a.arac_id = p.arac_id
      WHERE p.arac_id = $1 AND (${clause})
      ORDER BY p.parca_adi ASC
    `;
    const result = await pool.query(query, [aracId, ...params]);

    return res.status(200).json({ parcalar: result.rows });
  } catch (err) {
    console.error('Araç parçaları listeleme hatası:', err);
    return res.status(500).json({ message: 'Parca listesi alinamadi' });
  }
};

// YENİ PARÇA TAKİP KAYDI EKLE
const createParca = async (req, res) => {
  const rawTarih = req.body.son_degisim_tarihi || req.body.tarih;
  const bugun = new Date().toISOString().slice(0, 10);
  if (rawTarih && String(rawTarih).slice(0, 10) > bugun) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  const { error, value } = parcaEkleSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const secilenTarihStr = new Date(value.son_degisim_tarihi).toISOString().slice(0, 10);
  if (secilenTarihStr > bugun) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const sahiplik = await pool.query(
      `SELECT 1 FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [value.arac_id, ...params]
    );

    if (sahiplik.rowCount === 0) {
      return res.status(404).json({ message: 'Arac bulunamadi' });
    }

    const aralikKm =
      value.degisim_araligi_km === '' || value.degisim_araligi_km === undefined
        ? null
        : value.degisim_araligi_km;

    const result = await pool.query(
      `INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, degisim_araligi_km, son_degisim_tarihi)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [value.arac_id, value.parca_adi, value.son_degisim_km, aralikKm, value.son_degisim_tarihi]
    );

    return res.status(201).json({ message: 'Parca takibe alindi', parca: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Bu parca zaten takipte.' });
    }
    console.error('Parça ekleme hatası:', err);
    return res.status(500).json({ message: 'Parca eklenemedi' });
  }
};

// PARÇA TAKİP KAYDINI GÜNCELLE
const updateParca = async (req, res) => {
  const parcaId = Number(req.params.parca_id);
  if (!Number.isInteger(parcaId)) {
    return res.status(400).json({ message: 'Gecersiz parca id' });
  }

  const rawTarih = req.body.son_degisim_tarihi || req.body.tarih;
  const bugun = new Date().toISOString().slice(0, 10);
  if (rawTarih && String(rawTarih).slice(0, 10) > bugun) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  const { error, value } = parcaGuncelleSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const secilenTarihStr = new Date(value.son_degisim_tarihi).toISOString().slice(0, 10);
  if (secilenTarihStr > bugun) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const mevcutRes = await pool.query(
      `SELECT p.*
       FROM parca_takip p
       INNER JOIN araclar a ON a.arac_id = p.arac_id
       WHERE p.parca_id = $1 AND (${clause})`,
      [parcaId, ...params]
    );

    if (mevcutRes.rowCount === 0) {
      return res.status(404).json({ message: 'Parca bulunamadi' });
    }

    const mevcut = mevcutRes.rows[0];
    const yeniParcaAdi = value.parca_adi !== undefined ? value.parca_adi : mevcut.parca_adi;
    const yeniAralikKm =
      value.degisim_araligi_km === undefined
        ? mevcut.degisim_araligi_km
        : value.degisim_araligi_km === ''
          ? null
          : value.degisim_araligi_km;

    const result = await pool.query(
      `UPDATE parca_takip
       SET parca_adi = $1,
           son_degisim_km = $2,
           degisim_araligi_km = $3,
           son_degisim_tarihi = $4
       WHERE parca_id = $5
       RETURNING *`,
      [yeniParcaAdi, value.son_degisim_km, yeniAralikKm, value.son_degisim_tarihi, parcaId]
    );

    return res.status(200).json({ message: 'Parca kaydi guncellendi', parca: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Bu araçta aynı isimli parça zaten mevcut.' });
    }
    console.error('Parça güncelleme hatası:', err);
    return res.status(500).json({ message: 'Parca guncellenemedi' });
  }
};

// PARÇA TAKİP KAYDINI SİL
const deleteParca = async (req, res) => {
  const parcaId = Number(req.params.parca_id);
  if (!Number.isInteger(parcaId)) {
    return res.status(400).json({ message: 'Gecersiz parca id' });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const result = await pool.query(
      `DELETE FROM parca_takip p
       USING araclar a
       WHERE p.arac_id = a.arac_id
         AND p.parca_id = $1
         AND (${clause})
       RETURNING p.parca_id`,
      [parcaId, ...params]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Parca bulunamadi' });
    }

    return res.status(200).json({ message: 'Parca kaydi silindi' });
  } catch (err) {
    console.error('Parça silme hatası:', err);
    return res.status(500).json({ message: 'Parca silinemedi' });
  }
};

module.exports = {
  getAllParcalar,
  getParcalarByArac,
  createParca,
  updateParca,
  deleteParca,
};

