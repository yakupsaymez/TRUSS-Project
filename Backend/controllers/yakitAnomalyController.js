const Joi = require('joi');
const pool = require('../db');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { scanAccessibleFuelAnomalies } = require('../services/fuelAnomalyService');
const { logAuditEvent } = require('../services/auditService');

const VALID_TIPS = ['depo_asimi', 'ardisik_dolum', 'birim_fiyat_sapma', 'yuksek_tuketim'];

const listQuerySchema = Joi.object({
  durum: Joi.string().valid('acik', 'incelendi', 'yoksayildi', 'tumu').default('acik'),
  arac_id: Joi.number().integer().positive().optional(),
  tip: Joi.string().valid(...VALID_TIPS).optional(),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

const updateBodySchema = Joi.object({
  durum: Joi.string().valid('incelendi', 'yoksayildi').required(),
  inceleme_notu: Joi.string().trim().max(500).allow('', null).optional(),
});

// GET /api/yakit/anomaliler
const getYakitAnomalileri = async (req, res) => {
  const { error, value } = listQuerySchema.validate(req.query || {}, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 1);
    const baseConditions = [`(${clause})`, 'a.arsivlendi_mi = FALSE'];
    const baseParams = [...params];

    if (value.arac_id) {
      baseParams.push(value.arac_id);
      baseConditions.push(`a.arac_id = $${baseParams.length}`);
    }
    if (value.tip) {
      baseParams.push(value.tip);
      baseConditions.push(`ya.tip = $${baseParams.length}`);
    }

    const baseWhere = baseConditions.join(' AND ');
    const listConditions = [...baseConditions];
    const listParams = [...baseParams];

    if (value.durum !== 'tumu') {
      listParams.push(value.durum);
      listConditions.push(`ya.durum = $${listParams.length}`);
    }

    const listWhere = listConditions.join(' AND ');
    listParams.push(value.limit);

    const [ozetRes, listRes] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(COUNT(*) FILTER (WHERE ya.durum = 'acik'), 0)::int AS acik,
           COALESCE(COUNT(*) FILTER (WHERE ya.durum = 'acik' AND ya.seviye = 'kritik'), 0)::int AS kritik,
           COALESCE(COUNT(*) FILTER (WHERE ya.durum = 'acik' AND ya.seviye = 'uyari'), 0)::int AS uyari,
           COALESCE(COUNT(*) FILTER (WHERE ya.durum = 'incelendi'), 0)::int AS incelendi,
           COALESCE(COUNT(*) FILTER (WHERE ya.durum = 'yoksayildi'), 0)::int AS yoksayildi
         FROM yakit_anomalileri ya
         INNER JOIN araclar a ON a.arac_id = ya.arac_id
         WHERE ${baseWhere}`,
        baseParams
      ),
      pool.query(
        `SELECT
           ya.*,
           a.plaka,
           a.marka,
           a.model,
           a.sayac_tipi,
           y.tarih AS yakit_tarih,
           y.litre AS yakit_litre,
           y.tutar AS yakit_tutar,
           y.km AS yakit_km,
           iu.ad_soyad AS inceleyen_ad
         FROM yakit_anomalileri ya
         INNER JOIN araclar a ON a.arac_id = ya.arac_id
         INNER JOIN yakitlar y ON y.yakit_id = ya.yakit_id
         LEFT JOIN users iu ON iu.user_id = ya.inceleyen_user_id
         WHERE ${listWhere}
         ORDER BY ya.olusturma_tarihi DESC, ya.anomali_id DESC
         LIMIT $${listParams.length}`,
        listParams
      ),
    ]);

    return res.status(200).json({
      anomaliler: listRes.rows,
      ozet: ozetRes.rows[0] || { acik: 0, kritik: 0, uyari: 0, incelendi: 0, yoksayildi: 0 },
    });
  } catch (err) {
    console.error('Yakıt anomalileri listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// POST /api/yakit/anomaliler/tara
const scanYakitAnomalileri = async (req, res) => {
  try {
    const { taranan_kayit, yeni_anomali } = await scanAccessibleFuelAnomalies(req.user, { gun: 90 });
    return res.status(200).json({
      message: 'Yakıt anomali taraması tamamlandı',
      taranan_kayit,
      yeni_anomali,
    });
  } catch (err) {
    console.error('Yakıt anomali tarama hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

// PATCH /api/yakit/anomaliler/:id
const updateYakitAnomaliDurum = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Geçersiz anomali kimliği.' });
  }

  const { error, value } = updateBodySchema.validate(req.body || {}, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const { clause, params } = buildVehicleAccessFilter(req.user, 5);
    const notDegeri = value.inceleme_notu ? value.inceleme_notu : null;
    const result = await pool.query(
      `UPDATE yakit_anomalileri ya
       SET durum = $1,
           inceleme_notu = $2,
           inceleyen_user_id = $3,
           inceleme_tarihi = NOW()
       FROM araclar a
       WHERE ya.arac_id = a.arac_id
         AND ya.anomali_id = $4
         AND (${clause})
       RETURNING ya.*, a.plaka, a.org_id AS arac_org_id`,
      [value.durum, notDegeri, req.user.user_id, id, ...params]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Anomali kaydı bulunamadı veya yetkiniz yok.' });
    }

    const { plaka, arac_org_id, ...anomali } = result.rows[0];
    await logAuditEvent(req, {
      eylem: 'ANOMALI_GUNCELLENDI',
      varlik_tipi: 'yakit_anomali',
      varlik_id: id,
      org_id: arac_org_id ?? anomali.org_id,
      ozet: `${plaka} plakalı araç yakıt anomalisi (${anomali.tip}) "${anomali.durum}" olarak güncellendi.`,
      detay: { plaka, tip: anomali.tip, durum: anomali.durum, inceleme_notu: anomali.inceleme_notu },
    });

    return res.status(200).json({
      message: 'Anomali durumu güncellendi',
      anomali,
    });
  } catch (err) {
    console.error('Yakıt anomali güncelleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatasi' });
  }
};

module.exports = {
  getYakitAnomalileri,
  scanYakitAnomalileri,
  updateYakitAnomaliDurum,
};
