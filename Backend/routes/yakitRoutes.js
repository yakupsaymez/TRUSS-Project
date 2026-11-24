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

const router = express.Router();

router.get('/', authMiddleware, getAllYakitlar);
router.get('/anomaliler', authMiddleware, requirePermission('finans'), getYakitAnomalileri);
router.post('/anomaliler/tara', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), scanYakitAnomalileri);
router.patch('/anomaliler/:id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateYakitAnomaliDurum);
router.get('/arac/:arac_id', authMiddleware, getYakitlarByArac);
router.post('/', authMiddleware, requirePermission('yakit'), createYakit);
router.put('/:yakit_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateYakit);
router.delete('/:yakit_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), deleteYakit);

module.exports = router;
