// Sayaç kronoloji koruması: yalnızca çağıranın transaction client'ı ile çalışır (pool import edilmez)
const { bugunTR } = require('./dateUtils');
const AppError = require('./AppError');

// Tablo ve kolon adları YALNIZCA bu whitelist'ten gelir, request'ten asla
const SAYAC_KAYNAKLARI = { bakimlar: 'bakim_id', yakitlar: 'yakit_id', zimmet_muayeneleri: 'muayene_id' };

// Sayaç tipine göre birim: 'SMH' ise saat, değilse km
const sayacBirimi = (sayacTipi) => (sayacTipi === 'SMH' ? 'saat' : 'km');

// Araç satırlarını id sırasıyla kilitler (sıralı kilit = deadlock koruması)
const araclariKilitle = async (client, aracIdler) => {
  const idler = [...new Set((aracIdler || []).map(Number))]
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
  if (idler.length === 0) return [];
  const result = await client.query(
    `SELECT arac_id, sayac_tipi, guncel_km, guncel_calisma_saati, arsivlendi_mi
     FROM araclar
     WHERE arac_id = ANY($1::int[])
     ORDER BY arac_id
     FOR UPDATE`,
    [idler]
  );
  return result.rows;
};

// Arşivlenmiş araca mutasyon yapılmasını engeller (saf AppError 409)
const assertNotArchived = (aracOrList, tur = 'kayıt', islem = 'eklenemez') => {
  const list = Array.isArray(aracOrList) ? aracOrList : [aracOrList];
  if (list.some((a) => a?.arsivlendi_mi)) {
    throw new AppError(409, 'VEHICLE_ARCHIVED', `Arşivlenmiş araca ${tur} ${islem}.`);
  }
};

// Arşivlenmiş araca mutasyon yapılmasını engeller (409 — uyumluluk sarmalayıcısı)
const arsivliAracEngelle = async (client, res, aracOrList, tur = 'kayıt', islem = 'eklenemez') => {
  try {
    assertNotArchived(aracOrList, tur, islem);
    return false;
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 409) {
      await client.query('ROLLBACK');
      res.status(err.statusCode).json(err.toBody());
      return true;
    }
    throw err;
  }
};

// İzin verilen sayaç aralığı: alt = tarih ve öncesindeki en yüksek km, üst = tarihten sonraki en düşük km
const sayacSinirlari = async (client, { aracId, tarih, haricTablo = null, haricId = null }) => {
  if (haricTablo !== null && !Object.prototype.hasOwnProperty.call(SAYAC_KAYNAKLARI, haricTablo)) {
    throw new Error(`Geçersiz sayaç kaynağı: ${haricTablo}`);
  }

  // Hariç tutulan kayıt filtresi: kolon adı yalnızca whitelist sabitlerinden üretilir
  const haricFiltre = (tablo) =>
    `AND ($3::text IS DISTINCT FROM '${tablo}' OR ${SAYAC_KAYNAKLARI[tablo]} <> $4::int)`;

  const result = await client.query(
    `WITH kayitlar AS (
       SELECT tarih, km::numeric AS km FROM yakitlar
       WHERE arac_id = $1 AND km IS NOT NULL ${haricFiltre('yakitlar')}
       UNION ALL
       SELECT tarih, km::numeric AS km FROM bakimlar
       WHERE arac_id = $1 AND km IS NOT NULL ${haricFiltre('bakimlar')}
       UNION ALL
       SELECT muayene_tarihi AS tarih, sayac_degeri::numeric AS km FROM zimmet_muayeneleri
       WHERE arac_id = $1 AND sayac_degeri IS NOT NULL ${haricFiltre('zimmet_muayeneleri')}
     )
     SELECT
       COALESCE(MAX(km) FILTER (WHERE tarih <= $2::date), 0) AS alt_sinir,
       MIN(km) FILTER (WHERE tarih > $2::date) AS ust_sinir,
       COUNT(*)::int AS kayit_sayisi
     FROM kayitlar`,
    [aracId, tarih, haricTablo, haricId]
  );

  const row = result.rows[0] || {};
  let altSinir = Number(row.alt_sinir || 0);
  const kayitSayisi = Number(row.kayit_sayisi || 0);

  if (haricTablo === null && tarih === bugunTR() && kayitSayisi === 0) {
    const aracRes = await client.query(
      `SELECT sayac_tipi,
              COALESCE(guncel_km, 0)::int AS guncel_km,
              COALESCE(guncel_calisma_saati, 0)::int AS guncel_calisma_saati
       FROM araclar
       WHERE arac_id = $1`,
      [aracId]
    );
    if (aracRes.rowCount > 0) {
      const aracRow = aracRes.rows[0];
      const aracSayaci = aracRow.sayac_tipi === 'SMH' ? aracRow.guncel_calisma_saati : aracRow.guncel_km;
      altSinir = Math.max(altSinir, Number(aracSayaci || 0));
    }
  }

  return {
    alt_sinir: altSinir,
    ust_sinir: row.ust_sinir === null || row.ust_sinir === undefined ? null : Number(row.ust_sinir),
  };
};

// Değer aralık dışındaysa true
const sayacIhlaliMi = (deger, { alt_sinir, ust_sinir }) =>
  deger < alt_sinir || (ust_sinir !== null && deger > ust_sinir);

