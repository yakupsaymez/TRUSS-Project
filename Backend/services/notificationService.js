const pool = require('../db');
const { escapeHtml, sendNotificationEmail } = require('./emailService');

const DEFAULT_NOTIFICATION_MATRIX = {
  belge_vadesi: { email: true, sms: true },
  periyodik_bakim: { email: true, sms: true },
  parca_omru: { email: true, sms: false },
  maliyet_ozeti: { email: true, sms: false },
};

const KATEGORI_PREF_MAP = {
  belge: 'belge_vadesi',
  belge_vadesi: 'belge_vadesi',
  bakim: 'periyodik_bakim',
  periyodik_bakim: 'periyodik_bakim',
  parca: 'parca_omru',
  parca_omru: 'parca_omru',
  maliyet_ozeti: 'maliyet_ozeti',
};

const normalizeNotificationMatrix = (raw) => {
  const src = raw && typeof raw === 'object' ? raw : {};
  return Object.keys(DEFAULT_NOTIFICATION_MATRIX).reduce((acc, key) => {
    const def = DEFAULT_NOTIFICATION_MATRIX[key];
    const item = src[key] && typeof src[key] === 'object' ? src[key] : {};
    const email = typeof item.email === 'boolean'
      ? item.email
      : (typeof item.eposta === 'boolean' ? item.eposta : def.email);
    const entry = { email, sms: typeof item.sms === 'boolean' ? item.sms : def.sms };
    if (typeof item.uygulama === 'boolean') entry.uygulama = item.uygulama;
    if (typeof item.eposta === 'boolean') entry.eposta = item.eposta;
    acc[key] = entry;
    return acc;
  }, {});
};

const hasFinanceAccess = (user) => {
  if (!user) return false;
  if (user.role === 'SYSTEM_ADMIN' || user.role === 'FLEET_MANAGER') return true;
  const yetkiler = user.yetkiler && typeof user.yetkiler === 'object' ? user.yetkiler : {};
  return yetkiler.finans === true;
};

const resolveUserNotificationChannels = (user, kategori) => {
  if (kategori === 'maliyet_ozeti' && !hasFinanceAccess(user)) {
    return { uygulamaAcik: false, emailAcik: false, smsAcik: false, blockedByRbac: true };
  }

  const prefKey = KATEGORI_PREF_MAP[kategori] || kategori;
  const defaultPref = DEFAULT_NOTIFICATION_MATRIX[prefKey];
  if (!defaultPref) {
    return {
      uygulamaAcik: true,
      emailAcik: user?.email_bildirim_aktif !== false && Boolean(user?.email),
      smsAcik: user?.sms_bildirim_aktif === true && Boolean(user?.telefon),
      blockedByRbac: false,
    };
  }

  const rawPrefs = user?.bildirim_tercihleri && typeof user.bildirim_tercihleri === 'object'
    ? user.bildirim_tercihleri
    : {};
  const pref = rawPrefs[prefKey] && typeof rawPrefs[prefKey] === 'object' ? rawPrefs[prefKey] : {};

  const emailPref = typeof pref.email === 'boolean'
    ? pref.email
    : (typeof pref.eposta === 'boolean' ? pref.eposta : defaultPref.email);
  const smsPref = typeof pref.sms === 'boolean' ? pref.sms : defaultPref.sms;
  const uygulamaPref = typeof pref.uygulama === 'boolean' ? pref.uygulama : (emailPref || smsPref);
  const kategoriAcik = Boolean(uygulamaPref || emailPref || smsPref);

  return {
    uygulamaAcik: kategoriAcik && uygulamaPref,
    emailAcik: kategoriAcik && user?.email_bildirim_aktif !== false && emailPref && Boolean(user?.email),
    smsAcik: kategoriAcik && user?.sms_bildirim_aktif === true && smsPref && Boolean(user?.telefon),
    blockedByRbac: false,
  };
};

const deduplicateUsers = (rows) => {
  const seen = new Set();
  return rows.filter((r) => {
    if (!r?.user_id || seen.has(r.user_id)) return false;
    seen.add(r.user_id);
    return true;
  });
};

/**
 * Aracın organizasyonundaki yöneticileri (veya fallback sahibini) ve aktif zimmetli şoförü tekil döndürür.
 */
const getVehicleRecipients = async (arac) => {
  if (!arac?.arac_id) return [];

  if (!arac.org_id && !arac.kullanici_id) {
    const res = await pool.query(
      `SELECT u.user_id, u.ad_soyad, u.email, u.telefon, u.role, u.yetkiler, u.org_id,
              u.email_bildirim_aktif, u.sms_bildirim_aktif, u.bildirim_tercihleri
       FROM arac_sofor_atamalari asa
       INNER JOIN users u ON u.user_id = asa.sofor_user_id
       WHERE asa.arac_id = $1 AND asa.aktif = TRUE
       ORDER BY u.user_id ASC`,
      [arac.arac_id]
    );
    return deduplicateUsers(res.rows);
  }

  const ownerCond = arac.org_id
    ? "(u.org_id = $2 AND u.role IN ('SYSTEM_ADMIN', 'FLEET_MANAGER'))"
    : 'u.user_id = $2';
  const res = await pool.query(
    `SELECT DISTINCT ON (u.user_id)
       u.user_id, u.ad_soyad, u.email, u.telefon, u.role, u.yetkiler, u.org_id,
       u.email_bildirim_aktif, u.sms_bildirim_aktif, u.bildirim_tercihleri
     FROM users u
     WHERE ${ownerCond}
        OR EXISTS (
          SELECT 1 FROM arac_sofor_atamalari asa
          WHERE asa.arac_id = $1 AND asa.sofor_user_id = u.user_id AND asa.aktif = TRUE
        )
     ORDER BY u.user_id ASC`,
    [arac.arac_id, arac.org_id || arac.kullanici_id]
  );
  return deduplicateUsers(res.rows);
};

