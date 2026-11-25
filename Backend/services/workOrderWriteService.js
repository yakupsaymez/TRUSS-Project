const pool = require('../db');
const AppError = require('../utils/AppError');
const { tarihStr, ileriTarihMi } = require('../utils/dateUtils');
const { araclariKilitle, assertNotArchived, assertOdometerChronology } = require('../utils/odometerGuard');
const { createBakimTx } = require('./bakimWriteService');
const { dispatchNotificationToUser } = require('./notificationService');

const WORKORDER_COLS = `is_emri_id, org_id, arac_id, acan_user_id, onaylayan_user_id, olusulan_bakim_id,
  baslik, aciklama, kategori, oncelik, durum, bildirilen_sayac, servis_adi, tahmini_maliyet,
  gerceklesen_maliyet, planlanan_tarih::text AS planlanan_tarih, red_iptal_nedeni,
  kapanis_tarihi, olusturma_tarihi, guncelleme_tarihi`;
const UPDATABLE = ['baslik', 'aciklama', 'kategori', 'oncelik', 'durum', 'bildirilen_sayac', 'servis_adi', 'tahmini_maliyet', 'planlanan_tarih'];
const MGR_FIELDS = ['servis_adi', 'tahmini_maliyet', 'planlanan_tarih'];

const isMgr = (a) => a?.role === 'SYSTEM_ADMIN' || a?.role === 'FLEET_MANAGER';
const cleanStr = (v, max) => { const s = String(v || '').trim(); return s ? (max ? s.slice(0, max) : s) : null; };
const numOrNull = (v) => (v === null || v === '' ? null : Number(v));

const assertActor = (actor, requireMgr = false) => {
  if (!actor?.user_id) throw new AppError(401, 'TOKEN_MISSING', 'Oturum bulunamadı.');
  if (actor.role === 'FLEET_MANAGER' && !actor.org_id) throw new AppError(403, 'FORBIDDEN_ORG_REQUIRED', 'Organizasyon bilgisi bulunamadı.');
  if (requireMgr && !isMgr(actor)) throw new AppError(403, 'FORBIDDEN_ROLE', 'Bu işlem için yönetici yetkisi gereklidir.');
};

const parseOptDate = (raw) => {
  if (raw === undefined || raw === null || raw === '') return null;
  const gun = tarihStr(raw);
  if (!gun) throw new AppError(400, 'INVALID_DATE', 'Geçersiz tarih formatı.');
  return gun;
};

const assertDriverAssigned = async (client, aracId, userId) => {
  const r = await client.query('SELECT 1 FROM arac_sofor_atamalari WHERE arac_id = $1 AND sofor_user_id = $2 AND aktif = TRUE LIMIT 1', [aracId, userId]);
  if (r.rowCount === 0) throw new AppError(403, 'FORBIDDEN_VEHICLE_ACCESS', 'Bu araca erişim yetkiniz yoktur.');
};

const findPreLock = async (client, actor, id) => {
  const r = await client.query(
    `SELECT ie.is_emri_id, ie.org_id, ie.arac_id, ie.acan_user_id, ie.durum, a.plaka
     FROM is_emirleri ie LEFT JOIN araclar a ON a.arac_id = ie.arac_id WHERE ie.is_emri_id = $1`,
    [id]
  );
  const f = r.rows[0];
  if (!f || (actor.org_id && Number(f.org_id) !== Number(actor.org_id))) throw new AppError(404, 'WORKORDER_NOT_FOUND', 'İş emri bulunamadı.');
  return f;
};

const lockVehicleAndWo = async (client, id, aracId, verb) => {
  const [arac] = await araclariKilitle(client, [aracId]);
  if (!arac) throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Araç bulunamadı.');
  assertNotArchived(arac, 'iş emri', verb);
  const woRes = await client.query(`SELECT ${WORKORDER_COLS} FROM is_emirleri WHERE is_emri_id = $1 AND arac_id = $2 FOR UPDATE`, [id, aracId]);
  if (woRes.rowCount === 0) throw new AppError(404, 'WORKORDER_NOT_FOUND', 'İş emri bulunamadı.');
  const wo = woRes.rows[0];
  if (wo.durum === 'tamamlandi' || wo.durum === 'iptal') throw new AppError(409, 'WORKORDER_ALREADY_CLOSED', 'Bu iş emri zaten kapatılmış.');
  return { arac, wo };
};

