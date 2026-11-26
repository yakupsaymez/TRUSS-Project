/**
 * İdempotent ve DI tabanlı zarif sunucu kapatma yöneticisi oluşturur.
 */
function createGracefulShutdown({
  setShuttingDown,
  stopScheduler,
  stopRateLimiters,
  httpServer,
  pool,
  exitFn = (code) => process.exit(code),
  timeoutMs = 10_000,
  logger = console,
}) {
  let inProgress = false;

  return async function shutdown(signal = 'SIGTERM') {
    if (inProgress) return;
    inProgress = true;

    logger?.log?.(`[Shutdown] ${signal} sinyali alındı, zarif kapatma başlatılıyor.`);
    setShuttingDown?.(true);

    const timer = setTimeout(() => {
      logger?.error?.('[Shutdown] Zaman aşımı doldu, zorla çıkılıyor.');
      exitFn(1);
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();

    try {
      stopScheduler?.();
      stopRateLimiters?.();

      if (httpServer && typeof httpServer.close === 'function') {
        await new Promise((resolve, reject) => {
          httpServer.close((err) => (err ? reject(err) : resolve()));
          httpServer.closeIdleConnections?.();
        });
      }

      if (pool && typeof pool.end === 'function') {
        await pool.end();
      }

      clearTimeout(timer);
      exitFn(0);
    } catch (err) {
      clearTimeout(timer);
      logger?.error?.('[Shutdown] Kapatma hatası:', err?.message || err);
      exitFn(1);
    }
  };
}

module.exports = { createGracefulShutdown };
