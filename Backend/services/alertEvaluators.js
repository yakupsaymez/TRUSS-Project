const {
  gunFarkiTR,
  tarihStr,
  trTarihFormatla,
  yilEkleTR,
} = require('../utils/dateUtils');

const NOTIFY_DAY_THRESHOLD = 15;
const PARCA_KM_WARNING_THRESHOLD = 1500;
const PARCA_DATE_WARNING_DAYS = 30;
const PREDICTIVE_NOTIFY_DAY_THRESHOLD = 7;
const PARCA_YIL_ARALIGI = { aku: 4, lastikler: 5 };

const EVRAK_TURLERI = [
  { alan: 'muayene_tarihi', tur: 'muayene', etiket: 'Muayene' },
  { alan: 'kasko_tarihi', tur: 'kasko', etiket: 'Kasko' },
  { alan: 'sigorta_tarihi', tur: 'sigorta', etiket: 'Sigorta' },
];

const normalizeParcaAdi = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/ı/g, 'i')
  .replace(/ğ/g, 'g')
  .replace(/ş/g, 's')
  .replace(/ü/g, 'u')
  .replace(/ö/g, 'o')
  .replace(/ç/g, 'c');

const evaluateEvrakAlerts = (arac, bugun) => {
  const alerts = [];
  for (const { alan, tur, etiket } of EVRAK_TURLERI) {
    const tStr = tarihStr(arac[alan]);
    if (!tStr) continue;
    const gunFarki = gunFarkiTR(tStr, bugun);
    if (gunFarki === null || gunFarki > NOTIFY_DAY_THRESHOLD) continue;

    const band = gunFarki < 0 ? 'gecmis' : (gunFarki <= 7 ? 'kritik_7g' : 'uyari_15g');
    const seviye = gunFarki <= 7 ? 'kritik' : 'uyari';
    const tarihTR = trTarihFormatla(tStr);

    alerts.push({
      tur,
      seviye,
      referans_anahtar: `belge:${arac.arac_id}:${tur}:${tStr}:${band}`,
      baslik: gunFarki < 0
        ? `${arac.plaka} ${etiket} süresi doldu`
        : `${arac.plaka} ${etiket} bitimine ${gunFarki} gün`,
      mesaj: gunFarki < 0
        ? `${arac.plaka} plakalı aracın ${etiket.toLowerCase()} tarihi (${tarihTR}) ${Math.abs(gunFarki)} gün önce doldu.`
        : `${arac.plaka} plakalı aracın ${etiket.toLowerCase()} bitişine ${gunFarki} gün kaldı (${tarihTR}).`,
      detay: gunFarki < 0
        ? `${etiket} tarihi (${tarihTR}) ${Math.abs(gunFarki)} gün önce doldu.`
        : `${etiket} bitiş tarihi ${tarihTR} (${gunFarki} gün kaldı).`,
      meta: { tur, tarih: tStr, gun_farki: gunFarki, plaka: arac.plaka },
    });
  }
  return alerts;
};

const evaluateParcaAlerts = (item, bugun) => {
  const alerts = [];
  const currentKm = Number(item.guncel_km) || 0;
  const isSmh = item.sayac_tipi === 'SMH';
  const birim = isSmh ? 'saat' : 'KM';

  if (item.degisim_araligi_km !== null && item.degisim_araligi_km !== undefined && Number(item.degisim_araligi_km) > 0) {
    const aralik = Number(item.degisim_araligi_km);
    const sonKm = Number(item.son_degisim_km) || 0;
    const kalanKm = (sonKm + aralik) - currentKm;
    const esik = isSmh
      ? Math.max(25, Math.round(aralik * 0.15))
      : Math.min(PARCA_KM_WARNING_THRESHOLD, Math.round(aralik * 0.15) || PARCA_KM_WARNING_THRESHOLD);

    if (kalanKm <= esik) {
      const durum = kalanKm <= 0 ? 'asildi' : 'yaklasti';
      alerts.push({
        seviye: kalanKm <= 0 ? 'kritik' : 'uyari',
        referans_anahtar: `parca:${item.parca_id}:km:${sonKm}:${durum}`,
        baslik: `${item.plaka} — ${item.parca_adi} ${kalanKm <= 0 ? 'ömrü doldu' : 'değişimi yaklaştı'}`,
        mesaj: kalanKm <= 0
          ? `${item.plaka} plakalı araçta ${item.parca_adi} ömrü ${Math.abs(kalanKm).toLocaleString('tr-TR')} ${birim} aşıldı.`
          : `${item.plaka} plakalı araçta ${item.parca_adi} değişimine ${kalanKm.toLocaleString('tr-TR')} ${birim} kaldı.`,
        detay: kalanKm <= 0
          ? `Parça ömrü ${Math.abs(kalanKm).toLocaleString('tr-TR')} ${birim} aşıldı.`
          : `Değişime ${kalanKm.toLocaleString('tr-TR')} ${birim} kaldı.`,
        meta: { parca_id: item.parca_id, kalan_km: kalanKm, birim, plaka: item.plaka },
      });
    }
  }

  const yilAraligi = PARCA_YIL_ARALIGI[normalizeParcaAdi(item.parca_adi)];
  const sonTarih = tarihStr(item.son_degisim_tarihi);
  if (yilAraligi && sonTarih) {
    const bitisTarihi = yilEkleTR(sonTarih, yilAraligi);
    const kalanGun = gunFarkiTR(bitisTarihi, bugun);
    if (kalanGun !== null && kalanGun <= PARCA_DATE_WARNING_DAYS) {
      const durum = kalanGun < 0 ? 'asildi' : 'yaklasti';
      const bitisTR = trTarihFormatla(bitisTarihi);
      alerts.push({
        seviye: kalanGun < 0 ? 'kritik' : 'uyari',
        referans_anahtar: `parca:${item.parca_id}:tarih:${sonTarih}:${durum}`,
        baslik: `${item.plaka} — ${item.parca_adi} tarih bazlı uyarı`,
        mesaj: kalanGun < 0
          ? `${item.plaka} plakalı araçta ${item.parca_adi} tarih bazlı ömrünü (${bitisTR}) ${Math.abs(kalanGun)} gün geçti.`
          : `${item.plaka} plakalı araçta ${item.parca_adi} tarih bazlı değişimine ${kalanGun} gün kaldı (${bitisTR}).`,
        detay: kalanGun < 0
          ? `Tarih bazlı ömür (${bitisTR}) ${Math.abs(kalanGun)} gün geçildi.`
          : `Tarih bazlı değişime ${kalanGun} gün kaldı (${bitisTR}).`,
        meta: { parca_id: item.parca_id, kalan_gun: kalanGun, bitis_tarihi: bitisTarihi, plaka: item.plaka },
      });
    }
  }

  return alerts;
};

module.exports = {
  NOTIFY_DAY_THRESHOLD,
  PREDICTIVE_NOTIFY_DAY_THRESHOLD,
  evaluateEvrakAlerts,
  evaluateParcaAlerts,
};
