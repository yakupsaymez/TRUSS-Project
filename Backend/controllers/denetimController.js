const Joi = require('joi');
const pool = require('../db');
const { tarihStr } = require('../utils/dateUtils');

const querySchema = Joi.object({
  eylem: Joi.string().trim().max(60).allow('', null).optional(),
  varlik_tipi: Joi.string().trim().max(40).allow('', null).optional(),
  user_id: Joi.number().integer().positive().optional(),
  baslangic: Joi.string().trim().max(32).allow('', null).optional(),
  bitis: Joi.string().trim().max(32).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

// GET /api/denetim-kayitlari — Değişmez denetim izi listesi (READ-ONLY, ADR-13 org izolasyonu)
const getDenetimKayitlari = async (req, res) => {
  if (req.user.role !== 'SYSTEM_ADMIN' && !req.user.org_id) {
    return res.status(403).json({
      code: 'FORBIDDEN_ORG_REQUIRED',
      message: 'Organizasyon bilgisi bulunamadı.',
    });
  }

  const { error, value } = querySchema.validate(req.query || {}, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const baslangicGun = value.baslangic ? tarihStr(value.baslangic) : null;
  if (value.baslangic && !baslangicGun) {
    return res.status(400).json({ message: 'Geçersiz başlangıç tarihi formatı.' });
  }

  const bitisGun = value.bitis ? tarihStr(value.bitis) : null;
  if (value.bitis && !bitisGun) {
    return res.status(400).json({ message: 'Geçersiz bitiş tarihi formatı.' });
  }

  try {
    const conditions = [];
    const params = [];

    if (req.user.org_id) {
      params.push(req.user.org_id);
      conditions.push(`dk.org_id = $${params.length}`);
    }
    if (value.eylem) {
      params.push(value.eylem);
      conditions.push(`dk.eylem = $${params.length}`);
    }
    if (value.varlik_tipi) {
      params.push(value.varlik_tipi);
      conditions.push(`dk.varlik_tipi = $${params.length}`);
    }
    if (value.user_id) {
      params.push(value.user_id);
      conditions.push(`dk.user_id = $${params.length}`);
    }
    if (baslangicGun) {
      params.push(baslangicGun);
      conditions.push(`dk.olusturma_tarihi >= ($${params.length}::date AT TIME ZONE 'Europe/Istanbul')`);
    }
    if (bitisGun) {
      params.push(bitisGun);
      conditions.push(`dk.olusturma_tarihi < (($${params.length}::date + INTERVAL '1 day') AT TIME ZONE 'Europe/Istanbul')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const [listRes, countRes] = await Promise.all([
      pool.query(
        `SELECT dk.*, u.ad_soyad AS kullanici_ad_soyad
         FROM denetim_kayitlari dk
         LEFT JOIN users u ON u.user_id = dk.user_id
         ${whereClause}
         ORDER BY dk.olusturma_tarihi DESC, dk.denetim_id DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, value.limit, value.offset]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS toplam
         FROM denetim_kayitlari dk
         ${whereClause}`,
        params
      ),
    ]);

    return res.status(200).json({
      kayitlar: listRes.rows,
      toplam: countRes.rows[0]?.toplam || 0,
      limit: value.limit,
      offset: value.offset,
    });
  } catch (err) {
    console.error('Denetim kayıtları listeleme hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

module.exports = { getDenetimKayitlari };
