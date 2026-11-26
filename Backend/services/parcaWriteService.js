const AppError = require('../utils/AppError');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { tarihStr, ileriTarihMi } = require('../utils/dateUtils');
const { araclariKilitle, assertNotArchived, sayacBirimi } = require('../utils/odometerGuard');
const { hasFinanceAccess } = require('./docVaultHelpers');

const validateCalendarDate = (tarih) => {
  const gun = tarihStr(tarih);
  if (gun === null) throw new AppError(400, 'INVALID_DATE', 'Geçersiz tarih.');
  if (ileriTarihMi(tarih)) throw new AppError(400, 'FUTURE_DATE', 'İleri tarihli kayıt girilemez.');
  return gun;
};

const normalizeParcaAdi = (raw) => {
  const trimmed = String(raw ?? '').trim();
  if (trimmed.length < 1 || trimmed.length > 120) {
    throw new AppError(400, 'INVALID_PARCA_ADI', 'Parça adı 1 ile 120 karakter arasında olmalıdır.');
  }
  return trimmed;
};

const getAracSayacBilgisi = async (client, aracId, actor) => {
  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const res = await client.query(
    `SELECT a.arac_id, a.org_id, a.plaka, a.marka, a.model, a.sayac_tipi,
       GREATEST(
         COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
         COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = a.arac_id), 0),
         COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0)
       )::int AS guncel_sayac
     FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
    [aracId, ...params]
  );
  return res.rows[0] || null;
};

const assertParcaSayac = (km, arac) => {
  if (km !== null && km !== undefined && km > arac.guncel_sayac) {
    const birim = sayacBirimi(arac.sayac_tipi);
    throw new AppError(
      422,
      'SAYAC_KRONOLOJI_IHLALI',
      `Son değişim sayacı (${km} ${birim}), aracın güncel sayacından (${arac.guncel_sayac} ${birim}) büyük olamaz.`,
      { guncel_sayac: arac.guncel_sayac, sayac_tipi: arac.sayac_tipi, birim }
    );
  }
};

const buildMutationResult = (row, arac, canFinance, eylem, ozet) => ({
  parca: {
    parca_id: row.parca_id, arac_id: row.arac_id, parca_adi: row.parca_adi,
    son_degisim_km: row.son_degisim_km, degisim_araligi_km: row.degisim_araligi_km,
    son_degisim_tarihi: row.son_degisim_tarihi, maliyet: canFinance ? row.maliyet : null,
    notlar: row.notlar, plaka: arac.plaka, marka: arac.marka, model: arac.model,
    sayac_tipi: arac.sayac_tipi, guncel_km: arac.guncel_sayac,
  },
  auditCtx: {
    eylem, varlik_tipi: 'parca', varlik_id: row.parca_id, org_id: arac.org_id, ozet,
    detay: { plaka: arac.plaka, parca_adi: row.parca_adi, son_degisim_km: row.son_degisim_km, ...(canFinance ? { maliyet: row.maliyet } : {}) },
  },
});

const createParcaTx = async (client, actor, input) => {
  const aracId = Number(input.arac_id);
  const parcaAdi = normalizeParcaAdi(input.parca_adi);
  const tarihDb = validateCalendarDate(input.son_degisim_tarihi);

  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const erisim = await client.query(`SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`, [aracId, ...params]);
  if (erisim.rowCount === 0) throw new AppError(404, null, 'Arac bulunamadi');

  const [hedefArac] = await araclariKilitle(client, [aracId]);
  if (!hedefArac) throw new AppError(404, null, 'Arac bulunamadi');
  assertNotArchived(hedefArac, 'parça kaydı');

  const arac = await getAracSayacBilgisi(client, aracId, actor);
  if (!arac) throw new AppError(404, null, 'Arac bulunamadi');
  assertParcaSayac(input.son_degisim_km, arac);

  const canFinance = hasFinanceAccess(actor);
  const aralikKm = input.degisim_araligi_km === '' || input.degisim_araligi_km === undefined ? null : input.degisim_araligi_km;
  const maliyet = canFinance ? (input.maliyet === undefined || input.maliyet === null ? 0 : input.maliyet) : 0;
  const notlar = input.notlar === undefined || input.notlar === '' ? null : input.notlar;

  let row;
  try {
    const res = await client.query(
      `INSERT INTO parca_takip (arac_id, parca_adi, son_degisim_km, degisim_araligi_km, son_degisim_tarihi, maliyet, notlar)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [aracId, parcaAdi, input.son_degisim_km, aralikKm, tarihDb, maliyet, notlar]
    );
    row = res.rows[0];
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'DUPLICATE_PARCA', 'Bu parca zaten takipte.');
    throw err;
  }

  return buildMutationResult(row, arac, canFinance, 'PARCA_OLUSTURULDU', `${arac.plaka} plakalı araca ${row.parca_adi} parça takibi eklendi.`);
};

