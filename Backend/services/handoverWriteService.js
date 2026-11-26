const AppError = require('../utils/AppError');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { tarihStr, ileriTarihMi } = require('../utils/dateUtils');
const { assertNotArchived, assertOdometerChronology, aracSayaciniSenkronizeEt } = require('../utils/odometerGuard');
const { bindHandoverKeysTx } = require('./docVaultService');
const { createWorkOrderTx } = require('./workOrderWriteService');

const CHECKLIST_LABELS = Object.freeze({
  lastik_durumu: 'Lastikler',
  fren_durumu: 'Fren Sistemi',
  aydinlatma_durumu: 'Aydınlatma',
  sivi_sizinti_durumu: 'Sıvı / Sızıntı',
  kaporta_cam_durumu: 'Kaporta / Cam',
  guvenlik_ekipman_durumu: 'Güvenlik Ekipmanları',
  evrak_ruhsat_durumu: 'Evrak / Ruhsat',
  kabin_temizlik_durumu: 'Kabin / Temizlik',
});

const isMgr = (a) => a?.role === 'SYSTEM_ADMIN' || a?.role === 'FLEET_MANAGER';
const cleanStr = (v, max) => { const s = String(v || '').trim(); return s ? (max ? s.slice(0, max) : s) : null; };

const assertActor = (actor, requireMgr = false) => {
  if (!actor?.user_id) throw new AppError(401, 'TOKEN_MISSING', 'Oturum bulunamadı.');
  if (actor.role === 'FLEET_MANAGER' && !actor.org_id) throw new AppError(403, 'FORBIDDEN_ORG_REQUIRED', 'Organizasyon bilgisi bulunamadı.');
  if (requireMgr && !isMgr(actor)) throw new AppError(403, 'FORBIDDEN_ROLE', 'Bu işlem için yönetici yetkisi gereklidir.');
};

const lockOrgVehicle = async (client, actor, aracId) => {
  if (!actor.org_id) throw new AppError(404, 'ORG_NOT_FOUND', 'Yönetici organizasyonu bulunamadı.');
  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const res = await client.query(
    `SELECT a.arac_id, a.org_id, a.plaka, a.marka, a.model, a.sayac_tipi, a.arsivlendi_mi
     FROM araclar a
     WHERE a.arac_id = $1 AND (${clause}) AND a.org_id = $${2 + params.length}
     FOR UPDATE OF a`,
    [aracId, ...params, actor.org_id]
  );
  if (res.rowCount === 0) throw new AppError(403, 'FORBIDDEN_VEHICLE_ACCESS', 'Bu araç filonuza ait değil veya yetkiniz yok.');
  return res.rows[0];
};

