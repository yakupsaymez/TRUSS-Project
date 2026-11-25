const pool = require('../db');
const Joi = require('joi');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { ileriTarihMi, tarihStr } = require('../utils/dateUtils');
const { araclariKilitle, arsivliAracEngelle, aracSayaciniSenkronizeEt, sayacSinirlari, sayacIhlaliMi, sayac422Govdesi, sayacBirimi } = require('../utils/odometerGuard');
const { evaluateFuelRecordAnomalies } = require('../services/fuelAnomalyService');
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

const yakitBaseFields = {
  yakit_tipi: Joi.string().trim().max(50).allow('', null).optional(),
  tarih: Joi.alternatives().try(Joi.string().trim().min(10).max(32), Joi.date()).required(),
  litre: Joi.number().greater(0).max(99999999.99).required(),
  tutar: Joi.number().greater(0).max(9999999999.99).required(),
  km: Joi.number().integer().min(0).max(2147483647).allow(null, '').optional(),
  notlar: Joi.string().max(2000).allow('', null).optional(),
  fatura_no: Joi.string().trim().max(80).allow('', null).optional(),
  belge_url: Joi.string().trim().max(2048).pattern(/^(https?:\/\/|\/)/i).allow('', null).optional(),
};

const yakitCreateSchema = Joi.object({
  ...yakitBaseFields,
  arac_id: Joi.number().integer().positive().required(),
});

const yakitUpdateSchema = Joi.object({
  ...yakitBaseFields,
  arac_id: Joi.number().integer().positive().allow(null, '').optional(),
});

