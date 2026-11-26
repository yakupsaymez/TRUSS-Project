const AppError = require('../utils/AppError');

const VALID_KATEGORILER = Object.freeze(['HATA', 'ONERI', 'DESTEK']);
const VALID_DURUMLAR = Object.freeze(['ACIK', 'INCELENIYOR', 'COZULDU']);
const CTRL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(CTRL_CHAR_RE, '').trim();
}

function assertActor(actor) {
  if (!actor?.user_id || !actor?.role) {
    throw new AppError(401, 'TOKEN_MISSING', 'Oturum bulunamadı.');
  }
}

async function createFeedback(db, actor, input = {}) {
  assertActor(actor);

  const kategori = sanitizeText(input.kategori).toUpperCase();
  if (!VALID_KATEGORILER.includes(kategori)) {
    throw new AppError(400, 'INVALID_CATEGORY', 'Kategori HATA, ONERI veya DESTEK olmalıdır.');
  }

  const baslik = sanitizeText(input.baslik);
  if (baslik.length < 3 || baslik.length > 140) {
    throw new AppError(422, 'INVALID_TITLE', 'Başlık 3 ile 140 karakter arasında olmalıdır.');
  }

  const mesaj = sanitizeText(input.mesaj);
  if (mesaj.length < 10 || mesaj.length > 2000) {
    throw new AppError(422, 'INVALID_MESSAGE', 'Mesaj 10 ile 2000 karakter arasında olmalıdır.');
  }

  const rawPath = sanitizeText(input.sayfa_yolu);
  const sayfaYolu = rawPath ? rawPath.slice(0, 160) : null;

  const rawReqId = sanitizeText(input.son_istek_id);
  const sonIstekId = rawReqId ? rawReqId.slice(0, 64) : null;

  const res = await db.query(
    `INSERT INTO geri_bildirimler (
       org_id, user_id, rol, kategori, baslik, mesaj, sayfa_yolu, son_istek_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      actor.org_id ?? null,
      actor.user_id,
      String(actor.role).slice(0, 32),
      kategori,
      baslik,
      mesaj,
      sayfaYolu,
      sonIstekId,
    ]
  );

  return res.rows[0];
}

async function listFeedbacks(db, actor, query = {}) {
  assertActor(actor);

  const conditions = [];
  const params = [];

  if (actor.role === 'SYSTEM_ADMIN') {
    // Tum organizasyonlari gorebilir
  } else if (actor.role === 'FLEET_MANAGER') {
    if (!actor.org_id) {
      throw new AppError(403, 'FORBIDDEN_ORG_REQUIRED', 'Organizasyon bilgisi bulunamadı.');
    }
    params.push(actor.org_id);
    conditions.push(`gb.org_id = $${params.length}`);
  } else if (actor.role === 'DRIVER') {
    params.push(actor.user_id);
    conditions.push(`gb.user_id = $${params.length}`);
  } else {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Bu kaynağa erişim yetkiniz yok.');
  }

  const durum = sanitizeText(query.durum).toUpperCase();
  if (durum) {
    if (!VALID_DURUMLAR.includes(durum)) {
      throw new AppError(400, 'INVALID_STATUS', 'Geçersiz durum filtresi.');
    }
    params.push(durum);
    conditions.push(`gb.durum = $${params.length}`);
  }

  const kategori = sanitizeText(query.kategori).toUpperCase();
  if (kategori) {
    if (!VALID_KATEGORILER.includes(kategori)) {
      throw new AppError(400, 'INVALID_CATEGORY', 'Geçersiz kategori filtresi.');
    }
    params.push(kategori);
    conditions.push(`gb.kategori = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await db.query(
    `SELECT gb.*,
            u.ad_soyad,
            u.email,
            o.unvan AS org_ad
     FROM geri_bildirimler gb
     LEFT JOIN users u ON u.user_id = gb.user_id
     LEFT JOIN organizations o ON o.org_id = gb.org_id
     ${whereClause}
     ORDER BY gb.olusturulma_tarihi DESC, gb.id DESC
     LIMIT 100`,
    params
  );

  return res.rows;
}

async function updateFeedbackStatus(db, actor, feedbackId, input = {}) {
  assertActor(actor);
  if (actor.role !== 'SYSTEM_ADMIN') {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Bu işlem yalnızca SYSTEM_ADMIN tarafından yapılabilir.');
  }

  const id = Number(feedbackId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'INVALID_FEEDBACK_ID', 'Geçersiz geri bildirim kimliği.');
  }

  const durum = sanitizeText(input.durum).toUpperCase();
  if (!VALID_DURUMLAR.includes(durum)) {
    throw new AppError(400, 'INVALID_STATUS', 'Durum ACIK, INCELENIYOR veya COZULDU olmalıdır.');
  }

  const hasNote = input.yonetici_notu !== undefined;
  let yoneticiNotu = null;
  if (hasNote && input.yonetici_notu !== null) {
    yoneticiNotu = sanitizeText(String(input.yonetici_notu));
    if (yoneticiNotu.length > 500) {
      throw new AppError(422, 'INVALID_NOTE', 'Yönetici notu en fazla 500 karakter olabilir.');
    }
    if (yoneticiNotu.length === 0) yoneticiNotu = null;
  }

  const res = await db.query(
    `UPDATE geri_bildirimler
     SET durum = $2,
         yonetici_notu = CASE WHEN $4::boolean THEN $3 ELSE yonetici_notu END,
         guncellenme_tarihi = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, durum, yoneticiNotu, hasNote]
  );

  if (res.rowCount === 0) {
    throw new AppError(404, 'FEEDBACK_NOT_FOUND', 'Geri bildirim kaydı bulunamadı.');
  }

  return res.rows[0];
}

module.exports = {
  VALID_KATEGORILER,
  VALID_DURUMLAR,
  sanitizeText,
  createFeedback,
  listFeedbacks,
  updateFeedbackStatus,
};
