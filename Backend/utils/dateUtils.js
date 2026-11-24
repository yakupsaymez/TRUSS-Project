const IS_TZ = 'Europe/Istanbul';
const DAILY_MS = 86400000;

// Europe/Istanbul takvim gününü 'YYYY-MM-DD' olarak üretir (en-CA formatı ISO sırasını verir)
const tarihFormatlayici = new Intl.DateTimeFormat('en-CA', {
  timeZone: IS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const pad2 = (n) => String(n).padStart(2, '0');

// Türkiye'de bugünün takvim günü (now parametresi test edilebilirlik içindir)
const bugunTR = (now = new Date()) => tarihFormatlayici.format(now);

// Girdiyi 'YYYY-MM-DD' takvim gününe çevirir; çözülemezse null döner
const tarihStr = (input) => {
  // Kullanıcının girdiği takvim günü aynen korunur (saat dilimi çevrimi yapılmaz)
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const gun = input.slice(0, 10);
    const [y, m, d] = gun.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    // Takvimde olmayan günleri (2026-13-45, 2026-02-30) reddeder
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) {
      return null;
    }
    return gun;
  }
  // Geçerli Date nesnesi Türkiye takvim gününe çevrilir
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return tarihFormatlayici.format(input);
  }
  return null;
};

// Girdi Türkiye'deki bugünden ileri bir tarihse true döner
const ileriTarihMi = (input, now = new Date()) => {
  const t = tarihStr(input);
  return t !== null && t > bugunTR(now);
};

// Takvim gününü UTC gece yarısı milisaniyesine çevirir; geçersizse null döner
const parseCalendarUtcMs = (input) => {
  const s = tarihStr(input);
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

// İki takvim günü arasındaki tam gün farkı (hedef - baz)
const gunFarkiTR = (hedefTarih, bazTarih = bugunTR()) => {
  const hedefMs = parseCalendarUtcMs(hedefTarih);
  const bazMs = parseCalendarUtcMs(bazTarih);
  if (hedefMs === null || bazMs === null) return null;
  return Math.round((hedefMs - bazMs) / DAILY_MS);
};

// Verilen takvim gününe gün ekler/çıkarır ve 'YYYY-MM-DD' döner
const gunEkleTR = (bazTarih, gun) => {
  const bazMs = parseCalendarUtcMs(bazTarih);
  const delta = Number(gun);
  if (bazMs === null || !Number.isFinite(delta)) return null;
  const dt = new Date(bazMs + Math.trunc(delta) * DAILY_MS);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
};

// Verilen takvim gününe yıl ekler; 29 Şubat artık gün taşmasını 28 Şubat'a güvenli indirger
const yilEkleTR = (bazTarih, yil) => {
  const s = tarihStr(bazTarih);
  const deltaYil = Number(yil);
  if (!s || !Number.isFinite(deltaYil)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const hedefYil = y + Math.trunc(deltaYil);
  const ayinSonGunu = new Date(Date.UTC(hedefYil, m, 0)).getUTCDate();
  const guvenliGun = Math.min(d, ayinSonGunu);
  return `${hedefYil}-${pad2(m)}-${pad2(guvenliGun)}`;
};

// Türkiye takvim günü üzerinden ISO-8601 hafta anahtarı ('YYYY-Www')
const isoHaftaTR = (now = new Date()) => {
  const ms = parseCalendarUtcMs(bugunTR(now));
  const dt = new Date(ms);
  const gunNo = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - gunNo);
  const isoYil = dt.getUTCFullYear();
  const yilBasi = Date.UTC(isoYil, 0, 1);
  const haftaNo = Math.ceil(((dt.getTime() - yilBasi) / DAILY_MS + 1) / 7);
  return `${isoYil}-W${pad2(haftaNo)}`;
};

// Takvim gününü 'DD.MM.YYYY' formatında döndürür
const trTarihFormatla = (input) => {
  const s = tarihStr(input);
  if (!s) return '';
  return `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
};

module.exports = {
  bugunTR,
  tarihStr,
  ileriTarihMi,
  parseCalendarUtcMs,
  gunFarkiTR,
  gunEkleTR,
  yilEkleTR,
  isoHaftaTR,
  trTarihFormatla,
};
