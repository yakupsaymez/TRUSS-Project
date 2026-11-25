const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware.js');
const { authorizeRoles } = require('../middlewares/rbacMiddleware.js');
const {
  createArac,
  listAraclar,
  updateAracKonum,
  updateArac,
} = require('./arac/aracHandlers');
const { deleteArac, archiveArac, restoreArac } = require('./arac/aracArchiveHandlers');

const router = express.Router();

// ARAÇ EKLE (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
router.post('/ekle', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), createArac);

// ARAÇLARI LİSTELE (RBAC Filtreli: SYSTEM_ADMIN, FLEET_MANAGER, DRIVER)
router.get('/', authMiddleware, listAraclar);

// ARAÇ CANLI KONUM / SÜRÜCÜ CHECK-IN GÜNCELLE (SYSTEM_ADMIN, FLEET_MANAGER ve zimmetli DRIVER)
router.put('/:id/konum', authMiddleware, updateAracKonum);

// ARAÇ ARŞİVLE / GERİ YÜKLE (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
router.patch('/:arac_id/arsiv', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), archiveArac);
router.patch('/:arac_id/geri-yukle', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), restoreArac);

// ARAÇ SİL / SOFT-ARCHIVE (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
router.delete('/:arac_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), deleteArac);

// ARAÇ GÜNCELLE (Sadece SYSTEM_ADMIN ve FLEET_MANAGER)
router.put('/:arac_id', authMiddleware, authorizeRoles('SYSTEM_ADMIN', 'FLEET_MANAGER'), updateArac);

module.exports = router;