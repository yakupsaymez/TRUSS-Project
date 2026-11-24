const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorizeRoles, requirePermission } = require('../middlewares/rbacMiddleware');
const { getTcoAnalizi } = require('../controllers/tcoController');
const {
  getGenelOzet,
  getAylikHarcamaTrendi,
  getAracMaliyetDagilimi,
  getButceAnalizi,
  updateButceHedefi,
} = require('../controllers/raporController');

const router = express.Router();

// Finansal rapor erişimi: SYSTEM_ADMIN/FLEET_MANAGER veya yetkiler.finans === true
const requireFinanceAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ code: 'TOKEN_MISSING', message: 'Oturum bulunamadı' });
  }
  if (req.user.role === 'SYSTEM_ADMIN' || req.user.role === 'FLEET_MANAGER') {
    return next();
  }
  if (req.user.yetkiler?.finans === true) {
    return next();
  }
  return res.status(403).json({
    code: 'FORBIDDEN_INSUFFICIENT_ROLE',
    message: 'Finansal raporlara erişim yetkiniz yok.',
  });
};

router.get('/genel-ozet', authMiddleware, requireFinanceAccess, getGenelOzet);
router.get('/aylik-trend', authMiddleware, requireFinanceAccess, getAylikHarcamaTrendi);
router.get('/arac-maliyet', authMiddleware, requireFinanceAccess, getAracMaliyetDagilimi);
router.get('/butce', authMiddleware, requireFinanceAccess, getButceAnalizi);
router.put('/butce', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateButceHedefi);
router.get('/tco-analizi', authMiddleware, requirePermission('finans'), getTcoAnalizi);

// Geriye donuk uyumluluk (Dashboard.js icin)
router.get('/aylik-ozet', authMiddleware, requireFinanceAccess, getAylikHarcamaTrendi);
router.get('/arac-giderleri', authMiddleware, requireFinanceAccess, getAracMaliyetDagilimi);

module.exports = router;
