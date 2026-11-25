const Joi = require('joi');
const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { bugunTR, gunEkleTR } = require('../utils/dateUtils');
const { fetchPredictiveCandidates, computePredictiveSummaryFromRow } = require('../services/predictiveService');
const { NOTIFY_DAY_THRESHOLD, PREDICTIVE_NOTIFY_DAY_THRESHOLD, evaluateEvrakAlerts, evaluateParcaAlerts } = require('../services/alertEvaluators');
const { hasFinanceAccess } = require('../services/notificationService');

const SEVIYE_SIRASI = { kritik: 0, uyari: 1, bilgi: 2 };
const VISIBLE_COND = "COALESCE((meta_json->>'uygulama_gizli')::boolean, FALSE) = FALSE";
const VISIBLE_COND_B = "COALESCE((b.meta_json->>'uygulama_gizli')::boolean, FALSE) = FALSE";

const getBildirimler = async (req, res) => {
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(30),
    offset: Joi.number().integer().min(0).default(0),
    sadece_okunmamis: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),
    kategori: Joi.string().valid('belge', 'bakim', 'parca', 'maliyet_ozeti', 'sistem').optional(),
  });

  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const finansYetkisi = hasFinanceAccess(req.user);
    const conditions = ['b.user_id = $1', VISIBLE_COND_B];
    const params = [req.user.user_id];
    if (!finansYetkisi) conditions.push("b.kategori <> 'maliyet_ozeti'");
    if (value.sadece_okunmamis) conditions.push('b.okundu_mu = FALSE');
    if (value.kategori) {
      params.push(value.kategori);
      conditions.push(`b.kategori = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');
    const listParams = [...params, value.limit, value.offset];
    const unreadQuery = finansYetkisi
      ? `SELECT COUNT(*)::int AS okunmamis FROM bildirim_olaylari WHERE user_id = $1 AND okundu_mu = FALSE AND ${VISIBLE_COND}`
      : `SELECT COUNT(*)::int AS okunmamis FROM bildirim_olaylari WHERE user_id = $1 AND okundu_mu = FALSE AND ${VISIBLE_COND} AND kategori <> 'maliyet_ozeti'`;

    const [listRes, countRes, unreadRes] = await Promise.all([
      pool.query(
        `SELECT b.*, a.plaka
         FROM bildirim_olaylari b
         LEFT JOIN araclar a ON a.arac_id = b.arac_id
         WHERE ${whereClause}
         ORDER BY b.okundu_mu ASC, b.olusturma_tarihi DESC, b.bildirim_id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        listParams
      ),
      pool.query(`SELECT COUNT(*)::int AS toplam FROM bildirim_olaylari b WHERE ${whereClause}`, params),
      pool.query(unreadQuery, [req.user.user_id]),
    ]);

    return res.status(200).json({
      bildirimler: listRes.rows,
      okunmamis_sayisi: unreadRes.rows[0]?.okunmamis || 0,
      toplam: countRes.rows[0]?.toplam || 0,
    });
  } catch (err) {
    console.error('Bildirim listeleme hatası:', err);
    return res.status(500).json({ message: 'Bildirimler alınamadı' });
  }
};

const markBildirimOkundu = async (req, res) => {
  const paramCheck = Joi.object({ id: Joi.number().integer().positive().required() }).validate(req.params);
  if (paramCheck.error) return res.status(400).json({ message: 'Geçersiz bildirim kimliği.' });

  try {
    const finansYetkisi = hasFinanceAccess(req.user);
    const financeFilter = finansYetkisi ? '' : " AND kategori <> 'maliyet_ozeti'";

    const updateRes = await pool.query(
      `UPDATE bildirim_olaylari
       SET okundu_mu = TRUE, okunma_tarihi = COALESCE(okunma_tarihi, NOW())
       WHERE bildirim_id = $1 AND user_id = $2 AND ${VISIBLE_COND}${financeFilter}
       RETURNING *`,
      [paramCheck.value.id, req.user.user_id]
    );
    if (updateRes.rowCount === 0) {
      return res.status(404).json({ code: 'NOTIFICATION_NOT_FOUND', message: 'Bildirim bulunamadı.' });
    }

    const unreadRes = await pool.query(
      `SELECT COUNT(*)::int AS okunmamis
       FROM bildirim_olaylari
       WHERE user_id = $1 AND okundu_mu = FALSE AND ${VISIBLE_COND}${financeFilter}`,
      [req.user.user_id]
    );
    return res.status(200).json({ bildirim: updateRes.rows[0], okunmamis_sayisi: unreadRes.rows[0]?.okunmamis || 0 });
  } catch (err) {
    console.error('Bildirim okundu işaretleme hatası:', err);
    return res.status(500).json({ message: 'Bildirim güncellenemedi' });
  }
};

