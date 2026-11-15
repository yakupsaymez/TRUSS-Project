const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const katalogController = require('../controllers/katalogController');

router.use(authMiddleware);

// GET /api/katalog/kategoriler
router.get('/kategoriler', katalogController.getKategoriler);

// GET /api/katalog/markalar?kategori_id=X
router.get('/markalar', katalogController.getMarkalar);

// GET /api/katalog/modeller?marka_id=X&kategori_id=Y
router.get('/modeller', katalogController.getModellerByMarka);

// GET /api/katalog/varyantlar?model_id=X
router.get('/varyantlar', katalogController.getVaryantlarByModel);

module.exports = router;

