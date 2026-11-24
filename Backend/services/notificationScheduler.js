const cron = require('node-cron');
const pool = require('../db');
const { bugunTR, gunEkleTR, isoHaftaTR } = require('../utils/dateUtils');
const { fetchPredictiveCandidates, computePredictiveSummaryFromRow } = require('./predictiveService');
const {
  NOTIFY_DAY_THRESHOLD,
  PREDICTIVE_NOTIFY_DAY_THRESHOLD,
  evaluateEvrakAlerts,
  evaluateParcaAlerts,
} = require('./alertEvaluators');
const {
  getVehicleRecipients,
  getOrgFinanceRecipients,
  dispatchNotificationToUser,
} = require('./notificationService');

const dispatchToMany = async (recipients, payload, options) => {
  let count = 0;
  for (const user of recipients) {
    const res = await dispatchNotificationToUser(user, payload, options);
    if (res.created || res.emailSent) count += 1;
  }
  return count;
};

const notifyEvraklar = async ({ skipEmail = false, now = new Date() } = {}) => {
  const bugun = bugunTR(now);
  const sinirTarih = gunEkleTR(bugun, NOTIFY_DAY_THRESHOLD);

  const { rows } = await pool.query(
    `SELECT a.arac_id, a.org_id, a.kullanici_id, a.plaka,
            a.muayene_tarihi, a.kasko_tarihi, a.sigorta_tarihi
     FROM araclar a
     WHERE (a.muayene_tarihi IS NOT NULL AND a.muayene_tarihi <= $1::date)
        OR (a.kasko_tarihi IS NOT NULL AND a.kasko_tarihi <= $1::date)
        OR (a.sigorta_tarihi IS NOT NULL AND a.sigorta_tarihi <= $1::date)`,
    [sinirTarih]
  );

  let dispatched = 0;
  for (const arac of rows) {
    const alerts = evaluateEvrakAlerts(arac, bugun);
    if (!alerts.length) continue;
    const recipients = await getVehicleRecipients(arac);
    if (!recipients.length) continue;

    for (const alert of alerts) {
      dispatched += await dispatchToMany(recipients, {
        org_id: arac.org_id,
        arac_id: arac.arac_id,
        kategori: 'belge',
        seviye: alert.seviye,
        referans_anahtar: alert.referans_anahtar,
        baslik: alert.baslik,
        mesaj: alert.mesaj,
        link_url: '/app/takvim',
        meta_json: alert.meta,
      }, { skipEmail });
    }
  }
  return dispatched;
};

const notifyParcalar = async ({ skipEmail = false, now = new Date() } = {}) => {
  const bugun = bugunTR(now);
  const { rows } = await pool.query(`
    SELECT p.parca_id, p.parca_adi, p.son_degisim_km, p.degisim_araligi_km, p.son_degisim_tarihi,
           a.arac_id, a.org_id, a.kullanici_id, a.plaka, a.sayac_tipi,
           GREATEST(
             COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
             COALESCE((SELECT MAX(y.km) FROM yakitlar y WHERE y.arac_id = a.arac_id), 0),
             COALESCE((SELECT MAX(b.km) FROM bakimlar b WHERE b.arac_id = a.arac_id), 0)
           ) AS guncel_km
    FROM parca_takip p
    INNER JOIN araclar a ON a.arac_id = p.arac_id
  `);

  const recipientCache = new Map();
  let dispatched = 0;

  for (const item of rows) {
    const alerts = evaluateParcaAlerts(item, bugun);
    if (!alerts.length) continue;

    if (!recipientCache.has(item.arac_id)) {
      recipientCache.set(item.arac_id, await getVehicleRecipients(item));
    }
    const recipients = recipientCache.get(item.arac_id);
    if (!recipients.length) continue;

    for (const alert of alerts) {
      dispatched += await dispatchToMany(recipients, {
        org_id: item.org_id,
        arac_id: item.arac_id,
        kategori: 'parca',
        seviye: alert.seviye,
        referans_anahtar: alert.referans_anahtar,
        baslik: alert.baslik,
        mesaj: alert.mesaj,
        link_url: '/app/parcalar',
        meta_json: alert.meta,
      }, { skipEmail });
    }
  }
  return dispatched;
};

