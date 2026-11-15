const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const {
  getAllParcalar,
  getParcalarByArac,
  createParca,
  updateParca,
  deleteParca,
} = require('../controllers/parcaController');

const router = express.Router();

router.get('/', authMiddleware, getAllParcalar);
router.get('/arac/:arac_id', authMiddleware, getParcalarByArac);
router.post('/', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), createParca);
router.put('/:parca_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateParca);
router.delete('/:parca_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), deleteParca);

module.exports = router;

