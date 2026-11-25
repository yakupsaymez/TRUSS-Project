const Joi = require('joi');
const { previewFuelCsv, importFuelCsv } = require('../services/fuelImportService');
const { logAuditEvent } = require('../services/auditService');

const csvImportSchema = Joi.object({
  csv_text: Joi.string().min(1).max(1000000).required(),
});

const validateCsvBody = (body) => {
  const { error, value } = csvImportSchema.validate(body || {}, {
    convert: false,
    stripUnknown: true,
  });
  if (error) {
    return { errorStatus: 400, errorBody: { code: 'INVALID_REQUEST', message: error.details[0].message } };
  }
  if (!value.csv_text.trim()) {
    return { errorStatus: 400, errorBody: { code: 'CSV_EMPTY', message: 'CSV içeriği boş olamaz.' } };
  }
  return { csvText: value.csv_text };
};

const handleImportError = (res, err, label) => {
  if (err && (err.status === 400 || err.status === 413)) {
    return res.status(err.status).json({
      code: err.code || 'CSV_ERROR',
      message: err.message,
      ...(err.eksik_basliklar ? { eksik_basliklar: err.eksik_basliklar } : {}),
    });
  }
  console.error(`${label}:`, err);
  return res.status(500).json({ message: 'Sunucu hatasi' });
};

// POST /api/yakitlar/toplu-onizleme
const previewYakitImport = async (req, res) => {
  const check = validateCsvBody(req.body);
  if (check.errorStatus) return res.status(check.errorStatus).json(check.errorBody);

  try {
    const data = await previewFuelCsv(req.user, check.csvText);
    return res.status(200).json(data);
  } catch (err) {
    return handleImportError(res, err, 'Yakıt CSV önizleme hatası');
  }
};

// POST /api/yakitlar/toplu-aktar
const commitYakitImport = async (req, res) => {
  const check = validateCsvBody(req.body);
  if (check.errorStatus) return res.status(check.errorStatus).json(check.errorBody);

  try {
    const data = await importFuelCsv(req.user, check.csvText);
    await logAuditEvent(req, {
      eylem: 'YAKIT_TOPLU_AKTARIM',
      varlik_tipi: 'yakit',
      ozet: `Toplu yakıt CSV aktarımı: ${data.ozet?.eklenen || 0} eklendi, ${data.ozet?.mukerrer || 0} mükerrer, ${data.ozet?.hatali || 0} hatalı.`,
      detay: data.ozet,
    });
    return res.status(201).json(data);
  } catch (err) {
    return handleImportError(res, err, 'Yakıt CSV aktarım hatası');
  }
};

module.exports = { previewYakitImport, commitYakitImport };
