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

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', adminController.updateUserRole);

// PUT /api/admin/users/:id/permissions
router.put('/users/:id/permissions', adminController.updateUserPermissions);

// PUT /api/admin/users/:id/password
router.put('/users/:id/password', adminController.resetUserPassword);

// DELETE /api/admin/assign/:arac_id
router.delete('/assign/:arac_id', adminController.unassignVehicle);

// GET /api/admin/organization
router.get('/organization', adminController.getOrganization);

// PUT /api/admin/organization
router.put('/organization', adminController.updateOrganization);

module.exports = router;
