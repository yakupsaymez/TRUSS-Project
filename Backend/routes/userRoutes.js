const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const { loginRateLimiter, registerRateLimiter } = require('../middlewares/rateLimiter');
const userController = require('../controllers/userController');
const userSettingsController = require('../controllers/userSettingsController');

const router = express.Router();

// KAYIT & GİRİŞ ROTALARI
router.post('/register', registerRateLimiter, userController.register);
router.post('/login', loginRateLimiter, userController.login);

// MEVCUT KULLANICI & AYAR ROTALARI
router.get('/me', authMiddleware, userSettingsController.getMe);
router.get('/settings/notifications', authMiddleware, userSettingsController.getNotificationSettings);
router.put('/settings/notifications', authMiddleware, userSettingsController.updateNotificationSettings);
router.get('/settings/preferences', authMiddleware, userSettingsController.getPreferences);
router.put('/settings/preferences', authMiddleware, userSettingsController.updatePreferences);
router.put('/settings/password', authMiddleware, userSettingsController.changePassword);
router.delete('/settings/account', authMiddleware, authorizeRoles('SYSTEM_ADMIN'), userSettingsController.deleteAccount);

module.exports = router;