const buildNotifyCtx = (wo, row, actor, plaka) => {
  if (!wo.acan_user_id || Number(wo.acan_user_id) === Number(actor.user_id)) return null;
  const ok = row.durum === 'tamamlandi';
  return {
    recipientUserId: wo.acan_user_id, org_id: row.org_id, arac_id: row.arac_id, is_emri_id: row.is_emri_id,
    durum: row.durum, seviye: ok ? 'bilgi' : 'uyari',
    baslik: `${plaka || `#${row.arac_id}`} iş emri ${ok ? 'tamamlandı' : 'iptal edildi'}`,
    mesaj: ok
      ? `"${row.baslik}" talebiniz bakım kaydına dönüştürülerek kapatıldı.`
      : `"${row.baslik}" talebiniz iptal edildi.${row.red_iptal_nedeni ? ` Neden: ${row.red_iptal_nedeni}` : ''}`,
  };
};

const createWorkOrderTx = async (client, actor, input) => {
  assertActor(actor);
  if (actor.role === 'DRIVER' && MGR_FIELDS.some((k) => input[k] !== undefined && input[k] !== null && input[k] !== '')) {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Şoförler servis, maliyet veya planlanan tarih atayamaz.');
  }
  const aracId = Number(input.arac_id);
  const planTarih = parseOptDate(input.planlanan_tarih);
  const aracQ = await client.query('SELECT arac_id, org_id, plaka, sayac_tipi FROM araclar WHERE arac_id = $1', [aracId]);
  const arac = aracQ.rows[0];
  if (!arac || (actor.org_id && Number(arac.org_id) !== Number(actor.org_id))) throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Araç bulunamadı.');
  if (!arac.org_id) throw new AppError(409, 'VEHICLE_ORG_MISSING', 'Aracın organizasyon bilgisi eksik.');
  if (actor.role === 'DRIVER') await assertDriverAssigned(client, aracId, actor.user_id);

  const [hedef] = await araclariKilitle(client, [aracId]);
  if (!hedef) throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Araç bulunamadı.');
  assertNotArchived(hedef, 'iş emri', 'açılamaz');

  const ins = await client.query(
    `INSERT INTO is_emirleri (org_id, arac_id, acan_user_id, baslik, aciklama, kategori, oncelik, bildirilen_sayac, servis_adi, tahmini_maliyet, planlanan_tarih)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING ${WORKORDER_COLS}`,
    [
      arac.org_id, aracId, actor.user_id, String(input.baslik).trim().slice(0, 160), cleanStr(input.aciklama),
      input.kategori || 'ariza', input.oncelik || 'normal',
      input.bildirilen_sayac !== undefined ? numOrNull(input.bildirilen_sayac) : null,
      cleanStr(input.servis_adi, 120),
      input.tahmini_maliyet !== undefined ? numOrNull(input.tahmini_maliyet) : null, planTarih,
    ]
  );
  const row = ins.rows[0];
  return {
    row, notifyCtx: null,
    auditCtx: { eylem: 'IS_EMRI_ACILDI', varlik_tipi: 'is_emri', varlik_id: row.is_emri_id, org_id: row.org_id, ozet: `${arac.plaka} aracı için "${row.baslik}" iş emri açıldı.`, detay: { plaka: arac.plaka, kategori: row.kategori, oncelik: row.oncelik } },
  };
};

