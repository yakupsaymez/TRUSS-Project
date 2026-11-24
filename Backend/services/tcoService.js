const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { bugunTR, gunEkleTR } = require('../utils/dateUtils');
const { evaluateParcaAlerts } = require('./alertEvaluators');

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
const round1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : 0);

const buildVehicleTcoQuery = (accessClause, startIdx, endIdx) => `
  WITH erisebilir_araclar AS (
    SELECT
      a.arac_id, a.plaka, a.marka, a.model, a.sayac_tipi,
      GREATEST(
        COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
        COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = a.arac_id), 0),
        COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0)
      ) AS guncel_km
    FROM araclar a
    WHERE ${accessClause}
  ),
  yakit_donem AS (
    SELECT arac_id, COALESCE(SUM(tutar), 0)::numeric AS yakit_maliyet, COALESCE(SUM(litre), 0)::numeric AS toplam_litre
    FROM yakitlar WHERE tarih >= $${startIdx} AND tarih <= $${endIdx} GROUP BY arac_id
  ),
  bakim_donem AS (
    SELECT arac_id, COALESCE(SUM(maliyet), 0)::numeric AS bakim_maliyet
    FROM bakimlar WHERE tarih >= $${startIdx} AND tarih <= $${endIdx} GROUP BY arac_id
  ),
  parca_donem AS (
    SELECT arac_id, COALESCE(SUM(maliyet), 0)::numeric AS parca_maliyet
    FROM parca_takip WHERE son_degisim_tarihi >= $${startIdx} AND son_degisim_tarihi <= $${endIdx} GROUP BY arac_id
  ),
  sayac_noktalari AS (
    SELECT arac_id, COUNT(*)::int AS olcum_sayisi, MIN(km)::numeric AS min_sayac, MAX(km)::numeric AS max_sayac
    FROM (
      SELECT arac_id, km FROM yakitlar WHERE tarih >= $${startIdx} AND tarih <= $${endIdx} AND km IS NOT NULL AND km > 0
      UNION ALL
      SELECT arac_id, km FROM bakimlar WHERE tarih >= $${startIdx} AND tarih <= $${endIdx} AND km IS NOT NULL AND km > 0
    ) s
    GROUP BY arac_id
  )
  SELECT
    ea.arac_id, ea.plaka, ea.marka, ea.model, ea.sayac_tipi, ea.guncel_km,
    COALESCE(yd.yakit_maliyet, 0)::numeric AS yakit_maliyet,
    COALESCE(yd.toplam_litre, 0)::numeric AS toplam_litre,
    COALESCE(bd.bakim_maliyet, 0)::numeric AS bakim_maliyet,
    COALESCE(pd.parca_maliyet, 0)::numeric AS parca_maliyet,
    COALESCE(sn.olcum_sayisi, 0)::int AS olcum_sayisi,
    COALESCE(sn.min_sayac, 0)::numeric AS min_sayac,
    COALESCE(sn.max_sayac, 0)::numeric AS max_sayac
  FROM erisebilir_araclar ea
  LEFT JOIN yakit_donem yd ON yd.arac_id = ea.arac_id
  LEFT JOIN bakim_donem bd ON bd.arac_id = ea.arac_id
  LEFT JOIN parca_donem pd ON pd.arac_id = ea.arac_id
  LEFT JOIN sayac_noktalari sn ON sn.arac_id = ea.arac_id
`;

const buildParcaAlertCounts = (parcaRows, vehicleMap, bugun) => {
  const countsMap = new Map();
  for (const p of parcaRows) {
    const vehicle = vehicleMap.get(p.arac_id);
    if (!vehicle) continue;
    const alerts = evaluateParcaAlerts(
      { ...p, plaka: vehicle.plaka, sayac_tipi: vehicle.sayac_tipi, guncel_km: vehicle.guncel_km },
      bugun
    );
    if (alerts.length === 0) continue;
    const entry = countsMap.get(p.arac_id) || { kritik: 0, uyari: 0 };
    for (const alert of alerts) {
      if (alert.seviye === 'kritik') entry.kritik += 1;
      else if (alert.seviye === 'uyari') entry.uyari += 1;
    }
    countsMap.set(p.arac_id, entry);
  }
  return countsMap;
};

