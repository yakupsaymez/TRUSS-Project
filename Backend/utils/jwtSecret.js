const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

/**
 * JWT gizli anahtarını doğrular ve döndürür; eksikse fail-fast hata fırlatır.
 */
const getJwtSecret = () => {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is required.');
  }
  return secret;
};

module.exports = { getJwtSecret };