const notifyPredictiveMaintenance = async ({ skipEmail = false, now = new Date() } = {}) => {
  const araclar = await fetchPredictiveCandidates();
  let dispatched = 0;

  for (const item of araclar) {
    try {
      const prediction = computePredictiveSummaryFromRow(item, now);
      if (!prediction || (prediction.kalanKm > 0 && prediction.kalanGun > PREDICTIVE_NOTIFY_DAY_THRESHOLD)) {
        continue;
      }

      const recipients = await getVehicleRecipients(item);
      if (!recipients.length) continue;

      const durum = prediction.kalanKm <= 0 ? 'asildi' : 'yaklasti';
      const seviye = prediction.kalanKm <= 0 || prediction.kalanGun <= 3 ? 'kritik' : 'uyari';
      const mesaj = prediction.kalanKm <= 0
        ? `${item.plaka} plakalı aracın tahmini bakım sayacı ${Math.abs(prediction.kalanKm).toLocaleString('tr-TR')} ${prediction.birim} aşıldı.`
        : `${item.plaka} plakalı araçta tahmini bakım ${prediction.kalanGun} gün içinde (${prediction.tahminiTarihTR}). Kalan: ${Math.max(0, prediction.kalanKm).toLocaleString('tr-TR')} ${prediction.birim}.`;

      dispatched += await dispatchToMany(recipients, {
        org_id: item.org_id,
        arac_id: item.arac_id,
        kategori: 'bakim',
        seviye,
        referans_anahtar: `bakim:${item.arac_id}:${Number(item.son_bakim_km) || 0}:${prediction.hedefKm}:${durum}`,
        baslik: `${item.plaka} — Tahmini Bakım ${prediction.kalanKm <= 0 ? 'Aşıldı' : 'Yaklaştı'}`,
        mesaj,
        link_url: '/app/hareketler',
        meta_json: {
          kalan_km: prediction.kalanKm,
          kalan_gun: prediction.kalanGun,
          hedef_km: prediction.hedefKm,
          tahmini_tarih: prediction.tahminiTarih,
          birim: prediction.birim,
          plaka: item.plaka,
        },
      }, { skipEmail });
    } catch (error) {
      console.error('[Cron] Tahmini bakım bildirim hatası:', error.message);
    }
  }
  return dispatched;
};

const runNotificationChecks = async (options = {}) => {
  const { skipEmail = false, now = new Date() } = options;
  try {
    const belge = await notifyEvraklar({ skipEmail, now });
    const parca = await notifyParcalar({ skipEmail, now });
    const bakim = await notifyPredictiveMaintenance({ skipEmail, now });
    console.log('[Cron] Akıllı bildirim taraması tamamlandı.', { belge, parca, bakim });
    return { belge, parca, bakim };
  } catch (error) {
    console.error('[Cron] Bildirim taraması sırasında hata:', error.message);
    return { belge: 0, parca: 0, bakim: 0, error: error.message };
  }
};

