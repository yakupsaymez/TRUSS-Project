const { tarihStr, gunFarkiTR, gunEkleTR } = require('../utils/dateUtils');

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

const evalTankOverflowRule = ({ plaka, depo, litre }) => {
  if (depo === null || litre === null || !(litre > depo * 1.05)) return null;
  const olculen = round2(litre);
  const esik = round2(depo * 1.05);
  return {
    tip: 'depo_asimi',
    seviye: 'kritik',
    olculen_deger: olculen,
    beklenen_esik: esik,
    aciklama: `${plaka}: ${olculen} L dolum, depo kapasitesi (${round2(depo)} L) +%5 eşiği (${esik} L) aşıldı.`,
  };
};

const evalConsecutiveFillRule = ({ plaka, curTarih, curKm, prev, sayacTipi }) => {
  if (curKm === null || !prev) return null;
  const prevTarih = tarihStr(prev.tarih);
  const gunFarki = curTarih && prevTarih ? gunFarkiTR(curTarih, prevTarih) : null;
  const prevKm = Number(prev.km);
  if (gunFarki === null || gunFarki < 0 || gunFarki > 1 || !Number.isFinite(prevKm) || prevKm <= 0) {
    return null;
  }

  const delta = curKm - prevKm;
  const esik = sayacTipi === 'SMH' ? 2 : 50;
  if (delta >= 0 && delta < esik) {
    const birim = sayacTipi === 'SMH' ? 'saat' : 'km';
    return {
      tip: 'ardisik_dolum',
      seviye: gunFarki === 0 && delta === 0 ? 'kritik' : 'uyari',
      olculen_deger: round2(delta),
      beklenen_esik: esik,
      aciklama: `${plaka}: ${gunFarki === 0 ? 'Aynı gün' : '1 gün arayla'} yalnızca ${round2(delta)} ${birim} farkla ardışık dolum (eşik: ${esik} ${birim}).`,
    };
  }
  return null;
};

const evalUnitPriceRule = ({ plaka, litre, tutar, cnt, ortBirimFiyat }) => {
  if (!litre || !tutar) return null;
  const ort = toPosNum(ortBirimFiyat);
  const birimFiyat = tutar / litre;
  if (Number(cnt) >= 3 && ort !== null && Number.isFinite(birimFiyat) && birimFiyat > ort * 1.2) {
    const olculen = round2(birimFiyat);
    const esik = round2(ort * 1.2);
    return {
      tip: 'birim_fiyat_sapma',
      seviye: 'uyari',
      olculen_deger: olculen,
      beklenen_esik: esik,
      aciklama: `${plaka}: Birim yakıt fiyatı (${olculen} ₺/L), 30 günlük kurum ortalamasının (${round2(ort)} ₺/L) +%20 eşiği (${esik} ₺/L) üzerinde.`,
    };
  }
  return null;
};

const evalHighConsumptionRule = ({ plaka, curKm, prev, litre, sayacTipi, hedef, cnt, ortTuketim }) => {
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
        aciklama: `${plaka}: Tüketim (${olculen} ${birimStr}), hedef tüketimin (${round2(hedef)} ${birimStr}) +%25 eşiği (${esik} ${birimStr}) üzerinde.`,
      };
    }
    return null;
  }

  const ort = toPosNum(ortTuketim);
  if (Number(cnt) >= 3 && ort !== null && tuketim > ort * 1.35) {
    const olculen = round2(tuketim);
    const esik = round2(ort * 1.35);
    return {
      tip: 'yuksek_tuketim',
      seviye: tuketim > ort * 1.65 ? 'kritik' : 'uyari',
      olculen_deger: olculen,
      beklenen_esik: esik,
      aciklama: `${plaka}: Tüketim (${olculen} ${birimStr}), 90 günlük araç ortalamasının (${round2(ort)} ${birimStr}) +%35 eşiği (${esik} ${birimStr}) üzerinde.`,
    };
  }
  return null;
};

