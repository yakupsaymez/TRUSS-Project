const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: 'Bu işlem için yetkiniz bulunmamaktadır.'
      });
    }
    next();
  };
};

const buildVehicleAccessFilter = (user, paramOffset = 1) => {
  if (user?.role === 'SYSTEM_ADMIN') {
    return { clause: '1=1', params: [] };
  }
  if (user?.role === 'FLEET_MANAGER') {
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
  buildVehicleAccessFilter,
};

