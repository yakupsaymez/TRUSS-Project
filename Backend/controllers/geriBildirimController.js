const pool = require('../db');
const {
  createFeedback,
  listFeedbacks,
  updateFeedbackStatus,
} = require('../services/geriBildirimService');

const create = async (req, res, next) => {
  try {
    const kayit = await createFeedback(pool, req.user, {
      kategori: req.body?.kategori,
      baslik: req.body?.baslik,
      mesaj: req.body?.mesaj,
      sayfa_yolu: req.body?.sayfa_yolu,
      son_istek_id: req.body?.son_istek_id || req.requestId || null,
    });
    return res.status(201).json({
      message: 'Geri bildiriminiz alındı.',
      geri_bildirim: kayit,
    });
  } catch (err) {
    return next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const kayitlar = await listFeedbacks(pool, req.user, req.query);
    return res.status(200).json({
      message: 'Geri bildirimler listelendi.',
      geri_bildirimler: kayitlar,
    });
  } catch (err) {
    return next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const kayit = await updateFeedbackStatus(pool, req.user, req.params?.id, {
      durum: req.body?.durum,
      yonetici_notu: req.body?.yonetici_notu,
    });
    return res.status(200).json({
      message: 'Geri bildirim durumu güncellendi.',
      geri_bildirim: kayit,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { create, list, updateStatus };
