const pool = require('../db');

const SENSITIVE_KEY_RE = /(sifre|password|token|secret|authorization|hash|cookie)/i;

const sanitizeDetail = (value, depth = 0, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value !== 'object') {
    return String(value).slice(0, 500);
  }
  if (seen.has(value)) return '[CIRCULAR]';
  if (depth >= 5) return '[MAX_DEPTH]';

  seen.add(value);
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeDetail(item, depth + 1, seen));
  }

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      out[key] = '[MASKED]';
    } else if (val !== undefined) {
      out[key] = sanitizeDetail(val, depth + 1, seen);
    }
  }
  return out;
};

const extractClientIp = (reqOrCtx) => {
  const xff = reqOrCtx?.headers?.['x-forwarded-for'];
  let rawIp = null;
  if (typeof xff === 'string' && xff.trim()) {
    rawIp = xff.split(',')[0];
  } else if (Array.isArray(xff) && xff.length > 0) {
    rawIp = String(xff[0] || '').split(',')[0];
  } else {
    rawIp = reqOrCtx?.ip || reqOrCtx?.socket?.remoteAddress || null;
  }
  if (!rawIp) return null;
  const trimmed = String(rawIp).trim().slice(0, 64);
  return trimmed || null;
};

const logAuditEvent = async (
  reqOrCtx,
  { eylem, varlik_tipi, varlik_id = null, ozet, detay = null, org_id = undefined }
) => {
  try {
    const user = reqOrCtx?.user || null;
    const resolvedOrgId = org_id !== undefined ? org_id : (user?.org_id ?? null);
    const userId = user?.user_id ?? null;
    const kullaniciEposta = user?.email ? String(user.email).trim().slice(0, 160) : null;
    const kullaniciRol = user?.role ? String(user.role).trim().slice(0, 40) : null;
    const eylemStr = String(eylem || '').trim().slice(0, 60);
    const varlikTipiStr = String(varlik_tipi || '').trim().slice(0, 40);
    const ozetStr = String(ozet || '').trim() || `${eylemStr} (${varlikTipiStr})`;
    const sanitized = detay !== null && detay !== undefined ? sanitizeDetail(detay) : null;
    const ipAdresi = extractClientIp(reqOrCtx);

    const parsedVarlikId =
      varlik_id !== null && varlik_id !== undefined && Number.isInteger(Number(varlik_id))
        ? Number(varlik_id)
        : null;

    const result = await pool.query(
      `INSERT INTO denetim_kayitlari (
         org_id, user_id, kullanici_eposta, kullanici_rol,
         eylem, varlik_tipi, varlik_id, ozet, detay_json, ip_adresi
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        resolvedOrgId,
        userId,
        kullaniciEposta,
        kullaniciRol,
        eylemStr,
        varlikTipiStr,
        parsedVarlikId,
        ozetStr,
        sanitized === null ? null : JSON.stringify(sanitized),
        ipAdresi,
      ]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Denetim kaydı yazma hatası:', err);
    return null;
  }
};

module.exports = {
  SENSITIVE_KEY_RE,
  sanitizeDetail,
  extractClientIp,
  logAuditEvent,
};
