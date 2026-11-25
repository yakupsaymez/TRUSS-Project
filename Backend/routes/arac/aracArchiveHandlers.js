const Joi = require('joi');
const pool = require('../../db');
const { buildVehicleAccessFilter } = require('../../middlewares/rbacMiddleware.js');
const { logAuditEvent } = require('../../services/auditService');

const archiveBodySchema = Joi.object({
  arsiv_nedeni: Joi.string().trim().max(240).allow('', null).optional(),
});

const parseAracId = (req, res) => {
  const aracId = Number(req.params?.arac_id);
  if (!Number.isInteger(aracId) || aracId <= 0) {
    res.status(400).json({ message: 'Geçersiz araç kimliği.' });
    return null;
  }
  return aracId;
};

const lockVehicle = async (client, res, user, aracId) => {
  const { clause, params } = buildVehicleAccessFilter(user, 2);
  const resLock = await client.query(
    `SELECT a.* FROM araclar a WHERE a.arac_id = $1 AND (${clause}) FOR UPDATE OF a`,
    [aracId, ...params]
  );
  if (resLock.rowCount === 0) {
    await client.query('ROLLBACK');
    res.status(404).json({ message: 'Araç bulunamadı' });
    return null;
  }
  return resLock.rows[0];
};

const closeActiveAssignments = async (client, aracId) => {
  const r = await client.query(
    'UPDATE arac_sofor_atamalari SET aktif = FALSE, teslim_tarihi = NOW() WHERE arac_id = $1 AND aktif = TRUE',
    [aracId]
  );
  return r.rowCount || 0;
};

const withTx = async (req, res, label, handler) => {
  const aracId = parseAracId(req, res);
  if (!aracId) return;
  let client = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const mevcut = await lockVehicle(client, res, req.user, aracId);
    if (!mevcut) return;
    await handler(client, aracId, mevcut);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => null);
    console.error(`${label}:`, err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    if (client) client.release();
  }
};

// DELETE /api/araclar/:arac_id — Geçmiş kaydı yoksa siler; varsa soft-archive yapar
const deleteArac = (req, res) =>
  withTx(req, res, 'Araç Silme/Arşivleme Hatası', async (client, aracId, mevcut) => {
    const histRes = await client.query(
      `SELECT (
         EXISTS (SELECT 1 FROM yakitlar WHERE arac_id = $1) OR
         EXISTS (SELECT 1 FROM bakimlar WHERE arac_id = $1) OR
         EXISTS (SELECT 1 FROM parca_takip WHERE arac_id = $1 AND COALESCE(maliyet, 0) > 0)
       ) AS has_history`,
      [aracId]
    );
    if (histRes.rows[0]?.has_history) {
      const kapatilan = await closeActiveAssignments(client, aracId);
      const rawNeden = req.body?.arsiv_nedeni ? String(req.body.arsiv_nedeni).trim().slice(0, 240) : null;
      const updRes = await client.query(
        `UPDATE araclar
         SET arsivlendi_mi = TRUE, arsiv_tarihi = COALESCE(arsiv_tarihi, NOW()),
             arsiv_nedeni = COALESCE($2, arsiv_nedeni, 'Geçmiş hareket nedeniyle otomatik arşivlendi')
         WHERE arac_id = $1 RETURNING *`,
        [aracId, rawNeden]
      );
      const arac = updRes.rows[0];
      await client.query('COMMIT');
      if (!mevcut.arsivlendi_mi) {
        await logAuditEvent(req, {
          eylem: 'ARAC_ARSIVLENDI', varlik_tipi: 'arac', varlik_id: aracId, org_id: arac.org_id,
          ozet: `${arac.plaka} plakalı araç geçmiş hareket nedeniyle arşivlendi.`,
          detay: { plaka: arac.plaka, arsiv_nedeni: arac.arsiv_nedeni, kapatilan_zimmet_sayisi: kapatilan },
        });
      }
      return res.status(200).json({
        message: 'Geçmiş hareket kaydı bulunduğu için araç silinmedi, arşivlendi.',
        islem: 'arsivlendi', arac, kapatilan_zimmet_sayisi: kapatilan,
      });
    }

    await client.query('DELETE FROM araclar WHERE arac_id = $1', [aracId]);
    await client.query('COMMIT');
    await logAuditEvent(req, {
      eylem: 'ARAC_SILINDI', varlik_tipi: 'arac', varlik_id: aracId, org_id: mevcut.org_id,
      ozet: `${mevcut.plaka} plakalı araç silindi.`,
      detay: { plaka: mevcut.plaka, marka: mevcut.marka, model: mevcut.model },
    });
    return res.status(200).json({ message: 'Araç başarıyla silindi', islem: 'silindi' });
  });

// PATCH /api/araclar/:arac_id/arsiv — Aracı manuel arşivle ve aktif zimmetleri kapat
const archiveArac = (req, res) => {
  const { error, value } = archiveBodySchema.validate(req.body || {}, { convert: true, stripUnknown: true });
  if (error) return res.status(400).json({ message: error.details[0].message });
  return withTx(req, res, 'Araç Arşivleme Hatası', async (client, aracId) => {
    const kapatilan = await closeActiveAssignments(client, aracId);
    const updRes = await client.query(
      `UPDATE araclar
       SET arsivlendi_mi = TRUE, arsiv_tarihi = COALESCE(arsiv_tarihi, NOW()), arsiv_nedeni = COALESCE($2, arsiv_nedeni)
       WHERE arac_id = $1 RETURNING *`,
      [aracId, value.arsiv_nedeni || null]
    );
    const arac = updRes.rows[0];
    await client.query('COMMIT');
    await logAuditEvent(req, {
      eylem: 'ARAC_ARSIVLENDI', varlik_tipi: 'arac', varlik_id: aracId, org_id: arac.org_id,
      ozet: `${arac.plaka} plakalı araç arşivlendi.`,
      detay: { plaka: arac.plaka, arsiv_nedeni: arac.arsiv_nedeni, kapatilan_zimmet_sayisi: kapatilan },
    });
    return res.status(200).json({ message: 'Araç arşivlendi', arac, kapatilan_zimmet_sayisi: kapatilan });
  });
};

// PATCH /api/araclar/:arac_id/geri-yukle — Arşivlenmiş aracı geri yükle
const restoreArac = (req, res) =>
  withTx(req, res, 'Araç Geri Yükleme Hatası', async (client, aracId, mevcut) => {
    const updRes = await client.query(
      'UPDATE araclar SET arsivlendi_mi = FALSE, arsiv_tarihi = NULL, arsiv_nedeni = NULL WHERE arac_id = $1 RETURNING *',
      [aracId]
    );
    const arac = updRes.rows[0];
    await client.query('COMMIT');
    if (mevcut.arsivlendi_mi) {
      await logAuditEvent(req, {
        eylem: 'ARAC_GERI_YUKLENDI', varlik_tipi: 'arac', varlik_id: aracId, org_id: arac.org_id,
        ozet: `${arac.plaka} plakalı araç arşivden geri yüklendi.`, detay: { plaka: arac.plaka },
      });
    }
    return res.status(200).json({ message: 'Araç arşivden geri yüklendi', arac });
  });

module.exports = { deleteArac, archiveArac, restoreArac };
