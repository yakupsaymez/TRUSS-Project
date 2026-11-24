const pool = require('../db');
const Joi = require('joi');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { ensureManagerOrgId } = require('./admin/adminHelpers');
const { bugunTR } = require('../utils/dateUtils');

// 1. GENEL OZET (Toplam arac, toplam yakit gideri, toplam bakim gideri, yaklasan parca degisimi sayisi)
const getGenelOzet = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const query = `
      WITH kullanici_araclari AS (
        SELECT
          a.arac_id,
          a.sayac_tipi,
          GREATEST(
            COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
            COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = a.arac_id), 0),
            COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0)
          ) AS guncel_km
        FROM araclar a
        WHERE ${clause}
      ),
      yakit_toplam AS (
        SELECT COALESCE(SUM(y.tutar), 0) AS toplam_yakit,
               COALESCE(SUM(y.litre), 0) AS toplam_litre
        FROM yakitlar y
        INNER JOIN kullanici_araclari ka ON ka.arac_id = y.arac_id
      ),
      bakim_toplam AS (
        SELECT COALESCE(SUM(b.maliyet), 0) AS toplam_bakim,
               COUNT(b.bakim_id) AS bakim_sayisi
        FROM bakimlar b
        INNER JOIN kullanici_araclari ka ON ka.arac_id = b.arac_id
      ),
      parca_uyari AS (
        SELECT COUNT(*) AS yaklasan_parca_sayisi
        FROM parca_takip p
        INNER JOIN kullanici_araclari ka ON ka.arac_id = p.arac_id
        WHERE p.degisim_araligi_km IS NOT NULL
          AND p.degisim_araligi_km > 0
          AND ((COALESCE(p.son_degisim_km, 0) + p.degisim_araligi_km) - GREATEST(ka.guncel_km, COALESCE(p.son_degisim_km, 0))) <= LEAST(1500, ROUND(p.degisim_araligi_km * 0.15))
      )
      SELECT
        (SELECT COUNT(*) FROM kullanici_araclari)::int AS toplam_arac,
        (SELECT toplam_yakit FROM yakit_toplam)::numeric AS toplam_yakit_gideri,
        (SELECT toplam_litre FROM yakit_toplam)::numeric AS toplam_litre,
        (SELECT toplam_bakim FROM bakim_toplam)::numeric AS toplam_bakim_gideri,
        (SELECT bakim_sayisi FROM bakim_toplam)::int AS toplam_bakim_sayisi,
        ((SELECT toplam_yakit FROM yakit_toplam) + (SELECT toplam_bakim FROM bakim_toplam))::numeric AS toplam_gider,
        (SELECT yaklasan_parca_sayisi FROM parca_uyari)::int AS yaklasan_parca_sayisi
    `;

    const result = await pool.query(query, params);
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('RAPOR GENEL-OZET HATASI:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// 2. AYLIK HARCAMA TRENDI (Son 6 ayin yakit ve bakim harcamalari)
const getAylikHarcamaTrendi = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const query = `
      WITH months AS (
        SELECT TO_CHAR(date_trunc('month', (NOW() AT TIME ZONE 'Europe/Istanbul')::date - (n || ' months')::interval), 'YYYY-MM') AS ay
        FROM generate_series(0, 5) AS n
      ),
      yakit_aylik AS (
        SELECT TO_CHAR(date_trunc('month', y.tarih), 'YYYY-MM') AS ay,
               SUM(y.tutar) AS toplam_yakit
        FROM yakitlar y
        JOIN araclar a ON a.arac_id = y.arac_id
        WHERE (${clause})
          AND y.tarih >= date_trunc('month', (NOW() AT TIME ZONE 'Europe/Istanbul')::date - INTERVAL '5 months')
        GROUP BY 1
      ),
      bakim_aylik AS (
        SELECT TO_CHAR(date_trunc('month', b.tarih), 'YYYY-MM') AS ay,
               SUM(b.maliyet) AS toplam_bakim
        FROM bakimlar b
        JOIN araclar a ON a.arac_id = b.arac_id
        WHERE (${clause})
          AND b.tarih >= date_trunc('month', (NOW() AT TIME ZONE 'Europe/Istanbul')::date - INTERVAL '5 months')
        GROUP BY 1
      )
      SELECT m.ay,
             COALESCE(y.toplam_yakit, 0)::numeric AS toplam_yakit,
             COALESCE(b.toplam_bakim, 0)::numeric AS toplam_bakim,
             (COALESCE(y.toplam_yakit, 0) + COALESCE(b.toplam_bakim, 0))::numeric AS toplam_harcama
      FROM months m
      LEFT JOIN yakit_aylik y ON y.ay = m.ay
      LEFT JOIN bakim_aylik b ON b.ay = m.ay
      ORDER BY m.ay ASC
    `;

    const result = await pool.query(query, params);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('RAPOR AYLIK-TREND HATASI:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// 3. ARAC MALIYET DAGILIMI (Arac bazinda toplam yakit, bakim ve genel maliyetler)
const getAracMaliyetDagilimi = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const query = `
      SELECT
        a.arac_id,
        a.plaka,
        a.marka,
        a.model,
        a.yil,
        COALESCE(y.toplam_yakit, 0)::numeric AS toplam_yakit,
        COALESCE(b.toplam_bakim, 0)::numeric AS toplam_bakim,
        (COALESCE(y.toplam_yakit, 0) + COALESCE(b.toplam_bakim, 0))::numeric AS toplam_maliyet
      FROM araclar a
      LEFT JOIN (
        SELECT arac_id, SUM(tutar) AS toplam_yakit
        FROM yakitlar
        GROUP BY arac_id
      ) y ON y.arac_id = a.arac_id
      LEFT JOIN (
        SELECT arac_id, SUM(maliyet) AS toplam_bakim
        FROM bakimlar
        GROUP BY arac_id
      ) b ON b.arac_id = a.arac_id
      WHERE ${clause}
      ORDER BY toplam_maliyet DESC, a.plaka ASC
    `;

    const result = await pool.query(query, params);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('RAPOR ARAC-MALIYET HATASI:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// 4. AYLIK FILO BUTCE / GERCEKLESEN ANALIZI
const getButceAnalizi = async (req, res) => {
  try {
    let aylikYakitButcesi = 50000;
    let aylikBakimButcesi = 25000;

    const userRes = await pool.query(
      'SELECT org_id FROM users WHERE user_id = $1 LIMIT 1',
      [req.user.user_id]
    );
    const orgId = userRes.rows[0]?.org_id || null;

    if (orgId) {
      const orgRes = await pool.query(
        `SELECT aylik_yakit_butcesi, aylik_bakim_butcesi
         FROM organizations
         WHERE org_id = $1
         LIMIT 1`,
        [orgId]
      );
      if (orgRes.rowCount > 0) {
        aylikYakitButcesi = Number(orgRes.rows[0].aylik_yakit_butcesi ?? 50000);
        aylikBakimButcesi = Number(orgRes.rows[0].aylik_bakim_butcesi ?? 25000);
      }
    }

    const toplamButce = aylikYakitButcesi + aylikBakimButcesi;

    const { clause, params } = buildVehicleAccessFilter(req.user);
    const trendRes = await pool.query(
      `WITH months AS (
         SELECT TO_CHAR(date_trunc('month', (NOW() AT TIME ZONE 'Europe/Istanbul')::date - (n || ' months')::interval), 'YYYY-MM') AS ay
         FROM generate_series(0, 5) AS n
       ),
       yakit_aylik AS (
         SELECT TO_CHAR(date_trunc('month', y.tarih), 'YYYY-MM') AS ay,
                SUM(y.tutar) AS toplam_yakit
         FROM yakitlar y
         JOIN araclar a ON a.arac_id = y.arac_id
         WHERE (${clause})
           AND y.tarih >= date_trunc('month', (NOW() AT TIME ZONE 'Europe/Istanbul')::date - INTERVAL '5 months')
         GROUP BY 1
       ),
       bakim_aylik AS (
         SELECT TO_CHAR(date_trunc('month', b.tarih), 'YYYY-MM') AS ay,
                SUM(b.maliyet) AS toplam_bakim
         FROM bakimlar b
         JOIN araclar a ON a.arac_id = b.arac_id
         WHERE (${clause})
           AND b.tarih >= date_trunc('month', (NOW() AT TIME ZONE 'Europe/Istanbul')::date - INTERVAL '5 months')
         GROUP BY 1
       )
       SELECT m.ay,
              COALESCE(y.toplam_yakit, 0)::numeric AS toplam_yakit,
              COALESCE(b.toplam_bakim, 0)::numeric AS toplam_bakim,
              (COALESCE(y.toplam_yakit, 0) + COALESCE(b.toplam_bakim, 0))::numeric AS toplam_harcama
       FROM months m
       LEFT JOIN yakit_aylik y ON y.ay = m.ay
       LEFT JOIN bakim_aylik b ON b.ay = m.ay
       ORDER BY m.ay ASC`,
      params
    );

    const hesaplaKullanim = (gerceklesen, butce) =>
      butce > 0 ? Math.round((gerceklesen / butce) * 100) : gerceklesen > 0 ? 101 : 0;

    const hesaplaDurum = (gerceklesen, butce) => {
      if (gerceklesen > butce) return 'ASIM';
      if (butce > 0 && gerceklesen / butce >= 0.8) return 'RISK';
      return 'NORMAL';
    };

    const aylikSerisi = trendRes.rows.map((r) => {
      const yakitGerceklesen = Number(r.toplam_yakit || 0);
      const bakimGerceklesen = Number(r.toplam_bakim || 0);
      const toplamGerceklesen = Number(r.toplam_harcama || 0);
      const kullanimYuzdesi = hesaplaKullanim(toplamGerceklesen, toplamButce);
      const durum = hesaplaDurum(toplamGerceklesen, toplamButce);
      return {
        ay: r.ay,
        yakit_butce: aylikYakitButcesi,
        bakim_butce: aylikBakimButcesi,
        toplam_butce: toplamButce,
        yakit_gerceklesen: yakitGerceklesen,
        bakim_gerceklesen: bakimGerceklesen,
        toplam_gerceklesen: toplamGerceklesen,
        kullanim_yuzdesi: kullanimYuzdesi,
        durum,
        asim: durum === 'ASIM',
      };
    });

    const sonEleman = aylikSerisi[aylikSerisi.length - 1] || {
      ay: bugunTR().slice(0, 7),
      yakit_butce: aylikYakitButcesi,
      bakim_butce: aylikBakimButcesi,
      toplam_butce: toplamButce,
      yakit_gerceklesen: 0,
      bakim_gerceklesen: 0,
      toplam_gerceklesen: 0,
      kullanim_yuzdesi: 0,
      durum: 'NORMAL',
      asim: false,
    };

    return res.status(200).json({
      butce: {
        aylik_yakit_butcesi: aylikYakitButcesi,
        aylik_bakim_butcesi: aylikBakimButcesi,
        toplam_butce: toplamButce,
      },
      mevcut_ay: {
        ay: sonEleman.ay,
        yakit_butce: aylikYakitButcesi,
        bakim_butce: aylikBakimButcesi,
        toplam_butce: toplamButce,
        yakit_gerceklesen: sonEleman.yakit_gerceklesen,
        bakim_gerceklesen: sonEleman.bakim_gerceklesen,
        toplam_gerceklesen: sonEleman.toplam_gerceklesen,
        kullanim_yuzdesi: sonEleman.kullanim_yuzdesi,
        durum: sonEleman.durum,
        asim: sonEleman.asim,
      },
      aylik_serisi: aylikSerisi,
    });
  } catch (err) {
    console.error('RAPOR BUTCE HATASI:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// 5. AYLIK BUTCE HEDEFI GUNCELLE
const updateButceHedefi = async (req, res) => {
  const schema = Joi.object({
    aylik_yakit_butcesi: Joi.number().min(0).max(100000000).required(),
    aylik_bakim_butcesi: Joi.number().min(0).max(100000000).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const orgId = await ensureManagerOrgId(req.user.user_id);

    if (!orgId) {
      return res.status(404).json({ message: 'Organizasyon bulunamadı.' });
    }

    const result = await pool.query(
      `UPDATE organizations
       SET aylik_yakit_butcesi = $1,
           aylik_bakim_butcesi = $2
       WHERE org_id = $3
       RETURNING org_id, aylik_yakit_butcesi, aylik_bakim_butcesi`,
      [value.aylik_yakit_butcesi, value.aylik_bakim_butcesi, orgId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Organizasyon bulunamadı.' });
    }

    const row = result.rows[0];
    const yakit = Number(row.aylik_yakit_butcesi);
    const bakim = Number(row.aylik_bakim_butcesi);

    return res.status(200).json({
      message: 'Aylık bütçe hedefleri güncellendi.',
      butce: {
        aylik_yakit_butcesi: yakit,
        aylik_bakim_butcesi: bakim,
        toplam_butce: yakit + bakim,
      },
    });
  } catch (err) {
    console.error('RAPOR BUTCE GUNCELLEME HATASI:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

module.exports = {
  getGenelOzet,
  getAylikHarcamaTrendi,
  getAracMaliyetDagilimi,
  getButceAnalizi,
  updateButceHedefi,
};

