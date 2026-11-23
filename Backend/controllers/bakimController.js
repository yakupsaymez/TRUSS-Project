const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { ileriTarihMi, tarihStr } = require('../utils/dateUtils');
const {
  araclariKilitle,
  sayacSinirlari,
  sayacIhlaliMi,
  sayac422Govdesi,
  sayacBirimi,
} = require('../utils/odometerGuard');

// KULLANICININ ERİŞEBİLDİĞİ TÜM BAKIMLARI LİSTELE (RBAC Filtreli)
const getAllBakimlar = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const query = `
      SELECT b.*, a.plaka, a.marka, a.model, a.sayac_tipi
      FROM bakimlar b
      INNER JOIN araclar a ON a.arac_id = b.arac_id
      WHERE ${clause}
      ORDER BY b.tarih DESC, b.bakim_id DESC
    `;
    const result = await pool.query(query, params);
    return res.status(200).json({ message: 'Bakımlar listelendi', bakimlar: result.rows });
  } catch (err) {
    console.error('Bakım listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// BELİRLİ ARACIN TÜM BAKIMLARINI LİSTELE (RBAC Filtreli)
const getBakimlarByArac = async (req, res) => {
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
      SELECT b.*, a.plaka, a.marka, a.model, a.sayac_tipi
      FROM bakimlar b
      INNER JOIN araclar a ON a.arac_id = b.arac_id
      WHERE b.arac_id = $1 AND (${clause})
      ORDER BY b.tarih DESC, b.bakim_id DESC
    `;
    const result = await pool.query(query, [arac_id, ...params]);

    return res.status(200).json({ message: 'Bakimlar listelendi', bakimlar: result.rows });
  } catch (err) {
    console.error('Araç bakımları listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// YENİ BAKIM KAYDI EKLE (RBAC + Pozitif Değer + Odometer Kronoloji 422 Validasyonu)
const createBakim = async (req, res) => {
  const { arac_id, bakim_tipi, tarih, km, maliyet, notlar, aciklama } = req.body;

  if (!arac_id || !bakim_tipi || !tarih || km === undefined || km === '' || maliyet === undefined || maliyet === '') {
    return res.status(400).json({ message: 'Gerekli alanlar eksik.' });
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

  const sayisalKm = Number(km);
  const sayisalMaliyet = Number(maliyet);

  if (
    !Number.isFinite(sayisalKm) ||
    !Number.isInteger(sayisalKm) ||
    sayisalKm < 0 ||
    !Number.isFinite(sayisalMaliyet) ||
    sayisalMaliyet <= 0
  ) {
    return res.status(400).json({ message: 'Girilen tutar/maliyet 0\'dan büyük ve KM/Saat değeri geçerli olmalıdır.' });
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
    const sinirlar = await sayacSinirlari(client, { aracId, tarih: gun });
    if (sayacIhlaliMi(sayisalKm, sinirlar)) {
      await client.query('ROLLBACK');
      return res.status(422).json(sayac422Govdesi(sayisalKm, sinirlar, hedefArac.sayac_tipi));
    }

    const query = `
      INSERT INTO bakimlar (arac_id, bakim_tipi, tarih, km, maliyet, notlar)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await client.query(query, [
      aracId,
      bakim_tipi,
      gun,
      sayisalKm,
      sayisalMaliyet,
      notlar || aciklama || null,
    ]);

    // Periyodik Bakım / Yağ / Filtre bakımında ilgili parça sayaçlarını otomatik sıfırla
    const aramaMetni = `${bakim_tipi || ''} ${notlar || ''} ${aciklama || ''}`.toLocaleLowerCase('tr-TR');
    const isPeriyodikBakim =
      bakim_tipi === 'Periyodik Bakım' ||
      aramaMetni.includes('periyodik') ||
      aramaMetni.includes('yağ') ||
      aramaMetni.includes('yag') ||
      aramaMetni.includes('filtre');

    if (isPeriyodikBakim) {
      await client.query(
        `UPDATE parca_takip
         SET son_degisim_km = $1,
             son_degisim_tarihi = $2
         WHERE arac_id = $3
           AND parca_adi IN (
             'Motor Yağı',
             'Yağ Filtresi',
             'Hava Filtresi',
             'Polen Filtresi',
             'Polen / Kabin Filtresi'
           )`,
        [sayisalKm, gun, aracId]
      );
    }

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

    await client.query('COMMIT');

    return res.status(201).json({ message: 'Bakim kaydi eklendi', bakim: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('Bakım ekleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    client.release();
  }
};

// BELİRLİ BAKIM KAYDINI GÜNCELLE
const updateBakim = async (req, res) => {
  const { bakim_id } = req.params;
  const { arac_id, bakim_tipi, tarih, km, maliyet, notlar } = req.body;

  const bakimId = Number(bakim_id);
  if (!Number.isInteger(bakimId) || bakimId <= 0) {
    return res.status(400).json({ message: 'Geçersiz bakım kimliği.' });
  }

  if (!bakim_tipi || !tarih || km === undefined || km === '' || maliyet === undefined || maliyet === '') {
    return res.status(400).json({ message: 'Gerekli alanlar eksik.' });
  }

  if (!tarihStr(tarih)) {
    return res.status(400).json({ message: 'Geçersiz tarih formatı.' });
  }

  if (ileriTarihMi(tarih)) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  const gun = tarihStr(tarih);
  const sayisalKm = Number(km);
  const sayisalMaliyet = Number(maliyet);

  if (
    !Number.isFinite(sayisalKm) ||
    !Number.isInteger(sayisalKm) ||
    sayisalKm < 0 ||
    !Number.isFinite(sayisalMaliyet) ||
    sayisalMaliyet <= 0
  ) {
    return res.status(400).json({ message: 'Girilen tutar/maliyet 0\'dan büyük ve KM/Saat değeri geçerli olmalıdır.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Kaydı kilitle: eşzamanlı güncelleme araya giremez
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const bakimOwnershipCheck = await client.query(
      `SELECT b.bakim_id, b.arac_id
       FROM bakimlar b
       INNER JOIN araclar a ON b.arac_id = a.arac_id
       WHERE b.bakim_id = $1 AND (${clause})
       FOR UPDATE OF b`,
      [bakimId, ...params]
    );

    if (bakimOwnershipCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Bakim kaydi bulunamadi veya yetkiniz yok.' });
    }

    const kaynakAracId = Number(bakimOwnershipCheck.rows[0].arac_id);
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
    const sinirlar = await sayacSinirlari(client, {
      aracId: hedefAracId,
      tarih: gun,
      haricTablo: 'bakimlar',
      haricId: bakimId,
    });
    if (sayacIhlaliMi(sayisalKm, sinirlar)) {
      await client.query('ROLLBACK');
      return res.status(422).json(sayac422Govdesi(sayisalKm, sinirlar, hedefArac.sayac_tipi));
    }

    const result = await client.query(
      `UPDATE bakimlar
       SET arac_id = $1, bakim_tipi = $2, tarih = $3, km = $4, maliyet = $5, notlar = $6
       WHERE bakim_id = $7
       RETURNING *`,
      [hedefAracId, bakim_tipi, gun, sayisalKm, sayisalMaliyet, notlar || null, bakimId]
    );

    // araclar sayacını GREATEST ile yeniden senkronize et
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

    await client.query('COMMIT');

    return res.status(200).json({ message: 'Bakim kaydi guncellendi', bakim: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('Bakım güncelleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    client.release();
  }
};

// BELİRLİ BAKIM KAYDINI SİL
const deleteBakim = async (req, res) => {
  const { bakim_id } = req.params;

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const result = await pool.query(
      `DELETE FROM bakimlar b
       USING araclar a
       WHERE b.arac_id = a.arac_id
         AND b.bakim_id = $1
         AND (${clause})
       RETURNING b.bakim_id`,
      [bakim_id, ...params]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Bakim kaydi bulunamadi' });
    }

    return res.status(200).json({ message: 'Bakim kaydi silindi' });
  } catch (err) {
    console.error('Bakım silme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

module.exports = {
  getAllBakimlar,
  getBakimlarByArac,
  createBakim,
  updateBakim,
  deleteBakim,
};

