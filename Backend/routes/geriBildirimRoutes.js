const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const { createRateLimiter } = require('../middlewares/rateLimiter');
const ctrl = require('../controllers/geriBildirimController');

const feedbackPostLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  maxEntries: 5000,
  keyFn: (req) => `${req.user?.user_id || 'anon'}|${req.ip || req.socket?.remoteAddress || 'unknown'}`,
  messageFn: (sec) => `Çok fazla geri bildirim gönderildi. Lütfen ${sec} saniye sonra tekrar deneyin.`,
});

router.use(authMiddleware);

router.get('/', authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER'), ctrl.list);
router.post('/', authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER'), feedbackPostLimiter, ctrl.create);
router.patch('/:id/durum', authorizeRoles('SYSTEM_ADMIN'), ctrl.updateStatus);

module.exports = router;
