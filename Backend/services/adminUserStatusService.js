const AppError = require('../utils/AppError');

/**
 * Kullanıcı aktif/pasif durumunu yarış-koşulu güvenli biçimde günceller.
 * Pasife çekmede token_version artırır ve aktif şoför zimmetlerini kapatır.
 */
async function toggleUserStatusTx(client, actor, targetId, aktifMi) {
  if (!actor?.user_id) {
    throw new AppError(401, 'TOKEN_MISSING', 'Oturum bulunamadı.');
  }
  const id = Number(targetId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'INVALID_USER_ID', 'Geçersiz kullanıcı kimliği.');
  }
  if (typeof aktifMi !== 'boolean') {
    throw new AppError(400, 'INVALID_STATUS', 'aktif_mi alanı boolean olmalıdır.');
  }
  if (id === Number(actor.user_id)) {
    throw new AppError(400, 'SELF_ACTION_FORBIDDEN', 'Kendi hesap durumunuzu değiştiremezsiniz.');
  }

  const lockRes = await client.query(
    `SELECT user_id, ad_soyad, email, telefon, role, org_id, yetkiler, aktif_mi
     FROM users
     WHERE user_id = $1
     FOR UPDATE`,
    [id]
  );
  if (lockRes.rowCount === 0) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Kullanıcı bulunamadı.');
  }

  const target = lockRes.rows[0];
  if (actor.role !== 'SYSTEM_ADMIN') {
    if (!actor.org_id || Number(target.org_id) !== Number(actor.org_id)) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Kullanıcı organizasyonunuzda bulunamadı.');
    }
    if (target.role === 'SYSTEM_ADMIN') {
      throw new AppError(403, 'FORBIDDEN_SYSTEM_ADMIN_TARGET', 'SYSTEM_ADMIN hesabını yönetme yetkiniz yok.');
    }
  }

  if (target.role === 'SYSTEM_ADMIN' && aktifMi === false) {
    const adminLocks = await client.query(
      `SELECT user_id
       FROM users
       WHERE role = 'SYSTEM_ADMIN' AND aktif_mi = TRUE
       ORDER BY user_id ASC
       FOR UPDATE`
    );
    if (adminLocks.rowCount <= 1) {
      throw new AppError(409, 'LAST_SYSTEM_ADMIN', 'Sistemdeki son aktif SYSTEM_ADMIN hesabı pasife alınamaz.');
    }
  }

  const updRes = await client.query(
    `UPDATE users
     SET aktif_mi = $2,
         token_version = CASE WHEN $2 = FALSE THEN token_version + 1 ELSE token_version END
     WHERE user_id = $1
     RETURNING user_id, ad_soyad, email, telefon, role, org_id, yetkiler, aktif_mi`,
    [id, aktifMi]
  );
  const updatedUser = updRes.rows[0];

  let kapatilanZimmetSayisi = 0;
  if (aktifMi === false) {
    const zimmetRes = await client.query(
      `UPDATE arac_sofor_atamalari
       SET aktif = FALSE, teslim_tarihi = NOW()
       WHERE sofor_user_id = $1 AND aktif = TRUE`,
      [id]
    );
    kapatilanZimmetSayisi = zimmetRes.rowCount;
  }

  const durumLabel = aktifMi ? 'AKTIF' : 'PASIF';
  return {
    user: updatedUser,
    kapatilan_zimmet_sayisi: kapatilanZimmetSayisi,
    auditCtx: {
      eylem: 'KULLANICI_DURUM_GUNCELLENDI',
      varlik_tipi: 'user',
      varlik_id: id,
      org_id: target.org_id ?? null,
      ozet: `${updatedUser.email} kullanıcısı ${durumLabel} durumuna alındı.`,
      detay: {
        email: updatedUser.email,
        onceki_aktif_mi: Boolean(target.aktif_mi),
        yeni_aktif_mi: aktifMi,
        kapatilan_zimmet_sayisi: kapatilanZimmetSayisi,
      },
    },
  };
}

module.exports = { toggleUserStatusTx };
