const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { resolveDocVaultConfig } = require('../utils/validateEnv');
const {
  yuklemeUrlAl,
  belgeBagla,
  belgeleriListele,
  belgeErisimAl,
  belgeSil,
  localNesneYukle,
  localNesneIndir,
} = require('../controllers/belgeController');

const router = express.Router();

const requireLocalDriver = (req, res, next) => {
  if (resolveDocVaultConfig(process.env).driver !== 'local') {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Bulunamadı.' });
  }
  return next();
};

const rawBinaryParser = (req, res, next) => {
  express.raw({ type: '*/*', limit: '10mb' })(req, res, (err) => {
    if (!err) return next();
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Dosya boyutu 10 MB sınırını aşıyor.' });
    }
    return res.status(400).json({ code: 'INVALID_BODY', message: 'Geçersiz ikili dosya gövdesi.' });
  });
};

router.put('/local-nesne', requireLocalDriver, rawBinaryParser, localNesneYukle);
router.get('/local-nesne', requireLocalDriver, localNesneIndir);

router.post('/yukleme-url', authMiddleware, yuklemeUrlAl);
router.get('/', authMiddleware, belgeleriListele);
router.get('/erisim', authMiddleware, belgeErisimAl);
router.post('/:belge_id/bagla', authMiddleware, belgeBagla);
router.get('/:belge_id/erisim', authMiddleware, belgeErisimAl);
router.delete('/:belge_id', authMiddleware, belgeSil);

module.exports = router;