// KULLANICININ ERİŞEBİLDİĞİ TÜM YAKIT KAYITLARINI LİSTELE (RBAC Filtreli)
const getAllYakitlar = async (req, res) => {
  try {
    const { clause, params } = buildVehicleAccessFilter(req.user);
    const query = `
      SELECT y.*, ou.ad_soyad AS olusturan_ad, a.plaka, a.marka, a.model, a.sayac_tipi
      FROM yakitlar y
      INNER JOIN araclar a ON a.arac_id = y.arac_id
      LEFT JOIN users ou ON ou.user_id = y.olusturan_user_id
      WHERE ${clause}
      ORDER BY y.tarih DESC, y.yakit_id DESC
    `;
    const result = await pool.query(query, params);
    return res.status(200).json({ message: 'Yakit kayitlari listelendi', yakitlar: result.rows });
  } catch (err) {
    console.error('Yakıt listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// BELİRLİ ARACIN TÜM YAKIT KAYITLARINI LİSTELE (RBAC Filtreli)
const getYakitlarByArac = async (req, res) => {
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
      SELECT y.*, ou.ad_soyad AS olusturan_ad, a.plaka, a.marka, a.model, a.sayac_tipi
      FROM yakitlar y
      INNER JOIN araclar a ON a.arac_id = y.arac_id
      LEFT JOIN users ou ON ou.user_id = y.olusturan_user_id
      WHERE y.arac_id = $1 AND (${clause})
      ORDER BY y.tarih DESC, y.yakit_id DESC
    `;
    const result = await pool.query(query, [aracId, ...params]);

    return res.status(200).json({ message: 'Yakit kayitlari listelendi', yakitlar: result.rows });
  } catch (err) {
    console.error('Araç yakıt kayıtları listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// YENİ YAKIT KAYDI EKLE (RBAC + Pozitif Değer + Odometer Kronoloji 422 Validasyonu)
const createYakit = async (req, res) => {
  const { error, value } = yakitCreateSchema.validate(req.body || {}, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { arac_id, yakit_tipi, tarih, litre, tutar, km, notlar } = value;
  const aracId = arac_id;

  const gun = tarihStr(tarih);
  if (!gun) {
    return res.status(400).json({ message: 'Geçersiz tarih formatı.' });
  }

  if (ileriTarihMi(tarih)) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  const sayisalLitre = litre;
  const sayisalTutar = tutar;
  const sayisalKm = km !== undefined && km !== '' && km !== null ? Number(km) : null;
  const notlarDegeri = notlar || null;
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
    if (await arsivliAracEngelle(client, res, hedefArac, 'yakıt kaydı')) return;

    // Kronoloji kontrolü: tarihe göre alt/üst sınır (araclar.guncel_* alt sınıra katılmaz)
    if (sayisalKm !== null) {
      const sinirlar = await sayacSinirlari(client, { aracId, tarih: gun });
      if (sayacIhlaliMi(sayisalKm, sinirlar)) {
        await client.query('ROLLBACK');
        return res.status(422).json(sayac422Govdesi(sayisalKm, sinirlar, hedefArac.sayac_tipi));
      }
    }

    const query = `
      INSERT INTO yakitlar (arac_id, yakit_tipi, tarih, litre, tutar, km, notlar, fatura_no, belge_url, olusturan_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await client.query(query, [
      aracId,
      yakit_tipi || null,
      gun,
      sayisalLitre,
      sayisalTutar,
      sayisalKm,
      notlarDegeri,
      faturaNo,
      belgeUrl,
      olusturanUserId,
    ]);

    if (sayisalKm !== null) {
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
    }

    await client.query('COMMIT');

    let anomaliler = [];
    try {
      anomaliler = await evaluateFuelRecordAnomalies(result.rows[0].yakit_id, { mode: 'create' });
    } catch (anomErr) {
      console.error('Yakıt anomali değerlendirme hatası (create):', anomErr);
    }

    return res.status(201).json({ message: 'Yakit kaydi eklendi', yakit: result.rows[0], anomaliler });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error('Yakıt ekleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    if (client) client.release();
  }
};

// BELİRLİ YAKIT KAYDINI GÜNCELLE
const updateYakit = async (req, res) => {
  const { yakit_id } = req.params;

  const yakitId = Number(yakit_id);
  if (!Number.isInteger(yakitId) || yakitId <= 0) {
    return res.status(400).json({ message: 'Geçersiz yakıt kimliği.' });
  }

  const { error, value } = yakitUpdateSchema.validate(req.body || {}, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { arac_id, yakit_tipi, tarih, litre, tutar, km, notlar } = value;

  const gun = tarihStr(tarih);
  if (!gun) {
    return res.status(400).json({ message: 'Geçersiz tarih formatı.' });
  }

  if (ileriTarihMi(tarih)) {
    return res.status(400).json({ message: 'İleri tarihli kayıt girilemez.' });
  }

  const sayisalLitre = litre;
  const sayisalTutar = tutar;
  const sayisalKm = km !== undefined && km !== '' && km !== null ? Number(km) : null;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Kaydı kilitle: eşzamanlı güncelleme araya giremez
    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const yakitOwnershipCheck = await client.query(
      `SELECT y.yakit_id, y.arac_id, y.km, y.fatura_no, y.belge_url
       FROM yakitlar y
       INNER JOIN araclar a ON y.arac_id = a.arac_id
       WHERE y.yakit_id = $1 AND (${clause})
       FOR UPDATE OF y`,
      [yakitId, ...params]
    );

    if (yakitOwnershipCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Yakit kaydi bulunamadi veya yetkiniz yok.' });
    }

    const kaynakAracId = Number(yakitOwnershipCheck.rows[0].arac_id);
    const eskiKm = yakitOwnershipCheck.rows[0].km;
    const mevcutFaturaNo = yakitOwnershipCheck.rows[0].fatura_no || null;
    const mevcutBelgeUrl = yakitOwnershipCheck.rows[0].belge_url || null;
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
    if (kaynakAracId !== hedefAracId && await arsivliAracEngelle(client, res, hedefArac, 'yakıt kaydı')) return;

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
    if (sayisalKm !== null) {
      const sinirlar = await sayacSinirlari(client, {
        aracId: hedefAracId,
        tarih: gun,
        haricTablo: 'yakitlar',
        haricId: yakitId,
      });
      if (sayacIhlaliMi(sayisalKm, sinirlar)) {
        await client.query('ROLLBACK');
        return res.status(422).json(sayac422Govdesi(sayisalKm, sinirlar, hedefArac.sayac_tipi));
      }
    }

    const notlarDegeri = notlar || null;
    const faturaNo = value.fatura_no !== undefined
      ? resolveFaturaNo(value.fatura_no, notlarDegeri)
      : (extractFaturaFromNotlar(notlarDegeri) ?? mevcutFaturaNo);
    const belgeUrl = value.belge_url !== undefined ? normalizeBelgeUrl(value.belge_url) : mevcutBelgeUrl;

    const result = await client.query(
      `UPDATE yakitlar
       SET arac_id = $1,
           yakit_tipi = $2,
           tarih = $3,
           litre = $4,
           tutar = $5,
           km = $6,
           notlar = $7,
           fatura_no = $8,
           belge_url = $9
       WHERE yakit_id = $10
       RETURNING *`,
      [
        hedefAracId,
        yakit_tipi || null,
        gun,
        sayisalLitre,
        sayisalTutar,
        sayisalKm,
        notlarDegeri,
        faturaNo,
        belgeUrl,
        yakitId,
      ]
    );

    await aracSayaciniSenkronizeEt(client, {
      aracId: hedefAracId,
      eskiKm: kaynakAracId === hedefAracId ? eskiKm : null,
    });
    if (kaynakAracId !== hedefAracId) {
      await aracSayaciniSenkronizeEt(client, { aracId: kaynakAracId, eskiKm });
    }

    await client.query('COMMIT');

    let anomaliler = [];
    try {
      anomaliler = await evaluateFuelRecordAnomalies(yakitId, { mode: 'update' });
    } catch (anomErr) {
      console.error('Yakıt anomali değerlendirme hatası (update):', anomErr);
    }

    return res.status(200).json({ message: 'Yakit kaydi guncellendi', yakit: result.rows[0], anomaliler });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error('Yakıt güncelleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    if (client) client.release();
  }
};

// BELİRLİ YAKIT KAYDINI SİL
const deleteYakit = async (req, res) => {
  const { yakit_id } = req.params;

  const yakitId = Number(yakit_id);
  if (!Number.isInteger(yakitId) || yakitId <= 0) {
    return res.status(400).json({ message: 'Geçersiz yakıt kimliği.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { clause, params } = buildVehicleAccessFilter(req.user, 2);
    const yakitCheck = await client.query(
      `SELECT y.yakit_id, y.arac_id, y.km, a.plaka, a.org_id, y.tarih, y.litre, y.tutar
       FROM yakitlar y
       INNER JOIN araclar a ON y.arac_id = a.arac_id
       WHERE y.yakit_id = $1 AND (${clause})
       FOR UPDATE OF y`,
      [yakitId, ...params]
    );

    if (yakitCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Yakit kaydi bulunamadi' });
    }

    const row = yakitCheck.rows[0];
    const aracId = Number(row.arac_id);
    const eskiKm = row.km;

    await araclariKilitle(client, [aracId]);
    await client.query('DELETE FROM yakitlar WHERE yakit_id = $1', [yakitId]);
    await aracSayaciniSenkronizeEt(client, { aracId, eskiKm });

    await client.query('COMMIT');
    await logAuditEvent(req, {
      eylem: 'YAKIT_SILINDI', varlik_tipi: 'yakit', varlik_id: yakitId, org_id: row.org_id,
      ozet: `${row.plaka} plakalı aracın ${row.tarih} tarihli yakıt kaydı silindi.`,
      detay: { plaka: row.plaka, tarih: row.tarih, litre: row.litre, tutar: row.tutar },
    });

    return res.status(200).json({ message: 'Yakit kaydi silindi' });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error('Yakıt silme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getAllYakitlar,
  getYakitlarByArac,
  createYakit,
  updateYakit,
  deleteYakit,
};

