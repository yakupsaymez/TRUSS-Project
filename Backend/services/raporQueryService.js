const pool = require('../db');
const AppError = require('../utils/AppError');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { ensureManagerOrgId } = require('../controllers/admin/adminHelpers');
const { bugunTR, tarihStr } = require('../utils/dateUtils');
const { computeTcoAnalysis } = require('./tcoService');
const { serializeCsv } = require('../utils/csvSerializer');

const MAX_EXPORT_ROWS = 10000;
const ALLOWED_PERIODS = new Set([90, 180, 365]);
const ALLOWED_TIPS = new Set(['TUMU', 'YAKIT', 'BAKIM']);
const ALLOWED_WO_DURUM = new Set([
  'TUMU', 'acik', 'serviste', 'tamamlandi', 'iptal', 'talep', 'onaylandi', 'reddedildi',
]);

const toCols = (defs) => defs.map(([header, key, type]) => ({ header, key, type }));

const FILO_COLS = toCols([
  ['Plaka', 'plaka', 'string'], ['Marka / Model', 'marka_model', 'string'], ['Sayaç Tipi', 'sayac_tipi', 'string'],
  ['Veri Yeterli', 'veri_yeterli_text', 'string'], ['Yakıt Maliyeti (TL)', 'yakit_maliyet', 'number'], ['Bakım Maliyeti (TL)', 'bakim_maliyet', 'number'],
  ['Parça Maliyeti (TL)', 'parca_maliyet', 'number'], ['Toplam Maliyet (TL)', 'toplam_maliyet', 'number'], ['Toplam Yakıt (L)', 'toplam_litre', 'number'],
  ['Dönem Mesafe', 'donem_mesafe', 'number'], ['Birim Maliyet', 'birim_maliyet', 'number'], ['Ort. Tüketim', 'ort_tuketim', 'number'],
  ['Filo Sapma (%)', 'filo_sapma_yuzde', 'number'], ['Verimlilik Skoru', 'verimlilik_skoru', 'number'], ['Skor Durumu', 'skor_durum', 'string'],
  ['Değerlendirme Nedenleri', 'nedenler_text', 'string'],
]);

const HAREKET_COLS = toCols([
  ['Kayıt Tipi', 'kayit_tipi', 'string'], ['Kayıt ID', 'kayit_id', 'number'], ['Plaka', 'plaka', 'string'],
  ['Marka / Model', 'marka_model', 'string'], ['Sayaç Tipi', 'sayac_tipi', 'string'], ['Tarih', 'tarih', 'string'],
  ['Sayaç', 'km', 'number'], ['İşlem / Yakıt Tipi', 'islem_detayi', 'string'], ['Litre', 'litre', 'number'],
  ['Tutar (TL)', 'tutar', 'number'], ['Fatura No', 'fatura_no', 'string'], ['Notlar', 'notlar', 'string'],
]);

const IS_EMRI_COLS = toCols([
  ['İş Emri ID', 'is_emri_id', 'number'], ['Plaka', 'plaka', 'string'], ['Marka / Model', 'marka_model', 'string'],
  ['Başlık', 'baslik', 'string'], ['Kategori', 'kategori', 'string'], ['Öncelik', 'oncelik', 'string'],
  ['Durum', 'durum', 'string'], ['Servis Adı', 'servis_adi', 'string'], ['Bildirilen Sayaç', 'bildirilen_sayac', 'number'],
  ['Tahmini Maliyet (TL)', 'tahmini_maliyet', 'number'], ['Gerçekleşen Maliyet (TL)', 'gerceklesen_maliyet', 'number'], ['Planlanan Tarih', 'planlanan_tarih', 'string'],
  ['Oluşturma Tarihi', 'olusturma_tarihi', 'string'], ['Kapanış Tarihi', 'kapanis_tarihi', 'string'], ['Açan Kullanıcı', 'acan_ad_soyad', 'string'],
  ['Onaylayan Kullanıcı', 'onaylayan_ad_soyad', 'string'], ['Red / İptal Nedeni', 'red_iptal_nedeni', 'string'],
]);

const parseOptionalDate = (raw, field) => {
  if (raw === undefined || raw === null || raw === '') return null;
  const str = String(raw).trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(str) ? tarihStr(str) : null;
  if (!parsed) throw new AppError(400, 'INVALID_EXPORT_PARAMS', `Geçersiz ${field} tarihi (YYYY-MM-DD beklenir).`);
  return parsed;
};

