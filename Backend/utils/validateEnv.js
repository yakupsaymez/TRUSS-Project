const net = require('node:net');

const ALLOWED_TRUST_PROXY_KEYWORDS = new Set(['loopback', 'linklocal', 'uniquelocal']);
const S3_REQUIRED_KEYS = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];

function isValidIpOrCidr(token) {
  if (!token) return false;
  if (token.includes('/')) {
    const parts = token.split('/');
    if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return false;
    const ver = net.isIP(parts[0]);
    const mask = Number(parts[1]);
    return (ver === 4 && mask >= 0 && mask <= 32) || (ver === 6 && mask >= 0 && mask <= 128);
  }
  return net.isIP(token) !== 0;
}

/**
 * Belge kasası sürücüsünü ve S3/local yapılandırmasını ortam değişkenlerinden çözümler.
 */
function resolveDocVaultConfig(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || 'development').trim() || 'development';
  const driverRaw = typeof env.DOC_VAULT_DRIVER === 'string' ? env.DOC_VAULT_DRIVER.trim().toLowerCase() : '';
  const errors = [];

  if (driverRaw && driverRaw !== 's3' && driverRaw !== 'local') {
    errors.push({ key: 'DOC_VAULT_DRIVER', reason: "DOC_VAULT_DRIVER yalnız 's3' veya 'local' olabilir." });
  }
  if (nodeEnv === 'production' && driverRaw === 'local') {
    errors.push({ key: 'DOC_VAULT_DRIVER', reason: "Production ortamında 'local' belge kasası sürücüsü yasaktır." });
  }

  const s3 = {
    endpoint: typeof env.S3_ENDPOINT === 'string' ? env.S3_ENDPOINT.trim() : '',
    bucket: typeof env.S3_BUCKET === 'string' ? env.S3_BUCKET.trim() : '',
    accessKeyId: typeof env.S3_ACCESS_KEY_ID === 'string' ? env.S3_ACCESS_KEY_ID.trim() : '',
    secretAccessKey: typeof env.S3_SECRET_ACCESS_KEY === 'string' ? env.S3_SECRET_ACCESS_KEY.trim() : '',
    region: typeof env.S3_REGION === 'string' && env.S3_REGION.trim() ? env.S3_REGION.trim() : 'auto',
  };

  if (s3.endpoint) {
    let validEp = false;
    try {
      const parsed = new URL(s3.endpoint);
      validEp = (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
    } catch {
      validEp = false;
    }
    if (!validEp) {
      errors.push({ key: 'S3_ENDPOINT', reason: 'Geçerli bir http:// veya https:// URL olmalıdır.' });
    }
  }

  const s3KeyMap = {
    S3_ENDPOINT: s3.endpoint,
    S3_BUCKET: s3.bucket,
    S3_ACCESS_KEY_ID: s3.accessKeyId,
    S3_SECRET_ACCESS_KEY: s3.secretAccessKey,
  };
  const setCount = S3_REQUIRED_KEYS.filter((k) => Boolean(s3KeyMap[k])).length;

  if (driverRaw === 's3' || (setCount > 0 && setCount < S3_REQUIRED_KEYS.length)) {
    for (const k of S3_REQUIRED_KEYS) {
      if (!s3KeyMap[k]) {
        errors.push({ key: k, reason: 'S3 belge kasası için zorunludur.' });
      }
    }
  }

  let driver = 'disabled';
  if (setCount === S3_REQUIRED_KEYS.length && driverRaw !== 'local') {
    driver = 's3';
  } else if (nodeEnv !== 'production' && (driverRaw === '' || driverRaw === 'local')) {
    driver = 'local';
  }

  return { driver, s3, errors };
}

/**
 * TRUST_PROXY ortam değişkenini güvenli Express değerine ayrıştırır.
 */
function parseTrustProxy(raw, { nodeEnv = 'development' } = {}) {
  if (raw === undefined || raw === null) return { ok: true, value: false };
  const s = String(raw).trim().toLowerCase();
  if (s === '' || s === 'false' || s === '0') return { ok: true, value: false };
  if (s === 'true') {
    if (nodeEnv === 'production') {
      return { ok: false, reason: "Production ortamında TRUST_PROXY='true' yasaktır; hop sayısı (1..5), subnet veya CIDR kullanın." };
    }
    return { ok: true, value: true };
  }
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (n >= 1 && n <= 5) return { ok: true, value: n };
    return { ok: false, reason: 'TRUST_PROXY tamsayı değeri 1..5 aralığında olmalıdır.' };
  }
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 0 && parts.every((p) => ALLOWED_TRUST_PROXY_KEYWORDS.has(p) || isValidIpOrCidr(p))) {
    return { ok: true, value: parts.length === 1 ? parts[0] : parts.join(', ') };
  }
  return {
    ok: false,
    reason: 'TRUST_PROXY yalnız false, 1..5, loopback, linklocal, uniquelocal veya geçerli IP/CIDR olabilir.',
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

  const trustParsed = parseTrustProxy(env.TRUST_PROXY, { nodeEnv });
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

  const docVault = resolveDocVaultConfig(env);
  for (const e of docVault.errors) {
    addError(e.key, e.reason);
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
    docVaultDriver: docVault.driver,
  };
}

module.exports = { validateEnv, parseTrustProxy, resolveDocVaultConfig };
