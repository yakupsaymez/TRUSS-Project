const pool = require('../db');
const { bugunTR, gunEkleTR, gunFarkiTR, trTarihFormatla } = require('../utils/dateUtils');

/**
 * Araçların tahmini bakım hesabı için gerekli son bakım ve son 2 hareket verisini tek sorguda çeker.
 */
const fetchPredictiveCandidates = async (options = {}) => {
  const accessFilter = options.accessFilter && options.accessFilter.clause
    ? options.accessFilter
    : { clause: '1=1', params: [] };

  const query = `
    SELECT
      a.arac_id,
      a.org_id,
      a.kullanici_id,
      a.plaka,
      a.sayac_tipi,
      a.calisma_saati_bakim,
      a.onerilen_bakim_km,
      CASE
        WHEN a.sayac_tipi = 'SMH' THEN COALESCE(NULLIF(a.calisma_saati_bakim, 0), 250)
        ELSE COALESCE(NULLIF(a.onerilen_bakim_km, 0), 15000)
      END AS bakim_periyodu,
      GREATEST(
        COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
        COALESCE(bm.max_km, 0),
        COALESCE(ym.max_km, 0)
      ) AS guncel_km,
      lb.son_bakim_km,
      lb.son_bakim_tarihi,
      rh.kayitlar AS recent_rows
    FROM araclar a
    LEFT JOIN LATERAL (
      SELECT MAX(km) AS max_km FROM bakimlar WHERE arac_id = a.arac_id
    ) bm ON TRUE
    LEFT JOIN LATERAL (
      SELECT MAX(km) AS max_km FROM yakitlar WHERE arac_id = a.arac_id
    ) ym ON TRUE
    LEFT JOIN LATERAL (
      SELECT km AS son_bakim_km, tarih AS son_bakim_tarihi
      FROM bakimlar
      WHERE arac_id = a.arac_id
      ORDER BY tarih DESC, km DESC, bakim_id DESC
      LIMIT 1
    ) lb ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE(json_agg(t), '[]'::json) AS kayitlar
      FROM (
        SELECT km, tarih FROM (
          SELECT km, tarih FROM bakimlar WHERE arac_id = a.arac_id AND km IS NOT NULL AND tarih IS NOT NULL
          UNION ALL
          SELECT km, tarih FROM yakitlar WHERE arac_id = a.arac_id AND km IS NOT NULL AND tarih IS NOT NULL
        ) tum_kayitlar
        ORDER BY tarih DESC, km DESC
        LIMIT 2
      ) t
    ) rh ON TRUE
    WHERE ${accessFilter.clause}
    ORDER BY a.arac_id ASC
  `;

  const result = await pool.query(query, accessFilter.params || []);
  return result.rows;
};

/**
 * Tek araç satırından KM/SMH tahmini bakım özetini sıfıra bölünme korumalı olarak hesaplar.
 */
const computePredictiveSummaryFromRow = (row, now = new Date()) => {
  const currentKm = Number(row?.guncel_km) || 0;
  const recentRows = Array.isArray(row?.recent_rows) ? row.recent_rows : [];

  if (row?.son_bakim_km === null || row?.son_bakim_km === undefined || recentRows.length < 2) {
    return null;
  }

  const [yeniKayit, oncekiKayit] = recentRows;
  const hamGunFarki = gunFarkiTR(yeniKayit.tarih, oncekiKayit.tarih);
  const gunFarki = Math.max(1, Math.abs(hamGunFarki ?? 1));
  const kmFarki = Math.abs((Number(yeniKayit.km) || 0) - (Number(oncekiKayit.km) || 0));
  const gunlukOrtalamaKm = kmFarki / gunFarki;

  const isSmh = row.sayac_tipi === 'SMH';
  const birim = isSmh ? 'saat' : 'KM';
  const varsayilanPeriyot = isSmh
    ? Number(row.calisma_saati_bakim) || 250
    : Number(row.onerilen_bakim_km) || 15000;
  const periyot = Number(row.bakim_periyodu) || varsayilanPeriyot;
  const hedefKm = (Number(row.son_bakim_km) || 0) + periyot;
  const kalanKm = hedefKm - currentKm;
  const bugun = bugunTR(now);

  if (!Number.isFinite(gunlukOrtalamaKm) || gunlukOrtalamaKm <= 0) {
    if (kalanKm <= 0) {
      return {
        currentKm,
        hedefKm,
        kalanKm,
        kalanGun: 0,
        gunlukOrtalamaKm: 0,
        tahminiTarih: bugun,
        tahminiTarihTR: trTarihFormatla(bugun),
        birim,
        isSmh,
      };
    }
    return null;
  }

  const kalanGun = Math.ceil(kalanKm / gunlukOrtalamaKm);
  const tahminiTarih = gunEkleTR(bugun, Math.max(0, kalanGun));

  return {
    currentKm,
    hedefKm,
    kalanKm,
    kalanGun,
    gunlukOrtalamaKm,
    tahminiTarih,
    tahminiTarihTR: trTarihFormatla(tahminiTarih),
    birim,
    isSmh,
  };
};

module.exports = {
  fetchPredictiveCandidates,
  computePredictiveSummaryFromRow,
};
