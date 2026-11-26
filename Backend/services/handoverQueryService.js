const pool = require('../db');
const AppError = require('../utils/AppError');

const isMgr = (a) => a?.role === 'SYSTEM_ADMIN' || a?.role === 'FLEET_MANAGER';

const assertActor = (actor) => {
  if (!actor?.user_id) throw new AppError(401, 'TOKEN_MISSING', 'Oturum bulunamadı.');
  if (actor.role === 'FLEET_MANAGER' && !actor.org_id) {
    throw new AppError(403, 'FORBIDDEN_ORG_REQUIRED', 'Organizasyon bilgisi bulunamadı.');
  }
};

const formatInspectionRow = (r) => ({
  ...r,
  sayac_degeri: r.sayac_degeri !== null && r.sayac_degeri !== undefined ? Number(r.sayac_degeri) : null,
});

const listZimmetler = async (actor, filters = {}) => {
  assertActor(actor);
  const params = [];
  const conds = [];

  if (isMgr(actor)) {
    if (actor.org_id) {
      params.push(actor.org_id);
      conds.push(`a.org_id = $${params.length}`);
    }
  } else {
    params.push(actor.user_id);
    conds.push(`asa.sofor_user_id = $${params.length}`);
    if (actor.org_id) {
      params.push(actor.org_id);
      conds.push(`a.org_id = $${params.length}`);
    }
  }

  const baseWhere = conds.length > 0 ? conds.join(' AND ') : '1=1';
  const filterConds = [baseWhere];

  if (filters.arac_id) {
    params.push(Number(filters.arac_id));
    filterConds.push(`asa.arac_id = $${params.length}`);
  }
  if (filters.sofor_user_id && isMgr(actor)) {
    params.push(Number(filters.sofor_user_id));
    filterConds.push(`asa.sofor_user_id = $${params.length}`);
  }
  if (filters.aktif !== undefined && filters.aktif !== null && filters.aktif !== '') {
    params.push(Boolean(filters.aktif));
    filterConds.push(`asa.aktif = $${params.length}`);
  }

  const whereClause = filterConds.join(' AND ');
  const limit = Number(filters.limit || 100);
  const offset = Number(filters.offset || 0);

  const [listRes, countRes, summaryRes] = await Promise.all([
    pool.query(
      `SELECT asa.atama_id, asa.arac_id, asa.sofor_user_id, asa.atanma_tarihi, asa.teslim_tarihi, asa.aktif,
              a.org_id, a.plaka, a.marka, a.model, a.yil, a.sayac_tipi, a.arsivlendi_mi,
              CASE WHEN a.sayac_tipi = 'SMH' THEN COALESCE(a.guncel_calisma_saati, 0) ELSE COALESCE(a.guncel_km, 0) END::int AS guncel_sayac,
              u.ad_soyad AS sofor_ad_soyad, u.email AS sofor_email, u.telefon AS sofor_telefon
       FROM arac_sofor_atamalari asa
       INNER JOIN araclar a ON a.arac_id = asa.arac_id
       INNER JOIN users u ON u.user_id = asa.sofor_user_id
       WHERE ${whereClause}
       ORDER BY asa.aktif DESC, asa.atanma_tarihi DESC, asa.atama_id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS toplam
       FROM arac_sofor_atamalari asa
       INNER JOIN araclar a ON a.arac_id = asa.arac_id
       WHERE ${whereClause}`,
      params
    ),
    pool.query(
      `SELECT COUNT(*)::int AS toplam,
              COUNT(*) FILTER (WHERE asa.aktif = TRUE)::int AS aktif_sayisi,
              COUNT(*) FILTER (WHERE asa.aktif = FALSE)::int AS tamamlanan_sayisi,
              COUNT(*) FILTER (WHERE asa.aktif = TRUE AND NOT EXISTS (
                SELECT 1 FROM zimmet_muayeneleri zm WHERE zm.atama_id = asa.atama_id AND zm.muayene_tipi = 'TESLIM_ALMA'
              ))::int AS teslim_alma_bekleyen
       FROM arac_sofor_atamalari asa
       INNER JOIN araclar a ON a.arac_id = asa.arac_id
       WHERE ${baseWhere}`,
      params.slice(0, conds.length)
    ),
  ]);

  const atamaIds = listRes.rows.map((r) => r.atama_id);
  const inspMap = new Map();
  if (atamaIds.length > 0) {
    const inspRes = await pool.query(
      `SELECT zm.muayene_id, zm.atama_id, zm.muayene_tipi, zm.muayene_tarihi::text AS muayene_tarihi,
              zm.sayac_degeri, zm.genel_sonuc, zm.olusmus_is_emri_id, zm.yapan_user_id, zm.olusturma_tarihi,
              yu.ad_soyad AS yapan_ad_soyad
       FROM zimmet_muayeneleri zm
       LEFT JOIN users yu ON yu.user_id = zm.yapan_user_id
       WHERE zm.atama_id = ANY($1::int[])`,
      [atamaIds]
    );
    for (const m of inspRes.rows) {
      const entry = inspMap.get(m.atama_id) || { teslim_alma: null, teslim_etme: null };
      const formatted = formatInspectionRow(m);
      if (m.muayene_tipi === 'TESLIM_ALMA') entry.teslim_alma = formatted;
      else if (m.muayene_tipi === 'TESLIM_ETME') entry.teslim_etme = formatted;
      inspMap.set(m.atama_id, entry);
    }
  }

  const zimmetler = listRes.rows.map((row) => {
    const pair = inspMap.get(row.atama_id) || { teslim_alma: null, teslim_etme: null };
    return { ...row, teslim_alma: pair.teslim_alma, teslim_etme: pair.teslim_etme };
  });

  return {
    zimmetler,
    toplam: countRes.rows[0]?.toplam || 0,
    ozet: summaryRes.rows[0] || { toplam: 0, aktif_sayisi: 0, tamamlanan_sayisi: 0, teslim_alma_bekleyen: 0 },
  };
};