const runWeeklySummaryCheck = async (options = {}) => {
  const { skipEmail = false, now = new Date() } = options;
  const bugun = bugunTR(now);
  const haftaBaslangic = gunEkleTR(bugun, -7);
  const ayBaslangic = `${bugun.slice(0, 7)}-01`;
  const haftaAnahtar = isoHaftaTR(now);

  try {
    const { rows: orgs } = await pool.query(
      'SELECT org_id, unvan, aylik_yakit_butcesi, aylik_bakim_butcesi FROM organizations ORDER BY org_id ASC'
    );

    let dispatched = 0;
    for (const org of orgs) {
      const recipients = await getOrgFinanceRecipients(org.org_id);
      if (!recipients.length) continue;

      const spendRes = await pool.query(
        `SELECT
           COALESCE((SELECT SUM(y.tutar) FROM yakitlar y INNER JOIN araclar a ON a.arac_id = y.arac_id WHERE a.org_id = $1 AND y.tarih >= $2::date AND y.tarih <= $3::date), 0)::numeric AS hafta_yakit,
           COALESCE((SELECT SUM(b.maliyet) FROM bakimlar b INNER JOIN araclar a ON a.arac_id = b.arac_id WHERE a.org_id = $1 AND b.tarih >= $2::date AND b.tarih <= $3::date), 0)::numeric AS hafta_bakim,
           COALESCE((SELECT SUM(y.tutar) FROM yakitlar y INNER JOIN araclar a ON a.arac_id = y.arac_id WHERE a.org_id = $1 AND y.tarih >= $4::date AND y.tarih <= $3::date), 0)::numeric AS ay_yakit,
           COALESCE((SELECT SUM(b.maliyet) FROM bakimlar b INNER JOIN araclar a ON a.arac_id = b.arac_id WHERE a.org_id = $1 AND b.tarih >= $4::date AND b.tarih <= $3::date), 0)::numeric AS ay_bakim`,
        [org.org_id, haftaBaslangic, bugun, ayBaslangic]
      );

      const s = spendRes.rows[0] || {};
      const haftaToplam = Number(s.hafta_yakit || 0) + Number(s.hafta_bakim || 0);
      const ayToplam = Number(s.ay_yakit || 0) + Number(s.ay_bakim || 0);
      const toplamButce = Number(org.aylik_yakit_butcesi ?? 50000) + Number(org.aylik_bakim_butcesi ?? 25000);
      const kullanimYuzdesi = toplamButce > 0 ? Math.round((ayToplam / toplamButce) * 100) : (ayToplam > 0 ? 101 : 0);
      const seviye = ayToplam > toplamButce ? 'kritik' : (kullanimYuzdesi >= 80 ? 'uyari' : 'bilgi');

      dispatched += await dispatchToMany(recipients, {
        org_id: org.org_id,
        arac_id: null,
        kategori: 'maliyet_ozeti',
        seviye,
        referans_anahtar: `maliyet_ozeti:org:${org.org_id}:${haftaAnahtar}`,
        baslik: `${org.unvan ? `${org.unvan} — ` : ''}Haftalık Filo Maliyet Özeti (${haftaAnahtar})`,
        mesaj: `Son 7 gün toplam harcama: ${haftaToplam.toLocaleString('tr-TR')} ₺. Aylık bütçe kullanımı: %${kullanimYuzdesi} (${ayToplam.toLocaleString('tr-TR')} / ${toplamButce.toLocaleString('tr-TR')} ₺).`,
        link_url: '/app',
        meta_json: {
          unvan: org.unvan || null,
          hafta: haftaAnahtar,
          hafta_toplam: haftaToplam,
          ay_toplam: ayToplam,
          toplam_butce: toplamButce,
          kullanim_yuzdesi: kullanimYuzdesi,
        },
      }, { skipEmail });
    }

    return { organizations: orgs.length, dispatched };
  } catch (error) {
    console.error('[Cron] Haftalık maliyet özeti hatası:', error.message);
    return { organizations: 0, dispatched: 0, error: error.message };
  }
};

const startNotificationCron = () => {
  const timezone = process.env.CRON_TIMEZONE || 'Europe/Istanbul';
  cron.schedule('0 9 * * *', () => runNotificationChecks(), { timezone });
  cron.schedule('0 9 * * 1', () => runWeeklySummaryCheck(), { timezone });
  console.log('[Cron] Günlük (09:00) ve haftalık Pazartesi (09:00) bildirim görevleri planlandı.');
};

module.exports = {
  startNotificationCron,
  runNotificationChecks,
  runWeeklySummaryCheck,
};