const parseCommonExportFilters = ({ baslangic, bitis, arac_id }) => {
  const start = parseOptionalDate(baslangic, 'baslangic');
  const end = parseOptionalDate(bitis, 'bitis');
  if (start && end && start > end) {
    throw new AppError(422, 'INVALID_DATE_RANGE', 'Başlangıç tarihi bitiş tarihinden büyük olamaz.');
  }
  let aracId = null;
  if (arac_id !== undefined && arac_id !== null && arac_id !== '') {
    const n = Number(arac_id);
    if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'INVALID_EXPORT_PARAMS', 'Geçersiz arac_id parametresi.');
    aracId = n;
  }
  return { start, end, aracId };
};

const buildCsvPayload = (filename, columns, allRows) => {
  const truncated = allRows.length > MAX_EXPORT_ROWS;
  const rows = truncated ? allRows.slice(0, MAX_EXPORT_ROWS) : allRows;
  return { filename, csv: serializeCsv(columns, rows), count: rows.length, limit: MAX_EXPORT_ROWS, truncated };
};

const queryAylikTrend = async (actor) => {
  const { clause, params } = buildVehicleAccessFilter(actor, 1);
  const query = `
    WITH months AS (
      SELECT TO_CHAR(date_trunc('month', (NOW() AT TIME ZONE 'Europe/Istanbul')::date - (n || ' months')::interval), 'YYYY-MM') AS ay
      FROM generate_series(0, 5) AS n
    ),
    yakit_aylik AS (
      SELECT TO_CHAR(date_trunc('month', y.tarih), 'YYYY-MM') AS ay, SUM(y.tutar) AS toplam_yakit
      FROM yakitlar y JOIN araclar a ON a.arac_id = y.arac_id
      WHERE (${clause}) AND y.tarih >= date_trunc('month', (NOW() AT TIME ZONE 'Europe/Istanbul')::date - INTERVAL '5 months') GROUP BY 1
    ),
    bakim_aylik AS (
      SELECT TO_CHAR(date_trunc('month', b.tarih), 'YYYY-MM') AS ay, SUM(b.maliyet) AS toplam_bakim
      FROM bakimlar b JOIN araclar a ON a.arac_id = b.arac_id
      WHERE (${clause}) AND b.tarih >= date_trunc('month', (NOW() AT TIME ZONE 'Europe/Istanbul')::date - INTERVAL '5 months') GROUP BY 1
    )
    SELECT m.ay, COALESCE(y.toplam_yakit, 0)::numeric AS toplam_yakit, COALESCE(b.toplam_bakim, 0)::numeric AS toplam_bakim,
           (COALESCE(y.toplam_yakit, 0) + COALESCE(b.toplam_bakim, 0))::numeric AS toplam_harcama
    FROM months m LEFT JOIN yakit_aylik y ON y.ay = m.ay LEFT JOIN bakim_aylik b ON b.ay = m.ay ORDER BY m.ay ASC`;
  return (await pool.query(query, params)).rows;
};