const getZimmetDetail = async (actor, atamaId) => {
  assertActor(actor);
  const res = await pool.query(
    `SELECT asa.atama_id, asa.arac_id, asa.sofor_user_id, asa.atanma_tarihi, asa.teslim_tarihi, asa.aktif,
            a.org_id, a.plaka, a.marka, a.model, a.yil, a.sayac_tipi, a.arsivlendi_mi,
            CASE WHEN a.sayac_tipi = 'SMH' THEN COALESCE(a.guncel_calisma_saati, 0) ELSE COALESCE(a.guncel_km, 0) END::int AS guncel_sayac,
            u.ad_soyad AS sofor_ad_soyad, u.email AS sofor_email, u.telefon AS sofor_telefon
     FROM arac_sofor_atamalari asa
     INNER JOIN araclar a ON a.arac_id = asa.arac_id
     INNER JOIN users u ON u.user_id = asa.sofor_user_id
     WHERE asa.atama_id = $1`,
    [atamaId]
  );
  if (res.rowCount === 0) throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Zimmet kaydı bulunamadı.');
  const zimmet = res.rows[0];
  if (actor.org_id && Number(zimmet.org_id) !== Number(actor.org_id)) {
    throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Zimmet kaydı bulunamadı.');
  }
  if (!isMgr(actor) && Number(zimmet.sofor_user_id) !== Number(actor.user_id)) {
    throw new AppError(403, 'FORBIDDEN_VEHICLE_ACCESS', 'Bu zimmet kaydına erişim yetkiniz yoktur.');
  }

  const inspRes = await pool.query(
    `SELECT zm.*, zm.muayene_tarihi::text AS muayene_tarihi,
            yu.ad_soyad AS yapan_ad_soyad,
            ie.durum AS is_emri_durum, ie.oncelik AS is_emri_oncelik
     FROM zimmet_muayeneleri zm
     LEFT JOIN users yu ON yu.user_id = zm.yapan_user_id
     LEFT JOIN is_emirleri ie ON ie.is_emri_id = zm.olusmus_is_emri_id
     WHERE zm.atama_id = $1
     ORDER BY CASE zm.muayene_tipi WHEN 'TESLIM_ALMA' THEN 0 ELSE 1 END, zm.muayene_id ASC`,
    [atamaId]
  );

  const muayeneIds = inspRes.rows.map((m) => m.muayene_id);
  const docMap = new Map();
  if (muayeneIds.length > 0) {
    const docRes = await pool.query(
      `SELECT belge_id, varlik_id, nesne_anahtari, orijinal_ad, mime_tipi, boyut_bayt, olusturma_tarihi
       FROM belge_kasasi
       WHERE varlik_tipi = 'zimmet' AND varlik_id = ANY($1::int[]) AND durum = 'aktif'
       ORDER BY olusturma_tarihi ASC, belge_id ASC`,
      [muayeneIds]
    );
    for (const d of docRes.rows) {
      const arr = docMap.get(d.varlik_id) || [];
      arr.push(d);
      docMap.set(d.varlik_id, arr);
    }
  }

  const muayeneler = inspRes.rows.map((m) => ({
    ...formatInspectionRow(m),
    belgeler: docMap.get(m.muayene_id) || [],
  }));
  const teslimAlma = muayeneler.find((m) => m.muayene_tipi === 'TESLIM_ALMA') || null;
  const teslimEtme = muayeneler.find((m) => m.muayene_tipi === 'TESLIM_ETME') || null;

  return { zimmet: { ...zimmet, teslim_alma: teslimAlma, teslim_etme: teslimEtme, muayeneler } };
};

module.exports = { listZimmetler, getZimmetDetail };
