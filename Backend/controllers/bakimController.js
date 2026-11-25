const pool = require('../db');
const Joi = require('joi');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { ileriTarihMi, tarihStr } = require('../utils/dateUtils');
const { araclariKilitle, arsivliAracEngelle, aracSayaciniSenkronizeEt, sayacSinirlari, sayacIhlaliMi, sayac422Govdesi, sayacBirimi } = require('../utils/odometerGuard');
const { logAuditEvent } = require('../services/auditService');

const extractFaturaFromNotlar = (rawNotlar) => {
  if (!rawNotlar) return null;
  const match = String(rawNotlar).match(/\[Fatura:\s*([^\]]+)\]/i);
  if (!match) return null;
  return match[1].trim().slice(0, 80) || null;
};

const resolveFaturaNo = (explicitFaturaNo, rawNotlar) => {
  if (explicitFaturaNo !== undefined) {
    return String(explicitFaturaNo || '').trim().slice(0, 80) || null;
  }
  return extractFaturaFromNotlar(rawNotlar);
};

const normalizeBelgeUrl = (raw) => String(raw || '').trim() || null;

const bakimBaseFields = {
  bakim_tipi: Joi.string().trim().min(1).max(150).required(),
  tarih: Joi.alternatives().try(Joi.string().trim().min(10).max(32), Joi.date()).required(),
  km: Joi.number().integer().min(0).max(2147483647).required(),
  maliyet: Joi.number().greater(0).max(9999999999.99).required(),
  notlar: Joi.string().max(2000).allow('', null).optional(),
  aciklama: Joi.string().max(2000).allow('', null).optional(),
  sifirla_parcalar: Joi.boolean().optional(),
  fatura_no: Joi.string().trim().max(80).allow('', null).optional(),
  belge_url: Joi.string().trim().max(2048).pattern(/^(https?:\/\/|\/)/i).allow('', null).optional(),
};

const bakimCreateSchema = Joi.object({
  ...bakimBaseFields,
  arac_id: Joi.number().integer().positive().required(),
});

const bakimUpdateSchema = Joi.object({
  ...bakimBaseFields,
  arac_id: Joi.number().integer().positive().allow(null, '').optional(),
});

