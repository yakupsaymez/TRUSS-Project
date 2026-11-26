const Joi = require('joi');
const AppError = require('../utils/AppError');
const svc = require('../services/raporQueryService');

const butceSchema = Joi.object({
  aylik_yakit_butcesi: Joi.number().min(0).max(100000000).required(),
  aylik_bakim_butcesi: Joi.number().min(0).max(100000000).required(),
});

const handleError = (res, err, label) => {
  if (err instanceof AppError) return res.status(err.statusCode).json(err.toBody());
  console.error(`${label} HATASI:`, err);
  return res.status(500).json({ message: 'Sunucu hatası' });
};

const sendCsv = (res, result) => {
  const encoded = encodeURIComponent(result.filename);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"; filename*=UTF-8''${encoded}`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Export-Limit', String(result.limit));
  res.setHeader('X-Export-Count', String(result.count));
  res.setHeader('X-Export-Truncated', result.truncated ? 'true' : 'false');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Disposition, X-Export-Truncated, X-Export-Limit, X-Export-Count'
  );
  return res.status(200).send(result.csv);
};

const runJson = (fn, label) => async (req, res) => {
  try {
    return res.status(200).json(await fn(req.user));
  } catch (err) {
    return handleError(res, err, label);
  }
};

const getGenelOzet = runJson(svc.getGenelOzet, 'RAPOR GENEL-OZET');
const getAylikHarcamaTrendi = runJson(svc.getAylikHarcamaTrendi, 'RAPOR AYLIK-TREND');
const getAracMaliyetDagilimi = runJson(svc.getAracMaliyetDagilimi, 'RAPOR ARAC-MALIYET');
const getButceAnalizi = runJson(svc.getButceAnalizi, 'RAPOR BUTCE');

const updateButceHedefi = async (req, res) => {
  const { error, value } = butceSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    return res.status(200).json(await svc.updateButceHedefi(req.user, value));
  } catch (err) {
    return handleError(res, err, 'RAPOR BUTCE GUNCELLEME');
  }
};

const runCsv = (fn, label) => async (req, res) => {
  try {
    return sendCsv(res, await fn(req.user, req.query || {}));
  } catch (err) {
    return handleError(res, err, label);
  }
};

const exportFiloMaliyet = runCsv(svc.exportFiloMaliyetCsv, 'RAPOR EXPORT FILO-MALIYET');
const exportHareketler = runCsv(svc.exportHareketlerCsv, 'RAPOR EXPORT HAREKETLER');
const exportIsEmirleri = runCsv(svc.exportIsEmirleriCsv, 'RAPOR EXPORT IS-EMIRLERI');

module.exports = {
  getGenelOzet,
  getAylikHarcamaTrendi,
  getAracMaliyetDagilimi,
  getButceAnalizi,
  updateButceHedefi,
  exportFiloMaliyet,
  exportHareketler,
  exportIsEmirleri,
};
