const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { tarihStr, gunFarkiTR, gunEkleTR, bugunTR } = require('../utils/dateUtils');

const MAX_NUM_12_2 = 9999999999.99;

const toPosNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const round2 = (v) => {
  if (!Number.isFinite(v)) return null;
  const r = Math.round(v * 100) / 100;
  if (!Number.isFinite(r)) return null;
  return Math.min(MAX_NUM_12_2, Math.max(-MAX_NUM_12_2, r));
};

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

  const cnt = Number(res.rows[0]?.cnt || 0);
  const ort = toPosNum(res.rows[0]?.ort_birim_fiyat);
  const birimFiyat = tutar / litre;
  if (cnt >= 3 && ort !== null && Number.isFinite(birimFiyat) && birimFiyat > ort * 1.2) {
    const olculen = round2(birimFiyat);
    const esik = round2(ort * 1.2);
    return {
      tip: 'birim_fiyat_sapma',
      seviye: 'uyari',
      olculen_deger: olculen,
      beklenen_esik: esik,
      aciklama: `${cur.plaka}: Birim yakıt fiyatı (${olculen} ₺/L), 30 günlük kurum ortalamasının (${round2(ort)} ₺/L) +%20 eşiği (${esik} ₺/L) üzerinde.`,
    };
  }
  return null;
};

const checkHighConsumptionAnomaly = async (db, cur, curTarih, curKm, prev, litre, sayacTipi, hedef) => {
  if (curKm === null || !prev || !litre) return null;
  const prevKm = Number(prev.km);
  const delta = Number.isFinite(prevKm) ? curKm - prevKm : 0;
  if (delta <= 0) return null;

  const tuketim = sayacTipi === 'SMH' ? litre / delta : (litre / delta) * 100;
  if (!Number.isFinite(tuketim) || tuketim <= 0) return null;

  const birimStr = sayacTipi === 'SMH' ? 'L/saat' : 'L/100km';
  if (hedef !== null) {
    if (tuketim > hedef * 1.25) {
      const olculen = round2(tuketim);
      const esik = round2(hedef * 1.25);
      return {
        tip: 'yuksek_tuketim',
        seviye: tuketim > hedef * 1.5 ? 'kritik' : 'uyari',
        olculen_deger: olculen,
        beklenen_esik: esik,
        aciklama: `${cur.plaka}: Tüketim (${olculen} ${birimStr}), hedef tüketimin (${round2(hedef)} ${birimStr}) +%25 eşiği (${esik} ${birimStr}) üzerinde.`,
      };
    }
    return null;
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

  const cnt = Number(avgRes.rows[0]?.cnt || 0);
  const ort = toPosNum(avgRes.rows[0]?.ort_tuketim);
  if (cnt >= 3 && ort !== null && tuketim > ort * 1.35) {
    const olculen = round2(tuketim);
    const esik = round2(ort * 1.35);
    return {
      tip: 'yuksek_tuketim',
      seviye: tuketim > ort * 1.65 ? 'kritik' : 'uyari',
      olculen_deger: olculen,
      beklenen_esik: esik,
      aciklama: `${cur.plaka}: Tüketim (${olculen} ${birimStr}), 90 günlük araç ortalamasının (${round2(ort)} ${birimStr}) +%35 eşiği (${esik} ${birimStr}) üzerinde.`,
    };
  }
  return null;
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

  const detected = [];

  // 1. Depo Aşımı
  if (depo !== null && litre !== null && litre > depo * 1.05) {
    const olculen = round2(litre);
    const esik = round2(depo * 1.05);
    detected.push({
      tip: 'depo_asimi',
      seviye: 'kritik',
      olculen_deger: olculen,
      beklenen_esik: esik,
      aciklama: `${cur.plaka}: ${olculen} L dolum, depo kapasitesi (${round2(depo)} L) +%5 eşiği (${esik} L) aşıldı.`,
    });
  }

  const prev = curKm !== null ? await fetchPreviousFuelRecord(db, cur.arac_id, curTarih, curKm, cur.yakit_id) : null;

  // 2. Ardışık Dolum
  if (curKm !== null && prev) {
    const prevTarih = tarihStr(prev.tarih);
    const gunFarki = curTarih && prevTarih ? gunFarkiTR(curTarih, prevTarih) : null;
    const prevKm = Number(prev.km);
    if (gunFarki !== null && gunFarki >= 0 && gunFarki <= 1 && Number.isFinite(prevKm) && prevKm > 0) {
      const delta = curKm - prevKm;
      const esik = sayacTipi === 'SMH' ? 2 : 50;
      if (delta >= 0 && delta < esik) {
        const birim = sayacTipi === 'SMH' ? 'saat' : 'km';
        detected.push({
          tip: 'ardisik_dolum',
          seviye: gunFarki === 0 && delta === 0 ? 'kritik' : 'uyari',
          olculen_deger: round2(delta),
          beklenen_esik: esik,
          aciklama: `${cur.plaka}: ${gunFarki === 0 ? 'Aynı gün' : '1 gün arayla'} yalnızca ${round2(delta)} ${birim} farkla ardışık dolum (eşik: ${esik} ${birim}).`,
        });
      }
    }
  }

  // 3. Birim Fiyat Sapması
  const unitPriceAnomaly = await checkUnitPriceAnomaly(db, cur, curTarih, litre, tutar);
  if (unitPriceAnomaly) detected.push(unitPriceAnomaly);

  // 4. Yüksek Tüketim
  const consumptionAnomaly = await checkHighConsumptionAnomaly(
    db, cur, curTarih, curKm, prev, litre, sayacTipi, hedef
  );
  if (consumptionAnomaly) detected.push(consumptionAnomaly);

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

/**
 * Kullanıcının erişebildiği son N günlük yakıt kayıtlarını kronolojik sırayla tarar.
 */
const scanAccessibleFuelAnomalies = async (user, { gun = 90 } = {}) => {
  const { clause, params } = buildVehicleAccessFilter(user, 2);
  const baslangic = gunEkleTR(bugunTR(), -gun);
  const rowsRes = await pool.query(
    `SELECT y.yakit_id
     FROM yakitlar y
     INNER JOIN araclar a ON a.arac_id = y.arac_id
     WHERE y.tarih >= $1::date
       AND (${clause})
     ORDER BY y.tarih ASC, y.km ASC NULLS LAST, y.yakit_id ASC`,
    [baslangic, ...params]
  );

  let yeniAnomali = 0;
  for (const row of rowsRes.rows) {
    const yeni = await evaluateFuelRecordAnomalies(row.yakit_id, { mode: 'scan' });
    yeniAnomali += yeni.length;
  }

  return { taranan_kayit: rowsRes.rowCount || 0, yeni_anomali: yeniAnomali };
};

module.exports = {
  evaluateFuelRecordAnomalies,
  scanAccessibleFuelAnomalies,
};
