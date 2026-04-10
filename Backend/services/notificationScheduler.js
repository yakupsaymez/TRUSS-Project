const cron = require('node-cron');
const pool = require('../db');
const { sendEmail, sendSMS } = require('./notificationService');

const NOTIFY_DAY_THRESHOLD = 15;
const PARCA_KM_WARNING_THRESHOLD = 1500;

const PARCA_YIL_ARALIGI = {
  'Akü': 4,
  'Lastikler': 5
};

const buildDateAlert = (label, tarih) => {
  if (!tarih) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(tarih);
  if (Number.isNaN(targetDate.getTime())) return null;
  targetDate.setHours(0, 0, 0, 0);

  const dayDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff < 0) return `${label} tarihi gecmis.`;
  if (dayDiff <= NOTIFY_DAY_THRESHOLD) return `${label} bitimine ${dayDiff} gun kaldi.`;
  return null;
};

const getEvrakAdaylari = async () => {
  const query = `
    SELECT
      u.user_id,
      u.ad_soyad,
      u.email,
      u.telefon,
      a.arac_id,
      a.plaka,
      a.muayene_tarihi,
      a.kasko_tarihi,
      a.sigorta_tarihi
    FROM users u
    INNER JOIN araclar a ON a.kullanici_id = u.user_id
    WHERE
      (a.muayene_tarihi IS NOT NULL AND a.muayene_tarihi <= CURRENT_DATE + ($1 || ' day')::interval)
      OR (a.kasko_tarihi IS NOT NULL AND a.kasko_tarihi <= CURRENT_DATE + ($1 || ' day')::interval)
      OR (a.sigorta_tarihi IS NOT NULL AND a.sigorta_tarihi <= CURRENT_DATE + ($1 || ' day')::interval)
  `;

  const result = await pool.query(query, [NOTIFY_DAY_THRESHOLD]);
  return result.rows;
};

const getParcaAdaylari = async () => {
  const query = `
    SELECT
      p.parca_id,
      p.parca_adi,
      p.son_degisim_km,
      p.degisim_araligi_km,
      p.son_degisim_tarihi,
      a.arac_id,
      a.plaka,
      u.user_id,
      u.ad_soyad,
      u.email,
      u.telefon,
      GREATEST(
        COALESCE((SELECT MAX(y.km) FROM yakitlar y WHERE y.arac_id = a.arac_id), 0),
        COALESCE((SELECT MAX(b.km) FROM bakimlar b WHERE b.arac_id = a.arac_id), 0)
      ) AS guncel_km
    FROM parca_takip p
    INNER JOIN araclar a ON a.arac_id = p.arac_id
    INNER JOIN users u ON u.user_id = a.kullanici_id
  `;

  const result = await pool.query(query);
  return result.rows;
};

const notifyEvraklar = async () => {
  const evraklar = await getEvrakAdaylari();

  for (const item of evraklar) {
    const alerts = [
      buildDateAlert('Muayene', item.muayene_tarihi),
      buildDateAlert('Kasko', item.kasko_tarihi),
      buildDateAlert('Sigorta', item.sigorta_tarihi)
    ].filter(Boolean);

    if (!alerts.length) continue;

    const subject = `ABTS Hatirlatma - ${item.plaka} evrak durumu`;
    const text = `Merhaba ${item.ad_soyad || ''},\n\n${item.plaka} plakali araciniz icin:\n- ${alerts.join('\n- ')}\n\nABTS ekibi`;

    await sendEmail(item.email, subject, text);
    await sendSMS(item.telefon, `${item.plaka} icin: ${alerts.join(' | ')}`);
  }
};

const notifyParcalar = async () => {
  const parcalar = await getParcaAdaylari();

  for (const item of parcalar) {
    const alerts = [];
    const currentKm = Number(item.guncel_km) || 0;

    if (item.degisim_araligi_km !== null && item.degisim_araligi_km !== undefined) {
      const nextKm = (Number(item.son_degisim_km) || 0) + Number(item.degisim_araligi_km);
      const kalanKm = nextKm - currentKm;

      if (kalanKm <= 0) {
        alerts.push(`${item.parca_adi} omru dolmus gorunuyor (${Math.abs(kalanKm)} KM gecikme).`);
      } else if (kalanKm <= PARCA_KM_WARNING_THRESHOLD) {
        alerts.push(`${item.parca_adi} degisimi yaklasiyor (${kalanKm} KM kaldi).`);
      }
    }

    const yilAraligi = PARCA_YIL_ARALIGI[item.parca_adi];
    if (yilAraligi && item.son_degisim_tarihi) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastChangeDate = new Date(item.son_degisim_tarihi);
      if (!Number.isNaN(lastChangeDate.getTime())) {
        lastChangeDate.setHours(0, 0, 0, 0);
        const dueDate = new Date(lastChangeDate);
        dueDate.setFullYear(dueDate.getFullYear() + yilAraligi);

        const kalanGun = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (kalanGun < 0) {
          alerts.push(`${item.parca_adi} tarih bazli omrunu gecmis.`);
        } else if (kalanGun <= 30) {
          alerts.push(`${item.parca_adi} tarih bazli degisimi yaklasiyor (${kalanGun} gun kaldi).`);
        }
      }
    }

    if (!alerts.length) continue;

    const subject = `ABTS Parca Omur Uyarisi - ${item.plaka}`;
    const text = `Merhaba ${item.ad_soyad || ''},\n\n${item.plaka} plakali aracinizda:\n- ${alerts.join('\n- ')}\n\nABTS ekibi`;

    await sendEmail(item.email, subject, text);
    await sendSMS(item.telefon, `${item.plaka}: ${alerts.join(' | ')}`);
  }
};

const runNotificationChecks = async () => {
  try {
    await notifyEvraklar();
    await notifyParcalar();
    console.log('[Cron] Akilli bildirim taramasi tamamlandi.');
  } catch (error) {
    console.error('[Cron] Bildirim taramasi sirasinda hata:', error.message);
  }
};

const startNotificationCron = () => {
  cron.schedule('0 9 * * *', runNotificationChecks, {
    timezone: process.env.CRON_TIMEZONE || 'Europe/Istanbul'
  });

  console.log('[Cron] Akilli bildirim gorevi her gun 09:00 icin planlandi.');
};

module.exports = {
  startNotificationCron,
  runNotificationChecks
};