const scoreVehicle = (item, grupOrt, alertCounts) => {
  if (!item.veri_yeterli) {
    return {
      ...item,
      filo_sapma_yuzde: null,
      verimlilik_skoru: null,
      skor_durum: 'yetersiz_veri',
      nedenler: ['Dönem içi yeterli sayaç ölçümü yok'],
    };
  }

  const filo_sapma_yuzde =
    grupOrt !== null && grupOrt > 0 ? round1(((item.birim_maliyet - grupOrt) / grupOrt) * 100) : 0;
  const bakimOrani =
    item.toplam_maliyet > 0 ? (item.bakim_maliyet + item.parca_maliyet) / item.toplam_maliyet : 0;

  const kritikParcaSayisi = alertCounts?.kritik || 0;
  const uyariParcaSayisi = alertCounts?.uyari || 0;

  const penaltyCost = filo_sapma_yuzde > 0 ? Math.min(45, Math.round(filo_sapma_yuzde * 0.75)) : 0;
  const penaltyMaint = bakimOrani > 0.3 ? Math.min(30, Math.round((bakimOrani - 0.3) * 60)) : 0;
  const penaltyParts = Math.min(25, kritikParcaSayisi * 10 + uyariParcaSayisi * 4);

  const verimlilik_skoru = Math.max(0, Math.min(100, Math.round(100 - penaltyCost - penaltyMaint - penaltyParts)));
  const skor_durum = verimlilik_skoru >= 75 ? 'optimal' : verimlilik_skoru >= 50 ? 'izle' : 'yenileme_adayi';

  const nedenler = [];
  if (filo_sapma_yuzde >= 15) {
    nedenler.push(`Filo ortalamasının +%${Math.round(filo_sapma_yuzde)} üzerinde birim maliyet`);
  }
  if (bakimOrani >= 0.4) {
    nedenler.push(`Bakım ve parça gideri toplamın %${Math.round(bakimOrani * 100)}'i`);
  }
  if (kritikParcaSayisi > 0) {
    nedenler.push(`${kritikParcaSayisi} gecikmiş kritik parça`);
  } else if (uyariParcaSayisi > 0) {
    nedenler.push(`${uyariParcaSayisi} yaklaşan parça değişimi`);
  }
  if (nedenler.length === 0) {
    nedenler.push('Birim maliyet ve bakım yükü filo dengesinde');
  }

  return { ...item, filo_sapma_yuzde, verimlilik_skoru, skor_durum, nedenler };
};

const sortTcoVehicles = (a, b) => {
  if (a.veri_yeterli !== b.veri_yeterli) return a.veri_yeterli ? -1 : 1;
  if (a.veri_yeterli) {
    if (a.verimlilik_skoru !== b.verimlilik_skoru) return a.verimlilik_skoru - b.verimlilik_skoru;
    if (a.birim_maliyet !== b.birim_maliyet) return b.birim_maliyet - a.birim_maliyet;
  } else if (a.toplam_maliyet !== b.toplam_maliyet) {
    return b.toplam_maliyet - a.toplam_maliyet;
  }
  return String(a.plaka || '').localeCompare(String(b.plaka || ''), 'tr');
};

