const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware.js');
const { authorizeRoles, requirePermission } = require('../middlewares/rbacMiddleware.js');
const {
  getAllYakitlar,
  getYakitlarByArac,
  createYakit,
  updateYakit,
  deleteYakit,
} = require('../controllers/yakitController');
const {
  getYakitAnomalileri,
  scanYakitAnomalileri,
  updateYakitAnomaliDurum,
} = require('../controllers/yakitAnomalyController');
const { previewYakitImport, commitYakitImport } = require('../controllers/yakitImportController');

const router = express.Router();

const bulkJsonParser = (req, res, next) => {
  express.json({ limit: '1mb' })(req, res, (err) => {
    if (!err) return next();
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'CSV verisi 1 MB sınırını aşıyor.' });
    }
    return res.status(400).json({ code: 'INVALID_JSON', message: 'Geçersiz JSON gövdesi.' });
  });
};

router.get('/', authMiddleware, getAllYakitlar);
router.post('/toplu-onizleme', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), requirePermission('yakit'), bulkJsonParser, previewYakitImport);
router.post('/toplu-aktar', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), requirePermission('yakit'), bulkJsonParser, commitYakitImport);
router.get('/anomaliler', authMiddleware, requirePermission('finans'), getYakitAnomalileri);
router.post('/anomaliler/tara', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), scanYakitAnomalileri);
router.patch('/anomaliler/:id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateYakitAnomaliDurum);
router.get('/arac/:arac_id', authMiddleware, getYakitlarByArac);
router.post('/', authMiddleware, requirePermission('yakit'), createYakit);
router.put('/:yakit_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateYakit);
router.delete('/:yakit_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), deleteYakit);

module.exports = router;
