const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { tarihStr, gunEkleTR, bugunTR } = require('../utils/dateUtils');
const {
  toPosNum,
  evalTankOverflowRule,
  evalConsecutiveFillRule,
  evalUnitPriceRule,
  evalHighConsumptionRule,
  collectScanAnomalies,
} = require('./fuelAnomalyRules');

const fetchCurrentRecord = async (db, yakitId) => {
  const res = await db.query(
    `SELECT y.yakit_id, y.arac_id, y.tarih, y.litre, y.tutar, y.km,
            a.org_id, a.plaka, a.sayac_tipi, a.depo_kapasitesi_l, a.hedef_tuketim
     FROM yakitlar y
     INNER JOIN araclar a ON a.arac_id = y.arac_id
     WHERE y.yakit_id = $1
     LIMIT 1`,
    [yakitId]
  );
  return res.rows[0] || null;
};

const fetchPreviousFuelRecord = async (db, aracId, curTarih, curKm, yakitId) => {
  if (!curTarih || !Number.isFinite(curKm) || curKm <= 0) return null;
  const res = await db.query(
    `SELECT yakit_id, tarih, km, litre, tutar
     FROM yakitlar
     WHERE arac_id = $1
       AND km IS NOT NULL
       AND km > 0
       AND (tarih, km, yakit_id) < ($2::date, $3::int, $4::int)
     ORDER BY tarih DESC, km DESC, yakit_id DESC
     LIMIT 1`,
    [aracId, curTarih, Math.trunc(curKm), yakitId]
  );
  return res.rows[0] || null;
};

const checkUnitPriceAnomaly = async (db, cur, curTarih, litre, tutar) => {
  if (cur.org_id === null || cur.org_id === undefined || !curTarih || !litre || !tutar) return null;
  const start30 = gunEkleTR(curTarih, -30);
  if (!start30) return null;

  const res = await db.query(
    `SELECT COUNT(*)::int AS cnt, AVG(y2.tutar / y2.litre)::numeric AS ort_birim_fiyat
     FROM yakitlar y2
     INNER JOIN araclar a2 ON a2.arac_id = y2.arac_id
     WHERE a2.org_id = $1
       AND y2.yakit_id <> $2
       AND y2.litre > 0
       AND y2.tutar > 0
       AND y2.tarih >= $3::date
       AND y2.tarih <= $4::date`,
    [cur.org_id, cur.yakit_id, start30, curTarih]
  );

  return evalUnitPriceRule({
    plaka: cur.plaka,
    litre,
    tutar,
    cnt: Number(res.rows[0]?.cnt || 0),
    ortBirimFiyat: res.rows[0]?.ort_birim_fiyat,
  });
};

const checkHighConsumptionAnomaly = async (db, cur, curTarih, curKm, prev, litre, sayacTipi, hedef) => {
  if (curKm === null || !prev || !litre) return null;
  const prevKm = Number(prev.km);
  if (!Number.isFinite(prevKm) || curKm - prevKm <= 0) return null;

  if (hedef !== null) {
    return evalHighConsumptionRule({ plaka: cur.plaka, curKm, prev, litre, sayacTipi, hedef });
  }

  if (!curTarih) return null;
  const start90 = gunEkleTR(curTarih, -90);
  if (!start90) return null;

  const avgRes = await db.query(
    `WITH sirali AS (
       SELECT litre, km, LAG(km) OVER (ORDER BY tarih ASC, km ASC, yakit_id ASC) AS prev_km
       FROM yakitlar
       WHERE arac_id = $1
         AND yakit_id <> $2
         AND km IS NOT NULL
         AND km > 0
         AND litre > 0
         AND tutar > 0
         AND tarih >= $3::date
         AND tarih <= $4::date
     )
     SELECT
       COUNT(*)::int AS cnt,
       AVG(
         CASE
           WHEN $5 = 'SMH' THEN litre::numeric / (km - prev_km)
           ELSE (litre::numeric / (km - prev_km)) * 100
         END
       )::numeric AS ort_tuketim
     FROM sirali
     WHERE prev_km IS NOT NULL AND km > prev_km`,
    [cur.arac_id, cur.yakit_id, start90, curTarih, sayacTipi]
  );

  return evalHighConsumptionRule({
    plaka: cur.plaka,
    curKm,
    prev,
    litre,
    sayacTipi,
    hedef: null,
    cnt: Number(avgRes.rows[0]?.cnt || 0),
    ortTuketim: avgRes.rows[0]?.ort_tuketim,
  });
};

/**
 * Tek yakıt kaydı için deterministik 4 suistimal/tüketim kuralını çalıştırıp anomalileri kaydeder.
 */
