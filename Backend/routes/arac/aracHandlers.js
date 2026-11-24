const pool = require('../../db');
const { buildVehicleAccessFilter } = require('../../middlewares/rbacMiddleware.js');
const { tarihStr } = require('../../utils/dateUtils');
const Joi = require('joi');
const {
  olusturDinamikParcaSablonu,
  aracSchema,
  cozumleVaryantBilgileri,
  dogrulaKategoriId,
} = require('./aracHelpers');
const { ensureManagerOrgId } = require('../../controllers/admin/adminHelpers');
const { updateArac, deleteArac } = require('./aracMutationHandlers');

// POST /api/araclar/ekle — ARAÇ EKLE (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
const createArac = async (req, res) => {
  const { error, value } = aracSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const {
    plaka, kategori_id, kategori, marka, model, yil,
    guncel_km, guncel_calisma_saati, sayac_tipi, varyant_id,
    onerilen_bakim_km, triger_degisim_km, calisma_saati_bakim,
    muayene_tarihi, kasko_tarihi, sigorta_tarihi,
    depo_kapasitesi_l, hedef_tuketim,
  } = value;
  const kullanici_id = req.user?.user_id;

  let orgId = req.user?.org_id || null;
  if (!orgId && req.user?.role === 'FLEET_MANAGER' && kullanici_id) {
    orgId = await ensureManagerOrgId(kullanici_id);
  }

  let client = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    if (kategori_id) {
      await dogrulaKategoriId(client, Number(kategori_id));
    }

    const varyantBilgi = await cozumleVaryantBilgileri(client, {
      varyant_id,
      onerilen_bakim_km,
      triger_degisim_km,
      calisma_saati_bakim,
    });

    const normalizedKat = String(kategori || '').toLocaleLowerCase('tr-TR');
    const isKategoriIsMakinesi =
      normalizedKat.includes('iş makine') || normalizedKat.includes('is makine');

    const sayacTipi =
      sayac_tipi === 'KM' || sayac_tipi === 'SMH'
        ? sayac_tipi
        : varyantBilgi.calismaSaatiBakim || isKategoriIsMakinesi
          ? 'SMH'
          : 'KM';

    if (sayacTipi === 'KM') {
      varyantBilgi.calismaSaatiBakim = null;
    } else {
      varyantBilgi.onerilenBakimKm = null;
      varyantBilgi.trigerDegisimKm = null;
      varyantBilgi.trigerDegisimKmRaw = null;
    }

    const baslangicKm =
      guncel_km !== undefined && guncel_km !== '' && guncel_km !== null ? Number(guncel_km) : 0;
    const baslangicSaat =
      guncel_calisma_saati !== undefined && guncel_calisma_saati !== '' && guncel_calisma_saati !== null
        ? Number(guncel_calisma_saati)
        : sayacTipi === 'SMH'
          ? baslangicKm
          : 0;

    const parcaBaslangicSayaci = sayacTipi === 'SMH' ? baslangicSaat : baslangicKm;
    const depoKapasitesi =
      depo_kapasitesi_l !== undefined && depo_kapasitesi_l !== '' && depo_kapasitesi_l !== null
        ? Number(depo_kapasitesi_l)
        : null;
    const hedefTuketim =
      hedef_tuketim !== undefined && hedef_tuketim !== '' && hedef_tuketim !== null
        ? Number(hedef_tuketim)
        : null;

    const insertQuery = `
      INSERT INTO araclar (
        plaka, kategori_id, kategori, marka, model, yil, kullanici_id, org_id,
        guncel_km, guncel_calisma_saati, sayac_tipi, varyant_id,
        onerilen_bakim_km, triger_degisim_km, calisma_saati_bakim,
        muayene_tarihi, kasko_tarihi, sigorta_tarihi, depo_kapasitesi_l, hedef_tuketim
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      plaka,
      kategori_id ? Number(kategori_id) : null,
      kategori || 'Otomobil',
      marka,
      model,
      yil,
      kullanici_id,
      orgId,
      baslangicKm,
      baslangicSaat,
      sayacTipi,
      varyantBilgi.varyantId,
      varyantBilgi.onerilenBakimKm,
      varyantBilgi.trigerDegisimKm,
      varyantBilgi.calismaSaatiBakim,
      muayene_tarihi ? tarihStr(muayene_tarihi) : null,
      kasko_tarihi ? tarihStr(kasko_tarihi) : null,
      sigorta_tarihi ? tarihStr(sigorta_tarihi) : null,
      depoKapasitesi,
      hedefTuketim,
    ]);

    const aracId = result.rows[0].arac_id;
    const dinamikParcalar = olusturDinamikParcaSablonu({
      yakitTipi: varyantBilgi.yakitTipi,
      kategoriAdi: kategori || 'Otomobil',
      sayacTipi,
      onerilenBakimKm: varyantBilgi.onerilenBakimKm,
      trigerDegisimKm: varyantBilgi.trigerDegisimKmRaw,
      calismaSaatiBakim: varyantBilgi.calismaSaatiBakim,
    });

    if (dinamikParcalar.length > 0) {
      const parcaAdlari = dinamikParcalar.map((p) => p.parca_adi);
      const degisimAraliklari = dinamikParcalar.map((p) => p.degisim_araligi_km);
      await client.query(
        `INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, degisim_araligi_km, son_degisim_tarihi)
         SELECT $1, u.parca_adi, $2, u.degisim_araligi_km, CURRENT_DATE
         FROM UNNEST($3::varchar[], $4::int[]) AS u(parca_adi, degisim_araligi_km)
         ON CONFLICT (arac_id, parca_adi) DO NOTHING`,
        [aracId, parcaBaslangicSayaci, parcaAdlari, degisimAraliklari]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Araç eklendi', arac: result.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error('Araç Ekleme Hatası:', err);
    if (err.status === 400) return res.status(400).json({ code: err.code, message: err.message });
    if (err.code === '23503') return res.status(400).json({ message: 'Geçersiz kategori veya varyant kimliği.' });
    if (err.code === '23505') return res.status(409).json({ message: 'Bu plaka zaten kayıtlı.' });
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    if (client) client.release();
  }
};

// GET /api/araclar — ARAÇLARI LİSTELE (RBAC Filtreli: SYSTEM_ADMIN, FLEET_MANAGER, DRIVER)
// Son bakım, güncel sayaç, bakım periyodu ve son 30 gün yakıt gideri tek sorguda döner (N+1 engeli)
const listAraclar = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const result = await pool.query(
      `SELECT
         a.*,
         COALESCE(a.kategori, k.ad, 'Otomobil') AS kategori,
         u.telefon,
         u.email_bildirim_aktif,
         u.sms_bildirim_aktif,
         sb.son_bakim_km,
         sb.son_bakim_tarihi,
         GREATEST(
           COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
           COALESCE(ym.max_km, 0),
           COALESCE(bm.max_km, 0)
         )::int AS guncel_sayac,
         CASE
           WHEN a.sayac_tipi = 'SMH' THEN COALESCE(NULLIF(a.calisma_saati_bakim, 0), 250)
           ELSE COALESCE(NULLIF(a.onerilen_bakim_km, 0), 15000)
         END::int AS bakim_periyodu,
         COALESCE(ym.son_30_gun_yakit_tutari, 0)::numeric AS son_30_gun_yakit_tutari,
         z.zimmetli_sofor_id,
         z.zimmetli_sofor_ad
       FROM araclar a
       LEFT JOIN users u ON u.user_id = a.kullanici_id
       LEFT JOIN ref_kategoriler k ON k.kategori_id = a.kategori_id
       LEFT JOIN LATERAL (
         SELECT b.km AS son_bakim_km, b.tarih AS son_bakim_tarihi
         FROM bakimlar b
         WHERE b.arac_id = a.arac_id
         ORDER BY b.km DESC NULLS LAST, b.tarih DESC
         LIMIT 1
       ) sb ON TRUE
       LEFT JOIN LATERAL (
         SELECT MAX(b2.km) AS max_km
         FROM bakimlar b2
         WHERE b2.arac_id = a.arac_id
       ) bm ON TRUE
       LEFT JOIN LATERAL (
         SELECT
           MAX(y.km) AS max_km,
           SUM(y.tutar) FILTER (WHERE y.tarih >= (NOW() AT TIME ZONE 'Europe/Istanbul')::date - INTERVAL '30 days') AS son_30_gun_yakit_tutari
         FROM yakitlar y
         WHERE y.arac_id = a.arac_id
       ) ym ON TRUE
       LEFT JOIN LATERAL (
         SELECT
           asa.sofor_user_id AS zimmetli_sofor_id,
           COALESCE(NULLIF(TRIM(zs.ad_soyad), ''), zs.email) AS zimmetli_sofor_ad
         FROM arac_sofor_atamalari asa
         INNER JOIN users zs ON zs.user_id = asa.sofor_user_id
         WHERE asa.arac_id = a.arac_id AND asa.aktif = TRUE
         ORDER BY asa.atanma_tarihi DESC, asa.atama_id DESC
         LIMIT 1
       ) z ON TRUE
       WHERE ${clause}
       ORDER BY a.arac_id DESC`,
      params
    );
    res.status(200).json({ message: 'Araçlar listelendi', araclar: result.rows });
  } catch (err) {
    console.error('Araç Listeleme Hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// PUT /api/araclar/:id/konum — ARAÇ CANLI KONUM / SÜRÜCÜ CHECK-IN GÜNCELLE
const updateAracKonum = async (req, res) => {
  const paramCheck = Joi.object({
    id: Joi.number().integer().positive().required(),
  }).validate(req.params);
  if (paramCheck.error) {
    return res.status(400).json({ message: paramCheck.error.details[0].message });
  }

  const schema = Joi.object({
    enlem: Joi.number().min(-90).max(90).required(),
    boylam: Joi.number().min(-180).max(180).required(),
    konum_adi: Joi.string().trim().max(160).allow('', null).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const aracId = paramCheck.value.id;

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const accessCheck = await pool.query(
      `SELECT arac_id, plaka FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [aracId, ...params]
    );

    if (accessCheck.rowCount === 0) {
      return res.status(403).json({
        code: 'FORBIDDEN_VEHICLE_ACCESS',
        message: 'Bu aracın konumunu güncelleme yetkiniz yok.',
      });
    }

    const konumAdi = value.konum_adi ? value.konum_adi.trim() : null;
    const result = await pool.query(
      `UPDATE araclar
       SET son_enlem = $1,
           son_boylam = $2,
           son_konum_adi = $3,
           son_konum_zamani = NOW()
       WHERE arac_id = $4
       RETURNING arac_id, plaka, son_enlem, son_boylam, son_konum_adi, son_konum_zamani`,
      [value.enlem, value.boylam, konumAdi, aracId]
    );

    return res.status(200).json({
      message: 'Araç konumu güncellendi.',
      arac: result.rows[0],
    });
  } catch (err) {
    console.error('Araç Konum Güncelleme Hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

module.exports = {
  createArac,
  listAraclar,
  updateAracKonum,
  deleteArac,
  updateArac,
};