const getGenelOzet = async (actor) => {
  const { clause, params } = buildVehicleAccessFilter(actor, 1);
  const query = `
    WITH kullanici_araclari AS (
      SELECT a.arac_id, a.sayac_tipi, a.arsivlendi_mi,
        GREATEST(COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
          COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = a.arac_id), 0),
          COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0)) AS guncel_km
      FROM araclar a WHERE ${clause}
    ),
    yakit_toplam AS (SELECT COALESCE(SUM(y.tutar), 0) AS toplam_yakit, COALESCE(SUM(y.litre), 0) AS toplam_litre FROM yakitlar y INNER JOIN kullanici_araclari ka ON ka.arac_id = y.arac_id),
    bakim_toplam AS (SELECT COALESCE(SUM(b.maliyet), 0) AS toplam_bakim, COUNT(b.bakim_id) AS bakim_sayisi FROM bakimlar b INNER JOIN kullanici_araclari ka ON ka.arac_id = b.arac_id),
    parca_uyari AS (
      SELECT COUNT(*) AS yaklasan_parca_sayisi FROM parca_takip p INNER JOIN kullanici_araclari ka ON ka.arac_id = p.arac_id
      WHERE ka.arsivlendi_mi = FALSE AND p.degisim_araligi_km IS NOT NULL AND p.degisim_araligi_km > 0
        AND ((COALESCE(p.son_degisim_km, 0) + p.degisim_araligi_km) - GREATEST(ka.guncel_km, COALESCE(p.son_degisim_km, 0))) <= LEAST(1500, ROUND(p.degisim_araligi_km * 0.15))
    )
    SELECT (SELECT COUNT(*) FROM kullanici_araclari WHERE arsivlendi_mi = FALSE)::int AS toplam_arac,
      (SELECT toplam_yakit FROM yakit_toplam)::numeric AS toplam_yakit_gideri, (SELECT toplam_litre FROM yakit_toplam)::numeric AS toplam_litre,
      (SELECT toplam_bakim FROM bakim_toplam)::numeric AS toplam_bakim_gideri, (SELECT bakim_sayisi FROM bakim_toplam)::int AS toplam_bakim_sayisi,
      ((SELECT toplam_yakit FROM yakit_toplam) + (SELECT toplam_bakim FROM bakim_toplam))::numeric AS toplam_gider,
      (SELECT yaklasan_parca_sayisi FROM parca_uyari)::int AS yaklasan_parca_sayisi`;
  return (await pool.query(query, params)).rows[0];
};

const getAylikHarcamaTrendi = (actor) => queryAylikTrend(actor);

const getAracMaliyetDagilimi = async (actor) => {
  const { clause, params } = buildVehicleAccessFilter(actor, 1);
  const query = `
    WITH erisebilir_araclar AS (SELECT a.arac_id, a.plaka, a.marka, a.model, a.yil FROM araclar a WHERE ${clause}),
    yakit_ozet AS (SELECT y.arac_id, SUM(y.tutar) AS toplam_yakit FROM yakitlar y INNER JOIN erisebilir_araclar ea ON ea.arac_id = y.arac_id GROUP BY y.arac_id),
    bakim_ozet AS (SELECT b.arac_id, SUM(b.maliyet) AS toplam_bakim FROM bakimlar b INNER JOIN erisebilir_araclar ea ON ea.arac_id = b.arac_id GROUP BY b.arac_id)
    SELECT ea.arac_id, ea.plaka, ea.marka, ea.model, ea.yil,
      COALESCE(y.toplam_yakit, 0)::numeric AS toplam_yakit, COALESCE(b.toplam_bakim, 0)::numeric AS toplam_bakim,
      (COALESCE(y.toplam_yakit, 0) + COALESCE(b.toplam_bakim, 0))::numeric AS toplam_maliyet
    FROM erisebilir_araclar ea LEFT JOIN yakit_ozet y ON y.arac_id = ea.arac_id LEFT JOIN bakim_ozet b ON b.arac_id = ea.arac_id
    ORDER BY toplam_maliyet DESC, ea.plaka ASC`;
  return (await pool.query(query, params)).rows;
};

const getButceAnalizi = async (actor) => {
  let aylikYakitButcesi = 50000;
  let aylikBakimButcesi = 25000;
  const userRes = await pool.query('SELECT org_id FROM users WHERE user_id = $1 LIMIT 1', [actor.user_id]);
  const orgId = userRes.rows[0]?.org_id || null;
  if (orgId) {
    const orgRes = await pool.query('SELECT aylik_yakit_butcesi, aylik_bakim_butcesi FROM organizations WHERE org_id = $1 LIMIT 1', [orgId]);
    if (orgRes.rowCount > 0) {
      aylikYakitButcesi = Number(orgRes.rows[0].aylik_yakit_butcesi ?? 50000);
      aylikBakimButcesi = Number(orgRes.rows[0].aylik_bakim_butcesi ?? 25000);
    }
  }
  const toplamButce = aylikYakitButcesi + aylikBakimButcesi;
  const mapRow = (ay, yakit, bakim, toplam) => {
    const kullanim = toplamButce > 0 ? Math.round((toplam / toplamButce) * 100) : toplam > 0 ? 101 : 0;
    const durum = toplam > toplamButce ? 'ASIM' : toplamButce > 0 && toplam / toplamButce >= 0.8 ? 'RISK' : 'NORMAL';
    return {
      ay, yakit_butce: aylikYakitButcesi, bakim_butce: aylikBakimButcesi, toplam_butce: toplamButce,
      yakit_gerceklesen: yakit, bakim_gerceklesen: bakim, toplam_gerceklesen: toplam,
      kullanim_yuzdesi: kullanim, durum, asim: durum === 'ASIM',
    };
  };
  const aylikSerisi = (await queryAylikTrend(actor)).map((r) =>
    mapRow(r.ay, Number(r.toplam_yakit || 0), Number(r.toplam_bakim || 0), Number(r.toplam_harcama || 0))
  );
  return {
    butce: { aylik_yakit_butcesi: aylikYakitButcesi, aylik_bakim_butcesi: aylikBakimButcesi, toplam_butce: toplamButce },
    mevcut_ay: aylikSerisi[aylikSerisi.length - 1] || mapRow(bugunTR().slice(0, 7), 0, 0, 0),
    aylik_serisi: aylikSerisi,
  };
};

