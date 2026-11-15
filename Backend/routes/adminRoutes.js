const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const adminController = require('../controllers/adminController');

router.use(authMiddleware);
router.use(authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'));

// GET /api/admin/users
router.get('/users', adminController.getOrgUsers);

// POST /api/admin/users
router.post('/users', adminController.createDriver);

// POST /api/admin/assign
router.post('/assign', adminController.assignVehicleToDriver);

module.exports = router;
