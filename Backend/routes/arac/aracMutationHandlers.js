const pool = require('../../db');
const { buildVehicleAccessFilter } = require('../../middlewares/rbacMiddleware.js');
const { aracSchema, cozumleVaryantBilgileri } = require('./aracHelpers');

// PUT /api/araclar/:arac_id — ARAÇ GÜNCELLE (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
const updateArac = async (req, res) => {
  const { arac_id } = req.params;
  const aracId = Number(arac_id);
  if (!Number.isInteger(aracId) || aracId <= 0) {
    return res.status(400).json({ message: 'Geçersiz araç kimliği.' });
  }

  const { error, value } = aracSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const {
    plaka,
    kategori_id,
    kategori,
    marka,
    model,
    yil,
    guncel_km,
    guncel_calisma_saati,
    sayac_tipi,
    varyant_id,
    onerilen_bakim_km,
    triger_degisim_km,
    calisma_saati_bakim,
    muayene_tarihi,
    kasko_tarihi,
    sigorta_tarihi,
  } = value;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const mevcutRes = await client.query(
      `SELECT a.* FROM araclar a WHERE a.arac_id = $1 AND (${clause}) FOR UPDATE OF a`,
      [aracId, ...params]
    );
    if (mevcutRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Araç bulunamadı' });
    }
    const mevcut = mevcutRes.rows[0];

    const varyantBilgi = await cozumleVaryantBilgileri(client, {
      varyant_id: varyant_id !== undefined ? varyant_id : mevcut.varyant_id,
      onerilen_bakim_km: onerilen_bakim_km !== undefined ? onerilen_bakim_km : mevcut.onerilen_bakim_km,
      triger_degisim_km: triger_degisim_km !== undefined ? triger_degisim_km : mevcut.triger_degisim_km,
      calisma_saati_bakim: calisma_saati_bakim !== undefined ? calisma_saati_bakim : mevcut.calisma_saati_bakim,
    });

    const sayacTipi =
      sayac_tipi === 'KM' || sayac_tipi === 'SMH'
        ? sayac_tipi
        : calisma_saati_bakim !== undefined && calisma_saati_bakim !== '' && calisma_saati_bakim !== null
          ? 'SMH'
          : mevcut.sayac_tipi === 'KM' || mevcut.sayac_tipi === 'SMH'
            ? mevcut.sayac_tipi
            : varyantBilgi.calismaSaatiBakim
              ? 'SMH'
              : 'KM';

    if (sayacTipi === 'KM') {
      varyantBilgi.calismaSaatiBakim = null;
    } else {
      varyantBilgi.onerilenBakimKm = null;
      varyantBilgi.trigerDegisimKm = null;
    }

    const yeniGuncelKm =
      guncel_km !== undefined && guncel_km !== '' && guncel_km !== null
        ? Number(guncel_km)
        : mevcut.guncel_km || 0;
    const yeniGuncelSaat =
      guncel_calisma_saati !== undefined && guncel_calisma_saati !== '' && guncel_calisma_saati !== null
        ? Number(guncel_calisma_saati)
        : mevcut.guncel_calisma_saati || 0;

    // Odometer Rollback Engeli: Mevcut en yüksek yakıt/bakım kaydının altına düşülemez
    const maxSayacRes = await client.query(
      `SELECT GREATEST(
         COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = $1), 0),
         COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = $1), 0)
       )::int AS max_kayitli_sayac`,
      [aracId]
    );
    const maxKayitliSayac = Number(maxSayacRes.rows[0]?.max_kayitli_sayac || 0);
    const hedefSayacDegeri = sayacTipi === 'SMH' ? yeniGuncelSaat : yeniGuncelKm;

    if (hedefSayacDegeri < maxKayitliSayac) {
      await client.query('ROLLBACK');
      const birim = sayacTipi === 'SMH' ? 'saat' : 'km';
      return res.status(422).json({
        message: `Sayaç geri sarılamaz (Odometer Rollback engeli). Girilen değer (${hedefSayacDegeri} ${birim}), mevcut en yüksek yakıt/bakım kaydından (${maxKayitliSayac} ${birim}) düşük olamaz.`,
        max_kayitli_sayac: maxKayitliSayac,
        sayac_tipi: sayacTipi,
        birim,
      });
    }

    const updateQuery = `
      UPDATE araclar
      SET plaka = $1,
          kategori_id = $2,
          kategori = $3,
          marka = $4,
          model = $5,
          yil = $6,
          guncel_km = $7,
          guncel_calisma_saati = $8,
          sayac_tipi = $9,
          varyant_id = $10,
          onerilen_bakim_km = $11,
          triger_degisim_km = $12,
          calisma_saati_bakim = $13,
          muayene_tarihi = $14,
          kasko_tarihi = $15,
          sigorta_tarihi = $16
      WHERE arac_id = $17
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      plaka,
      kategori_id ? Number(kategori_id) : mevcut.kategori_id,
      kategori || mevcut.kategori || 'Otomobil',
      marka,
      model,
      yil,
      yeniGuncelKm,
      yeniGuncelSaat,
      sayacTipi,
      varyantBilgi.varyantId,
      varyantBilgi.onerilenBakimKm,
      varyantBilgi.trigerDegisimKm,
      varyantBilgi.calismaSaatiBakim,
      muayene_tarihi || null,
      kasko_tarihi || null,
      sigorta_tarihi || null,
      aracId,
    ]);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Araç güncellendi', arac: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('Araç Güncelleme Hatası:', err);
    if (err.code === '23505') return res.status(409).json({ message: 'Bu plaka zaten kayıtlı.' });
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
};

// DELETE /api/araclar/:arac_id — ARAÇ SİL (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
const deleteArac = async (req, res) => {
  const { arac_id } = req.params;
  const aracId = Number(arac_id);
  if (!Number.isInteger(aracId) || aracId <= 0) {
    return res.status(400).json({ message: 'Geçersiz araç kimliği.' });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const result = await pool.query(
      `DELETE FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [aracId, ...params]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Araç bulunamadı' });
    res.status(200).json({ message: 'Araç başarıyla silindi' });
  } catch (err) {
    console.error('Araç Silme Hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

module.exports = {
  updateArac,
  deleteArac,
};