const updateButceHedefi = async (actor, { aylik_yakit_butcesi, aylik_bakim_butcesi }) => {
  const orgId = await ensureManagerOrgId(actor.user_id);
  if (!orgId) throw new AppError(404, null, 'Organizasyon bulunamadı.');
  const result = await pool.query(
    `UPDATE organizations SET aylik_yakit_butcesi = $1, aylik_bakim_butcesi = $2
     WHERE org_id = $3 RETURNING org_id, aylik_yakit_butcesi, aylik_bakim_butcesi`,
    [aylik_yakit_butcesi, aylik_bakim_butcesi, orgId]
  );
  if (result.rowCount === 0) throw new AppError(404, null, 'Organizasyon bulunamadı.');
  const yakit = Number(result.rows[0].aylik_yakit_butcesi);
  const bakim = Number(result.rows[0].aylik_bakim_butcesi);
  return {
    message: 'Aylık bütçe hedefleri güncellendi.',
    butce: { aylik_yakit_butcesi: yakit, aylik_bakim_butcesi: bakim, toplam_butce: yakit + bakim },
  };
};

const exportFiloMaliyetCsv = async (actor, { donem_gun } = {}) => {
  const rawPeriod = donem_gun === undefined || donem_gun === null || donem_gun === '' ? 90 : Number(donem_gun);
  if (!Number.isInteger(rawPeriod) || !ALLOWED_PERIODS.has(rawPeriod)) {
    throw new AppError(400, 'INVALID_PERIOD', 'donem_gun 90, 180 veya 365 olmalıdır.');
  }
  const analysis = await computeTcoAnalysis(actor, rawPeriod);
  const mapped = (analysis.araclar || []).map((r) => ({
    ...r,
    veri_yeterli_text: r.veri_yeterli ? 'Evet' : 'Hayır',
    nedenler_text: Array.isArray(r.nedenler) ? r.nedenler.join(' | ') : '',
  }));
  return buildCsvPayload(`filo-maliyet-${rawPeriod}g-${bugunTR()}.csv`, FILO_COLS, mapped);
};