const updateWorkOrderTx = async (client, actor, input) => {
  assertActor(actor, true);
  if (!UPDATABLE.some((k) => input[k] !== undefined)) throw new AppError(400, 'EMPTY_UPDATE', 'Güncellenecek en az bir alan gönderilmelidir.');
  if (input.durum !== undefined && input.durum !== 'serviste') {
    throw new AppError(400, 'INVALID_TRANSITION', 'Geçersiz durum geçişi. Yalnızca serviste durumuna geçilebilir.');
  }
  const id = Number(input.isEmriId ?? input.is_emri_id);
  const planTarih = input.planlanan_tarih !== undefined ? parseOptDate(input.planlanan_tarih) : undefined;
  const found = await findPreLock(client, actor, id);
  const { wo } = await lockVehicleAndWo(client, id, found.arac_id, 'güncellenemez');
  const nextDurum = input.durum !== undefined ? input.durum : wo.durum;

  const upd = await client.query(
    `UPDATE is_emirleri
     SET baslik=$2, aciklama=$3, kategori=$4, oncelik=$5, durum=$6, bildirilen_sayac=$7, servis_adi=$8,
         tahmini_maliyet=$9, planlanan_tarih=$10, onaylayan_user_id=$11, guncelleme_tarihi=NOW()
     WHERE is_emri_id=$1 RETURNING ${WORKORDER_COLS}`,
    [
      id,
      input.baslik !== undefined ? String(input.baslik).trim().slice(0, 160) : wo.baslik,
      input.aciklama !== undefined ? cleanStr(input.aciklama) : wo.aciklama,
      input.kategori ?? wo.kategori, input.oncelik ?? wo.oncelik, nextDurum,
      input.bildirilen_sayac !== undefined ? numOrNull(input.bildirilen_sayac) : wo.bildirilen_sayac,
      input.servis_adi !== undefined ? cleanStr(input.servis_adi, 120) : wo.servis_adi,
      input.tahmini_maliyet !== undefined ? numOrNull(input.tahmini_maliyet) : wo.tahmini_maliyet,
      planTarih !== undefined ? planTarih : wo.planlanan_tarih,
      nextDurum === 'serviste' ? actor.user_id : wo.onaylayan_user_id,
    ]
  );
  const row = upd.rows[0];
  return {
    row, notifyCtx: null,
    auditCtx: { eylem: 'IS_EMRI_GUNCELLENDI', varlik_tipi: 'is_emri', varlik_id: row.is_emri_id, org_id: row.org_id, ozet: `${found.plaka || `#${row.arac_id}`} iş emri güncellendi (${row.durum}).`, detay: { plaka: found.plaka, durum: row.durum, servis_adi: row.servis_adi } },
  };
};

const completeWorkOrderTx = async (client, actor, input) => {
  assertActor(actor, true);
  const gun = tarihStr(input.tarih);
  if (!gun) throw new AppError(400, 'INVALID_DATE', 'Geçersiz tarih formatı.');
  if (ileriTarihMi(input.tarih)) throw new AppError(400, 'FUTURE_DATE', 'İleri tarihli kayıt girilemez.');
  const sayac = Number(input.sayac_degeri);
  if (!Number.isFinite(sayac) || sayac < 0) throw new AppError(400, 'INVALID_ODOMETER', 'Geçersiz sayaç değeri.');

  const id = Number(input.isEmriId ?? input.is_emri_id);
  const found = await findPreLock(client, actor, id);
  const { arac, wo } = await lockVehicleAndWo(client, id, found.arac_id, 'tamamlanamaz');

  const isHour = arac.sayac_tipi === 'SMH' || arac.sayac_tipi === 'SAAT';
  if (!isHour && !Number.isInteger(sayac)) throw new AppError(400, 'INVALID_ODOMETER', 'KM sayaçlı araçlarda sayaç değeri tam sayı olmalıdır.');
  if (isHour && !Number.isInteger(sayac)) {
    await assertOdometerChronology(client, { aracId: wo.arac_id, tarih: gun, deger: sayac, sayacTipi: arac.sayac_tipi });
  }

  const decimalNote = isHour && !Number.isInteger(sayac) ? `[Sayaç: ${sayac} saat]` : '';
  const notlar = [cleanStr(input.notlar), decimalNote].filter(Boolean).join(' ') || null;
  const bakimTipi = cleanStr(input.islem_tipi, 150) || (wo.kategori === 'periyodik_bakim' ? 'Periyodik Bakım' : wo.baslik.slice(0, 150));
  const tutar = Number(input.tutar);

  const { row: bakim } = await createBakimTx(client, actor, {
    arac_id: wo.arac_id, bakim_tipi: bakimTipi, tarih: gun, km: Math.round(sayac),
    maliyet: tutar, fatura_no: input.fatura_no, notlar, sifirla_parcalar: input.sifirla_parcalar,
  });

  const upd = await client.query(
    `UPDATE is_emirleri
     SET durum='tamamlandi', olusulan_bakim_id=$2, gerceklesen_maliyet=$3, servis_adi=COALESCE($4, servis_adi),
         onaylayan_user_id=$5, kapanis_tarihi=NOW(), guncelleme_tarihi=NOW()
     WHERE is_emri_id=$1 RETURNING ${WORKORDER_COLS}`,
    [id, bakim.bakim_id, tutar, cleanStr(input.servis_adi, 120), actor.user_id]
  );
  const row = upd.rows[0];
  return {
    row, bakim, notifyCtx: buildNotifyCtx(wo, row, actor, found.plaka),
    auditCtx: { eylem: 'IS_EMRI_TAMAMLANDI', varlik_tipi: 'is_emri', varlik_id: row.is_emri_id, org_id: row.org_id, ozet: `${found.plaka || `#${row.arac_id}`} iş emri tamamlandı (Bakım #${bakim.bakim_id}).`, detay: { plaka: found.plaka, bakim_id: bakim.bakim_id, tutar, sayac_degeri: sayac } },
  };
};

const cancelWorkOrderTx = async (client, actor, input) => {
  assertActor(actor);
  const id = Number(input.isEmriId ?? input.is_emri_id);
  const found = await findPreLock(client, actor, id);
  if (actor.role === 'DRIVER') await assertDriverAssigned(client, found.arac_id, actor.user_id);

  const { wo } = await lockVehicleAndWo(client, id, found.arac_id, 'iptal edilemez');
  if (actor.role === 'DRIVER' && (Number(wo.acan_user_id) !== Number(actor.user_id) || wo.durum !== 'acik')) {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Şoförler yalnızca kendi açtıkları açık iş emirlerini iptal edebilir.');
  }

  const neden = cleanStr(input.red_iptal_nedeni, 240);
  const upd = await client.query(
    `UPDATE is_emirleri SET durum='iptal', red_iptal_nedeni=$2, onaylayan_user_id=COALESCE($3, onaylayan_user_id), kapanis_tarihi=NOW(), guncelleme_tarihi=NOW()
     WHERE is_emri_id=$1 RETURNING ${WORKORDER_COLS}`,
    [id, neden, isMgr(actor) ? actor.user_id : null]
  );
  const row = upd.rows[0];
  return {
    row, notifyCtx: buildNotifyCtx(wo, row, actor, found.plaka),
    auditCtx: { eylem: 'IS_EMRI_IPTAL', varlik_tipi: 'is_emri', varlik_id: row.is_emri_id, org_id: row.org_id, ozet: `${found.plaka || `#${row.arac_id}`} iş emri iptal edildi.`, detay: { plaka: found.plaka, red_iptal_nedeni: neden } },
  };
};

const notifyWorkOrderRequester = async (notifyCtx) => {
  if (!notifyCtx?.recipientUserId) return null;
  try {
    const res = await pool.query(
      `SELECT user_id, ad_soyad, email, telefon, role, yetkiler, org_id, email_bildirim_aktif, sms_bildirim_aktif, bildirim_tercihleri
       FROM users WHERE user_id = $1 LIMIT 1`,
      [notifyCtx.recipientUserId]
    );
    if (res.rowCount === 0) return null;
    return await dispatchNotificationToUser(res.rows[0], {
      org_id: notifyCtx.org_id, arac_id: notifyCtx.arac_id, kategori: 'sistem', seviye: notifyCtx.seviye,
      referans_anahtar: `is_emri:${notifyCtx.is_emri_id}:${notifyCtx.durum}`,
      baslik: notifyCtx.baslik, mesaj: notifyCtx.mesaj, link_url: '/app/is-emirleri',
    }, { skipEmail: true });
  } catch (err) {
    console.error('İş emri bildirimi hatası:', err);
    return null;
  }
};

module.exports = { createWorkOrderTx, updateWorkOrderTx, completeWorkOrderTx, cancelWorkOrderTx, notifyWorkOrderRequester };