const markTumBildirimlerOkundu = async (req, res) => {
  try {
    const finansYetkisi = hasFinanceAccess(req.user);
    const financeFilter = finansYetkisi ? '' : " AND kategori <> 'maliyet_ozeti'";

    const result = await pool.query(
      `UPDATE bildirim_olaylari
       SET okundu_mu = TRUE, okunma_tarihi = COALESCE(okunma_tarihi, NOW())
       WHERE user_id = $1 AND okundu_mu = FALSE AND ${VISIBLE_COND}${financeFilter}`,
      [req.user.user_id]
    );
    return res.status(200).json({
      message: 'Tüm bildirimler okundu olarak işaretlendi.',
      guncellenen_sayisi: result.rowCount || 0,
      okunmamis_sayisi: 0,
    });
  } catch (err) {
    console.error('Toplu bildirim okundu hatası:', err);
    return res.status(500).json({ message: 'Bildirimler güncellenemedi' });
  }
};

const buildBudgetActionItems = async (orgId, bugun) => {
  if (!orgId) return { butce: [], items: [] };
  const ayBaslangic = `${bugun.slice(0, 7)}-01`;
  const [orgRes, spendRes] = await Promise.all([
    pool.query('SELECT aylik_yakit_butcesi, aylik_bakim_butcesi FROM organizations WHERE org_id = $1 LIMIT 1', [orgId]),
    pool.query(
      `SELECT
         COALESCE((SELECT SUM(y.tutar) FROM yakitlar y INNER JOIN araclar a ON a.arac_id = y.arac_id WHERE a.org_id = $1 AND y.tarih >= $2::date), 0)::numeric AS ay_yakit,
         COALESCE((SELECT SUM(b.maliyet) FROM bakimlar b INNER JOIN araclar a ON a.arac_id = b.arac_id WHERE a.org_id = $1 AND b.tarih >= $2::date), 0)::numeric AS ay_bakim`,
      [orgId, ayBaslangic]
    ),
  ]);
  if (orgRes.rowCount === 0) return { butce: [], items: [] };

  const yakitButce = Number(orgRes.rows[0].aylik_yakit_butcesi ?? 50000);
  const bakimButce = Number(orgRes.rows[0].aylik_bakim_butcesi ?? 25000);
  const toplamButce = yakitButce + bakimButce;
  const ayYakit = Number(spendRes.rows[0]?.ay_yakit || 0);
  const ayBakim = Number(spendRes.rows[0]?.ay_bakim || 0);
  const ayToplam = ayYakit + ayBakim;
  const yuzde = toplamButce > 0 ? Math.round((ayToplam / toplamButce) * 100) : (ayToplam > 0 ? 101 : 0);
  const durum = ayToplam > toplamButce ? 'ASIM' : (yuzde >= 80 ? 'RISK' : 'NORMAL');

  const butce = [{
    ay: bugun.slice(0, 7),
    toplam_butce: toplamButce,
    toplam_gerceklesen: ayToplam,
    yakit_gerceklesen: ayYakit,
    bakim_gerceklesen: ayBakim,
    kullanim_yuzdesi: yuzde,
    durum,
  }];
  const items = (durum === 'ASIM' || durum === 'RISK')
    ? [{
        kategori: 'maliyet_ozeti',
        seviye: durum === 'ASIM' ? 'kritik' : 'uyari',
        arac_id: null,
        plaka: null,
        baslik: durum === 'ASIM' ? `Aylık filo bütçesi aşıldı (%${yuzde})` : `Aylık filo bütçesi risk sınırında (%${yuzde})`,
        detay: `Bu ay toplam ${ayToplam.toLocaleString('tr-TR')} ₺ harcandı (Hedef: ${toplamButce.toLocaleString('tr-TR')} ₺).`,
        link_url: '/app',
        meta: butce[0],
      }]
    : [];

  return { butce, items };
};

