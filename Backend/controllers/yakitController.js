const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { ileriTarihMi, tarihStr } = require('../utils/dateUtils');

// KULLANICININ ERİŞEBİLDİĞİ TÜM YAKIT KAYITLARINI LİSTELE (RBAC Filtreli)
const getAllYakitlar = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const query = `
      SELECT y.*, a.plaka, a.marka, a.model, a.sayac_tipi
      FROM yakitlar y
      INNER JOIN araclar a ON a.arac_id = y.arac_id
      WHERE ${clause}
      ORDER BY y.tarih DESC, y.yakit_id DESC
    `;
    const result = await pool.query(query, params);
    return res.status(200).json({ message: 'Yakit kayitlari listelendi', yakitlar: result.rows });
  } catch (err) {
    console.error('Yakıt listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// BELİRLİ ARACIN TÜM YAKIT KAYITLARINI LİSTELE (RBAC Filtreli)
const getYakitlarByArac = async (req, res) => {
  const { arac_id } = req.params;

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const sahiplik = await pool.query(
      `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [arac_id, ...params]
    );

    if (sahiplik.rowCount === 0) {
      return res.status(403).json({ message: 'Bu araca erişim yetkiniz yoktur.' });
    }

    const query = `
      SELECT y.*, a.plaka, a.marka, a.model, a.sayac_tipi
      FROM yakitlar y
      INNER JOIN araclar a ON a.arac_id = y.arac_id
      WHERE y.arac_id = $1 AND (${clause})
      ORDER BY y.tarih DESC, y.yakit_id DESC
    `;
    const result = await pool.query(query, [arac_id, ...params]);

    return res.status(200).json({ message: 'Yakit kayitlari listelendi', yakitlar: result.rows });
  } catch (err) {
    console.error('Araç yakıt kayıtları listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// YENİ YAKIT KAYDI EKLE (RBAC + Pozitif Değer + Odometer Rollback 422 Validasyonu)
const createYakit = async (req, res) => {
  const { arac_id, yakit_tipi, tarih, litre, tutar, km, notlar } = req.body;

  if (!arac_id || !tarih || litre === undefined || litre === '' || tutar === undefined || tutar === '') {
    return res.status(400).json({ message: 'Zorunlu alanlar (arac_id, litre, tutar, tarih) eksik.' });
  }

  if (!tarihStr(tarih)) {
    return res.status(400).json({ message: 'Geçersiz tarih formatı.' });
  }

  if (ileriTarihMi(tarih)) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  const sayisalLitre = Number(litre);
  const sayisalTutar = Number(tutar);
  const sayisalKm = km !== undefined && km !== '' && km !== null ? Number(km) : null;

  if (!Number.isFinite(sayisalLitre) || sayisalLitre <= 0 || !Number.isFinite(sayisalTutar) || sayisalTutar <= 0) {
    return res.status(400).json({ message: 'Girilen litre ve tutar değerleri 0\'dan büyük olmalıdır.' });
  }

  if (sayisalKm !== null && (!Number.isFinite(sayisalKm) || sayisalKm < 0)) {
    return res.status(400).json({ message: 'Geçersiz KM / Çalışma Saati değeri.' });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const aracOwnershipCheck = await pool.query(
      `SELECT a.arac_id, a.sayac_tipi, a.guncel_km, a.guncel_calisma_saati
       FROM araclar a
       WHERE a.arac_id = $1 AND (${clause})`,
      [arac_id, ...params]
    );

    if (aracOwnershipCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Bu aracı duzenlemek icin yetkiniz yoktur.' });
    }

    const aracRow = aracOwnershipCheck.rows[0];

    // KM / SMH Düşürme (Odometer Rollback) Kontrolü
    if (sayisalKm !== null) {
      const kmCheck = await pool.query(
        `SELECT GREATEST(
           COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = $1 AND tarih <= $2), 0),
           COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = $1 AND tarih <= $2), 0),
           COALESCE($3::int, 0)
         ) AS max_gecmis_km`,
        [
          Number(arac_id),
          tarih,
          aracRow.sayac_tipi === 'SMH' ? aracRow.guncel_calisma_saati : aracRow.guncel_km,
        ]
      );

      const maxGecmisKm = Number(kmCheck.rows[0]?.max_gecmis_km || 0);
      if (sayisalKm < maxGecmisKm) {
        const birimEtiketi = aracRow.sayac_tipi === 'SMH' ? 'Saat' : 'km';
        return res.status(422).json({
          message: `Girilen sayaç değeri (${sayisalKm.toLocaleString('tr-TR')} ${birimEtiketi}), aracın mevcut/önceki kayıtlı değerinden (${maxGecmisKm.toLocaleString('tr-TR')} ${birimEtiketi}) düşük olamaz.`,
        });
      }
    }

    const query = `
      INSERT INTO yakitlar (arac_id, yakit_tipi, tarih, litre, tutar, km, notlar)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      Number(arac_id),
      yakit_tipi || null,
      tarih,
      sayisalLitre,
      sayisalTutar,
      sayisalKm,
      notlar || null,
    ]);

    if (sayisalKm !== null) {
      if (aracRow.sayac_tipi === 'SMH') {
        await pool.query(
          'UPDATE araclar SET guncel_calisma_saati = GREATEST(COALESCE(guncel_calisma_saati, 0), $1) WHERE arac_id = $2',
          [sayisalKm, Number(arac_id)]
        );
      } else {
        await pool.query(
          'UPDATE araclar SET guncel_km = GREATEST(COALESCE(guncel_km, 0), $1) WHERE arac_id = $2',
          [sayisalKm, Number(arac_id)]
        );
      }
    }

    return res.status(201).json({ message: 'Yakit kaydi eklendi', yakit: result.rows[0] });
  } catch (err) {
    console.error('🚨 YAKIT EKLEME HATASI DETAYI:', err);
    return res.status(500).json({ message: 'Sunucu hatasi', detay: err.message });
  }
};