/**
 * Organizasyonun finansal rapor/bütçe bildirimlerini almaya yetkili kullanıcılarını döndürür.
 */
const getOrgFinanceRecipients = async (orgId) => {
  if (!orgId) return [];
  const res = await pool.query(
    `SELECT user_id, ad_soyad, email, telefon, role, yetkiler, org_id,
            email_bildirim_aktif, sms_bildirim_aktif, bildirim_tercihleri
     FROM users
     WHERE org_id = $1
       AND (role IN ('SYSTEM_ADMIN', 'FLEET_MANAGER') OR COALESCE((yetkiler->>'finans')::boolean, FALSE) = TRUE)
     ORDER BY user_id ASC`,
    [orgId]
  );
  return deduplicateUsers(res.rows);
};

const buildDefaultEmailHtml = (user, payload) => `
  <p style="margin:0 0 12px 0;">Merhaba ${escapeHtml(user?.ad_soyad || 'Kullanıcı')},</p>
  <p style="margin:0 0 12px 0;font-weight:600;color:#f8fafc;">${escapeHtml(payload.baslik)}</p>
  <p style="margin:0;color:#cbd5e1;">${escapeHtml(payload.mesaj)}</p>
`;

/**
 * Tek kullanıcıya RBAC, tercih matrisi ve (user_id, kategori, referans_anahtar) dedup garantisiyle bildirim gönderir.
 */
const dispatchNotificationToUser = async (user, payload, options = {}) => {
  if (!user?.user_id || !payload?.kategori || !payload?.referans_anahtar) {
    return { created: false, deduplicated: false, emailSent: false, skipped: true };
  }

  const channels = resolveUserNotificationChannels(user, payload.kategori);
  if (channels.blockedByRbac || (!channels.uygulamaAcik && !channels.emailAcik)) {
    return { created: false, deduplicated: false, emailSent: false, skipped: true, blockedByRbac: channels.blockedByRbac };
  }

  const uygulamaGizli = !channels.uygulamaAcik;
  const metaJson = uygulamaGizli
    ? { ...(payload.meta_json || {}), uygulama_gizli: true }
    : (payload.meta_json || {});

  const insertRes = await pool.query(
    `INSERT INTO bildirim_olaylari (
       org_id, user_id, arac_id, kategori, seviye,
       referans_anahtar, baslik, mesaj, link_url, okundu_mu, okunma_tarihi, meta_json
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $10 THEN NOW() ELSE NULL END, $11::jsonb
     )
     ON CONFLICT (user_id, kategori, referans_anahtar) DO NOTHING
     RETURNING bildirim_id`,
    [
      payload.org_id ?? user.org_id ?? null,
      user.user_id,
      payload.arac_id ?? null,
      payload.kategori,
      payload.seviye || 'uyari',
      String(payload.referans_anahtar).slice(0, 120),
      String(payload.baslik || '').slice(0, 200),
      String(payload.mesaj || ''),
      payload.link_url ? String(payload.link_url).slice(0, 255) : null,
      uygulamaGizli,
      JSON.stringify(metaJson),
    ]
  );

  if (insertRes.rowCount === 0) {
    return { created: false, deduplicated: true, emailSent: false };
  }
  const bildirimId = insertRes.rows[0].bildirim_id;

  let emailSent = false;
  if (channels.emailAcik && !options.skipEmail) {
    const subject = payload.emailSubject || `TRUSS — ${payload.baslik}`;
    const htmlBody = payload.emailHtml || buildDefaultEmailHtml(user, payload);
    const emailResult = await sendNotificationEmail(user.email, subject, htmlBody, options);
    if (emailResult?.sent === true) {
      emailSent = true;
      if (bildirimId) {
        await pool.query('UPDATE bildirim_olaylari SET eposta_gonderildi = TRUE WHERE bildirim_id = $1', [bildirimId]);
      }
    }
  }

  return {
    created: channels.uygulamaAcik && Boolean(bildirimId),
    deduplicated: false,
    bildirimId,
    emailSent,
  };
};

module.exports = {
  DEFAULT_NOTIFICATION_MATRIX,
  normalizeNotificationMatrix,
  hasFinanceAccess,
  resolveUserNotificationChannels,
  getVehicleRecipients,
  getOrgFinanceRecipients,
  dispatchNotificationToUser,
};
