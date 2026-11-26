const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getZimmetler, getZimmetById, createMuayene } = require('../controllers/zimmetController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getZimmetler);
router.get('/:atama_id', getZimmetById);
router.post('/:atama_id/muayeneler', createMuayene);

module.exports = router;
