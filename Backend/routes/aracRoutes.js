const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middlewares/authMiddleware.js');
const { authorizeRoles, buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware.js');
const Joi = require('joi');

const router = express.Router();

// Araç tipine, yakıt türüne ve varyant periyoduna göre dinamik parça şablonu üretir
const olusturDinamikParcaSablonu = ({
  yakitTipi,
  kategoriAdi,
  sayacTipi,
  onerilenBakimKm,
  trigerDegisimKm,
  calismaSaatiBakim,
}) => {
  const normalizedYakit = String(yakitTipi || '').toLowerCase();
  const normalizedKategori = String(kategoriAdi || '').toLowerCase();
  const isElektrik = normalizedYakit.includes('elektrik');
  const isIsMakinesi =
    sayacTipi === 'SMH' ||
    Boolean(calismaSaatiBakim) ||
    normalizedKategori.includes('iş makine') ||
    normalizedKategori.includes('is makine');
  const isAgirVasita = normalizedKategori.includes('ağır vasıta') || normalizedKategori.includes('agir vasita');

  // 1. İŞ MAKİNESİ (Çalışma Saati - SMH Bazlı Endüstriyel Şablon)
  if (isIsMakinesi) {
    const saatPeriyot = Number(calismaSaatiBakim) > 0 ? Number(calismaSaatiBakim) : 250;
    return [
      { parca_adi: 'Motor Yağı', degisim_araligi_km: saatPeriyot },
      { parca_adi: 'Yağ Filtresi', degisim_araligi_km: saatPeriyot },
      { parca_adi: 'Hidrolik Yağ & Filtre', degisim_araligi_km: saatPeriyot * 2 },
      { parca_adi: 'Hava Filtresi (İç/Dış)', degisim_araligi_km: saatPeriyot },
      { parca_adi: 'Yakıt / Su Ayırıcı Filtre', degisim_araligi_km: saatPeriyot },
      { parca_adi: 'Şanzıman / Cer Yağı', degisim_araligi_km: saatPeriyot * 4 },
      { parca_adi: 'Akü', degisim_araligi_km: null },
      { parca_adi: 'Lastikler / Palet Takımı', degisim_araligi_km: null },
    ];
  }

  // 2. ELEKTRİKLİ ARAÇ (EV - Motor Yağı, Yağ Filtresi ve Triger Kayışı YOK)
  if (isElektrik) {
    const evBakimKm = Number(onerilenBakimKm) > 0 ? Number(onerilenBakimKm) : 20000;
    return [
      { parca_adi: 'Polen / Kabin Filtresi', degisim_araligi_km: evBakimKm },
      { parca_adi: 'Fren Balataları', degisim_araligi_km: 40000 },
      { parca_adi: 'Fren Hidroliği', degisim_araligi_km: evBakimKm * 2 },
      { parca_adi: 'Batarya Soğutma Sıvısı', degisim_araligi_km: evBakimKm * 4 },
      { parca_adi: '12V Yardımcı Akü', degisim_araligi_km: null },
      { parca_adi: 'Lastikler', degisim_araligi_km: null },
    ];
  }

  // 3. AĞIR VASITA / BİNEK / SUV / TİCARİ (İçten Yanmalı & Hibrit)
  const bakimKm =
    Number(onerilenBakimKm) > 0
      ? Number(onerilenBakimKm)
      : isAgirVasita
        ? 60000
        : 15000;

  const frenBalataKm = isAgirVasita ? 100000 : 30000;

  const parcalar = [
    { parca_adi: 'Motor Yağı', degisim_araligi_km: bakimKm },
    { parca_adi: 'Yağ Filtresi', degisim_araligi_km: bakimKm },
    { parca_adi: 'Hava Filtresi', degisim_araligi_km: bakimKm },
    { parca_adi: 'Polen Filtresi', degisim_araligi_km: bakimKm },
    { parca_adi: 'Fren Balataları', degisim_araligi_km: frenBalataKm },
    { parca_adi: 'Akü', degisim_araligi_km: null },
    { parca_adi: 'Lastikler', degisim_araligi_km: null },
  ];

  // Triger kayışı/zinciri yalnızca varyantta tanımlıysa veya standart binek/ticari ise eklenir
  if (trigerDegisimKm !== null) {
    const trigerKm =
      Number(trigerDegisimKm) > 0
        ? Number(trigerDegisimKm)
        : isAgirVasita
          ? 300000
          : 90000;
    parcalar.splice(5, 0, { parca_adi: 'Triger Kayışı', degisim_araligi_km: trigerKm });
  }

  return parcalar;
};

// Merkezi Araç Gümrük Kuralları
const aracSchema = Joi.object({
  plaka: Joi.string().min(5).max(11).required(),
  kategori_id: Joi.number().integer().optional().allow(null, ''),
  kategori: Joi.string().max(100).optional().allow(null, ''),
  marka: Joi.string().min(2).required(),
  model: Joi.string().min(1).required(),
  yil: Joi.number().integer().min(1950).max(2027).required(),
  guncel_km: Joi.number().integer().min(0).optional().allow(null, ''),
  guncel_calisma_saati: Joi.number().integer().min(0).optional().allow(null, ''),
  sayac_tipi: Joi.string().valid('KM', 'SMH').optional().allow(null, ''),
  varyant_id: Joi.number().integer().positive().optional().allow(null, ''),
  onerilen_bakim_km: Joi.number().integer().min(0).optional().allow(null, ''),
  triger_degisim_km: Joi.number().integer().min(0).optional().allow(null, ''),
  calisma_saati_bakim: Joi.number().integer().min(0).optional().allow(null, ''),
  muayene_tarihi: Joi.date().iso().optional().allow(null, ''),
  kasko_tarihi: Joi.date().iso().optional().allow(null, ''),
  sigorta_tarihi: Joi.date().iso().optional().allow(null, ''),
});

// Varyant bilgilerini veritabanından çözüp eksik bakım periyotlarını tamamlar
const cozumleVaryantBilgileri = async (client, {
  varyant_id,
  onerilen_bakim_km,
  triger_degisim_km,
  calisma_saati_bakim,
}) => {
  let varyantRow = null;
  if (varyant_id) {
    const vRes = await client.query(
      `SELECT varyant_id, yakit_tipi, onerilen_bakim_km, triger_degisim_km, calisma_saati_bakim
       FROM ref_arac_varyantlari
       WHERE varyant_id = $1
       LIMIT 1`,
      [Number(varyant_id)]
    );
    varyantRow = vRes.rows[0] || null;
  }

  const cozulmusBakimKm =
    onerilen_bakim_km !== undefined && onerilen_bakim_km !== '' && onerilen_bakim_km !== null
      ? Number(onerilen_bakim_km)
      : varyantRow?.onerilen_bakim_km ?? null;

  const cozulmusTrigerKm =
    triger_degisim_km !== undefined && triger_degisim_km !== '' && triger_degisim_km !== null
      ? Number(triger_degisim_km)
      : varyantRow
        ? varyantRow.triger_degisim_km
        : undefined;

  const cozulmusCalismaSaatiBakim =
    calisma_saati_bakim !== undefined && calisma_saati_bakim !== '' && calisma_saati_bakim !== null
      ? Number(calisma_saati_bakim)
      : varyantRow?.calisma_saati_bakim ?? null;

  return {
    varyantId: varyantRow ? varyantRow.varyant_id : varyant_id ? Number(varyant_id) : null,
    yakitTipi: varyantRow?.yakit_tipi || null,
    onerilenBakimKm: cozulmusBakimKm,
    trigerDegisimKm: cozulmusTrigerKm === undefined ? null : cozulmusTrigerKm,
    trigerDegisimKmRaw: cozulmusTrigerKm,
    calismaSaatiBakim: cozulmusCalismaSaatiBakim,
  };
};

// ARAÇ EKLE (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
router.post('/ekle', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), async (req, res) => {
  const { error, value } = aracSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const {
    plaka,
    kategori_id,
    kategori,
    marka,
    model,
    yil,
    guncel_km,
    guncel_calisma_saati,
    varyant_id,
    onerilen_bakim_km,
    triger_degisim_km,
    calisma_saati_bakim,
    muayene_tarihi,
    kasko_tarihi,
    sigorta_tarihi,
  } = value;
  const kullanici_id = req.user?.user_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const varyantBilgi = await cozumleVaryantBilgileri(client, {
      varyant_id,
      onerilen_bakim_km,
      triger_degisim_km,
      calisma_saati_bakim,
    });

    const sayacTipi = varyantBilgi.calismaSaatiBakim ? 'SMH' : 'KM';
    const baslangicKm =
      guncel_km !== undefined && guncel_km !== '' && guncel_km !== null ? Number(guncel_km) : 0;
    const baslangicSaat =
      guncel_calisma_saati !== undefined && guncel_calisma_saati !== '' && guncel_calisma_saati !== null
        ? Number(guncel_calisma_saati)
        : sayacTipi === 'SMH'
          ? baslangicKm
          : 0;

    const parcaBaslangicSayaci = sayacTipi === 'SMH' ? baslangicSaat : baslangicKm;

    const insertQuery = `
      INSERT INTO araclar (
        plaka, kategori_id, kategori, marka, model, yil, kullanici_id,
        guncel_km, guncel_calisma_saati, sayac_tipi, varyant_id,
        onerilen_bakim_km, triger_degisim_km, calisma_saati_bakim,
        muayene_tarihi, kasko_tarihi, sigorta_tarihi
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17
      )
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
      baslangicKm,
      baslangicSaat,
      sayacTipi,
      varyantBilgi.varyantId,
      varyantBilgi.onerilenBakimKm,
      varyantBilgi.trigerDegisimKm,
      varyantBilgi.calismaSaatiBakim,
      muayene_tarihi || null,
      kasko_tarihi || null,
      sigorta_tarihi || null,
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
    await client.query('ROLLBACK');
    console.error('Araç Ekleme Hatası:', err);
    if (err.code === '23505') return res.status(409).json({ message: 'Bu plaka zaten kayıtlı.' });
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// ARAÇLARI LİSTELE (RBAC Filtreli: SYSTEM_ADMIN, FLEET_MANAGER, DRIVER)
// Son bakım, güncel sayaç, bakım periyodu ve son 30 gün yakıt gideri tek sorguda döner (N+1 engeli)
router.get('/', authMiddleware, async (req, res) => {
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
         COALESCE(ym.son_30_gun_yakit_tutari, 0)::numeric AS son_30_gun_yakit_tutari
       FROM araclar a
       INNER JOIN users u ON u.user_id = a.kullanici_id
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
           SUM(y.tutar) FILTER (WHERE y.tarih >= CURRENT_DATE - INTERVAL '30 days') AS son_30_gun_yakit_tutari
         FROM yakitlar y
         WHERE y.arac_id = a.arac_id
       ) ym ON TRUE
       WHERE ${clause}
       ORDER BY a.arac_id DESC`,
      params
    );
    res.status(200).json({ message: 'Araçlar listelendi', araclar: result.rows });
  } catch (err) {
    console.error('Araç Listeleme Hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ARAÇ SİL (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
router.delete('/:arac_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), async (req, res) => {
  const { arac_id } = req.params;
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const result = await pool.query(
      `DELETE FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [arac_id, ...params]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Araç bulunamadı' });
    res.status(200).json({ message: 'Araç başarıyla silindi' });
  } catch (err) {
    console.error('Araç Silme Hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ARAÇ GÜNCELLE (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
router.put('/:arac_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), async (req, res) => {
  const { error, value } = aracSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { arac_id } = req.params;
  const {
    plaka,
    kategori_id,
    kategori,
    marka,
    model,
    yil,
    guncel_km,
    guncel_calisma_saati,
    varyant_id,
    onerilen_bakim_km,
    triger_degisim_km,
    calisma_saati_bakim,
    muayene_tarihi,
    kasko_tarihi,
    sigorta_tarihi,
  } = value;

  const client = await pool.connect();
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const mevcutRes = await client.query(
      `SELECT a.* FROM araclar a WHERE a.arac_id = $1 AND (${clause}) LIMIT 1`,
      [arac_id, ...params]
    );
    if (mevcutRes.rowCount === 0) {
      return res.status(404).json({ message: 'Araç bulunamadı' });
    }
    const mevcut = mevcutRes.rows[0];

    const varyantBilgi = await cozumleVaryantBilgileri(client, {
      varyant_id: varyant_id !== undefined ? varyant_id : mevcut.varyant_id,
      onerilen_bakim_km: onerilen_bakim_km !== undefined ? onerilen_bakim_km : mevcut.onerilen_bakim_km,
      triger_degisim_km: triger_degisim_km !== undefined ? triger_degisim_km : mevcut.triger_degisim_km,
      calisma_saati_bakim: calisma_saati_bakim !== undefined ? calisma_saati_bakim : mevcut.calisma_saati_bakim,
    });

    const sayacTipi = varyantBilgi.calismaSaatiBakim ? 'SMH' : 'KM';
    const yeniGuncelKm =
      guncel_km !== undefined && guncel_km !== '' && guncel_km !== null
        ? Number(guncel_km)
        : mevcut.guncel_km || 0;
    const yeniGuncelSaat =
      guncel_calisma_saati !== undefined && guncel_calisma_saati !== '' && guncel_calisma_saati !== null
        ? Number(guncel_calisma_saati)
        : mevcut.guncel_calisma_saati || 0;

    // Odometer Rollback Engeli: Mevcut en yüksek yakıt/bakım kaydının altına düşülemez
    const maxSayacRes = await client.query(
      `SELECT GREATEST(
         COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = $1), 0),
         COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = $1), 0)
       )::int AS max_kayitli_sayac`,
      [Number(arac_id)]
    );
    const maxKayitliSayac = Number(maxSayacRes.rows[0]?.max_kayitli_sayac || 0);
    const hedefSayacDegeri = sayacTipi === 'SMH' ? yeniGuncelSaat : yeniGuncelKm;

    if (hedefSayacDegeri < maxKayitliSayac) {
      return res.status(422).json({
        message: `Sayaç geri sarılamaz (Odometer Rollback engeli). Girilen değer (${hedefSayacDegeri}), mevcut en yüksek yakıt/bakım kaydından (${maxKayitliSayac}) düşük olamaz.`,
        max_kayitli_sayac: maxKayitliSayac,
      });
    }

    const updateQuery = `
      UPDATE araclar
      SET plaka = $1,
          kategori_id = $2,
          kategori = $3,
          marka = $4,
          model = $5,
          yil = $6,
          guncel_km = $7,
          guncel_calisma_saati = $8,
          sayac_tipi = $9,
          varyant_id = $10,
          onerilen_bakim_km = $11,
          triger_degisim_km = $12,
          calisma_saati_bakim = $13,
          muayene_tarihi = $14,
          kasko_tarihi = $15,
          sigorta_tarihi = $16
      WHERE arac_id = $17
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      plaka,
      kategori_id ? Number(kategori_id) : mevcut.kategori_id,
      kategori || mevcut.kategori || 'Otomobil',
      marka,
      model,
      yil,
      yeniGuncelKm,
      yeniGuncelSaat,
      sayacTipi,
      varyantBilgi.varyantId,
      varyantBilgi.onerilenBakimKm,
      varyantBilgi.trigerDegisimKm,
      varyantBilgi.calismaSaatiBakim,
      muayene_tarihi || null,
      kasko_tarihi || null,
      sigorta_tarihi || null,
      arac_id,
    ]);

    res.status(200).json({ message: 'Araç güncellendi', arac: result.rows[0] });
  } catch (err) {
    console.error('Araç Güncelleme Hatası:', err);
    if (err.code === '23505') return res.status(409).json({ message: 'Bu plaka zaten kayıtlı.' });
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

module.exports = router;