const limiterRegistry = new Set();
const getClientIp = (req) => req?.ip || req?.socket?.remoteAddress || 'unknown';

/**
 * E-posta girdisini tip-güvenli biçimde normalize eder; string-dışı değerlerde TypeError fırlatmaz.
 */
function normalizeEmailKey(rawEmail) {
  if (typeof rawEmail !== 'string') return '__invalid__';
  const normalized = rawEmail.trim().toLowerCase().slice(0, 254);
  return normalized || '__invalid__';
}

function setRateLimitHeaders(res, { limit, remaining, resetSeconds }) {
  res.setHeader('RateLimit-Limit', String(limit));
  res.setHeader('RateLimit-Remaining', String(remaining));
  res.setHeader('RateLimit-Reset', String(resetSeconds));
}

function sendRateLimited(res, { limit, resetSeconds, retryAfterSeconds, message }) {
  setRateLimitHeaders(res, { limit, remaining: 0, resetSeconds });
  res.setHeader('Retry-After', String(retryAfterSeconds));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(429).json({ code: 'RATE_LIMITED', message, retryAfterSeconds });
}

/**
 * maxEntries tavanlı ve süreli bellek-içi hız sınırlayıcı (NODE_ENV=test bypass'ı yoktur).
 */
function createRateLimiter({
  windowMs,
  max,
  maxEntries = 5000,
  keyFn = (req) => getClientIp(req),
  messageFn = (sec) => `Çok fazla istek yapıldı. Lütfen ${sec} saniye sonra tekrar deneyin.`,
  nowFn = Date.now,
  cleanupIntervalMs = 60_000,
}) {
  const store = new Map();
  let cleanupTimer = null;

  const sweepExpired = (now) => {
    for (const [k, entry] of store.entries()) {
      if (entry.resetAt <= now) store.delete(k);
    }
  };

  if (cleanupIntervalMs > 0) {
    cleanupTimer = setInterval(() => sweepExpired(nowFn()), cleanupIntervalMs);
    if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
  }

  const peek = (key) => {
    const now = nowFn();
    const entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      if (entry) store.delete(key);
      const resetSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      return { allowed: true, count: 0, limit: max, remaining: max, resetAt: now + windowMs, resetSeconds, retryAfterSeconds: 0 };
    }
    const allowed = entry.count < max;
    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      allowed,
      count: entry.count,
      limit: max,
      remaining: Math.max(0, max - entry.count),
      resetAt: entry.resetAt,
      resetSeconds,
      retryAfterSeconds: allowed ? 0 : resetSeconds,
    };
  };

  const consume = (key) => {
    const now = nowFn();
    let entry = store.get(key);
    if (entry && entry.resetAt <= now) {
      store.delete(key);
      entry = undefined;
    }
    if (!entry) {
      if (store.size >= maxEntries) {
        sweepExpired(now);
        while (store.size >= maxEntries) {
          const oldestKey = store.keys().next().value;
          if (oldestKey === undefined) break;
          store.delete(oldestKey);
        }
      }
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    if (entry.count >= max) {
      return { allowed: false, count: entry.count, limit: max, remaining: 0, resetAt: entry.resetAt, resetSeconds, retryAfterSeconds: resetSeconds };
    }
    entry.count += 1;
    return {
      allowed: true,
      count: entry.count,
      limit: max,
      remaining: Math.max(0, max - entry.count),
      resetAt: entry.resetAt,
      resetSeconds,
      retryAfterSeconds: 0,
    };
  };

  const resetKey = (key) => store.delete(key);
  const reset = () => store.clear();
  const stop = () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  };
  const size = () => store.size;

  const middleware = (req, res, next) => {
    const result = consume(keyFn(req));
    if (!result.allowed) {
      return sendRateLimited(res, {
        limit: max,
        resetSeconds: result.resetSeconds,
        retryAfterSeconds: result.retryAfterSeconds,
        message: messageFn(result.retryAfterSeconds),
      });
    }
    setRateLimitHeaders(res, { limit: max, remaining: result.remaining, resetSeconds: result.resetSeconds });
    return next();
  };

  Object.assign(middleware, { peek, consume, resetKey, reset, stop, size });
  limiterRegistry.add(middleware);
  return middleware;
}

/**
 * İki katmanlı (IP+Email ve saf IP) bileşik hız sınırlayıcı.
 */
function createCompositeRateLimiter({
  windowMs = 15 * 60 * 1000,
  emailMax = 6,
  ipMax = 30,
  maxEntries = 5000,
  nowFn = Date.now,
  cleanupIntervalMs = 60_000,
} = {}) {
  const emailLimiter = createRateLimiter({ windowMs, max: emailMax, maxEntries, nowFn, cleanupIntervalMs });
  const ipLimiter = createRateLimiter({ windowMs, max: ipMax, maxEntries, nowFn, cleanupIntervalMs });

  const middleware = (req, res, next) => {
    const ip = getClientIp(req);
    const emailKey = `${ip}|${normalizeEmailKey(req.body?.email)}`;
    const ipKey = `${ip}`;
    const ePeek = emailLimiter.peek(emailKey);
    const iPeek = ipLimiter.peek(ipKey);

    if (!ePeek.allowed || !iPeek.allowed) {
      const blocking = !iPeek.allowed && iPeek.retryAfterSeconds >= ePeek.retryAfterSeconds ? iPeek : ePeek;
      return sendRateLimited(res, {
        limit: blocking.limit,
        resetSeconds: blocking.resetSeconds,
        retryAfterSeconds: blocking.retryAfterSeconds,
        message: `Çok fazla giriş denemesi yapıldı. Lütfen ${blocking.retryAfterSeconds} saniye sonra tekrar deneyin.`,
      });
    }

    const eRes = emailLimiter.consume(emailKey);
    const iRes = ipLimiter.consume(ipKey);
    const tighter = eRes.remaining <= iRes.remaining ? eRes : iRes;
    setRateLimitHeaders(res, { limit: tighter.limit, remaining: tighter.remaining, resetSeconds: tighter.resetSeconds });

    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) emailLimiter.resetKey(emailKey);
    });
    return next();
  };

  middleware.emailLimiter = emailLimiter;
  middleware.ipLimiter = ipLimiter;
  middleware.reset = () => { emailLimiter.reset(); ipLimiter.reset(); };
  middleware.stop = () => { emailLimiter.stop(); ipLimiter.stop(); };
  return middleware;
}

const loginRateLimiter = createCompositeRateLimiter({ windowMs: 15 * 60 * 1000, emailMax: 6, ipMax: 30, maxEntries: 5000 });
const registerRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  maxEntries: 5000,
  keyFn: (req) => `${getClientIp(req)}`,
  messageFn: (sec) => `Çok fazla kayıt denemesi yapıldı. Lütfen ${sec} saniye sonra tekrar deneyin.`,
});

const resetAllRateLimiters = () => { for (const limiter of limiterRegistry) limiter.reset(); };
const stopAllRateLimiterCleanups = () => { for (const limiter of limiterRegistry) limiter.stop(); };

module.exports = {
  createRateLimiter,
  createCompositeRateLimiter,
  normalizeEmailKey,
  loginRateLimiter,
  registerRateLimiter,
  resetAllRateLimiters,
  stopAllRateLimiterCleanups,
};
