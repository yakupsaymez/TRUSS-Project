const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const app = require('./server');
const pool = require('./db');
const { validateEnv } = require('./utils/validateEnv');
const { createGracefulShutdown } = require('./utils/gracefulShutdown');
const { stopAllRateLimiterCleanups } = require('./middlewares/rateLimiter');
const {
  startNotificationCron,
  stopNotificationScheduler,
} = require('./services/notificationScheduler');

function startServer() {
  const cfg = validateEnv(process.env);
  const httpServer = app.listen(cfg.port, () => {
    console.log(`Sunucu http://localhost:${cfg.port} adresinde calisiyor.`);
  });

  startNotificationCron();

  const shutdown = createGracefulShutdown({
    setShuttingDown: app.setShuttingDown,
    stopScheduler: stopNotificationScheduler,
    stopRateLimiters: stopAllRateLimiterCleanups,
    httpServer,
    pool,
  });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { httpServer, shutdown, cfg };
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
