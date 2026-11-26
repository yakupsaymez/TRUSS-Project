const AppError = require('../utils/AppError');

/**
 * Eşleşmeyen /api/* rotaları için standart 404 JSON yanıtı döner.
 */
function apiNotFoundHandler(req, res) {
  return res.status(404).json({
    error: 'İstenen API uç noktası bulunamadı.',
    message: 'İstenen API uç noktası bulunamadı.',
    code: 'ENDPOINT_NOT_FOUND',
    requestId: req.requestId,
  });
}

/**
 * Express 5 merkezi hata yakalayıcı: iç detayları (SQLSTATE, stack, table) her ortamda gizler.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const requestId = req.requestId;

  if (err?.status === 413 || err?.statusCode === 413 || err?.type === 'entity.too.large') {
    const msg = 'İstek boyutu izin verilen sınırı aşıyor.';
    return res.status(413).json({ error: msg, message: msg, code: 'PAYLOAD_TOO_LARGE', requestId });
  }
  if ((err instanceof SyntaxError || err?.type === 'entity.parse.failed') && (err?.status === 400 || err?.statusCode === 400) && 'body' in err) {
    const msg = 'Geçersiz JSON gövdesi.';
    return res.status(400).json({ error: msg, message: msg, code: 'INVALID_JSON', requestId });
  }
  if ((err instanceof AppError || (Number.isInteger(err?.statusCode) && err.statusCode >= 400 && err.statusCode < 500)) && err.statusCode >= 400 && err.statusCode < 500) {
    const body = typeof err.toBody === 'function'
      ? { ...err.toBody(), requestId }
      : { error: err.message, message: err.message, code: err.code, requestId };
    return res.status(err.statusCode).json(body);
  }

  console.error('[TRUSS ERROR]', { requestId, message: err?.message, code: err?.code, detail: err?.detail, constraint: err?.constraint, table: err?.table, stack: err?.stack });
  const msg = 'Sunucu hatası oluştu.';
  return res.status(500).json({ error: msg, message: msg, code: 'INTERNAL_ERROR', requestId });
}

module.exports = { apiNotFoundHandler, errorHandler };
