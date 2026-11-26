const crypto = require('crypto');
const defaultPool = require('../db');
const { MIGRATIONS } = require('./migrations');

const MIGRATE_LOCK_KEY = [1414681939, 1];

const SCHEMA_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const computeChecksum = (sql) =>
  crypto
    .createHash('sha256')
    .update(String(sql).trim().replace(/\r\n/g, '\n'))
    .digest('hex');

async function runMigrations(targetPool = defaultPool, options = {}) {
  const schemaRaw = options?.schema;
  let schemaIdent = null;
  if (schemaRaw !== undefined && schemaRaw !== null && schemaRaw !== '') {
    if (typeof schemaRaw !== 'string' || !SCHEMA_NAME_RE.test(schemaRaw)) {
      throw Object.assign(
        new Error(`Geçersiz şema adı: ${schemaRaw}`),
        { code: 'INVALID_SCHEMA_NAME', schema: schemaRaw }
      );
    }
    schemaIdent = `"${schemaRaw}"`;
  }
  const migrationsTable = schemaIdent ? `${schemaIdent}.schema_migrations` : 'schema_migrations';

  let lockClient = null;
  let lockAcquired = false;
  let hadError = false;
  const applied = [];
  const skipped = [];

  try {
    lockClient = await targetPool.connect();
    await lockClient.query('SELECT pg_advisory_lock($1, $2)', MIGRATE_LOCK_KEY);
    lockAcquired = true;

    await lockClient.query(`
      CREATE TABLE IF NOT EXISTS ${migrationsTable} (
        version VARCHAR(80) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
      )
    `);

    const existingRes = await lockClient.query(`SELECT version, checksum FROM ${migrationsTable}`);
    const existingMap = new Map(existingRes.rows.map((r) => [r.version, r.checksum]));

    for (const migration of MIGRATIONS) {
      const checksum = computeChecksum(migration.sql);
      if (existingMap.has(migration.version)) {
        if (existingMap.get(migration.version) !== checksum) {
          throw Object.assign(
            new Error(`Migrasyon checksum uyuşmazlığı: ${migration.version}`),
            { code: 'MIGRATION_CHECKSUM_MISMATCH', version: migration.version }
          );
        }
        skipped.push(migration.version);
        continue;
      }

      await lockClient.query('BEGIN');
      try {
        if (schemaIdent) {
          await lockClient.query(`SET LOCAL search_path TO ${schemaIdent}`);
        }
        await lockClient.query(migration.sql);
        await lockClient.query(
          `INSERT INTO ${migrationsTable} (version, checksum) VALUES ($1, $2)`,
          [migration.version, checksum]
        );
        await lockClient.query('COMMIT');
        applied.push(migration.version);
      } catch (txErr) {
        await lockClient.query('ROLLBACK').catch(() => null);
        throw txErr;
      }
    }

    return { ok: true, total: MIGRATIONS.length, applied, skipped };
  } catch (err) {
    hadError = true;
    throw err;
  } finally {
    if (lockClient) {
      if (lockAcquired) {
        await lockClient
          .query('SELECT pg_advisory_unlock($1, $2)', MIGRATE_LOCK_KEY)
          .catch(() => {
            hadError = true;
          });
      }
      lockClient.release(hadError);
    }
  }
}

if (require.main === module) {
  (async () => {
    try {
      const result = await runMigrations(defaultPool);
      console.log(JSON.stringify(result));
    } catch (err) {
      console.error('Migrasyon hatasi:', err);
      process.exitCode = 1;
    } finally {
      await defaultPool.end();
    }
  })();
}

module.exports = { runMigrations, computeChecksum, MIGRATE_LOCK_KEY };