const assignVehicleTx = async (client, actor, input) => {
  assertActor(actor, true);
  const aracId = Number(input.arac_id);
  const soforId = Number(input.sofor_user_id);
  let atanmaTarihi = null;
  if (input.atanma_tarihi) {
    const gun = tarihStr(input.atanma_tarihi);
    if (!gun) throw new AppError(400, 'INVALID_DATE', 'Geçersiz atanma tarihi formatı.');
    if (ileriTarihMi(input.atanma_tarihi)) throw new AppError(400, 'FUTURE_DATE', 'İleri tarihli zimmet ataması yapılamaz.');
    atanmaTarihi = gun;
  }

  const arac = await lockOrgVehicle(client, actor, aracId);
  if (arac.arsivlendi_mi) throw new AppError(409, 'VEHICLE_ARCHIVED', 'Arşivlenmiş araca şoför zimmetlenemez.');

  const drv = await client.query('SELECT user_id, ad_soyad, role FROM users WHERE user_id = $1 AND org_id = $2 FOR UPDATE', [soforId, actor.org_id]);
  if (drv.rowCount === 0) throw new AppError(404, 'DRIVER_NOT_FOUND', 'Şoför filonuzda bulunamadı.');
  if (drv.rows[0].role !== 'DRIVER') throw new AppError(422, 'ASSIGNEE_NOT_DRIVER', 'Araç yalnızca Şoför rolündeki kullanıcılara zimmetlenebilir.');

  await client.query('UPDATE arac_sofor_atamalari SET aktif = FALSE, teslim_tarihi = NOW() WHERE arac_id = $1 AND aktif = TRUE', [aracId]);
  const ins = await client.query(
    `INSERT INTO arac_sofor_atamalari (arac_id, sofor_user_id, aktif, atanma_tarihi)
     VALUES ($1, $2, TRUE, COALESCE($3::timestamptz, NOW()))
     RETURNING *`,
    [aracId, soforId, atanmaTarihi]
  );
  const assignment = ins.rows[0];

  let muayeneOut = null;
  if (input.muayene) {
    muayeneOut = await recordHandoverInspectionTx(client, actor, {
      ...input.muayene,
      atamaId: assignment.atama_id,
      muayene_tipi: 'TESLIM_ALMA',
      kapat_zimmet: false,
    });
  }

  return {
    assignment,
    muayene: muayeneOut?.row || null,
    is_emri: muayeneOut?.is_emri || null,
    auditCtx: {
      eylem: 'ARAC_ZIMMETLENDI',
      varlik_tipi: 'zimmet',
      varlik_id: assignment.atama_id,
      org_id: arac.org_id,
      ozet: `${arac.plaka} aracı ${drv.rows[0].ad_soyad} şoförüne zimmetlendi.`,
      detay: { arac_id: aracId, plaka: arac.plaka, sofor_user_id: soforId, atama_id: assignment.atama_id },
    },
    woAuditCtx: muayeneOut?.woAuditCtx || null,
  };
};

const unassignVehicleTx = async (client, actor, input) => {
  assertActor(actor, true);
  const aracId = Number(input.arac_id);
  const arac = await lockOrgVehicle(client, actor, aracId);

  const upd = await client.query(
    'UPDATE arac_sofor_atamalari SET aktif = FALSE, teslim_tarihi = NOW() WHERE arac_id = $1 AND aktif = TRUE RETURNING *',
    [aracId]
  );
  if (upd.rowCount === 0) throw new AppError(404, 'ACTIVE_ASSIGNMENT_NOT_FOUND', 'Bu araçta aktif zimmet bulunamadı.');
  const assignment = upd.rows[0];
  return {
    assignment,
    auditCtx: {
      eylem: 'ARAC_ZIMMET_KALDIRILDI',
      varlik_tipi: 'zimmet',
      varlik_id: assignment.atama_id,
      org_id: arac.org_id,
      ozet: `${arac.plaka} aracının aktif zimmeti kapatıldı.`,
      detay: { arac_id: aracId, plaka: arac.plaka, atama_id: assignment.atama_id },
    },
  };
};

