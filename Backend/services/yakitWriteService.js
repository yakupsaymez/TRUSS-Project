const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { ileriTarihMi, tarihStr } = require('../utils/dateUtils');
const AppError = require('../utils/AppError');
const {
  araclariKilitle,
  assertNotArchived,
  assertOdometerChronology,
  syncVehicleOdometer,
  aracSayaciniSenkronizeEt,
  sayacBirimi,
} = require('../utils/odometerGuard');

const extractFaturaFromNotlar = (rawNotlar) => {
  if (!rawNotlar) return null;
  const match = String(rawNotlar).match(/\[Fatura:\s*([^\]]+)\]/i);
  if (!match) return null;
  return match[1].trim().slice(0, 80) || null;
};

const resolveFaturaNo = (explicitFaturaNo, rawNotlar) => {
  if (explicitFaturaNo !== undefined) {
    return String(explicitFaturaNo || '').trim().slice(0, 80) || null;
  }
  return extractFaturaFromNotlar(rawNotlar);
};

const normalizeBelgeUrl = (raw) => String(raw || '').trim() || null;

const validateCalendarDate = (tarih) => {
  const gun = tarihStr(tarih);
  if (!gun) throw new AppError(400, 'INVALID_DATE', 'Geçersiz tarih formatı.');
  if (ileriTarihMi(tarih)) throw new AppError(400, 'FUTURE_DATE', 'İleri tarihli kayıt girilemez.');
  return gun;
};

const createYakitTx = async (client, actor, input) => {
  const { arac_id: aracId, yakit_tipi, tarih, litre, tutar, km, notlar } = input;
  const gun = validateCalendarDate(tarih);
  const sayisalKm = km !== undefined && km !== '' && km !== null ? Number(km) : null;
  const notlarDegeri = notlar || null;
  const faturaNo = resolveFaturaNo(input.fatura_no, notlarDegeri);
  const belgeUrl = normalizeBelgeUrl(input.belge_url);
  const olusturanUserId = actor?.user_id || null;

  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const ownership = await client.query(
    `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
    [aracId, ...params]
  );
  if (ownership.rowCount === 0) {
    throw new AppError(403, null, 'Bu aracı duzenlemek icin yetkiniz yoktur.');
  }

  const [hedefArac] = await araclariKilitle(client, [aracId]);
  if (!hedefArac) {
    throw new AppError(403, null, 'Bu aracı duzenlemek icin yetkiniz yoktur.');
  }
  assertNotArchived(hedefArac, 'yakıt kaydı');
  await assertOdometerChronology(client, {
    aracId,
    tarih: gun,
    deger: sayisalKm,
    sayacTipi: hedefArac.sayac_tipi,
  });

  const inserted = await client.query(
    `INSERT INTO yakitlar (arac_id, yakit_tipi, tarih, litre, tutar, km, notlar, fatura_no, belge_url, olusturan_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      aracId,
      yakit_tipi || null,
      gun,
      litre,
      tutar,
      sayisalKm,
      notlarDegeri,
      faturaNo,
      belgeUrl,
      olusturanUserId,
    ]
  );

  await syncVehicleOdometer(client, { aracId, sayacTipi: hedefArac.sayac_tipi, km: sayisalKm });
  const row = inserted.rows[0];
  return { row, anomalyCtx: { yakitId: row.yakit_id, mode: 'create' }, auditCtx: null };
};

