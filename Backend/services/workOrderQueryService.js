const pool = require('../db');
const AppError = require('../utils/AppError');
const { bugunTR } = require('../utils/dateUtils');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { hasFinanceAccess } = require('./docVaultService');

const listWorkOrders = async (actor, filters = {}) => {
  if (actor?.role === 'FLEET_MANAGER' && !actor?.org_id) {
    throw new AppError(403, 'FORBIDDEN_ORG_REQUIRED', 'Organizasyon bilgisi bulunamadı.');
  }

  const access = buildVehicleAccessFilter(actor, 1);
  const params = [...access.params];
  const conditions = [`(${access.clause})`];

  if (filters.durum) {
    params.push(filters.durum);
    conditions.push(`ie.durum = $${params.length}`);
  }
  if (filters.oncelik) {
    params.push(filters.oncelik);
    conditions.push(`ie.oncelik = $${params.length}`);
  }
  if (filters.kategori) {
    params.push(filters.kategori);
    conditions.push(`ie.kategori = $${params.length}`);
  }
  if (filters.arac_id) {
    params.push(Number(filters.arac_id));
    conditions.push(`ie.arac_id = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');
  const limit = Number(filters.limit || 100);
  const offset = Number(filters.offset || 0);
  const ayBaslangic = `${bugunTR().slice(0, 7)}-01`;

  const [listRes, countRes, summaryRes] = await Promise.all([
    pool.query(
      `SELECT ie.is_emri_id, ie.org_id, ie.arac_id, ie.acan_user_id, ie.onaylayan_user_id,
              ie.olusulan_bakim_id, ie.baslik, ie.aciklama, ie.kategori, ie.oncelik, ie.durum,
              ie.bildirilen_sayac, ie.servis_adi, ie.tahmini_maliyet, ie.gerceklesen_maliyet,
              ie.planlanan_tarih::text AS planlanan_tarih, ie.red_iptal_nedeni,
              ie.kapanis_tarihi, ie.olusturma_tarihi, ie.guncelleme_tarihi,
              a.plaka, a.marka, a.model, a.sayac_tipi,
              au.ad_soyad AS acan_ad_soyad,
              ou.ad_soyad AS onaylayan_ad_soyad,
              b.belge_url AS bakim_belge_url
       FROM is_emirleri ie
       INNER JOIN araclar a ON a.arac_id = ie.arac_id
       LEFT JOIN users au ON au.user_id = ie.acan_user_id
       LEFT JOIN users ou ON ou.user_id = ie.onaylayan_user_id
       LEFT JOIN bakimlar b ON b.bakim_id = ie.olusulan_bakim_id
       WHERE ${whereClause}
       ORDER BY ie.olusturma_tarihi DESC, ie.is_emri_id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS toplam
       FROM is_emirleri ie
       INNER JOIN araclar a ON a.arac_id = ie.arac_id
       WHERE ${whereClause}`,
      params
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE ie.durum = 'acik')::int AS acik,
         COUNT(*) FILTER (WHERE ie.durum = 'serviste')::int AS serviste,
         COUNT(*) FILTER (
           WHERE ie.durum = 'tamamlandi'
             AND ie.kapanis_tarihi >= ($${access.params.length + 1}::date AT TIME ZONE 'Europe/Istanbul')
         )::int AS tamamlandi_bu_ay
       FROM is_emirleri ie
       INNER JOIN araclar a ON a.arac_id = ie.arac_id
       WHERE (${access.clause})`,
      [...access.params, ayBaslangic]
    ),
  ]);

  const woIds = listRes.rows.map((r) => r.is_emri_id);
  const docMap = new Map();
  if (woIds.length > 0) {
    const docRes = await pool.query(
      `SELECT belge_id, varlik_id, nesne_anahtari, orijinal_ad, mime_tipi, boyut_bayt, olusturma_tarihi
       FROM belge_kasasi
       WHERE varlik_tipi = 'is_emri' AND varlik_id = ANY($1::int[]) AND durum = 'aktif'
       ORDER BY olusturma_tarihi ASC, belge_id ASC`,
      [woIds]
    );
    for (const d of docRes.rows) {
      const arr = docMap.get(d.varlik_id) || [];
      arr.push(d);
      docMap.set(d.varlik_id, arr);
    }
  }
  const canSeeFinance = hasFinanceAccess(actor);
  const isEmirleri = listRes.rows.map((r) => ({
    ...r,
    tahmini_maliyet: canSeeFinance ? r.tahmini_maliyet : null,
    gerceklesen_maliyet: canSeeFinance ? r.gerceklesen_maliyet : null,
    bakim_belge_url: canSeeFinance ? (r.bakim_belge_url || null) : null,
    belgeler: docMap.get(r.is_emri_id) || [],
  }));

  return {
    is_emirleri: isEmirleri,
    toplam: countRes.rows[0]?.toplam || 0,
    ozet: summaryRes.rows[0] || { acik: 0, serviste: 0, tamamlandi_bu_ay: 0 },
  };
};

const fetchOpenWorkOrderActionItems = async (actor, accessFilter) => {
  if (actor?.role !== 'SYSTEM_ADMIN' && actor?.role !== 'FLEET_MANAGER') {
    return [];
  }

  const res = await pool.query(
    `SELECT ie.is_emri_id, ie.arac_id, ie.baslik, ie.aciklama, ie.oncelik, ie.kategori, ie.olusturma_tarihi, a.plaka
     FROM is_emirleri ie
     INNER JOIN araclar a ON a.arac_id = ie.arac_id
     WHERE (${accessFilter.clause})
       AND a.arsivlendi_mi = FALSE
       AND ie.durum = 'acik'
     ORDER BY CASE ie.oncelik WHEN 'kritik' THEN 0 WHEN 'yuksek' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
              ie.olusturma_tarihi ASC`,
    accessFilter.params
  );

  return res.rows.map((row) => ({
    kategori: 'is_emri',
    seviye: row.oncelik === 'kritik' ? 'kritik' : 'uyari',
    arac_id: row.arac_id,
    plaka: row.plaka,
    baslik: `${row.plaka} — ${row.baslik}`,
    detay: row.aciklama || `Öncelik: ${row.oncelik} · Kategori: ${row.kategori}`,
    link_url: '/app/is-emirleri',
    meta: {
      is_emri_id: row.is_emri_id,
      oncelik: row.oncelik,
      kategori: row.kategori,
      olusturma_tarihi: row.olusturma_tarihi,
    },
  }));
};

module.exports = {
  listWorkOrders,
  fetchOpenWorkOrderActionItems,
};
