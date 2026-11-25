const pool = require('../db');

async function withTransaction(fn, dbPool = pool) {
  const client = await dbPool.connect();
  let destroyOnRelease = false;
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      destroyOnRelease = true;
    }
    throw err;
  } finally {
    if (destroyOnRelease) client.release(true);
    else client.release();
  }
}

module.exports = withTransaction;