const computeOrg30DayAvg = (orgPrices, curYakitId, start30, curTarih) => {
  let cnt = 0;
  let sum = 0;
  for (const pr of orgPrices) {
    if (pr.tarih > curTarih) break;
    if (pr.tarih >= start30 && pr.yakit_id !== curYakitId) {
      cnt += 1;
      sum += pr.birimFiyat;
    }
  }
  return { cnt, ortBirimFiyat: cnt > 0 ? sum / cnt : null };
};

const computeVehicle90DayAvg = (vehicleRows, curYakitId, start90, curTarih, sayacTipi) => {
  let prevKm = null;
  let cnt = 0;
  let sum = 0;
  for (const r of vehicleRows) {
    if (r.tarihStr > curTarih) break;
    if (r.tarihStr < start90 || r.yakit_id === curYakitId) continue;
    if (r.kmPos === null || r.litrePos === null || r.tutarPos === null) continue;
    if (prevKm !== null && r.kmPos > prevKm) {
      const delta = r.kmPos - prevKm;
      sum += sayacTipi === 'SMH' ? r.litrePos / delta : (r.litrePos / delta) * 100;
      cnt += 1;
    }
    prevKm = r.kmPos;
  }
  return { cnt, ortTuketim: cnt > 0 ? sum / cnt : null };
};

const collectScanAnomalies = (byVehicle, pricesByOrg, baslangic) => {
  const allDetected = [];
  for (const vehicleRows of byVehicle.values()) {
    let prevKmRow = null;
    for (const cur of vehicleRows) {
      const prev = cur.kmPos !== null ? prevKmRow : null;
      if (cur.tarihStr && cur.tarihStr >= baslangic) {
        const sayacTipi = cur.sayac_tipi === 'SMH' ? 'SMH' : 'KM';
        const depo = toPosNum(cur.depo_kapasitesi_l);
        const hedef = toPosNum(cur.hedef_tuketim);
        const candidates = [
          evalTankOverflowRule({ plaka: cur.plaka, depo, litre: cur.litrePos }),
          evalConsecutiveFillRule({ plaka: cur.plaka, curTarih: cur.tarihStr, curKm: cur.kmPos, prev, sayacTipi }),
        ];

        if (cur.org_id !== null && cur.org_id !== undefined && cur.litrePos && cur.tutarPos) {
          const start30 = gunEkleTR(cur.tarihStr, -30);
          const orgPrices = pricesByOrg.get(Number(cur.org_id)) || [];
          const { cnt, ortBirimFiyat } = start30 ? computeOrg30DayAvg(orgPrices, cur.yakit_id, start30, cur.tarihStr) : { cnt: 0, ortBirimFiyat: null };
          candidates.push(evalUnitPriceRule({ plaka: cur.plaka, litre: cur.litrePos, tutar: cur.tutarPos, cnt, ortBirimFiyat }));
        }

        if (cur.kmPos !== null && prev && cur.litrePos && cur.kmPos - Number(prev.km) > 0) {
          let stats = { cnt: 0, ortTuketim: null };
          if (hedef === null) {
            const start90 = gunEkleTR(cur.tarihStr, -90);
            if (start90) stats = computeVehicle90DayAvg(vehicleRows, cur.yakit_id, start90, cur.tarihStr, sayacTipi);
          }
          candidates.push(evalHighConsumptionRule({ plaka: cur.plaka, curKm: cur.kmPos, prev, litre: cur.litrePos, sayacTipi, hedef, ...stats }));
        }

        for (const a of candidates) {
          if (a) allDetected.push({ org_id: cur.org_id || null, arac_id: cur.arac_id, yakit_id: cur.yakit_id, ...a });
        }
      }
      if (cur.kmPos !== null) prevKmRow = cur;
    }
  }
  return allDetected;
};

module.exports = {
  toPosNum,
  round2,
  evalTankOverflowRule,
  evalConsecutiveFillRule,
  evalUnitPriceRule,
  evalHighConsumptionRule,
  collectScanAnomalies,
};