const updateYakitTx = async (client, actor, input) => {
  const yakitId = Number(input.yakitId ?? input.yakit_id);
  const { arac_id, yakit_tipi, tarih, litre, tutar, km, notlar } = input;
  const gun = validateCalendarDate(tarih);
  const sayisalKm = km !== undefined && km !== '' && km !== null ? Number(km) : null;

  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const existingQ = await client.query(
    `SELECT y.yakit_id, y.arac_id, y.km, y.fatura_no, y.belge_url
     FROM yakitlar y
     INNER JOIN araclar a ON y.arac_id = a.arac_id
     WHERE y.yakit_id = $1 AND (${clause})
     FOR UPDATE OF y`,
    [yakitId, ...params]
  );
  if (existingQ.rowCount === 0) {
    throw new AppError(404, null, 'Yakit kaydi bulunamadi veya yetkiniz yok.');
  }

  const existing = existingQ.rows[0];
  const kaynakAracId = Number(existing.arac_id);
  const eskiKm = existing.km;
  const mevcutFaturaNo = existing.fatura_no || null;
  const mevcutBelgeUrl = existing.belge_url || null;
  const hedefAracId = Number(arac_id || kaynakAracId);
  if (!Number.isInteger(hedefAracId) || hedefAracId <= 0) {
    throw new AppError(400, null, 'Geçersiz araç kimliği.');
  }

  const hedefCheck = await client.query(
    `SELECT a.arac_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
    [hedefAracId, ...params]
  );
  if (hedefCheck.rowCount === 0) {
    throw new AppError(403, null, 'Hedef araca erişim yetkiniz yoktur.');
  }

  const kilitler = await araclariKilitle(client, [kaynakAracId, hedefAracId]);
  const hedefArac = kilitler.find((a) => Number(a.arac_id) === hedefAracId);
  const kaynakArac = kilitler.find((a) => Number(a.arac_id) === kaynakAracId);
  if (!hedefArac) {
    throw new AppError(403, null, 'Hedef araca erişim yetkiniz yoktur.');
  }
  assertNotArchived(kilitler, 'yakıt kaydı', 'güncellenemez');

  if (kaynakAracId !== hedefAracId && kaynakArac && kaynakArac.sayac_tipi !== hedefArac.sayac_tipi) {
    throw new AppError(
      422,
      'SAYAC_TIPI_UYUSMAZ',
      'Kayıt farklı sayaç tipindeki (KM/SMH) bir araca taşınamaz.',
      { sayac_tipi: hedefArac.sayac_tipi, birim: sayacBirimi(hedefArac.sayac_tipi) }
    );
  }

  await assertOdometerChronology(client, {
    aracId: hedefAracId,
    tarih: gun,
    deger: sayisalKm,
    sayacTipi: hedefArac.sayac_tipi,
    haricTablo: 'yakitlar',
    haricId: yakitId,
  });

  const notlarDegeri = notlar || null;
  const faturaNo = input.fatura_no !== undefined
    ? resolveFaturaNo(input.fatura_no, notlarDegeri)
    : (extractFaturaFromNotlar(notlarDegeri) ?? mevcutFaturaNo);
  const belgeUrl = input.belge_url !== undefined ? normalizeBelgeUrl(input.belge_url) : mevcutBelgeUrl;

  const updated = await client.query(
    `UPDATE yakitlar
     SET arac_id = $1, yakit_tipi = $2, tarih = $3, litre = $4, tutar = $5,
         km = $6, notlar = $7, fatura_no = $8, belge_url = $9
     WHERE yakit_id = $10
     RETURNING *`,
    [
      hedefAracId,
      yakit_tipi || null,
      gun,
      litre,
      tutar,
      sayisalKm,
      notlarDegeri,
      faturaNo,
      belgeUrl,
      yakitId,
    ]
  );

  await aracSayaciniSenkronizeEt(client, {
    aracId: hedefAracId,
    eskiKm: kaynakAracId === hedefAracId ? eskiKm : null,
  });
  if (kaynakAracId !== hedefAracId) {
    await aracSayaciniSenkronizeEt(client, { aracId: kaynakAracId, eskiKm });
  }

  return { row: updated.rows[0], anomalyCtx: { yakitId, mode: 'update' }, auditCtx: null };
};

const deleteYakitTx = async (client, actor, input) => {
  const yakitId = Number(input.yakitId ?? input.yakit_id);
  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const yakitCheck = await client.query(
    `SELECT y.yakit_id, y.arac_id, y.km, a.plaka, a.org_id, y.tarih, y.litre, y.tutar
     FROM yakitlar y
     INNER JOIN araclar a ON y.arac_id = a.arac_id
     WHERE y.yakit_id = $1 AND (${clause})
     FOR UPDATE OF y`,
    [yakitId, ...params]
  );
  if (yakitCheck.rowCount === 0) {
    throw new AppError(404, null, 'Yakit kaydi bulunamadi');
  }

  const row = yakitCheck.rows[0];
  const aracId = Number(row.arac_id);
  const [hedefArac] = await araclariKilitle(client, [aracId]);
  assertNotArchived(hedefArac, 'yakıt kaydı', 'silinemez');

  await client.query('DELETE FROM yakitlar WHERE yakit_id = $1', [yakitId]);
  await aracSayaciniSenkronizeEt(client, { aracId, eskiKm: row.km });

  return {
    row,
    anomalyCtx: null,
    auditCtx: {
      eylem: 'YAKIT_SILINDI',
      varlik_tipi: 'yakit',
      varlik_id: yakitId,
      org_id: row.org_id,
      ozet: `${row.plaka} plakalı aracın ${row.tarih} tarihli yakıt kaydı silindi.`,
      detay: { plaka: row.plaka, tarih: row.tarih, litre: row.litre, tutar: row.tutar },
    },
  };
};

module.exports = { createYakitTx, updateYakitTx, deleteYakitTx };
