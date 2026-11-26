const AppError = require('../utils/AppError');
const userSettingsService = require('../services/userSettingsService');

function handleError(res, err, logLabel, fallbackMessage) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toBody());
  }
  console.error(logLabel, err);
  return res.status(500).json({ message: fallbackMessage });
}

async function getMe(req, res) {
  try {
    return res.status(200).json(await userSettingsService.getMe(req.user));
  } catch (err) {
    return handleError(res, err, 'Mevcut kullanıcı okuma hatası:', 'Kullanıcı bilgisi alınamadı');
  }
}

async function getNotificationSettings(req, res) {
  try {
    return res.status(200).json(await userSettingsService.getNotificationSettings(req.user));
  } catch (err) {
    return handleError(res, err, 'Bildirim ayarları okuma hatası:', 'Bildirim ayarlari alinamadi');
  }
}

async function updateNotificationSettings(req, res) {
  try {
    return res.status(200).json(await userSettingsService.updateNotificationSettings(req.user, req.body));
  } catch (err) {
    return handleError(res, err, 'Bildirim ayarları güncelleme hatası:', 'Bildirim ayarlari guncellenemedi');
  }
}

async function getPreferences(req, res) {
  try {
    return res.status(200).json(await userSettingsService.getPreferences(req.user));
  } catch (err) {
    return handleError(res, err, 'Tercih ayarları okuma hatası:', 'Tercih ayarlari alinamadi');
  }
}

async function updatePreferences(req, res) {
  try {
    return res.status(200).json(await userSettingsService.updatePreferences(req.user, req.body));
  } catch (err) {
    return handleError(res, err, 'Tercih ayarları güncelleme hatası:', 'Tercih ayarlari guncellenemedi');
  }
}

async function changePassword(req, res) {
  try {
    return res.status(200).json(await userSettingsService.changePassword(req.user, req.body));
  } catch (err) {
    return handleError(res, err, 'Şifre güncelleme hatası:', 'Şifre güncellenemedi.');
  }
}

async function deleteAccount(req, res) {
  try {
    return res.status(200).json(await userSettingsService.deleteAccount(req.user));
  } catch (err) {
    return handleError(res, err, 'Hesap silme hatası:', 'Hesap silinemedi');
  }
}

module.exports = {
  getMe,
  getNotificationSettings,
  updateNotificationSettings,
  getPreferences,
  updatePreferences,
  changePassword,
  deleteAccount,
};
