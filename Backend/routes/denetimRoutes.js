const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const { getDenetimKayitlari } = require('../controllers/denetimController');

const router = express.Router();

router.get('/', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), getDenetimKayitlari);

module.exports = router;
