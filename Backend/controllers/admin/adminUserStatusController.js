const withTransaction = require('../../utils/withTransaction');
const AppError = require('../../utils/AppError');
const { toggleUserStatusTx } = require('../../services/adminUserStatusService');
const { logAuditEvent } = require('../../services/auditService');

const updateUserStatus = async (req, res, next) => {
  try {
    const rawId = Number(req.params?.id);
    if (!Number.isInteger(rawId) || rawId <= 0) {
      throw new AppError(400, 'INVALID_USER_ID', 'Geçersiz kullanıcı kimliği.');
    }
    if (typeof req.body?.aktif_mi !== 'boolean') {
      throw new AppError(400, 'INVALID_STATUS', 'aktif_mi alanı boolean olmalıdır.');
    }

    const out = await withTransaction((client) =>
      toggleUserStatusTx(client, req.user, rawId, req.body.aktif_mi)
    );
    await logAuditEvent(req, out.auditCtx);

    return res.status(200).json({
      message: out.user.aktif_mi ? 'Kullanıcı aktifleştirildi.' : 'Kullanıcı pasife alındı.',
      user: out.user,
      kapatilan_zimmet_sayisi: out.kapatilan_zimmet_sayisi,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { updateUserStatus };
