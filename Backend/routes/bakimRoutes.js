const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware.js');
const { authorizeRoles, requirePermission } = require('../middlewares/rbacMiddleware.js');
const {
  getAllBakimlar,
  getBakimlarByArac,
  createBakim,
  updateBakim,
  deleteBakim,
} = require('../controllers/bakimController');

const router = express.Router();

router.get('/', authMiddleware, getAllBakimlar);
router.get('/arac/:arac_id', authMiddleware, getBakimlarByArac);
router.post('/', authMiddleware, requirePermission('bakim'), createBakim);
router.put('/:bakim_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateBakim);
router.delete('/:bakim_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), deleteBakim);

module.exports = router;

