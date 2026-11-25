const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { tarihStr, bugunTR } = require('../utils/dateUtils');
const { araclariKilitle, sayacBirimi } = require('../utils/odometerGuard');
const { parseFuelCsv, normalizePlate } = require('../utils/csvFuelParser');
const { toPosNum, evalTankOverflowRule, evalConsecutiveFillRule, evalHighConsumptionRule } = require('./fuelAnomalyRules');
const { evaluateBatchFuelAnomalies } = require('./fuelAnomalyService');

const round2 = (n) => Math.round(n * 100) / 100;
const buildSig = (aracId, tarih, litre, tutar, km) =>
  `${aracId}|${tarih}|${Number(litre).toFixed(2)}|${Number(tutar).toFixed(2)}|${km ?? -1}`;

const cmpImportOrder = (a, b) => {
  if (a.tarih !== b.tarih) return a.tarih < b.tarih ? -1 : 1;
  const aNull = a.km === null ? 1 : 0;
  const bNull = b.km === null ? 1 : 0;
  if (aNull !== bNull) return aNull - bNull;
  return a.km !== null && a.km !== b.km ? a.km - b.km : a.satir_no - b.satir_no;
};

const loadAccessibleVehicles = async (db, user) => {
  const { clause, params } = buildVehicleAccessFilter(user, 1);
  const res = await db.query(
    `SELECT a.arac_id, a.org_id, a.plaka, a.sayac_tipi,
            COALESCE(a.guncel_km, 0)::int AS guncel_km,
            COALESCE(a.guncel_calisma_saati, 0)::int AS guncel_calisma_saati,
            a.depo_kapasitesi_l, a.hedef_tuketim, v.yakit_tipi AS arac_yakit_tipi
     FROM araclar a LEFT JOIN ref_arac_varyantlari v ON v.varyant_id = a.varyant_id
     WHERE (${clause})`,
    params
  );
  return new Map(res.rows.map((r) => [normalizePlate(r.plaka), r]));
};

const loadExistingSignatures = async (db, aracIds, minTarih, maxTarih) => {
  const sigs = new Set();
  if (aracIds.length === 0) return sigs;
  const res = await db.query(
    `SELECT arac_id, tarih, ROUND(litre, 2)::text AS litre_r, ROUND(tutar, 2)::text AS tutar_r, COALESCE(km, -1)::int AS km_key
     FROM yakitlar WHERE arac_id = ANY($1::int[]) AND tarih >= $2::date AND tarih <= $3::date`,
    [aracIds, minTarih, maxTarih]
  );
  for (const r of res.rows) sigs.add(buildSig(r.arac_id, tarihStr(r.tarih), r.litre_r, r.tutar_r, r.km_key));
  return sigs;
};

const loadOdometerPoints = async (db, aracIds) => {
  const allPoints = new Map();
  const fuelPoints = new Map();
  if (aracIds.length === 0) return { allPoints, fuelPoints };
  const res = await db.query(
    `SELECT arac_id, tarih, km, 'yakit' AS kaynak FROM yakitlar WHERE arac_id = ANY($1::int[]) AND km IS NOT NULL
     UNION ALL
     SELECT arac_id, tarih, km, 'bakim' AS kaynak FROM bakimlar WHERE arac_id = ANY($1::int[]) AND km IS NOT NULL`,
    [aracIds]
  );
  for (const r of res.rows) {
    const pt = { tarih: tarihStr(r.tarih), km: Number(r.km) };
    if (!allPoints.has(r.arac_id)) allPoints.set(r.arac_id, []);
    allPoints.get(r.arac_id).push(pt);
    if (r.kaynak === 'yakit' && pt.km > 0) {
      if (!fuelPoints.has(r.arac_id)) fuelPoints.set(r.arac_id, []);
      fuelPoints.get(r.arac_id).push(pt);
    }
  }
  return { allPoints, fuelPoints };
};

const findPrevFuelPoint = (fuelPoints, tarih, km) => {
  let best = null;
  for (const p of fuelPoints) {
    if (p.tarih > tarih || (p.tarih === tarih && km !== null && p.km > km)) continue;
    if (!best || p.tarih > best.tarih || (p.tarih === best.tarih && p.km > best.km)) best = p;
  }
  return best;
};

const formatRow = (row, durum, extra = {}) => ({
  satir_no: row.satir_no, plaka: row.plaka, plaka_ham: row.plaka_ham,
  arac_id: extra.arac_id ?? null, tarih: row.tarih, litre: row.litre, tutar: row.tutar, km: row.km,
  yakit_tipi: extra.yakit_tipi !== undefined ? extra.yakit_tipi : row.yakit_tipi,
  istasyon: row.istasyon, fatura_no: row.fatura_no, durum,
  neden_kodu: extra.neden_kodu ?? row.neden_kodu ?? null,
  neden_mesaj: extra.neden_mesaj ?? row.neden_mesaj ?? null,
  uyarilar: extra.uyarilar ?? [], yakit_id: extra.yakit_id ?? null,
});

