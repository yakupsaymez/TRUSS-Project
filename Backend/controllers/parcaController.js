const Joi = require('joi');
const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { tarihStr, ileriTarihMi } = require('../utils/dateUtils');
const { araclariKilitle, arsivliAracEngelle } = require('../utils/odometerGuard');
const { logAuditEvent } = require('../services/auditService');

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
const getAracSayacBilgisi = async (aracId, user, db = pool) => {
  const { clause, params } = buildVehicleAccessFilter(user, 2);
  const res = await db.query(
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
      WHERE (${clause}) AND a.arsivlendi_mi = FALSE
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

  let client = null;
  let settled = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const erisim = await client.query(
      `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [value.arac_id, ...params]
    );
    if (erisim.rowCount === 0) {
      return res.status(404).json({ message: 'Arac bulunamadi' });
    }

    const [hedefArac] = await araclariKilitle(client, [value.arac_id]);
    if (!hedefArac) {
      return res.status(404).json({ message: 'Arac bulunamadi' });
    }
    if (await arsivliAracEngelle(client, res, hedefArac, 'parça kaydı')) {
      settled = true;
      return;
    }

    const arac = await getAracSayacBilgisi(value.arac_id, req.user, client);
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

    const result = await client.query(
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

    await client.query('COMMIT');
    settled = true;
    return res.status(201).json({ message: 'Parca takibe alindi', parca: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Bu parca zaten takipte.' });
    }
    console.error('Parça ekleme hatası:', err);
    return res.status(500).json({ message: 'Parca eklenemedi' });
  } finally {
    if (client) {
      if (!settled) await client.query('ROLLBACK').catch(() => null);
      client.release();
    }
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

  let client = null;
  let settled = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const mevcutRes = await client.query(
      `SELECT p.*
       FROM parca_takip p
       INNER JOIN araclar a ON a.arac_id = p.arac_id
       WHERE p.parca_id = $1 AND (${clause})
       FOR UPDATE OF p`,
      [parcaId, ...params]
    );

    if (mevcutRes.rowCount === 0) {
      await client.query('ROLLBACK');
      settled = true;
      return res.status(404).json({ message: 'Parca bulunamadi' });
    }

    const mevcut = mevcutRes.rows[0];
    if (value.arac_id !== undefined && Number(value.arac_id) !== Number(mevcut.arac_id)) {
      return res.status(400).json({
        code: 'PARCA_ARAC_DEGISTIRILEMEZ',
        message: 'Parça kaydının bağlı olduğu araç değiştirilemez.',
      });
    }

    const [hedefArac] = await araclariKilitle(client, [mevcut.arac_id]);
    if (await arsivliAracEngelle(client, res, hedefArac, 'parça kaydı')) {
      settled = true;
      return;
    }

    // Araç değişmez (ADR-09); mevcut aracın yetki + güncel sayacı tek sorguda doğrulanır
    const arac = await getAracSayacBilgisi(mevcut.arac_id, req.user, client);
    if (!arac) {
      return res.status(404).json({ message: 'Arac bulunamadi' });
    }

    // Etkin km kontrolü: km gönderilmediyse mevcut.son_degisim_km araca göre doğrulanır
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

    const result = await client.query(
      `UPDATE parca_takip
       SET parca_adi = $1,
           son_degisim_km = COALESCE($2::int, son_degisim_km),
           degisim_araligi_km = $3,
           son_degisim_tarihi = COALESCE($4::date, son_degisim_tarihi),
           maliyet = $5,
           notlar = $6
       WHERE parca_id = $7
       RETURNING *`,
      [
        yeniParcaAdi,
        yeniSonDegisimKmParam,
        yeniAralikKm,
        tarihDb,
        yeniMaliyet,
        yeniNotlar,
        parcaId,
      ]
    );

    await client.query('COMMIT');
    settled = true;
    return res.status(200).json({ message: 'Parca kaydi guncellendi', parca: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Bu araçta aynı isimli parça zaten mevcut.' });
    }
    console.error('Parça güncelleme hatası:', err);
    return res.status(500).json({ message: 'Parca guncellenemedi' });
  } finally {
    if (client) {
      if (!settled) await client.query('ROLLBACK').catch(() => null);
      client.release();
    }
  }
};

// PARÇA TAKİP KAYDINI SİL
const deleteParca = async (req, res) => {
  const parcaId = Number(req.params.parca_id);
  if (!Number.isInteger(parcaId) || parcaId <= 0) {
    return res.status(400).json({ message: 'Gecersiz parca id' });
  }

  let client = null;
  let settled = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const parcaCheck = await client.query(
      `SELECT p.parca_id, p.arac_id, p.parca_adi, p.maliyet, a.plaka, a.org_id
       FROM parca_takip p
       INNER JOIN araclar a ON a.arac_id = p.arac_id
       WHERE p.parca_id = $1 AND (${clause})
       FOR UPDATE OF p`,
      [parcaId, ...params]
    );

    if (parcaCheck.rowCount === 0) {
      return res.status(404).json({ message: 'Parca bulunamadi' });
    }

    const row = parcaCheck.rows[0];
    const [hedefArac] = await araclariKilitle(client, [row.arac_id]);
    if (await arsivliAracEngelle(client, res, hedefArac, 'parça kaydı', 'silinemez')) {
      settled = true;
      return;
    }

    await client.query('DELETE FROM parca_takip WHERE parca_id = $1', [parcaId]);
    await client.query('COMMIT');
    settled = true;

    await logAuditEvent(req, {
      eylem: 'PARCA_SILINDI',
      varlik_tipi: 'parca',
      varlik_id: parcaId,
      org_id: row.org_id,
      ozet: `${row.plaka} plakalı aracın ${row.parca_adi} parça kaydı silindi.`,
      detay: { plaka: row.plaka, parca_adi: row.parca_adi, maliyet: row.maliyet },
    });

    return res.status(200).json({ message: 'Parca kaydi silindi' });
  } catch (err) {
    console.error('Parça silme hatası:', err);
    return res.status(500).json({ message: 'Parca silinemedi' });
  } finally {
    if (client) {
      if (!settled) await client.query('ROLLBACK').catch(() => null);
      client.release();
    }
  }
};

module.exports = {
  getAllParcalar,
  getParcalarByArac,
  createParca,
  updateParca,
  deleteParca,
};