const computeTcoAnalysis = async (user, donemGun = 90) => {
  const bugun = bugunTR();
  const baslangicTarihi = gunEkleTR(bugun, -donemGun);
  const access = buildVehicleAccessFilter(user, 1);
  const startIdx = access.params.length + 1;
  const endIdx = startIdx + 1;
  const queryParams = [...access.params, baslangicTarihi, bugun];

  const vehicleSql = buildVehicleTcoQuery(access.clause, startIdx, endIdx);
  const parcaSql = `
    SELECT p.parca_id, p.arac_id, p.parca_adi, p.son_degisim_km, p.degisim_araligi_km, p.son_degisim_tarihi
    FROM parca_takip p
    INNER JOIN araclar a ON a.arac_id = p.arac_id
    WHERE ${access.clause}
  `;

  const [vehicleRes, parcaRes] = await Promise.all([
    pool.query(vehicleSql, queryParams),
    pool.query(parcaSql, access.params),
  ]);

  const vehicleMap = new Map();
  const baseItems = vehicleRes.rows.map((row) => {
    vehicleMap.set(row.arac_id, row);
    const sayac_tipi = row.sayac_tipi === 'SMH' ? 'SMH' : 'KM';
    const yakit_maliyet = round2(toNum(row.yakit_maliyet));
    const bakim_maliyet = round2(toNum(row.bakim_maliyet));
    const parca_maliyet = round2(toNum(row.parca_maliyet));
    const toplam_litre = round2(toNum(row.toplam_litre));
    const toplam_maliyet = round2(yakit_maliyet + bakim_maliyet + parca_maliyet);

    const olcum_sayisi = toNum(row.olcum_sayisi);
    const min_sayac = toNum(row.min_sayac);
    const max_sayac = toNum(row.max_sayac);
    const donem_mesafe = olcum_sayisi >= 2 && max_sayac > min_sayac ? round2(max_sayac - min_sayac) : 0;
    const veri_yeterli = olcum_sayisi >= 2 && donem_mesafe > 0;

    const birim_maliyet = veri_yeterli ? round2(toplam_maliyet / donem_mesafe) : null;
    const ort_tuketim =
      veri_yeterli && toplam_litre > 0 && donem_mesafe > 0
        ? sayac_tipi === 'SMH'
          ? round2(toplam_litre / donem_mesafe)
          : round2((toplam_litre / donem_mesafe) * 100)
        : null;

    return {
      arac_id: row.arac_id,
      plaka: row.plaka,
      marka_model: [row.marka, row.model].filter(Boolean).join(' '),
      sayac_tipi,
      veri_yeterli,
      toplam_maliyet,
      yakit_maliyet,
      bakim_maliyet,
      parca_maliyet,
      toplam_litre,
      donem_mesafe,
      birim_maliyet,
      ort_tuketim,
    };
  });

  const kmValid = baseItems.filter((v) => v.veri_yeterli && v.sayac_tipi === 'KM');
  const smhValid = baseItems.filter((v) => v.veri_yeterli && v.sayac_tipi === 'SMH');
  const km_ort_birim_maliyet =
    kmValid.length > 0 ? round2(kmValid.reduce((acc, v) => acc + v.birim_maliyet, 0) / kmValid.length) : null;
  const smh_ort_birim_maliyet =
    smhValid.length > 0 ? round2(smhValid.reduce((acc, v) => acc + v.birim_maliyet, 0) / smhValid.length) : null;

  const parcaAlertCounts = buildParcaAlertCounts(parcaRes.rows, vehicleMap, bugun);
  const araclar = baseItems
    .map((item) => {
      const grupOrt = item.sayac_tipi === 'SMH' ? smh_ort_birim_maliyet : km_ort_birim_maliyet;
      return scoreVehicle(item, grupOrt, parcaAlertCounts.get(item.arac_id));
    })
    .sort(sortTcoVehicles);

  return {
    donem_gun: donemGun,
    ozet: {
      km_ort_birim_maliyet,
      smh_ort_birim_maliyet,
      yenileme_adayi_sayisi: araclar.filter((v) => v.skor_durum === 'yenileme_adayi').length,
      izle_sayisi: araclar.filter((v) => v.skor_durum === 'izle').length,
      yetersiz_veri_sayisi: araclar.filter((v) => v.skor_durum === 'yetersiz_veri').length,
    },
    araclar,
  };
};

module.exports = { computeTcoAnalysis };