const evaluateImportRows = async (db, parsedRows, byPlate) => {
  const results = [];
  const plateMatched = [];
  for (const row of parsedRows) {
    if (row.neden_kodu) { results.push(formatRow(row, 'hatali')); continue; }
    const vehicle = byPlate.get(row.plaka);
    if (!vehicle) {
      results.push(formatRow(row, 'hatali', { neden_kodu: 'TANIMSIZ_PLAKA', neden_mesaj: 'Plaka erişilebilir araçlar arasında bulunamadı.' }));
      continue;
    }
    const yakitTipi = row.yakit_tipi || (vehicle.arac_yakit_tipi ? String(vehicle.arac_yakit_tipi).trim().slice(0, 50) : null);
    plateMatched.push({ row: { ...row, yakit_tipi: yakitTipi }, vehicle });
  }

  const uniqueCandidates = [];
  if (plateMatched.length > 0) {
    const aracIds = [...new Set(plateMatched.map((m) => m.vehicle.arac_id))];
    const tarihler = plateMatched.map((m) => m.row.tarih).sort();
    const seen = await loadExistingSignatures(db, aracIds, tarihler[0], tarihler[tarihler.length - 1]);
    for (const item of plateMatched) {
      const sig = buildSig(item.vehicle.arac_id, item.row.tarih, item.row.litre, item.row.tutar, item.row.km);
      if (seen.has(sig)) {
        results.push(formatRow(item.row, 'mukerrer', { arac_id: item.vehicle.arac_id, neden_kodu: 'MUKERRER_KAYIT', neden_mesaj: 'Aynı araç, tarih, litre, tutar ve sayaç değerine sahip kayıt zaten mevcut.' }));
      } else {
        seen.add(sig);
        uniqueCandidates.push(item);
      }
    }
  }

  const accepted = [];
  if (uniqueCandidates.length > 0) {
    const { allPoints, fuelPoints } = await loadOdometerPoints(db, [...new Set(uniqueCandidates.map((c) => c.vehicle.arac_id))]);
    const todayTR = bugunTR();
    const byArac = new Map();
    for (const item of uniqueCandidates) {
      const list = byArac.get(item.vehicle.arac_id) || [];
      list.push(item);
      byArac.set(item.vehicle.arac_id, list);
    }

    for (const [aracId, items] of byArac.entries()) {
      items.sort((a, b) => cmpImportOrder(a.row, b.row));
      const pts = allPoints.get(aracId) || [];
      const fPts = fuelPoints.get(aracId) || [];

      for (const { row, vehicle } of items) {
        const sayacTipi = vehicle.sayac_tipi === 'SMH' ? 'SMH' : 'KM';
        if (row.km !== null) {
          let alt = 0;
          let ust = null;
          for (const p of pts) {
            if (p.tarih <= row.tarih && p.km > alt) alt = p.km;
            if (p.tarih > row.tarih && (ust === null || p.km < ust)) ust = p.km;
          }
          if (row.tarih === todayTR && pts.length === 0) alt = Math.max(alt, sayacTipi === 'SMH' ? vehicle.guncel_calisma_saati : vehicle.guncel_km);
          if (row.km < alt || (ust !== null && row.km > ust)) {
            const aralik = ust === null ? `en az ${alt} ${sayacBirimi(sayacTipi)}` : `${alt} - ${ust} ${sayacBirimi(sayacTipi)}`;
            results.push(formatRow(row, 'hatali', { arac_id: aracId, neden_kodu: 'SAYAC_TUTARSIZ', neden_mesaj: `Sayaç (${row.km}) izin verilen aralığın dışında (${aralik}).` }));
            continue;
          }
          pts.push({ tarih: row.tarih, km: row.km });
        }

        const prevFuel = row.km !== null && row.km > 0 ? findPrevFuelPoint(fPts, row.tarih, row.km) : null;
        const uyarilar = [
          evalTankOverflowRule({ plaka: vehicle.plaka, depo: toPosNum(vehicle.depo_kapasitesi_l), litre: row.litre }),
          evalConsecutiveFillRule({ plaka: vehicle.plaka, curTarih: row.tarih, curKm: row.km, prev: prevFuel, sayacTipi }),
          evalHighConsumptionRule({ plaka: vehicle.plaka, curKm: row.km, prev: prevFuel, litre: row.litre, sayacTipi, hedef: toPosNum(vehicle.hedef_tuketim) }),
        ].filter(Boolean).map(({ tip, seviye, aciklama }) => ({ tip, seviye, aciklama }));

        if (row.km !== null && row.km > 0) fPts.push({ tarih: row.tarih, km: row.km });
        const validRow = formatRow(row, 'gecerli', { arac_id: aracId, uyarilar });
        accepted.push(validRow);
        results.push(validRow);
      }
    }
  }

  accepted.sort(cmpImportOrder);
  results.sort((a, b) => a.satir_no - b.satir_no);
  return { accepted, results };
};

