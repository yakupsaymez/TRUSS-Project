const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./db');
const { getJwtSecret } = require('./utils/jwtSecret');
const { parseTrustProxy } = require('./utils/validateEnv');
const { createSecurityHeadersMiddleware } = require('./middlewares/securityHeaders');
const { requestIdMiddleware } = require('./middlewares/requestIdMiddleware');
const { apiNotFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const userRoutes = require('./routes/userRoutes');
const aracRoutes = require('./routes/aracRoutes');
const bakimRoutes = require('./routes/bakimRoutes');
const yakitRoutes = require('./routes/yakitRoutes');
const parcaRoutes = require('./routes/parcaRoutes');
const raporRoutes = require('./routes/raporRoutes');
const adminRoutes = require('./routes/adminRoutes');
const katalogRoutes = require('./routes/katalogRoutes');
const bildirimRoutes = require('./routes/bildirimRoutes');
const denetimRoutes = require('./routes/denetimRoutes');
const isEmriRoutes = require('./routes/isEmriRoutes');
const belgeRoutes = require('./routes/belgeRoutes');
const zimmetRoutes = require('./routes/zimmetRoutes');
const geriBildirimRoutes = require('./routes/geriBildirimRoutes');

getJwtSecret();

/**
 * Tekil-uçuş (single-flight) sağlık denetimi ve güvenlik zırhlı Express uygulaması üretir.
 */
function createApp({
  dbPool = pool,
  nodeEnv = process.env.NODE_ENV,
  trustProxyRaw = process.env.TRUST_PROXY,
  corsOriginRaw = process.env.CORS_ORIGIN,
  healthTimeoutMs = 1500,
} = {}) {
  const app = express();
  let shuttingDown = false;
  let inFlightHealthPromise = null;

  app.setShuttingDown = (val) => { shuttingDown = Boolean(val); };
  app.isShuttingDown = () => shuttingDown;
  app.disable('x-powered-by');

  const parsedProxy = parseTrustProxy(trustProxyRaw, { nodeEnv });
  if (parsedProxy.ok && parsedProxy.value !== false) app.set('trust proxy', parsedProxy.value);

  app.use(requestIdMiddleware);
  app.use(createSecurityHeadersMiddleware({ nodeEnv }));
  const corsOrigins = corsOriginRaw
    ? String(corsOriginRaw).split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:5173'];
  app.use(cors({
    origin: corsOrigins.length > 0 ? corsOrigins : ['http://localhost:5173'],
    credentials: true,
    exposedHeaders: ['Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'X-Request-Id', 'Content-Disposition'],
  }));

  const defaultJsonParser = express.json({ limit: '100kb' });
  app.use((req, res, next) => {
    if (
      req.originalUrl
      && (req.originalUrl.startsWith('/api/yakitlar/toplu-') || req.originalUrl.startsWith('/api/belgeler/local-nesne'))
    ) {
      return next();
    }
    return defaultJsonParser(req, res, next);
  });

  const runSingleFlightHealth = () => {
    if (!inFlightHealthPromise) {
      inFlightHealthPromise = (async () => {
        let timer = null;
        const queryPromise = Promise.resolve().then(() => dbPool.query('SELECT 1'));
        queryPromise.catch(() => {});
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('HEALTH_TIMEOUT')), healthTimeoutMs);
          if (typeof timer.unref === 'function') timer.unref();
        });
        try {
          await Promise.race([queryPromise, timeoutPromise]);
          return true;
        } catch {
          return false;
        } finally {
          if (timer) clearTimeout(timer);
          inFlightHealthPromise = null;
        }
      })();
    }
    return inFlightHealthPromise;
  };

  app.get('/api/health', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (shuttingDown) {
      return res.status(503).json({ status: 'shutting_down', db: 'draining', timestamp: new Date().toISOString() });
    }
    const ok = await runSingleFlightHealth();
    const timestamp = new Date().toISOString();
    return res.status(ok ? 200 : 503).json(
      ok ? { status: 'ok', db: 'up', timestamp } : { status: 'degraded', db: 'down', timestamp }
    );
  });

  app.get('/', (req, res) => res.send('TRUSS Backend Çalışıyor'));
  app.use('/api/users', userRoutes);
  app.use('/api/araclar', aracRoutes);
  app.use('/api/bakimlar', bakimRoutes);
  app.use('/api/yakitlar', yakitRoutes);
  app.use('/api/parcalar', parcaRoutes);
  app.use('/api/parca-takip', parcaRoutes);
  app.use('/api/raporlar', raporRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/katalog', katalogRoutes);
  app.use('/api/bildirimler', bildirimRoutes);
  app.use('/api/denetim-kayitlari', denetimRoutes);
  app.use('/api/is-emirleri', isEmriRoutes);
  app.use('/api/belgeler', belgeRoutes);
  app.use('/api/zimmetler', zimmetRoutes);
  app.use('/api/geri-bildirim', geriBildirimRoutes);

  app.use('/api', apiNotFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
app.createApp = createApp;
module.exports = app;
