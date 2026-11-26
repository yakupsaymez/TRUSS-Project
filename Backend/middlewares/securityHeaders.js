/**
 * HTTP güvenlik yanıt başlıklarını uygulayan Express middleware fabrikası.
 */
function createSecurityHeadersMiddleware({ nodeEnv } = {}) {
  return (req, res, next) => {
    const env = nodeEnv !== undefined ? nodeEnv : process.env.NODE_ENV;
    const rawPath = String(req.originalUrl || req.path || '').split('?')[0];

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');

    if (rawPath === '/api' || rawPath.startsWith('/api/')) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    }

    if (rawPath === '/api/users/login' || rawPath === '/api/users/register') {
      res.setHeader('Cache-Control', 'no-store');
    }

    if (env === 'production' || req.secure === true) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  };
}

const securityHeaders = createSecurityHeadersMiddleware();

module.exports = { createSecurityHeadersMiddleware, securityHeaders };
