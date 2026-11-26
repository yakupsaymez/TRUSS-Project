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
  exportFiloMaliyet,
  exportHareketler,
  exportIsEmirleri,
} = require('../controllers/raporController');

const router = express.Router();
const requireFinans = requirePermission('finans');

router.get('/genel-ozet', authMiddleware, requireFinans, getGenelOzet);
router.get('/aylik-trend', authMiddleware, requireFinans, getAylikHarcamaTrendi);
router.get('/arac-maliyet', authMiddleware, requireFinans, getAracMaliyetDagilimi);
router.get('/butce', authMiddleware, requireFinans, getButceAnalizi);
router.put('/butce', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateButceHedefi);
router.get('/tco-analizi', authMiddleware, requireFinans, getTcoAnalizi);

router.get('/export/filo-maliyet', authMiddleware, requireFinans, exportFiloMaliyet);
router.get('/export/hareketler', authMiddleware, requireFinans, exportHareketler);
router.get('/export/is-emirleri', authMiddleware, requireFinans, exportIsEmirleri);

// Geriye donuk uyumluluk (Dashboard icin)
router.get('/aylik-ozet', authMiddleware, requireFinans, getAylikHarcamaTrendi);
router.get('/arac-giderleri', authMiddleware, requireFinans, getAracMaliyetDagilimi);

module.exports = router;
