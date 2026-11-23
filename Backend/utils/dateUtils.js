const IS_TZ = 'Europe/Istanbul';

// Europe/Istanbul takvim gününü 'YYYY-MM-DD' olarak üretir (en-CA formatı ISO sırasını verir)
const tarihFormatlayici = new Intl.DateTimeFormat('en-CA', {
  timeZone: IS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

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

module.exports = { bugunTR, tarihStr, ileriTarihMi };
