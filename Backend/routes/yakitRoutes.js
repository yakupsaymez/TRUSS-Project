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

const router = express.Router();

router.get('/', authMiddleware, getAllYakitlar);
router.get('/arac/:arac_id', authMiddleware, getYakitlarByArac);
router.post('/', authMiddleware, requirePermission('yakit'), createYakit);
router.put('/:yakit_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateYakit);
router.delete('/:yakit_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), deleteYakit);

module.exports = router;
