const crypto = require('node:crypto');

const SAFE_REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Her API isteğine doğrulanmış veya yeni üretilmiş X-Request-Id atar
 * ve 4xx/5xx JSON hata yanıtlarına mutasyonsuz requestId ekler.
 */
function requestIdMiddleware(req, res, next) {
  const raw = typeof req.get === 'function' ? req.get('X-Request-Id') : req.headers?.['x-request-id'];
  const id = typeof raw === 'string' && SAFE_REQUEST_ID_RE.test(raw) ? raw : crypto.randomUUID();

  req.requestId = id;
  res.setHeader('X-Request-Id', id);

  if (!res.__trussRequestIdWrapped) {
    res.__trussRequestIdWrapped = true;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 400 && body && typeof body === 'object' && !Array.isArray(body)) {
        return originalJson({ ...body, requestId: body.requestId || req.requestId });
      }
      return originalJson(body);
    };
  }

  return next();
}

module.exports = { requestIdMiddleware, SAFE_REQUEST_ID_RE };