// Frontend 422 sözleşmesi: { message, alt_sinir, ust_sinir, sayac_tipi, birim }
const sayac422Govdesi = (deger, sinirlar, sayacTipi) => {
  const birim = sayacBirimi(sayacTipi);
  const fmt = (n) => Number(n).toLocaleString('tr-TR');
  const aralik =
    sinirlar.ust_sinir === null
      ? `en az ${fmt(sinirlar.alt_sinir)} ${birim}`
      : `${fmt(sinirlar.alt_sinir)} – ${fmt(sinirlar.ust_sinir)} ${birim}`;
  return {
    code: 'SAYAC_KRONOLOJI_IHLALI',
    message: `Girilen sayaç (${fmt(deger)} ${birim}) bu tarih için izin verilen aralığın dışında (${aralik}).`,
    alt_sinir: sinirlar.alt_sinir,
    ust_sinir: sinirlar.ust_sinir,
    sayac_tipi: sayacTipi,
    birim,
  };
};

// Güncelleme/silme sonrası araclar.guncel_km veya guncel_calisma_saati değerini yeniden hesaplar
const aracSayaciniSenkronizeEt = async (client, { aracId, eskiKm = null }) => {
  const aracRes = await client.query(
    `SELECT sayac_tipi,
            COALESCE(guncel_km, 0)::int AS guncel_km,
            COALESCE(guncel_calisma_saati, 0)::int AS guncel_calisma_saati
     FROM araclar
     WHERE arac_id = $1`,
    [aracId]
  );
  if (aracRes.rowCount === 0) return;

  const ozetRes = await client.query(
    `SELECT COUNT(*)::int AS kayit_sayisi,
            COALESCE(MAX(km), 0)::numeric AS max_kayit
     FROM (
       SELECT km::numeric AS km FROM yakitlar WHERE arac_id = $1 AND km IS NOT NULL
       UNION ALL
       SELECT km::numeric AS km FROM bakimlar WHERE arac_id = $1 AND km IS NOT NULL
       UNION ALL
       SELECT sayac_degeri::numeric AS km FROM zimmet_muayeneleri WHERE arac_id = $1 AND sayac_degeri IS NOT NULL
     ) t`,
    [aracId]
  );

  const arac = aracRes.rows[0];
  const isSmh = arac.sayac_tipi === 'SMH';
  const mevcutSayac = Number(isSmh ? arac.guncel_calisma_saati : arac.guncel_km);
  const eski = eskiKm != null ? Number(eskiKm) : null;
  const kayitSayisi = Number(ozetRes.rows[0]?.kayit_sayisi || 0);
  const maxKayit = Math.round(Number(ozetRes.rows[0]?.max_kayit || 0));

  let yeniSayac;
  if (eski !== null && mevcutSayac === eski) {
    if (kayitSayisi > 0) {
      yeniSayac = maxKayit;
    } else {
      const parcaRes = await client.query(
        `SELECT COALESCE(MAX(son_degisim_km), 0)::int AS max_parca
         FROM parca_takip
         WHERE arac_id = $1 AND son_degisim_km IS NOT NULL`,
        [aracId]
      );
      const maxParca = Number(parcaRes.rows[0]?.max_parca || 0);
      yeniSayac = maxParca > 0 ? maxParca : mevcutSayac;
    }
  } else {
    yeniSayac = Math.max(mevcutSayac, maxKayit);
  }

  if (yeniSayac !== mevcutSayac) {
    if (isSmh) {
      await client.query('UPDATE araclar SET guncel_calisma_saati = $1 WHERE arac_id = $2', [yeniSayac, aracId]);
    } else {
      await client.query('UPDATE araclar SET guncel_km = $1 WHERE arac_id = $2', [yeniSayac, aracId]);
    }
  }
};

// Saf sayaç kronoloji doğrulaması (ihlalse 422 AppError fırlatır)
const assertOdometerChronology = async (
  client,
  { aracId, tarih, deger, sayacTipi, haricTablo = null, haricId = null }
) => {
  if (deger === null || deger === undefined) return;
  const sinirlar = await sayacSinirlari(client, { aracId, tarih, haricTablo, haricId });
  if (sayacIhlaliMi(deger, sinirlar)) {
    const body = sayac422Govdesi(deger, sinirlar, sayacTipi);
    throw new AppError(422, body.code, body.message, {
      alt_sinir: body.alt_sinir,
      ust_sinir: body.ust_sinir,
      sayac_tipi: body.sayac_tipi,
      birim: body.birim,
    });
  }
};

// Tekil kayıt ekleme sonrası araç sayacını ileri taşır
const syncVehicleOdometer = async (client, { aracId, sayacTipi, km }) => {
  if (km === null || km === undefined) return;
  if (sayacTipi === 'SMH') {
    await client.query(
      'UPDATE araclar SET guncel_calisma_saati = GREATEST(COALESCE(guncel_calisma_saati, 0), $1) WHERE arac_id = $2',
      [km, aracId]
    );
  } else {
    await client.query(
      'UPDATE araclar SET guncel_km = GREATEST(COALESCE(guncel_km, 0), $1) WHERE arac_id = $2',
      [km, aracId]
    );
  }
};

module.exports = {
  SAYAC_KAYNAKLARI,
  sayacBirimi,
  araclariKilitle,
  assertNotArchived,
  arsivliAracEngelle,
  assertOdometerChronology,
  syncVehicleOdometer,
  aracSayaciniSenkronizeEt,
  sayacSinirlari,
  sayacIhlaliMi,
  sayac422Govdesi,
};
