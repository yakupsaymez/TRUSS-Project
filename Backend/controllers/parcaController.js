const Joi = require('joi');
const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { tarihStr, ileriTarihMi } = require('../utils/dateUtils');

const parcaEkleSchema = Joi.object({
  arac_id: Joi.number().integer().required(),
  parca_adi: Joi.string().min(2).max(120).required(),
  son_degisim_km: Joi.number().integer().min(0).required(),
  degisim_araligi_km: Joi.number().integer().min(0).allow(null, '').optional(),
  son_degisim_tarihi: Joi.date().iso().required(),
  maliyet: Joi.number().min(0).optional().allow(null),
  notlar: Joi.string().max(1000).optional().allow(null, ''),
});

const parcaGuncelleSchema = Joi.object({
  arac_id: Joi.number().integer().optional(),
  parca_adi: Joi.string().min(2).max(120).optional(),
  son_degisim_km: Joi.number().integer().min(0).optional(),
  degisim_araligi_km: Joi.number().integer().min(0).allow(null, '').optional(),
  son_degisim_tarihi: Joi.date().iso().optional(),
  maliyet: Joi.number().min(0).optional().allow(null),
  notlar: Joi.string().max(1000).optional().allow(null, ''),
}).min(1);

// Sayaç tipine göre birim etiketi ('SMH' ise saat, değilse km)
const sayacBirimi = (sayacTipi) => (sayacTipi === 'SMH' ? 'saat' : 'km');

// Erişim yetkisi + aracın güncel sayacı (araç sayacı, bakım ve yakıt kayıtlarının maksimumu) — tek sorgu
const getAracSayacBilgisi = async (aracId, user) => {
  const { clause, params } = buildVehicleAccessFilter(user, 2);
  const res = await pool.query(
    `SELECT
       a.arac_id,
       a.sayac_tipi,
       GREATEST(
         COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
         COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = a.arac_id), 0),
         COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0)
       )::int AS guncel_sayac
     FROM araclar a
     WHERE a.arac_id = $1 AND (${clause})`,
    [aracId, ...params]
  );
  return res.rows[0] || null;
};

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
          COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0)
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
          COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0)
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
  const { error, value } = parcaEkleSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // Tarih kontrolü Joi sonrası tek sefer yapılır (Türkiye takvim günü)
  if (ileriTarihMi(req.body.son_degisim_tarihi)) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }
  const tarihDb = tarihStr(req.body.son_degisim_tarihi);
  if (tarihDb === null) {
    return res.status(400).json({ message: 'Geçersiz tarih.' });
  }

  try {
    const arac = await getAracSayacBilgisi(value.arac_id, req.user);
    if (!arac) {
      return res.status(404).json({ message: 'Arac bulunamadi' });
    }

    if (value.son_degisim_km > arac.guncel_sayac) {
      const birim = sayacBirimi(arac.sayac_tipi);
      return res.status(422).json({
        message: `Son değişim sayacı (${value.son_degisim_km} ${birim}), aracın güncel sayacından (${arac.guncel_sayac} ${birim}) büyük olamaz.`,
        guncel_sayac: arac.guncel_sayac,
        sayac_tipi: arac.sayac_tipi,
        birim,
      });
    }

    const aralikKm =
      value.degisim_araligi_km === '' || value.degisim_araligi_km === undefined
        ? null
        : value.degisim_araligi_km;
    const maliyet = value.maliyet === undefined || value.maliyet === null ? 0 : value.maliyet;
    const notlar = value.notlar === undefined || value.notlar === '' ? null : value.notlar;

    const result = await pool.query(
      `INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, degisim_araligi_km, son_degisim_tarihi, maliyet, notlar)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        value.arac_id,
        value.parca_adi,
        value.son_degisim_km,
        aralikKm,
        tarihDb,
        maliyet,
        notlar,
      ]
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

  const { error, value } = parcaGuncelleSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // Tarih yalnızca gönderildiyse doğrulanır (gönderilmediyse SQL COALESCE ile DB değeri korunur)
  let tarihDb = null;
  if (req.body.son_degisim_tarihi !== undefined) {
    tarihDb = tarihStr(req.body.son_degisim_tarihi);
    if (tarihDb === null) {
      return res.status(400).json({ message: 'Geçersiz tarih.' });
    }
    if (ileriTarihMi(req.body.son_degisim_tarihi)) {
      return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
    }
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
    const yeniAracId = value.arac_id !== undefined ? value.arac_id : mevcut.arac_id;

    // Hedef araç (değişmiş olsa dahi) için yetki + güncel sayaç tek sorguda doğrulanır
    const arac = await getAracSayacBilgisi(yeniAracId, req.user);
    if (!arac) {
      return res.status(404).json({ message: 'Arac bulunamadi' });
    }

    // Etkin km kontrolü: km gönderilmediyse mevcut.son_degisim_km hedef araca göre doğrulanır
    const etkinKm = value.son_degisim_km !== undefined ? value.son_degisim_km : mevcut.son_degisim_km;
    if (etkinKm !== null && etkinKm !== undefined && etkinKm > arac.guncel_sayac) {
      const birim = sayacBirimi(arac.sayac_tipi);
      return res.status(422).json({
        message: `Son değişim sayacı (${etkinKm} ${birim}), aracın güncel sayacından (${arac.guncel_sayac} ${birim}) büyük olamaz.`,
        guncel_sayac: arac.guncel_sayac,
        sayac_tipi: arac.sayac_tipi,
        birim,
      });
    }

    const yeniParcaAdi = value.parca_adi !== undefined ? value.parca_adi : mevcut.parca_adi;
    const yeniSonDegisimKmParam = value.son_degisim_km !== undefined ? value.son_degisim_km : null;
    const yeniAralikKm =
      value.degisim_araligi_km === undefined
        ? mevcut.degisim_araligi_km
        : value.degisim_araligi_km === ''
          ? null
          : value.degisim_araligi_km;
    const yeniMaliyet =
      value.maliyet === undefined ? mevcut.maliyet : value.maliyet === null ? 0 : value.maliyet;
    const yeniNotlar =
      value.notlar === undefined ? mevcut.notlar : value.notlar === '' ? null : value.notlar;

    const result = await pool.query(
      `UPDATE parca_takip
       SET arac_id = $1,
           parca_adi = $2,
           son_degisim_km = COALESCE($3::int, son_degisim_km),
           degisim_araligi_km = $4,
           son_degisim_tarihi = COALESCE($5::date, son_degisim_tarihi),
           maliyet = $6,
           notlar = $7
       WHERE parca_id = $8
       RETURNING *`,
      [
        yeniAracId,
        yeniParcaAdi,
        yeniSonDegisimKmParam,
        yeniAralikKm,
        tarihDb,
        yeniMaliyet,
        yeniNotlar,
        parcaId,
      ]
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