const getAksiyonMerkezi = async (req, res) => {
  try {
    const now = new Date();
    const bugun = bugunTR(now);
    const sinirTarih = gunEkleTR(bugun, NOTIFY_DAY_THRESHOLD);
    const accessFilter = buildVehicleAccessFilter(req.user);
    const finansYetkisi = hasFinanceAccess(req.user);

    const [evrakRes, parcaRes, predictiveRows, budgetResult] = await Promise.all([
      pool.query(
        `SELECT a.arac_id, a.plaka, a.muayene_tarihi, a.kasko_tarihi, a.sigorta_tarihi
         FROM araclar a
         WHERE (${accessFilter.clause})
           AND a.arsivlendi_mi = FALSE
           AND (
             (a.muayene_tarihi IS NOT NULL AND a.muayene_tarihi <= $${accessFilter.params.length + 1}::date)
             OR (a.kasko_tarihi IS NOT NULL AND a.kasko_tarihi <= $${accessFilter.params.length + 1}::date)
             OR (a.sigorta_tarihi IS NOT NULL AND a.sigorta_tarihi <= $${accessFilter.params.length + 1}::date)
           )`,
        [...accessFilter.params, sinirTarih]
      ),
      pool.query(
        `SELECT p.parca_id, p.parca_adi, p.son_degisim_km, p.degisim_araligi_km, p.son_degisim_tarihi,
                a.arac_id, a.plaka, a.sayac_tipi,
                GREATEST(
                  COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
                  COALESCE((SELECT MAX(y.km) FROM yakitlar y WHERE y.arac_id = a.arac_id), 0),
                  COALESCE((SELECT MAX(b.km) FROM bakimlar b WHERE b.arac_id = a.arac_id), 0)
                ) AS guncel_km
         FROM parca_takip p
         INNER JOIN araclar a ON a.arac_id = p.arac_id
         WHERE (${accessFilter.clause}) AND a.arsivlendi_mi = FALSE`,
        accessFilter.params
      ),
      fetchPredictiveCandidates({ accessFilter }),
      finansYetkisi ? buildBudgetActionItems(req.user.org_id, bugun) : Promise.resolve({ butce: [], items: [] }),
    ]);

    const ogeler = [];
    let belgeSayisi = 0;
    let bakimSayisi = 0;
    let parcaSayisi = 0;

    for (const arac of evrakRes.rows) {
      for (const alert of evaluateEvrakAlerts(arac, bugun)) {
        belgeSayisi += 1;
        ogeler.push({
          kategori: 'belge',
          seviye: alert.seviye,
          arac_id: arac.arac_id,
          plaka: arac.plaka,
          baslik: alert.baslik,
          detay: alert.detay,
          link_url: '/app/takvim',
          meta: alert.meta,
        });
      }
    }

    for (const row of predictiveRows) {
      const pred = computePredictiveSummaryFromRow(row, now);
      if (!pred || (pred.kalanKm > 0 && pred.kalanGun > PREDICTIVE_NOTIFY_DAY_THRESHOLD)) continue;
      bakimSayisi += 1;
      ogeler.push({
        kategori: 'bakim',
        seviye: pred.kalanKm <= 0 || pred.kalanGun <= 3 ? 'kritik' : 'uyari',
        arac_id: row.arac_id,
        plaka: row.plaka,
        baslik: `${row.plaka} tahmini bakım ${pred.kalanKm <= 0 ? 'aşıldı' : 'yaklaştı'}`,
        detay: pred.kalanKm <= 0
          ? `Hedef sayaç (${pred.hedefKm.toLocaleString('tr-TR')} ${pred.birim}) ${Math.abs(pred.kalanKm).toLocaleString('tr-TR')} ${pred.birim} aşıldı.`
          : `Tahmini tarih ${pred.tahminiTarihTR} (${pred.kalanGun} gün, kalan ${Math.max(0, pred.kalanKm).toLocaleString('tr-TR')} ${pred.birim}).`,
        link_url: '/app/hareketler',
        meta: pred,
      });
    }

    for (const p of parcaRes.rows) {
      for (const alert of evaluateParcaAlerts(p, bugun)) {
        parcaSayisi += 1;
        ogeler.push({
          kategori: 'parca',
          seviye: alert.seviye,
          arac_id: p.arac_id,
          plaka: p.plaka,
          baslik: alert.baslik,
          detay: alert.detay,
          link_url: '/app/parcalar',
          meta: alert.meta,
        });
      }
    }

    ogeler.push(...budgetResult.items);
    ogeler.sort((a, b) => (SEVIYE_SIRASI[a.seviye] ?? 9) - (SEVIYE_SIRASI[b.seviye] ?? 9));

    return res.status(200).json({
      olusturma_zamani: now.toISOString(),
      finans_yetkisi: finansYetkisi,
      ozet: {
        toplam: ogeler.length,
        kritik: ogeler.filter((x) => x.seviye === 'kritik').length,
        uyari: ogeler.filter((x) => x.seviye === 'uyari').length,
        belge_sayisi: belgeSayisi,
        bakim_sayisi: bakimSayisi,
        parca_sayisi: parcaSayisi,
        butce_sayisi: budgetResult.items.length,
      },
      ogeler,
      butce: budgetResult.butce,
    });
  } catch (err) {
    console.error('Aksiyon merkezi hatası:', err);
    return res.status(500).json({ message: 'Aksiyon merkezi verileri alınamadı' });
  }
};

module.exports = {
  getBildirimler,
  markBildirimOkundu,
  markTumBildirimlerOkundu,
  getAksiyonMerkezi,
};