const summarizeRows = (results, accepted) => ({
  toplam: results.length,
  mukerrer: results.filter((r) => r.durum === 'mukerrer').length,
  hatali: results.filter((r) => r.durum === 'hatali').length,
  toplam_litre: round2(accepted.reduce((s, r) => s + Number(r.litre || 0), 0)),
  toplam_tutar: round2(accepted.reduce((s, r) => s + Number(r.tutar || 0), 0)),
});

const previewFuelCsv = async (user, csvText) => {
  const parsedRows = parseFuelCsv(csvText);
  const byPlate = await loadAccessibleVehicles(pool, user);
  const { accepted, results } = await evaluateImportRows(pool, parsedRows, byPlate);
  return { ozet: { ...summarizeRows(results, accepted), gecerli: accepted.length }, satirlar: results };
};

const importFuelCsv = async (user, csvText) => {
  const parsedRows = parseFuelCsv(csvText);
  let client;
  let accepted = [];
  let results = [];
  let insertedIds = [];
  let insertedAracIds = [];

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const byPlate = await loadAccessibleVehicles(client, user);
    const lockIds = [...new Set(parsedRows.filter((r) => !r.neden_kodu && byPlate.has(r.plaka)).map((r) => byPlate.get(r.plaka).arac_id))];
    if (lockIds.length > 0) {
      const lockMap = new Map((await araclariKilitle(client, lockIds)).map((l) => [l.arac_id, l]));
      for (const v of byPlate.values()) {
        const l = lockMap.get(v.arac_id);
        if (l) Object.assign(v, { sayac_tipi: l.sayac_tipi, guncel_km: Number(l.guncel_km || 0), guncel_calisma_saati: Number(l.guncel_calisma_saati || 0) });
      }
    }

    ({ accepted, results } = await evaluateImportRows(client, parsedRows, byPlate));
    if (accepted.length > 0) {
      const ins = await client.query(
        `INSERT INTO yakitlar (arac_id, yakit_tipi, tarih, litre, tutar, km, notlar, fatura_no, olusturan_user_id)
         SELECT * FROM UNNEST($1::int[], $2::varchar[], $3::date[], $4::numeric[], $5::numeric[], $6::int[], $7::text[], $8::varchar[], $9::int[])
         RETURNING yakit_id, arac_id, tarih, km`,
        [
          accepted.map((r) => r.arac_id), accepted.map((r) => r.yakit_tipi), accepted.map((r) => r.tarih),
          accepted.map((r) => r.litre), accepted.map((r) => r.tutar), accepted.map((r) => r.km),
          accepted.map((r) => (r.istasyon ? `İstasyon: ${r.istasyon}`.slice(0, 2000) : null)),
          accepted.map((r) => r.fatura_no), accepted.map(() => user.user_id || null),
        ]
      );
      ins.rows.forEach((dbRow, i) => { accepted[i].yakit_id = dbRow.yakit_id; });
      insertedIds = ins.rows.map((r) => r.yakit_id);
      insertedAracIds = [...new Set(ins.rows.map((r) => r.arac_id))];

      const maxKmMap = new Map();
      for (const r of accepted) {
        if (r.km !== null && r.km > (maxKmMap.get(r.arac_id) ?? -1)) maxKmMap.set(r.arac_id, r.km);
      }
      if (maxKmMap.size > 0) {
        await client.query(
          `UPDATE araclar a
           SET guncel_km = CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_km ELSE GREATEST(COALESCE(a.guncel_km, 0), v.max_km) END,
               guncel_calisma_saati = CASE WHEN a.sayac_tipi = 'SMH' THEN GREATEST(COALESCE(a.guncel_calisma_saati, 0), v.max_km) ELSE a.guncel_calisma_saati END
           FROM UNNEST($1::int[], $2::int[]) AS v(arac_id, max_km) WHERE a.arac_id = v.arac_id`,
          [[...maxKmMap.keys()], [...maxKmMap.values()]]
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    if (client) client.release();
  }

  let yeniAnomali = 0;
  if (insertedIds.length > 0) {
    try {
      const res = await evaluateBatchFuelAnomalies({ aracIds: insertedAracIds, targetYakitIds: insertedIds, minTarih: accepted[0].tarih });
      yeniAnomali = res.yeni_anomali || 0;
    } catch (anomErr) {
      console.error('Toplu yakıt anomali değerlendirme hatası:', anomErr);
    }
  }
  return { ozet: { ...summarizeRows(results, accepted), eklenen: accepted.length, yeni_anomali: yeniAnomali }, satirlar: results };
};

module.exports = { previewFuelCsv, importFuelCsv };
