const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getBildirimler,
  markBildirimOkundu,
  markTumBildirimlerOkundu,
  getAksiyonMerkezi,
} = require('../controllers/bildirimController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getBildirimler);
router.get('/aksiyon-merkezi', getAksiyonMerkezi);
router.patch('/tumunu-oku', markTumBildirimlerOkundu);
router.put('/tumunu-oku', markTumBildirimlerOkundu);
router.patch('/:id/okundu', markBildirimOkundu);
router.put('/:id/okundu', markBildirimOkundu);

module.exports = router;
