const pool = require('../db');

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'TOKEN_MISSING',
        message: 'Oturum bulunamadı'
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: 'Bu işlem için yetkiniz bulunmamaktadır.'
      });
    }
    next();
  };
};

const requirePermission = (key) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'TOKEN_MISSING',
        message: 'Oturum bulunamadı',
      });
    }
    if (req.user.role === 'SYSTEM_ADMIN' || req.user.role === 'FLEET_MANAGER') {
      return next();
    }
    try {
      const userRes = await pool.query(
        'SELECT role, yetkiler FROM users WHERE user_id = $1 LIMIT 1',
        [req.user.user_id]
      );
      if (userRes.rowCount === 0) {
        return res.status(401).json({
          code: 'USER_NOT_FOUND',
          message: 'Kullanıcı bulunamadı.',
        });
      }
      const row = userRes.rows[0];
      if (row.role === 'SYSTEM_ADMIN' || row.role === 'FLEET_MANAGER') {
        return next();
      }
      const yetkiler = row.yetkiler && typeof row.yetkiler === 'object' ? row.yetkiler : {};
      if (yetkiler[key] === true) {
        return next();
      }
      return res.status(403).json({
        code: 'FORBIDDEN_PERMISSION',
        message: `Bu işlem için '${key}' yetkiniz bulunmamaktadır.`,
      });
    } catch (err) {
      console.error('Yetki doğrulama hatası:', err);
      return res.status(500).json({ message: 'Sunucu hatası' });
    }
  };
};

const buildVehicleAccessFilter = (user, paramOffset = 1) => {
  if (user?.role === 'SYSTEM_ADMIN') {
    if (user.org_id) {
      return {
        clause: `a.org_id = $${paramOffset}`,
        params: [user.org_id],
      };
    }
    return { clause: '1=1', params: [] };
  }
  if (user?.role === 'FLEET_MANAGER') {
    if (user.org_id) {
      return {
        clause: `a.org_id = $${paramOffset}`,
        params: [user.org_id],
      };
    }
    return { clause: `a.kullanici_id = $${paramOffset}`, params: [user.user_id] };
  }
  return {
    clause: `EXISTS (
      SELECT 1 FROM arac_sofor_atamalari asa
      WHERE asa.arac_id = a.arac_id AND asa.sofor_user_id = $${paramOffset} AND asa.aktif = TRUE
    )`,
    params: [user?.user_id],
  };
};

module.exports = {
  authorizeRoles,
  requirePermission,
  buildVehicleAccessFilter,
};

