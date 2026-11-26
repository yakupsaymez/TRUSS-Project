const ALLOWED_TRUST_PROXY_KEYWORDS = new Set(['loopback', 'linklocal', 'uniquelocal']);

/**
 * TRUST_PROXY ortam değişkenini güvenli Express değerine ayrıştırır.
 */
function parseTrustProxy(raw) {
  if (raw === undefined || raw === null) {
    return { ok: true, value: false };
  }
  const s = String(raw).trim().toLowerCase();
  if (s === '' || s === 'false' || s === '0') {
    return { ok: true, value: false };
  }
  if (s === 'true') {
    return { ok: true, value: true };
  }
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (n >= 1 && n <= 10) {
      return { ok: true, value: n };
    }
    return { ok: false, reason: 'TRUST_PROXY tamsayı değeri 1..10 aralığında olmalıdır.' };
  }
  if (ALLOWED_TRUST_PROXY_KEYWORDS.has(s)) {
    return { ok: true, value: s };
  }
  return {
    ok: false,
    reason: 'TRUST_PROXY yalnız false, true, 0..10, loopback, linklocal veya uniquelocal olabilir.',
  };
}

function isValidPort(raw) {
  if (!/^\d+$/.test(raw)) return false;
  const n = Number(raw);
  return n >= 1 && n <= 65535;
}

/**
 * Başlangıç ortam değişkenlerini fail-fast doğrulayıp tüm geçersiz anahtarları raporlar.
 */
function validateEnv(env = process.env) {
  const invalidKeys = [];
  const details = [];
  const addError = (key, reason) => {
    if (!invalidKeys.includes(key)) invalidKeys.push(key);
    details.push(`${key}: ${reason}`);
  };

  const nodeEnv = String(env.NODE_ENV || 'development').trim() || 'development';
  const dbUrl = typeof env.DATABASE_URL === 'string' ? env.DATABASE_URL.trim() : '';
  const hasDatabaseUrl = dbUrl.length > 0;

  if (hasDatabaseUrl) {
    let validUrl = /^postgres(?:ql)?:\/\/.+/i.test(dbUrl);
    if (validUrl) {
      try {
        const parsed = new URL(dbUrl);
        validUrl = Boolean(parsed.hostname);
      } catch {
        validUrl = false;
      }
    }
    if (!validUrl) {
      addError('DATABASE_URL', 'Geçerli bir postgres:// veya postgresql:// URL olmalıdır.');
    }
  } else {
    if (!String(env.DB_HOST || '').trim()) addError('DB_HOST', 'Zorunludur.');
    if (!String(env.DB_USER || '').trim()) addError('DB_USER', 'Zorunludur.');
    if (!String(env.DB_NAME || '').trim()) addError('DB_NAME', 'Zorunludur.');
    const dbPortRaw = String(env.DB_PORT ?? '').trim();
    if (!dbPortRaw || !isValidPort(dbPortRaw)) {
      addError('DB_PORT', '1..65535 aralığında geçerli bir port numarası olmalıdır.');
    }
  }

  const jwtSecret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!jwtSecret) {
    addError('JWT_SECRET', 'Zorunludur.');
  } else if (nodeEnv === 'production' && jwtSecret.length < 32) {
    addError('JWT_SECRET', 'Production ortamında en az 32 karakter olmalıdır.');
  }

  const portRaw = env.PORT === undefined || env.PORT === null ? '' : String(env.PORT).trim();
  let port = 5001;
  if (portRaw !== '') {
    if (!isValidPort(portRaw)) {
      addError('PORT', '1..65535 aralığında geçerli bir port numarası olmalıdır.');
    } else {
      port = Number(portRaw);
    }
  }

  const trustParsed = parseTrustProxy(env.TRUST_PROXY);
  if (!trustParsed.ok) {
    addError('TRUST_PROXY', trustParsed.reason);
  }

  const corsRaw = typeof env.CORS_ORIGIN === 'string' ? env.CORS_ORIGIN.trim() : '';
  const corsOrigins = corsRaw ? corsRaw.split(',').map((o) => o.trim()).filter(Boolean) : [];
  if (nodeEnv === 'production') {
    if (corsOrigins.length === 0) {
      addError('CORS_ORIGIN', 'Production ortamında en az bir köken tanımlanmalıdır.');
    } else {
      for (const origin of corsOrigins) {
        if (origin === '*') {
          addError('CORS_ORIGIN', 'Wildcard (*) köken yasaktır.');
          continue;
        }
        try {
          const parsed = new URL(origin);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            addError('CORS_ORIGIN', `Geçersiz protokol: ${origin}`);
          }
        } catch {
          addError('CORS_ORIGIN', `Geçersiz URL: ${origin}`);
        }
      }
    }
  }

  if (invalidKeys.length > 0) {
    const err = new Error(
      `Ortam değişkeni doğrulama hatası [${invalidKeys.join(', ')}]: ${details.join(' | ')}`
    );
    err.code = 'ENV_VALIDATION_FAILED';
    err.invalidKeys = invalidKeys;
    err.details = details;
    throw err;
  }

  return {
    nodeEnv,
    port,
    trustProxy: trustParsed.value,
    corsOrigins,
    hasDatabaseUrl,
  };
}

module.exports = { validateEnv, parseTrustProxy };