// BELİRLİ YAKIT KAYDINI GÜNCELLE
const updateYakit = async (req, res) => {
  const { yakit_id } = req.params;
  const { arac_id, yakit_tipi, tarih, litre, tutar, km, notlar } = req.body;

  if (!tarih || litre === undefined || litre === '' || tutar === undefined || tutar === '') {
    return res.status(400).json({ message: 'Zorunlu alanlar (litre, tutar, tarih) eksik.' });
  }

  if (!tarihStr(tarih)) {
    return res.status(400).json({ message: 'Geçersiz tarih formatı.' });
  }

  if (ileriTarihMi(tarih)) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  const sayisalLitre = Number(litre);
  const sayisalTutar = Number(tutar);
  const sayisalKm = km !== undefined && km !== '' && km !== null ? Number(km) : null;

  if (!Number.isFinite(sayisalLitre) || sayisalLitre <= 0 || !Number.isFinite(sayisalTutar) || sayisalTutar <= 0) {
    return res.status(400).json({ message: 'Girilen litre ve tutar değerleri 0\'dan büyük olmalıdır.' });
  }

  if (sayisalKm !== null && (!Number.isFinite(sayisalKm) || sayisalKm < 0)) {
    return res.status(400).json({ message: 'Geçersiz KM / Çalışma Saati değeri.' });
  }

  const client = await pool.connect();
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const yakitOwnershipCheck = await client.query(
      `SELECT y.yakit_id, y.arac_id
       FROM yakitlar y
       INNER JOIN araclar a ON y.arac_id = a.arac_id
       WHERE y.yakit_id = $1 AND (${clause})`,
      [yakit_id, ...params]
    );

    if (yakitOwnershipCheck.rowCount === 0) {
      return res.status(404).json({ message: 'Yakit kaydi bulunamadi veya yetkiniz yok.' });
    }

    const hedefAracId = arac_id ? Number(arac_id) : yakitOwnershipCheck.rows[0].arac_id;

    // Hedef araca erişim + sayaç tipi (araç değişmese de tek sorguda doğrulanır)
    const hedefAracCheck = await client.query(
      `SELECT a.arac_id, a.sayac_tipi FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [hedefAracId, ...params]
    );
    if (hedefAracCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Hedef araca erişim yetkiniz yoktur.' });
    }
    const aracRow = hedefAracCheck.rows[0];

    // KM / SMH Düşürme (Odometer Rollback) Kontrolü: güncellenen kaydın kendisi hariç, ilgili tarihe kadarki en yüksek sayaç
    if (sayisalKm !== null) {
      const kmCheck = await client.query(
        `SELECT GREATEST(
           COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = $1 AND tarih <= $2 AND yakit_id <> $3), 0),
           COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = $1 AND tarih <= $2), 0)
         ) AS max_gecmis_km`,
        [hedefAracId, tarih, yakit_id]
      );

      const maxGecmisKm = Number(kmCheck.rows[0]?.max_gecmis_km || 0);
      if (sayisalKm < maxGecmisKm) {
        const birimEtiketi = aracRow.sayac_tipi === 'SMH' ? 'Saat' : 'km';
        return res.status(422).json({
          message: `Girilen sayaç değeri (${sayisalKm.toLocaleString('tr-TR')} ${birimEtiketi}), aracın önceki kayıtlı değerinden (${maxGecmisKm.toLocaleString('tr-TR')} ${birimEtiketi}) düşük olamaz.`,
        });
      }
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE yakitlar
       SET arac_id = $1,
           yakit_tipi = $2,
           tarih = $3,
           litre = $4,
           tutar = $5,
           km = $6,
           notlar = $7
       WHERE yakit_id = $8
       RETURNING *`,
      [
        hedefAracId,
        yakit_tipi || null,
        tarih,
        sayisalLitre,
        sayisalTutar,
        sayisalKm,
        notlar || null,
        yakit_id,
      ]
    );

    // araclar sayacını GREATEST ile yeniden senkronize et
    if (sayisalKm !== null) {
      await client.query(
        `UPDATE araclar a
         SET guncel_km = CASE WHEN a.sayac_tipi = 'SMH'
                              THEN a.guncel_km
                              ELSE GREATEST(COALESCE(a.guncel_km, 0), s.max_km) END,
             guncel_calisma_saati = CASE WHEN a.sayac_tipi = 'SMH'
                                         THEN GREATEST(COALESCE(a.guncel_calisma_saati, 0), s.max_km)
                                         ELSE a.guncel_calisma_saati END
         FROM (
           SELECT GREATEST(
             COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = $1), 0),
             COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = $1), 0)
           ) AS max_km
         ) s
         WHERE a.arac_id = $1`,
        [hedefAracId]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({ message: 'Yakit kaydi guncellendi', yakit: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('Yakıt güncelleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    client.release();
  }
};

// BELİRLİ YAKIT KAYDINI SİL
const deleteYakit = async (req, res) => {
  const { yakit_id } = req.params;

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const result = await pool.query(
      `DELETE FROM yakitlar y
       USING araclar a
       WHERE y.arac_id = a.arac_id
         AND y.yakit_id = $1
         AND (${clause})
       RETURNING y.yakit_id`,
      [yakit_id, ...params]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Yakit kaydi bulunamadi' });
    }

    return res.status(200).json({ message: 'Yakit kaydi silindi' });
  } catch (err) {
    console.error('Yakıt silme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

module.exports = {
  getAllYakitlar,
  getYakitlarByArac,
  createYakit,
  updateYakit,
  deleteYakit,
};