// KULLANICININ ERİŞEBİLDİĞİ TÜM BAKIMLARI LİSTELE (RBAC Filtreli)
const getAllBakimlar = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const query = `
      SELECT b.*, ou.ad_soyad AS olusturan_ad, a.plaka, a.marka, a.model, a.sayac_tipi
      FROM bakimlar b
      INNER JOIN araclar a ON a.arac_id = b.arac_id
      LEFT JOIN users ou ON ou.user_id = b.olusturan_user_id
      WHERE ${clause}
      ORDER BY b.tarih DESC, b.bakim_id DESC
    `;
    const result = await pool.query(query, params);
    return res.status(200).json({ message: 'Bakımlar listelendi', bakimlar: result.rows });
  } catch (err) {
    console.error('Bakım listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// BELİRLİ ARACIN TÜM BAKIMLARINI LİSTELE (RBAC Filtreli)
const getBakimlarByArac = async (req, res) => {
  const { arac_id } = req.params;
  const aracId = Number(arac_id);
  if (!Number.isInteger(aracId) || aracId <= 0) {
    return res.status(400).json({ message: 'Geçersiz araç kimliği.' });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const sahiplik = await pool.query(
      `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [aracId, ...params]
    );

    if (sahiplik.rowCount === 0) {
      return res.status(403).json({ message: 'Bu araca erişim yetkiniz yoktur.' });
    }

    const query = `
      SELECT b.*, ou.ad_soyad AS olusturan_ad, a.plaka, a.marka, a.model, a.sayac_tipi
      FROM bakimlar b
      INNER JOIN araclar a ON a.arac_id = b.arac_id
      LEFT JOIN users ou ON ou.user_id = b.olusturan_user_id
      WHERE b.arac_id = $1 AND (${clause})
      ORDER BY b.tarih DESC, b.bakim_id DESC
    `;
    const result = await pool.query(query, [aracId, ...params]);

    return res.status(200).json({ message: 'Bakimlar listelendi', bakimlar: result.rows });
  } catch (err) {
    console.error('Araç bakımları listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// YENİ BAKIM KAYDI EKLE (RBAC + Pozitif Değer + Odometer Kronoloji 422 Validasyonu)
const createBakim = async (req, res) => {
  const { error, value } = bakimCreateSchema.validate(req.body || {}, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { arac_id, bakim_tipi, tarih, km, maliyet, notlar, aciklama, sifirla_parcalar } = value;
  const aracId = arac_id;

  const gun = tarihStr(tarih);
  if (!gun) {
    return res.status(400).json({ message: 'Geçersiz tarih formatı.' });
  }

  if (ileriTarihMi(tarih)) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  const sayisalKm = km;
  const sayisalMaliyet = maliyet;
  const notlarDegeri = notlar || aciklama || null;
  const faturaNo = resolveFaturaNo(value.fatura_no, notlarDegeri);
  const belgeUrl = normalizeBelgeUrl(value.belge_url);
  const olusturanUserId = req.user?.user_id || null;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const aracOwnershipCheck = await client.query(
      `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [aracId, ...params]
    );

    if (aracOwnershipCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Bu aracı duzenlemek icin yetkiniz yoktur.' });
    }

    const [hedefArac] = await araclariKilitle(client, [aracId]);
    if (!hedefArac) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Bu aracı duzenlemek icin yetkiniz yoktur.' });
    }
    if (await arsivliAracEngelle(client, res, hedefArac, 'bakım kaydı')) return;

    // Kronoloji kontrolü: tarihe göre alt/üst sınır (araclar.guncel_* alt sınıra katılmaz)
    const sinirlar = await sayacSinirlari(client, { aracId, tarih: gun });
    if (sayacIhlaliMi(sayisalKm, sinirlar)) {
      await client.query('ROLLBACK');
      return res.status(422).json(sayac422Govdesi(sayisalKm, sinirlar, hedefArac.sayac_tipi));
    }

    const query = `
      INSERT INTO bakimlar (arac_id, bakim_tipi, tarih, km, maliyet, notlar, fatura_no, belge_url, olusturan_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await client.query(query, [
      aracId,
      bakim_tipi,
      gun,
      sayisalKm,
      sayisalMaliyet,
      notlarDegeri,
      faturaNo,
      belgeUrl,
      olusturanUserId,
    ]);

    // Periyodik Bakım / Yağ & Filtre Bakımı için deterministik parça sıfırlama
    const PERIYODIK_SIFIRLAMA_HARITASI = {
      'Periyodik Bakım': [
        'Motor Yağı',
        'Yağ Filtresi',
        'Hava Filtresi',
        'Hava Filtresi (İç/Dış)',
        'Polen Filtresi',
        'Polen / Kabin Filtresi',
      ],
      'Yağ & Filtre Bakımı': [
        'Motor Yağı',
        'Yağ Filtresi',
        'Hava Filtresi',
        'Hava Filtresi (İç/Dış)',
        'Polen Filtresi',
        'Polen / Kabin Filtresi',
        'Yakıt / Su Ayırıcı Filtre',
      ],
    };

    const sifirlanacakParcalar = PERIYODIK_SIFIRLAMA_HARITASI[bakim_tipi] || null;
    if (sifirla_parcalar !== false && sifirlanacakParcalar) {
      await client.query(
        `UPDATE parca_takip
         SET son_degisim_km = $1,
             son_degisim_tarihi = $2
         WHERE arac_id = $3
           AND COALESCE(son_degisim_km, 0) <= $1
           AND parca_adi = ANY($4::text[])`,
        [sayisalKm, gun, aracId, sifirlanacakParcalar]
      );
    }

    if (hedefArac.sayac_tipi === 'SMH') {
      await client.query(
        'UPDATE araclar SET guncel_calisma_saati = GREATEST(COALESCE(guncel_calisma_saati, 0), $1) WHERE arac_id = $2',
        [sayisalKm, aracId]
      );
    } else {
      await client.query(
        'UPDATE araclar SET guncel_km = GREATEST(COALESCE(guncel_km, 0), $1) WHERE arac_id = $2',
        [sayisalKm, aracId]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({ message: 'Bakim kaydi eklendi', bakim: result.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error('Bakım ekleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    if (client) client.release();
  }
};

// BELİRLİ BAKIM KAYDINI GÜNCELLE
const updateBakim = async (req, res) => {
  const { bakim_id } = req.params;

  const bakimId = Number(bakim_id);
  if (!Number.isInteger(bakimId) || bakimId <= 0) {
    return res.status(400).json({ message: 'Geçersiz bakım kimliği.' });
  }

  const { error, value } = bakimUpdateSchema.validate(req.body || {}, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { arac_id, bakim_tipi, tarih, km, maliyet, notlar, aciklama } = value;

  const gun = tarihStr(tarih);
  if (!gun) {
    return res.status(400).json({ message: 'Geçersiz tarih formatı.' });
  }

  if (ileriTarihMi(tarih)) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  const sayisalKm = km;
  const sayisalMaliyet = maliyet;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Kaydı kilitle: eşzamanlı güncelleme araya giremez
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const bakimOwnershipCheck = await client.query(
      `SELECT b.bakim_id, b.arac_id, b.km, b.fatura_no, b.belge_url
       FROM bakimlar b
       INNER JOIN araclar a ON b.arac_id = a.arac_id
       WHERE b.bakim_id = $1 AND (${clause})
       FOR UPDATE OF b`,
      [bakimId, ...params]
    );

    if (bakimOwnershipCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Bakim kaydi bulunamadi veya yetkiniz yok.' });
    }

    const kaynakAracId = Number(bakimOwnershipCheck.rows[0].arac_id);
    const eskiKm = bakimOwnershipCheck.rows[0].km;
    const mevcutFaturaNo = bakimOwnershipCheck.rows[0].fatura_no || null;
    const mevcutBelgeUrl = bakimOwnershipCheck.rows[0].belge_url || null;
    const hedefAracId = Number(arac_id || kaynakAracId);
    if (!Number.isInteger(hedefAracId) || hedefAracId <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Geçersiz araç kimliği.' });
    }

    // Hedef araca erişim doğrulaması
    const hedefAracCheck = await client.query(
      `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
      [hedefAracId, ...params]
    );
    if (hedefAracCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Hedef araca erişim yetkiniz yoktur.' });
    }

    // Kaynak + hedef araçları sıralı kilitle (deadlock koruması) ve sayaç tiplerini al
    const kilitler = await araclariKilitle(client, [kaynakAracId, hedefAracId]);
    const hedefArac = kilitler.find((a) => Number(a.arac_id) === hedefAracId);
    const kaynakArac = kilitler.find((a) => Number(a.arac_id) === kaynakAracId);
    if (!hedefArac) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Hedef araca erişim yetkiniz yoktur.' });
    }
    if (await arsivliAracEngelle(client, res, kilitler, 'bakım kaydı', 'güncellenemez')) return;

    if (kaynakAracId !== hedefAracId && kaynakArac && kaynakArac.sayac_tipi !== hedefArac.sayac_tipi) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        code: 'SAYAC_TIPI_UYUSMAZ',
        message: 'Kayıt farklı sayaç tipindeki (KM/SMH) bir araca taşınamaz.',
        sayac_tipi: hedefArac.sayac_tipi,
        birim: sayacBirimi(hedefArac.sayac_tipi),
      });
    }

    // Kronoloji kontrolü: güncellenen kayıt hariç, tarihe göre alt/üst sınır
    const sinirlar = await sayacSinirlari(client, {
      aracId: hedefAracId,
      tarih: gun,
      haricTablo: 'bakimlar',
      haricId: bakimId,
    });
    if (sayacIhlaliMi(sayisalKm, sinirlar)) {
      await client.query('ROLLBACK');
      return res.status(422).json(sayac422Govdesi(sayisalKm, sinirlar, hedefArac.sayac_tipi));
    }

    const notlarDegeri = notlar || aciklama || null;
    const faturaNo = value.fatura_no !== undefined
      ? resolveFaturaNo(value.fatura_no, notlarDegeri)
      : (extractFaturaFromNotlar(notlarDegeri) ?? mevcutFaturaNo);
    const belgeUrl = value.belge_url !== undefined ? normalizeBelgeUrl(value.belge_url) : mevcutBelgeUrl;

    const result = await client.query(
      `UPDATE bakimlar
       SET arac_id = $1, bakim_tipi = $2, tarih = $3, km = $4, maliyet = $5, notlar = $6, fatura_no = $7, belge_url = $8
       WHERE bakim_id = $9
       RETURNING *`,
      [hedefAracId, bakim_tipi, gun, sayisalKm, sayisalMaliyet, notlarDegeri, faturaNo, belgeUrl, bakimId]
    );

    await aracSayaciniSenkronizeEt(client, {
      aracId: hedefAracId,
      eskiKm: kaynakAracId === hedefAracId ? eskiKm : null,
    });
    if (kaynakAracId !== hedefAracId) {
      await aracSayaciniSenkronizeEt(client, { aracId: kaynakAracId, eskiKm });
    }

    await client.query('COMMIT');

    return res.status(200).json({ message: 'Bakim kaydi guncellendi', bakim: result.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error('Bakım güncelleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    if (client) client.release();
  }
};

// BELİRLİ BAKIM KAYDINI SİL
const deleteBakim = async (req, res) => {
  const { bakim_id } = req.params;

  const bakimId = Number(bakim_id);
  if (!Number.isInteger(bakimId) || bakimId <= 0) {
    return res.status(400).json({ message: 'Geçersiz bakım kimliği.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const bakimCheck = await client.query(
      `SELECT b.bakim_id, b.arac_id, b.km, a.plaka, a.org_id, b.bakim_tipi, b.tarih, b.maliyet
       FROM bakimlar b
       INNER JOIN araclar a ON b.arac_id = a.arac_id
       WHERE b.bakim_id = $1 AND (${clause})
       FOR UPDATE OF b`,
      [bakimId, ...params]
    );

    if (bakimCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Bakim kaydi bulunamadi' });
    }

    const row = bakimCheck.rows[0];
    const aracId = Number(row.arac_id);
    const eskiKm = row.km;

    const [hedefArac] = await araclariKilitle(client, [aracId]);
    if (await arsivliAracEngelle(client, res, hedefArac, 'bakım kaydı', 'silinemez')) return;
    await client.query('DELETE FROM bakimlar WHERE bakim_id = $1', [bakimId]);
    await aracSayaciniSenkronizeEt(client, { aracId, eskiKm });

    await client.query('COMMIT');
    await logAuditEvent(req, {
      eylem: 'BAKIM_SILINDI', varlik_tipi: 'bakim', varlik_id: bakimId, org_id: row.org_id,
      ozet: `${row.plaka} plakalı aracın ${row.tarih} tarihli bakım kaydı silindi.`,
      detay: { plaka: row.plaka, bakim_tipi: row.bakim_tipi, tarih: row.tarih, maliyet: row.maliyet },
    });

    return res.status(200).json({ message: 'Bakim kaydi silindi' });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error('Bakım silme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getAllBakimlar,
  getBakimlarByArac,
  createBakim,
  updateBakim,
  deleteBakim,
};

