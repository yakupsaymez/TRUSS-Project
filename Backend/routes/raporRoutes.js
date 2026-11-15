const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getGenelOzet,
  getAylikHarcamaTrendi,
  getAracMaliyetDagilimi,
} = require('../controllers/raporController');

const router = express.Router();

router.get('/genel-ozet', authMiddleware, getGenelOzet);
router.get('/aylik-trend', authMiddleware, getAylikHarcamaTrendi);
router.get('/arac-maliyet', authMiddleware, getAracMaliyetDagilimi);

// Geriye donuk uyumluluk (Dashboard.js icin)
router.get('/aylik-ozet', authMiddleware, getAylikHarcamaTrendi);
router.get('/arac-giderleri', authMiddleware, getAracMaliyetDagilimi);

module.exports = router;
