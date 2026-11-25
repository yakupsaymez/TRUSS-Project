const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getIsEmirleri,
  createIsEmri,
  updateIsEmri,
  completeIsEmri,
  cancelIsEmri,
} = require('../controllers/isEmriController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getIsEmirleri);
router.post('/', createIsEmri);
router.patch('/:is_emri_id', updateIsEmri);
router.post('/:is_emri_id/tamamla', completeIsEmri);
router.post('/:is_emri_id/iptal', cancelIsEmri);

module.exports = router;