const evaluateFuelRecordAnomalies = async (yakitId, { mode = 'create', db = pool } = {}) => {
  const cur = await fetchCurrentRecord(db, yakitId);
  if (!cur) return [];

  if (mode === 'update') {
    await db.query(`DELETE FROM yakit_anomalileri WHERE yakit_id = $1 AND durum = 'acik'`, [yakitId]);
    await db.query(
      `UPDATE yakit_anomalileri
       SET arac_id = $2, org_id = $3
       WHERE yakit_id = $1 AND (arac_id <> $2 OR org_id IS DISTINCT FROM $3)`,
      [yakitId, cur.arac_id, cur.org_id || null]
    );
  }

  const litre = toPosNum(cur.litre);
  const tutar = toPosNum(cur.tutar);
  const curKm = toPosNum(cur.km);
  const depo = toPosNum(cur.depo_kapasitesi_l);
  const hedef = toPosNum(cur.hedef_tuketim);
  const sayacTipi = cur.sayac_tipi === 'SMH' ? 'SMH' : 'KM';
  const curTarih = tarihStr(cur.tarih);

  const prev = curKm !== null ? await fetchPreviousFuelRecord(db, cur.arac_id, curTarih, curKm, cur.yakit_id) : null;
  const detected = [
    evalTankOverflowRule({ plaka: cur.plaka, depo, litre }),
    evalConsecutiveFillRule({ plaka: cur.plaka, curTarih, curKm, prev, sayacTipi }),
    await checkUnitPriceAnomaly(db, cur, curTarih, litre, tutar),
    await checkHighConsumptionAnomaly(db, cur, curTarih, curKm, prev, litre, sayacTipi, hedef),
  ].filter(Boolean);

  const inserted = [];
  for (const a of detected) {
    const insRes = await db.query(
      `INSERT INTO yakit_anomalileri (org_id, arac_id, yakit_id, tip, seviye, olculen_deger, beklenen_esik, aciklama)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (yakit_id, tip) DO NOTHING
       RETURNING *`,
      [cur.org_id || null, cur.arac_id, cur.yakit_id, a.tip, a.seviye, a.olculen_deger, a.beklenen_esik, a.aciklama]
    );
    if (insRes.rows[0]) inserted.push(insRes.rows[0]);
  }

  return inserted;
};

const buildVehicleFuelMap = (rows, baslangic, targetIdSet = null) => {
  const byVehicle = new Map();
  const orgIdSet = new Set();
  let tarananKayit = 0;

  for (const row of rows) {
    const curTarih = tarihStr(row.tarih);
    const enriched = {
      ...row,
      tarihStr: curTarih,
      litrePos: toPosNum(row.litre),
      tutarPos: toPosNum(row.tutar),
      kmPos: toPosNum(row.km),
    };
    const isTarget = targetIdSet ? targetIdSet.has(row.yakit_id) : Boolean(curTarih && curTarih >= baslangic);
    if (isTarget) {
      tarananKayit += 1;
      if (row.org_id !== null && row.org_id !== undefined) orgIdSet.add(Number(row.org_id));
    }
    if (!byVehicle.has(row.arac_id)) byVehicle.set(row.arac_id, []);
    byVehicle.get(row.arac_id).push(enriched);
  }
  return { byVehicle, orgIdSet, tarananKayit };
};

const loadOrgUnitPrices = async (orgIds, priceStart) => {
  const pricesByOrg = new Map();
  if (!orgIds || orgIds.length === 0 || !priceStart) return pricesByOrg;

  const priceRes = await pool.query(
    `SELECT a.org_id, y.yakit_id, y.tarih, (y.tutar / y.litre)::numeric AS birim_fiyat
     FROM yakitlar y INNER JOIN araclar a ON a.arac_id = y.arac_id
     WHERE a.org_id = ANY($1::int[]) AND y.litre > 0 AND y.tutar > 0 AND y.tarih >= $2::date
     ORDER BY a.org_id ASC, y.tarih ASC, y.yakit_id ASC`,
    [orgIds, priceStart]
  );
  for (const pr of priceRes.rows) {
    const oid = Number(pr.org_id);
    const birimFiyat = Number(pr.birim_fiyat);
    if (!Number.isFinite(birimFiyat)) continue;
    if (!pricesByOrg.has(oid)) pricesByOrg.set(oid, []);
    pricesByOrg.get(oid).push({ yakit_id: pr.yakit_id, tarih: tarihStr(pr.tarih), birimFiyat });
  }
  return pricesByOrg;
};