const recordHandoverInspectionTx = async (client, actor, input) => {
  assertActor(actor);
  const atamaId = Number(input.atamaId ?? input.atama_id);
  const muayeneTipi = input.muayene_tipi;
  if (input.kapat_zimmet === true && !isMgr(actor)) {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Zimmeti kapatma yetkisi yalnızca yöneticilere aittir.');
  }
  const gun = tarihStr(input.muayene_tarihi);
  if (!gun) throw new AppError(400, 'INVALID_DATE', 'Geçersiz muayene tarihi formatı.');
  if (ileriTarihMi(input.muayene_tarihi)) throw new AppError(400, 'FUTURE_DATE', 'İleri tarihli muayene kaydı girilemez.');
  const sayac = Number(input.sayac_degeri);
  if (!Number.isFinite(sayac) || sayac < 0) throw new AppError(400, 'INVALID_ODOMETER', 'Geçersiz sayaç değeri.');

  const preQ = await client.query(
    `SELECT asa.atama_id, asa.arac_id, asa.sofor_user_id, asa.aktif, a.org_id
     FROM arac_sofor_atamalari asa
     INNER JOIN araclar a ON a.arac_id = asa.arac_id
     WHERE asa.atama_id = $1`,
    [atamaId]
  );
  const pre = preQ.rows[0];
  if (!pre || (actor.org_id && Number(pre.org_id) !== Number(actor.org_id))) {
    throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Zimmet kaydı bulunamadı.');
  }
  if (!pre.org_id) throw new AppError(409, 'VEHICLE_ORG_MISSING', 'Aracın organizasyon bilgisi eksik.');

  // Deadlock koruması: önce araç satırı, sonra zimmet satırı kilitlenir
  const aracQ = await client.query(
    'SELECT arac_id, org_id, plaka, sayac_tipi, guncel_km, guncel_calisma_saati, arsivlendi_mi FROM araclar WHERE arac_id = $1 FOR UPDATE',
    [pre.arac_id]
  );
  const arac = aracQ.rows[0];
  if (!arac || (actor.org_id && Number(arac.org_id) !== Number(actor.org_id))) {
    throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Araç bulunamadı.');
  }
  assertNotArchived(arac, 'zimmet muayenesi', 'eklenemez');

  const atamaQ = await client.query(
    'SELECT atama_id, arac_id, sofor_user_id, aktif FROM arac_sofor_atamalari WHERE atama_id = $1 FOR UPDATE',
    [atamaId]
  );
  const atama = atamaQ.rows[0];
  if (!atama) throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Zimmet kaydı bulunamadı.');

  if (actor.role === 'DRIVER' && (!atama.aktif || Number(atama.sofor_user_id) !== Number(actor.user_id))) {
    throw new AppError(403, 'FORBIDDEN_VEHICLE_ACCESS', 'Yalnızca aktif kendi zimmetiniz için muayene kaydedebilirsiniz.');
  }

  const isHour = arac.sayac_tipi === 'SMH' || arac.sayac_tipi === 'SAAT';
  if (!isHour && !Number.isInteger(sayac)) {
    throw new AppError(400, 'INVALID_ODOMETER', 'KM sayaçlı araçlarda sayaç değeri tam sayı olmalıdır.');
  }
  await assertOdometerChronology(client, { aracId: arac.arac_id, tarih: gun, deger: sayac, sayacTipi: arac.sayac_tipi });

  const dup = await client.query('SELECT 1 FROM zimmet_muayeneleri WHERE atama_id = $1 AND muayene_tipi = $2', [atamaId, muayeneTipi]);
  if (dup.rowCount > 0) {
    throw new AppError(409, 'HANDOVER_ALREADY_RECORDED', 'Bu zimmet için bu muayene tipi zaten kaydedilmiş.');
  }

  let closedAssignment = null;
  if (input.kapat_zimmet === true && atama.aktif) {
    const cl = await client.query(
      'UPDATE arac_sofor_atamalari SET aktif = FALSE, teslim_tarihi = NOW() WHERE atama_id = $1 AND aktif = TRUE RETURNING *',
      [atamaId]
    );
    closedAssignment = cl.rows[0] || null;
  }

  const checklist = {};
  const defects = [];
  let worst = 'TEMIZ';
  for (const [col, label] of Object.entries(CHECKLIST_LABELS)) {
    const val = input[col] || 'OK';
    checklist[col] = val;
    if (val === 'KRITIK') { worst = 'KRITIK'; defects.push(`${label} (KRİTİK)`); }
    else if (val === 'KUSURLU') { if (worst !== 'KRITIK') worst = 'KUSURLU'; defects.push(`${label} (KUSURLU)`); }
  }
  let genelSonuc = input.genel_sonuc || worst;
  if (worst === 'KRITIK') genelSonuc = 'KRITIK';
  else if (worst === 'KUSURLU' && genelSonuc === 'TEMIZ') genelSonuc = 'KUSURLU';

  const notlar = cleanStr(input.notlar, 2000);
  let ins;
  try {
    ins = await client.query(
      `INSERT INTO zimmet_muayeneleri (
         org_id, atama_id, arac_id, sofor_user_id, yapan_user_id,
         muayene_tipi, muayene_tarihi, sayac_degeri, genel_sonuc,
         lastik_durumu, fren_durumu, aydinlatma_durumu, sivi_sizinti_durumu,
         kaporta_cam_durumu, guvenlik_ekipman_durumu, evrak_ruhsat_durumu, kabin_temizlik_durumu,
         notlar
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *, muayene_tarihi::text AS muayene_tarihi`,
      [
        arac.org_id, atamaId, arac.arac_id, atama.sofor_user_id, actor.user_id,
        muayeneTipi, gun, sayac, genelSonuc,
        checklist.lastik_durumu, checklist.fren_durumu, checklist.aydinlatma_durumu, checklist.sivi_sizinti_durumu,
        checklist.kaporta_cam_durumu, checklist.guvenlik_ekipman_durumu, checklist.evrak_ruhsat_durumu, checklist.kabin_temizlik_durumu,
        notlar,
      ]
    );
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'HANDOVER_ALREADY_RECORDED', 'Bu zimmet için bu muayene tipi zaten kaydedilmiş.');
    throw err;
  }

  const row = ins.rows[0];
  row.sayac_degeri = Number(row.sayac_degeri);
  row.belgeler = await bindHandoverKeysTx(client, actor, {
    muayeneId: row.muayene_id, aracId: arac.arac_id, orgId: arac.org_id, keys: input.belge_anahtarlari,
  });

  let woOut = null;
  if (genelSonuc === 'KUSURLU' || genelSonuc === 'KRITIK') {
    const tipEtiket = muayeneTipi === 'TESLIM_ALMA' ? 'Teslim Alma' : 'Teslim Etme';
    const baslik = `${arac.plaka} Zimmet Muayene Arızası (${tipEtiket})`.slice(0, 160);
    const aciklama = [
      defects.length > 0 ? `Tespit edilen kusurlar: ${defects.join(', ')}` : `Genel sonuç: ${genelSonuc}`,
      notlar ? `Not: ${notlar}` : null,
    ].filter(Boolean).join('\n');

    woOut = await createWorkOrderTx(client, actor, {
      arac_id: arac.arac_id,
      baslik,
      aciklama,
      kategori: 'ariza',
      oncelik: genelSonuc === 'KRITIK' ? 'kritik' : 'yuksek',
      bildirilen_sayac: sayac,
    }, { lockedArac: arac });

    await client.query('UPDATE zimmet_muayeneleri SET olusmus_is_emri_id = $2 WHERE muayene_id = $1', [row.muayene_id, woOut.row.is_emri_id]);
    row.olusmus_is_emri_id = woOut.row.is_emri_id;
  }

  await aracSayaciniSenkronizeEt(client, { aracId: arac.arac_id });

  return {
    row,
    is_emri: woOut?.row || null,
    assignment: closedAssignment,
    auditCtx: {
      eylem: 'ZIMMET_MUAYENE_KAYDEDILDI',
      varlik_tipi: 'zimmet',
      varlik_id: row.muayene_id,
      org_id: arac.org_id,
      ozet: `${arac.plaka} aracı için ${muayeneTipi} muayenesi (${genelSonuc}) kaydedildi.`,
      detay: { atama_id: atamaId, arac_id: arac.arac_id, muayene_tipi: muayeneTipi, genel_sonuc: genelSonuc, sayac_degeri: sayac, olusmus_is_emri_id: row.olusmus_is_emri_id },
    },
    woAuditCtx: woOut?.auditCtx || null,
  };
};

module.exports = { CHECKLIST_LABELS, assignVehicleTx, unassignVehicleTx, recordHandoverInspectionTx };
