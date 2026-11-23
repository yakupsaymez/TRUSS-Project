// Sayaç kronoloji koruması: yalnızca çağıranın transaction client'ı ile çalışır (pool import edilmez)

// Tablo ve kolon adları YALNIZCA bu whitelist'ten gelir, request'ten asla
const SAYAC_KAYNAKLARI = { bakimlar: 'bakim_id', yakitlar: 'yakit_id' };

// Sayaç tipine göre birim: 'SMH' ise saat, değilse km
const sayacBirimi = (sayacTipi) => (sayacTipi === 'SMH' ? 'saat' : 'km');

// Araç satırlarını id sırasıyla kilitler (sıralı kilit = deadlock koruması)
const araclariKilitle = async (client, aracIdler) => {
  const idler = [...new Set((aracIdler || []).map(Number))]
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
  if (idler.length === 0) return [];
  const result = await client.query(
    `SELECT arac_id, sayac_tipi
     FROM araclar
     WHERE arac_id = ANY($1::int[])
     ORDER BY arac_id
     FOR UPDATE`,
    [idler]
  );
  return result.rows;
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
       SELECT tarih, km FROM yakitlar
       WHERE arac_id = $1 AND km IS NOT NULL ${haricFiltre('yakitlar')}
       UNION ALL
       SELECT tarih, km FROM bakimlar
       WHERE arac_id = $1 AND km IS NOT NULL ${haricFiltre('bakimlar')}
     )
     SELECT
       COALESCE(MAX(km) FILTER (WHERE tarih <= $2::date), 0) AS alt_sinir,
       MIN(km) FILTER (WHERE tarih > $2::date) AS ust_sinir
     FROM kayitlar`,
    [aracId, tarih, haricTablo, haricId]
  );

  const row = result.rows[0] || {};
  return {
    alt_sinir: Number(row.alt_sinir || 0),
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

module.exports = {
  SAYAC_KAYNAKLARI,
  sayacBirimi,
  araclariKilitle,
  sayacSinirlari,
  sayacIhlaliMi,
  sayac422Govdesi,
};
