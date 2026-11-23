const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { ileriTarihMi, tarihStr } = require('../utils/dateUtils');
const { araclariKilitle, aracSayaciniSenkronizeEt, sayacSinirlari, sayacIhlaliMi, sayac422Govdesi, sayacBirimi } = require('../utils/odometerGuard');

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

// YENİ YAKIT KAYDI EKLE (RBAC + Pozitif Değer + Odometer Kronoloji 422 Validasyonu)
const createYakit = async (req, res) => {
  const { arac_id, yakit_tipi, tarih, litre, tutar, km, notlar } = req.body;

  if (!arac_id || !tarih || litre === undefined || litre === '' || tutar === undefined || tutar === '') {
    return res.status(400).json({ message: 'Zorunlu alanlar (arac_id, litre, tutar, tarih) eksik.' });
  }

  const aracId = Number(arac_id);
  if (!Number.isInteger(aracId) || aracId <= 0) {
    return res.status(400).json({ message: 'Geçersiz araç kimliği.' });
  }

  const gun = tarihStr(tarih);
  if (!gun) {
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

  if (sayisalKm !== null && (!Number.isFinite(sayisalKm) || !Number.isInteger(sayisalKm) || sayisalKm < 0)) {
    return res.status(400).json({ message: 'Geçersiz KM / Çalışma Saati değeri.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const aracOwnershipCheck = await client.query(
      `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [aracId, ...params]
    );

    if (aracOwnershipCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Bu aracı duzenlemek icin yetkiniz yoktur.' });
    }

    const [hedefArac] = await araclariKilitle(client, [aracId]);
    if (!hedefArac) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Bu aracı duzenlemek icin yetkiniz yoktur.' });
    }

    // Kronoloji kontrolü: tarihe göre alt/üst sınır (araclar.guncel_* alt sınıra katılmaz)
    if (sayisalKm !== null) {
      const sinirlar = await sayacSinirlari(client, { aracId, tarih: gun });
      if (sayacIhlaliMi(sayisalKm, sinirlar)) {
        await client.query('ROLLBACK');
        return res.status(422).json(sayac422Govdesi(sayisalKm, sinirlar, hedefArac.sayac_tipi));
      }
    }

    const query = `
      INSERT INTO yakitlar (arac_id, yakit_tipi, tarih, litre, tutar, km, notlar)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await client.query(query, [
      aracId,
      yakit_tipi || null,
      gun,
      sayisalLitre,
      sayisalTutar,
      sayisalKm,
      notlar || null,
    ]);

    if (sayisalKm !== null) {
      if (hedefArac.sayac_tipi === 'SMH') {
        await client.query(
          'UPDATE araclar SET guncel_calisma_saati = GREATEST(COALESCE(guncel_calisma_saati, 0), $1) WHERE arac_id = $2',
          [sayisalKm, aracId]
        );
      } else {
        await client.query(
          'UPDATE araclar SET guncel_km = GREATEST(COALESCE(guncel_km, 0), $1) WHERE arac_id = $2',
          [sayisalKm, aracId]
        );
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({ message: 'Yakit kaydi eklendi', yakit: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('Yakıt ekleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    client.release();
  }
};

// BELİRLİ YAKIT KAYDINI GÜNCELLE
const updateYakit = async (req, res) => {
  const { yakit_id } = req.params;
  const { arac_id, yakit_tipi, tarih, litre, tutar, km, notlar } = req.body;

  const yakitId = Number(yakit_id);
  if (!Number.isInteger(yakitId) || yakitId <= 0) {
    return res.status(400).json({ message: 'Geçersiz yakıt kimliği.' });
  }

  if (!tarih || litre === undefined || litre === '' || tutar === undefined || tutar === '') {
    return res.status(400).json({ message: 'Zorunlu alanlar (litre, tutar, tarih) eksik.' });
  }

  const gun = tarihStr(tarih);
  if (!gun) {
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

  if (sayisalKm !== null && (!Number.isFinite(sayisalKm) || !Number.isInteger(sayisalKm) || sayisalKm < 0)) {
    return res.status(400).json({ message: 'Geçersiz KM / Çalışma Saati değeri.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Kaydı kilitle: eşzamanlı güncelleme araya giremez
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const yakitOwnershipCheck = await client.query(
      `SELECT y.yakit_id, y.arac_id, y.km
       FROM yakitlar y
       INNER JOIN araclar a ON y.arac_id = a.arac_id
       WHERE y.yakit_id = $1 AND (${clause})
       FOR UPDATE OF y`,
      [yakitId, ...params]
    );

    if (yakitOwnershipCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Yakit kaydi bulunamadi veya yetkiniz yok.' });
    }

    const kaynakAracId = Number(yakitOwnershipCheck.rows[0].arac_id);
    const eskiKm = yakitOwnershipCheck.rows[0].km;
    const hedefAracId = Number(arac_id || kaynakAracId);
    if (!Number.isInteger(hedefAracId) || hedefAracId <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Geçersiz araç kimliği.' });
    }

    // Hedef araca erişim doğrulaması
    const hedefAracCheck = await client.query(
      `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [hedefAracId, ...params]
    );
    if (hedefAracCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Hedef araca erişim yetkiniz yoktur.' });
    }

    // Kaynak + hedef araçları sıralı kilitle (deadlock koruması) ve sayaç tiplerini al
    const kilitler = await araclariKilitle(client, [kaynakAracId, hedefAracId]);
    const hedefArac = kilitler.find((a) => Number(a.arac_id) === hedefAracId);
    const kaynakArac = kilitler.find((a) => Number(a.arac_id) === kaynakAracId);
    if (!hedefArac) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Hedef araca erişim yetkiniz yoktur.' });
    }

    if (kaynakAracId !== hedefAracId && kaynakArac && kaynakArac.sayac_tipi !== hedefArac.sayac_tipi) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        code: 'SAYAC_TIPI_UYUSMAZ',
        message: 'Kayıt farklı sayaç tipindeki (KM/SMH) bir araca taşınamaz.',
        sayac_tipi: hedefArac.sayac_tipi,
        birim: sayacBirimi(hedefArac.sayac_tipi),
      });
    }

    // Kronoloji kontrolü: güncellenen kayıt hariç, tarihe göre alt/üst sınır
    if (sayisalKm !== null) {
      const sinirlar = await sayacSinirlari(client, {
        aracId: hedefAracId,
        tarih: gun,
        haricTablo: 'yakitlar',
        haricId: yakitId,
      });
      if (sayacIhlaliMi(sayisalKm, sinirlar)) {
        await client.query('ROLLBACK');
        return res.status(422).json(sayac422Govdesi(sayisalKm, sinirlar, hedefArac.sayac_tipi));
      }
    }

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
        gun,
        sayisalLitre,
        sayisalTutar,
        sayisalKm,
        notlar || null,
        yakitId,
      ]
    );

    await aracSayaciniSenkronizeEt(client, {
      aracId: hedefAracId,
      eskiKm: kaynakAracId === hedefAracId ? eskiKm : null,
    });
    if (kaynakAracId !== hedefAracId) {
      await aracSayaciniSenkronizeEt(client, { aracId: kaynakAracId, eskiKm });
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

  const yakitId = Number(yakit_id);
  if (!Number.isInteger(yakitId) || yakitId <= 0) {
    return res.status(400).json({ message: 'Geçersiz yakıt kimliği.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const yakitCheck = await client.query(
      `SELECT y.yakit_id, y.arac_id, y.km
       FROM yakitlar y
       INNER JOIN araclar a ON y.arac_id = a.arac_id
       WHERE y.yakit_id = $1 AND (${clause})
       FOR UPDATE OF y`,
      [yakitId, ...params]
    );

    if (yakitCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Yakit kaydi bulunamadi' });
    }

    const aracId = Number(yakitCheck.rows[0].arac_id);
    const eskiKm = yakitCheck.rows[0].km;

    await araclariKilitle(client, [aracId]);
    await client.query('DELETE FROM yakitlar WHERE yakit_id = $1', [yakitId]);
    await aracSayaciniSenkronizeEt(client, { aracId, eskiKm });

    await client.query('COMMIT');

    return res.status(200).json({ message: 'Yakit kaydi silindi' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('Yakıt silme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllYakitlar,
  getYakitlarByArac,
  createYakit,
  updateYakit,
  deleteYakit,
};

