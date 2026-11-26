const path = require('path');
const pg = require('pg');
const { Pool } = pg;
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// DATE (OID 1082) kolonlarını UTC Date yerine saf 'YYYY-MM-DD' string olarak döndür (UTC-1 gün kaymasını önler)
pg.types.setTypeParser(1082, (val) => val);

const databaseUrl = (process.env.DATABASE_URL || '').trim();
const poolConfig = databaseUrl
  ? { connectionString: databaseUrl }
  : {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME,
    };

const pool = new Pool(poolConfig);

module.exports = pool;