const updateParcaTx = async (client, actor, input) => {
  const parcaId = Number(input.parcaId ?? input.parca_id);
  if (!Number.isInteger(parcaId) || parcaId <= 0) throw new AppError(400, null, 'Gecersiz parca id');

  const tarihDb = input.son_degisim_tarihi !== undefined ? validateCalendarDate(input.son_degisim_tarihi) : null;
  const parcaAdiInput = input.parca_adi !== undefined ? normalizeParcaAdi(input.parca_adi) : undefined;

  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const preCheck = await client.query(
    `SELECT p.arac_id FROM parca_takip p INNER JOIN araclar a ON a.arac_id = p.arac_id WHERE p.parca_id = $1 AND (${clause})`,
    [parcaId, ...params]
  );
  if (preCheck.rowCount === 0) throw new AppError(404, null, 'Parca bulunamadi');

  const [hedefArac] = await araclariKilitle(client, [preCheck.rows[0].arac_id]);
  if (!hedefArac) throw new AppError(404, null, 'Arac bulunamadi');
  assertNotArchived(hedefArac, 'parça kaydı');

  const mevcutRes = await client.query('SELECT p.* FROM parca_takip p WHERE p.parca_id = $1 FOR UPDATE OF p', [parcaId]);
  if (mevcutRes.rowCount === 0) throw new AppError(404, null, 'Parca bulunamadi');
  const mevcut = mevcutRes.rows[0];

  if (input.arac_id !== undefined && Number(input.arac_id) !== Number(mevcut.arac_id)) {
    throw new AppError(400, 'PARCA_ARAC_DEGISTIRILEMEZ', 'Parça kaydının bağlı olduğu araç değiştirilemez.');
  }

  const arac = await getAracSayacBilgisi(client, mevcut.arac_id, actor);
  if (!arac) throw new AppError(404, null, 'Arac bulunamadi');
  assertParcaSayac(input.son_degisim_km !== undefined ? input.son_degisim_km : mevcut.son_degisim_km, arac);

  const canFinance = hasFinanceAccess(actor);
  const yeniParcaAdi = parcaAdiInput !== undefined ? parcaAdiInput : mevcut.parca_adi;
  const yeniSonDegisimKmParam = input.son_degisim_km !== undefined ? input.son_degisim_km : null;
  const yeniAralikKm = input.degisim_araligi_km === undefined ? mevcut.degisim_araligi_km : (input.degisim_araligi_km === '' ? null : input.degisim_araligi_km);
  const yeniMaliyet = !canFinance ? mevcut.maliyet : (input.maliyet === undefined ? mevcut.maliyet : (input.maliyet === null ? 0 : input.maliyet));
  const yeniNotlar = input.notlar === undefined ? mevcut.notlar : (input.notlar === '' ? null : input.notlar);

  let row;
  try {
    const res = await client.query(
      `UPDATE parca_takip SET parca_adi = $1, son_degisim_km = COALESCE($2::int, son_degisim_km),
         degisim_araligi_km = $3, son_degisim_tarihi = COALESCE($4::date, son_degisim_tarihi), maliyet = $5, notlar = $6
       WHERE parca_id = $7 RETURNING *`,
      [yeniParcaAdi, yeniSonDegisimKmParam, yeniAralikKm, tarihDb, yeniMaliyet, yeniNotlar, parcaId]
    );
    row = res.rows[0];
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'DUPLICATE_PARCA', 'Bu araçta aynı isimli parça zaten mevcut.');
    throw err;
  }

  return buildMutationResult(row, arac, canFinance, 'PARCA_GUNCELLENDI', `${arac.plaka} plakalı aracın ${row.parca_adi} parça kaydı güncellendi.`);
};

const deleteParcaTx = async (client, actor, input) => {
  const parcaId = Number(input.parcaId ?? input.parca_id);
  if (!Number.isInteger(parcaId) || parcaId <= 0) throw new AppError(400, null, 'Gecersiz parca id');

  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const preCheck = await client.query(
    `SELECT p.arac_id, a.plaka, a.org_id FROM parca_takip p INNER JOIN araclar a ON a.arac_id = p.arac_id WHERE p.parca_id = $1 AND (${clause})`,
    [parcaId, ...params]
  );
  if (preCheck.rowCount === 0) throw new AppError(404, null, 'Parca bulunamadi');
  const { arac_id: aracId, plaka, org_id: orgId } = preCheck.rows[0];

  const [hedefArac] = await araclariKilitle(client, [aracId]);
  if (!hedefArac) throw new AppError(404, null, 'Arac bulunamadi');
  assertNotArchived(hedefArac, 'parça kaydı', 'silinemez');

  const parcaCheck = await client.query('SELECT p.parca_id, p.parca_adi, p.maliyet FROM parca_takip p WHERE p.parca_id = $1 FOR UPDATE OF p', [parcaId]);
  if (parcaCheck.rowCount === 0) throw new AppError(404, null, 'Parca bulunamadi');
  const row = parcaCheck.rows[0];

  await client.query('DELETE FROM parca_takip WHERE parca_id = $1', [parcaId]);
  const canFinance = hasFinanceAccess(actor);

  return {
    parcaId,
    auditCtx: {
      eylem: 'PARCA_SILINDI', varlik_tipi: 'parca', varlik_id: parcaId, org_id: orgId,
      ozet: `${plaka} plakalı aracın ${row.parca_adi} parça kaydı silindi.`,
      detay: { plaka, parca_adi: row.parca_adi, ...(canFinance ? { maliyet: row.maliyet } : {}) },
    },
  };
};

module.exports = { createParcaTx, updateParcaTx, deleteParcaTx };