const exportHareketlerCsv = async (actor, filters = {}) => {
  const tip = filters.tip === undefined || filters.tip === null || filters.tip === ''
    ? 'TUMU' : String(filters.tip).trim().toUpperCase();
  if (!ALLOWED_TIPS.has(tip)) throw new AppError(400, 'INVALID_EXPORT_PARAMS', 'tip TUMU, YAKIT veya BAKIM olmalıdır.');
  const { start, end, aracId } = parseCommonExportFilters(filters);
  const access = buildVehicleAccessFilter(actor, 1);
  const params = [...access.params];
  const aracIdx = aracId ? params.push(aracId) : null;
  const startIdx = start ? params.push(start) : null;
  const endIdx = end ? params.push(end) : null;
  const buildConds = (alias) => {
    const conds = [`(${access.clause})`];
    if (aracIdx) conds.push(`${alias}.arac_id = $${aracIdx}`);
    if (startIdx) conds.push(`${alias}.tarih >= $${startIdx}`);
    if (endIdx) conds.push(`${alias}.tarih <= $${endIdx}`);
    return conds.join(' AND ');
  };
  const yakitSql = `SELECT 'YAKIT'::text AS kayit_tipi, y.yakit_id AS kayit_id, a.plaka,
    CONCAT_WS(' ', a.marka, a.model) AS marka_model, a.sayac_tipi, y.tarih::text AS tarih,
    y.km, y.yakit_tipi AS islem_detayi, y.litre, y.tutar, y.fatura_no, y.notlar
    FROM yakitlar y INNER JOIN araclar a ON a.arac_id = y.arac_id WHERE ${buildConds('y')}`;
  const bakimSql = `SELECT 'BAKIM'::text AS kayit_tipi, b.bakim_id AS kayit_id, a.plaka,
    CONCAT_WS(' ', a.marka, a.model) AS marka_model, a.sayac_tipi, b.tarih::text AS tarih,
    b.km, b.bakim_tipi AS islem_detayi, NULL::numeric AS litre, b.maliyet AS tutar, b.fatura_no, b.notlar
    FROM bakimlar b INNER JOIN araclar a ON a.arac_id = b.arac_id WHERE ${buildConds('b')}`;
  const bodySql = tip === 'YAKIT' ? yakitSql : tip === 'BAKIM' ? bakimSql : `${yakitSql} UNION ALL ${bakimSql}`;
  params.push(MAX_EXPORT_ROWS + 1);
  const res = await pool.query(
    `SELECT * FROM (${bodySql}) h ORDER BY tarih DESC, km DESC NULLS LAST, kayit_tipi ASC, kayit_id DESC LIMIT $${params.length}`,
    params
  );
  return buildCsvPayload(`hareketler-${bugunTR()}.csv`, HAREKET_COLS, res.rows);
};

const exportIsEmirleriCsv = async (actor, filters = {}) => {
  const durum = filters.durum === undefined || filters.durum === null || filters.durum === ''
    ? 'TUMU' : String(filters.durum).trim();
  if (!ALLOWED_WO_DURUM.has(durum)) throw new AppError(400, 'INVALID_EXPORT_PARAMS', 'Geçersiz durum filtresi.');
  const { start, end, aracId } = parseCommonExportFilters(filters);
  const access = buildVehicleAccessFilter(actor, 1);
  const params = [...access.params];
  const conds = [`(${access.clause})`];
  if (aracId) { params.push(aracId); conds.push(`ie.arac_id = $${params.length}`); }
  if (durum !== 'TUMU') { params.push(durum); conds.push(`ie.durum = $${params.length}`); }
  if (start) { params.push(start); conds.push(`ie.olusturma_tarihi >= ($${params.length}::text || ' 00:00:00+03')::timestamptz`); }
  if (end) { params.push(end); conds.push(`ie.olusturma_tarihi < (($${params.length}::date + 1)::text || ' 00:00:00+03')::timestamptz`); }
  params.push(MAX_EXPORT_ROWS + 1);
  const res = await pool.query(
    `SELECT ie.is_emri_id, a.plaka, CONCAT_WS(' ', a.marka, a.model) AS marka_model,
            ie.baslik, ie.kategori, ie.oncelik, ie.durum, ie.servis_adi,
            ie.bildirilen_sayac, ie.tahmini_maliyet, ie.gerceklesen_maliyet,
            ie.planlanan_tarih::text AS planlanan_tarih,
            TO_CHAR(ie.olusturma_tarihi AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') AS olusturma_tarihi,
            TO_CHAR(ie.kapanis_tarihi AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') AS kapanis_tarihi,
            au.ad_soyad AS acan_ad_soyad, ou.ad_soyad AS onaylayan_ad_soyad, ie.red_iptal_nedeni
     FROM is_emirleri ie
     INNER JOIN araclar a ON a.arac_id = ie.arac_id
     LEFT JOIN users au ON au.user_id = ie.acan_user_id
     LEFT JOIN users ou ON ou.user_id = ie.onaylayan_user_id
     WHERE ${conds.join(' AND ')}
     ORDER BY ie.olusturma_tarihi DESC, ie.is_emri_id DESC
     LIMIT $${params.length}`,
    params
  );
  return buildCsvPayload(`is-emirleri-${bugunTR()}.csv`, IS_EMRI_COLS, res.rows);
};

module.exports = {
  MAX_EXPORT_ROWS, getGenelOzet, getAylikHarcamaTrendi, getAracMaliyetDagilimi,
  getButceAnalizi, updateButceHedefi, exportFiloMaliyetCsv, exportHareketlerCsv, exportIsEmirleriCsv,
};