const insertAnomaliesBatch = async (allDetected) => {
  if (!allDetected || allDetected.length === 0) return 0;
  const insRes = await pool.query(
    `INSERT INTO yakit_anomalileri (org_id, arac_id, yakit_id, tip, seviye, olculen_deger, beklenen_esik, aciklama)
     SELECT * FROM UNNEST($1::int[], $2::int[], $3::int[], $4::text[], $5::text[], $6::numeric[], $7::numeric[], $8::text[])
     ON CONFLICT (yakit_id, tip) DO NOTHING
     RETURNING anomali_id`,
    [
      allDetected.map((d) => d.org_id), allDetected.map((d) => d.arac_id),
      allDetected.map((d) => d.yakit_id), allDetected.map((d) => d.tip),
      allDetected.map((d) => d.seviye), allDetected.map((d) => d.olculen_deger),
      allDetected.map((d) => d.beklenen_esik), allDetected.map((d) => d.aciklama),
    ]
  );
  return insRes.rowCount || 0;
};

const fetchWindowedFuelRows = async (vehicleClause, vehicleParams, historyStart) => {
  const res = await pool.query(
    `WITH erisebilir AS (
       SELECT a.arac_id, a.org_id, a.plaka, a.sayac_tipi, a.depo_kapasitesi_l, a.hedef_tuketim
       FROM araclar a WHERE (${vehicleClause})
     ),
     sonrasi AS (
       SELECT y.yakit_id, y.arac_id, y.tarih, y.litre, y.tutar, y.km,
              e.org_id, e.plaka, e.sayac_tipi, e.depo_kapasitesi_l, e.hedef_tuketim
       FROM yakitlar y INNER JOIN erisebilir e ON e.arac_id = y.arac_id WHERE y.tarih >= $1::date
     ),
     oncesi AS (
       SELECT DISTINCT ON (y.arac_id) y.yakit_id, y.arac_id, y.tarih, y.litre, y.tutar, y.km,
              e.org_id, e.plaka, e.sayac_tipi, e.depo_kapasitesi_l, e.hedef_tuketim
       FROM yakitlar y INNER JOIN erisebilir e ON e.arac_id = y.arac_id
       WHERE y.tarih < $1::date AND y.km IS NOT NULL AND y.km > 0
       ORDER BY y.arac_id, y.tarih DESC, y.km DESC, y.yakit_id DESC
     )
     SELECT * FROM (SELECT * FROM oncesi UNION ALL SELECT * FROM sonrasi) birlesik
     ORDER BY arac_id ASC, tarih ASC, km ASC NULLS LAST, yakit_id ASC`,
    [historyStart, ...vehicleParams]
  );
  return res.rows;
};

/**
 * Kullanıcının erişebildiği son N günlük yakıt kayıtlarını toplu sorgu + bellek içi pencereleme ile tarar.
 */
const scanAccessibleFuelAnomalies = async (user, { gun = 90 } = {}) => {
  const { clause, params } = buildVehicleAccessFilter(user, 2);
  const baslangic = gunEkleTR(bugunTR(), -gun);
  const rows = await fetchWindowedFuelRows(`(${clause}) AND a.arsivlendi_mi = FALSE`, params, gunEkleTR(baslangic, -90));
  const { byVehicle, orgIdSet, tarananKayit } = buildVehicleFuelMap(rows, baslangic);
  if (tarananKayit === 0) return { taranan_kayit: 0, yeni_anomali: 0 };

  const pricesByOrg = await loadOrgUnitPrices([...orgIdSet], gunEkleTR(baslangic, -30));
  const allDetected = collectScanAnomalies(byVehicle, pricesByOrg, baslangic);
  return { taranan_kayit: tarananKayit, yeni_anomali: await insertAnomaliesBatch(allDetected) };
};

/**
 * Toplu CSV aktarımı sonrası yalnızca eklenen kayıtlar için pencereleme ile anomali üretir.
 */
const evaluateBatchFuelAnomalies = async ({ aracIds, targetYakitIds, minTarih }) => {
  const uniqueAracIds = [...new Set((aracIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  const targetIdSet = new Set((targetYakitIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0));
  if (uniqueAracIds.length === 0 || targetIdSet.size === 0 || !minTarih) return { yeni_anomali: 0 };

  const rows = await fetchWindowedFuelRows('a.arac_id = ANY($2::int[])', [uniqueAracIds], gunEkleTR(minTarih, -90));
  const { byVehicle, orgIdSet } = buildVehicleFuelMap(rows, minTarih, targetIdSet);
  const pricesByOrg = await loadOrgUnitPrices([...orgIdSet], gunEkleTR(minTarih, -30));
  const detected = collectScanAnomalies(byVehicle, pricesByOrg, minTarih).filter((d) => targetIdSet.has(d.yakit_id));
  return { yeni_anomali: await insertAnomaliesBatch(detected) };
};

module.exports = { evaluateFuelRecordAnomalies, scanAccessibleFuelAnomalies, evaluateBatchFuelAnomalies };
