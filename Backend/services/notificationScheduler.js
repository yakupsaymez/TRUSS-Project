const cron = require('node-cron');
const pool = require('../db');
const { sendEmail, sendSMS } = require('./notificationService');

const NOTIFY_DAY_THRESHOLD = 15;
const PARCA_KM_WARNING_THRESHOLD = 1500;
const PREDICTIVE_NOTIFY_DAY_THRESHOLD = 7;
const DAILY_MS = 1000 * 60 * 60 * 24;

const PARCA_YIL_ARALIGI = {
  Aku: 4,
  'Lastikler': 5
};

const normalizeParcaAdi = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/ı/g, 'i')
  .replace(/ğ/g, 'g')
  .replace(/ş/g, 's')
  .replace(/ü/g, 'u')
  .replace(/ö/g, 'o')
  .replace(/ç/g, 'c');

const isEnabled = (value) => value !== false;

const dispatchNotifications = async (item, subject, text, smsText) => {
  const tasks = [];

  if (isEnabled(item.email_bildirim_aktif) && item.email) {
    tasks.push(sendEmail(item.email, subject, text));
  }

  if (isEnabled(item.sms_bildirim_aktif) && item.telefon) {
    tasks.push(sendSMS(item.telefon, smsText));
  }

  if (!tasks.length) return;

  const results = await Promise.allSettled(tasks);
  results
    .filter((result) => result.status === 'rejected')
    .forEach((result) => console.error('[Cron] Bildirim gonderim hatasi:', result.reason?.message || result.reason));
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
      u.email_bildirim_aktif,
      u.sms_bildirim_aktif,
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
      u.email_bildirim_aktif,
      u.sms_bildirim_aktif,
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

    await dispatchNotifications(item, subject, text, `${item.plaka} icin: ${alerts.join(' | ')}`);
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

    const parcaAnahtari = normalizeParcaAdi(item.parca_adi);
    const yilAraligi = parcaAnahtari === 'aku'
      ? PARCA_YIL_ARALIGI.Aku
      : parcaAnahtari === 'lastikler'
        ? PARCA_YIL_ARALIGI.Lastikler
        : null;
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

    await dispatchNotifications(item, subject, text, `${item.plaka}: ${alerts.join(' | ')}`);
  }
};

const getPredictiveCandidates = async () => {
  const query = `
    SELECT
      a.arac_id,
      a.plaka,
      u.user_id,
      u.ad_soyad,
      u.email,
      u.telefon,
      u.email_bildirim_aktif,
      u.sms_bildirim_aktif
    FROM araclar a
    INNER JOIN users u ON u.user_id = a.kullanici_id
  `;

  const result = await pool.query(query);
  return result.rows;
};

const getPredictiveSummary = async (aracId) => {
  const [currentKmResult, lastBakimResult, recentHistoryResult] = await Promise.all([
    pool.query(
      `SELECT GREATEST(
         COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = $1), 0),
         COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = $1), 0)
       ) AS guncel_km`,
      [aracId]
    ),
    pool.query('SELECT km, tarih FROM bakimlar WHERE arac_id = $1 ORDER BY tarih DESC, bakim_id DESC LIMIT 1', [aracId]),
    pool.query(
      `SELECT kaynak, km, tarih FROM (
         SELECT 'bakim' AS kaynak, bakim_id AS kayit_id, km, tarih FROM bakimlar WHERE arac_id = $1 AND km IS NOT NULL AND tarih IS NOT NULL
         UNION ALL
         SELECT 'yakit' AS kaynak, yakit_id AS kayit_id, km, tarih FROM yakitlar WHERE arac_id = $1 AND km IS NOT NULL AND tarih IS NOT NULL
       ) tum_kayitlar
       ORDER BY tarih DESC, kayit_id DESC
       LIMIT 2`,
      [aracId]
    )
  ]);

  const currentKm = Number(currentKmResult.rows[0]?.guncel_km) || 0;
  const lastBakim = lastBakimResult.rows[0] || null;
  const recentRows = recentHistoryResult.rows || [];

  if (!lastBakim || recentRows.length < 2) {
    return null;
  }

  const [yeniKayit, oncekiKayit] = recentRows;
  const kmFarki = Math.abs((Number(yeniKayit.km) || 0) - (Number(oncekiKayit.km) || 0));
  const gunFarki = Math.max(1, Math.round(Math.abs(new Date(yeniKayit.tarih).getTime() - new Date(oncekiKayit.tarih).getTime()) / DAILY_MS));
  const gunlukOrtalamaKm = kmFarki / gunFarki;

  if (!Number.isFinite(gunlukOrtalamaKm) || gunlukOrtalamaKm <= 0) {
    return null;
  }

  const hedefKm = (Number(lastBakim.km) || 0) + 10000;
  const kalanKm = hedefKm - currentKm;
  const kalanGun = Math.ceil(kalanKm / gunlukOrtalamaKm);

  return {
    currentKm,
    hedefKm,
    kalanKm,
    kalanGun,
    gunlukOrtalamaKm,
    tahminiTarih: new Date(Date.now() + Math.max(0, kalanGun) * DAILY_MS)
  };
};

const notifyPredictiveMaintenance = async () => {
  const araclar = await getPredictiveCandidates();

  for (const item of araclar) {
    try {
      const prediction = await getPredictiveSummary(item.arac_id);
      if (!prediction || prediction.kalanGun > PREDICTIVE_NOTIFY_DAY_THRESHOLD) continue;

      const tahminiTarih = prediction.tahminiTarih.toLocaleDateString('tr-TR');
      const subject = `ABTS Tahmini Bakim Hatirlatmasi - ${item.plaka}`;
      const text = prediction.kalanKm <= 0
        ? `Merhaba ${item.ad_soyad || ''},\n\n${item.plaka} plakali araciniz icin tahmini bakim kilometresi ${Math.abs(prediction.kalanKm).toLocaleString('tr-TR')} KM asildi. Tahmini bakim tarihi: ${tahminiTarih}.\n\nABTS ekibi`
        : `Merhaba ${item.ad_soyad || ''},\n\n${item.plaka} plakali araciniz icin tahmini bakim tarihi ${tahminiTarih} olarak hesaplandi. Kalan mesafe: ${Math.max(0, prediction.kalanKm).toLocaleString('tr-TR')} KM.\nGununluk ortalama kullanim: ${prediction.gunlukOrtalamaKm.toFixed(1)} KM.\n\nABTS ekibi`;

      const smsText = prediction.kalanKm <= 0
        ? `${item.plaka}: Bakim kilometresi asildi. Tahmini tarih ${tahminiTarih}.`
        : `${item.plaka}: Bakim ${prediction.kalanGun} gun icinde olabilir. Tahmini tarih ${tahminiTarih}.`;

      await dispatchNotifications(item, subject, text, smsText);
    } catch (error) {
      console.error('[Cron] Tahmini bakim bildirim hatasi:', error.message);
    }
  }
};

const runNotificationChecks = async () => {
  try {
    await notifyEvraklar();
    await notifyParcalar();
    await notifyPredictiveMaintenance();
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

