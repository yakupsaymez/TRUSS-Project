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
const { bindSingleDocumentTx, softDeleteEntityDocumentsTx } = require('./docVaultService');

const PERIYODIK_SIFIRLAMA_HARITASI = {
  'Periyodik Bakım': [
    'Motor Yağı',
    'Yağ Filtresi',
    'Hava Filtresi',
    'Hava Filtresi (İç/Dış)',
    'Polen Filtresi',
    'Polen / Kabin Filtresi',
  ],
  'Yağ & Filtre Bakımı': [
    'Motor Yağı',
    'Yağ Filtresi',
    'Hava Filtresi',
    'Hava Filtresi (İç/Dış)',
    'Polen Filtresi',
    'Polen / Kabin Filtresi',
    'Yakıt / Su Ayırıcı Filtre',
  ],
};

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

const createBakimTx = async (client, actor, input) => {
  const { arac_id: aracId, bakim_tipi, tarih, km, maliyet, notlar, aciklama, sifirla_parcalar } = input;
  const gun = validateCalendarDate(tarih);
  const notlarDegeri = notlar || aciklama || null;
  const faturaNo = resolveFaturaNo(input.fatura_no, notlarDegeri);
  const belgeUrl = normalizeBelgeUrl(input.belge_url);
  const olusturanUserId = actor?.user_id || null;

  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const ownership = await client.query(
    `SELECT a.arac_id, a.org_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
    [aracId, ...params]
  );
  if (ownership.rowCount === 0) {
    throw new AppError(403, null, 'Bu aracı duzenlemek icin yetkiniz yoktur.');
  }

  const [hedefArac] = await araclariKilitle(client, [aracId]);
  if (!hedefArac) {
    throw new AppError(403, null, 'Bu aracı duzenlemek icin yetkiniz yoktur.');
  }
  assertNotArchived(hedefArac, 'bakım kaydı');
  await assertOdometerChronology(client, {
    aracId,
    tarih: gun,
    deger: km,
    sayacTipi: hedefArac.sayac_tipi,
  });

  const inserted = await client.query(
    `INSERT INTO bakimlar (arac_id, bakim_tipi, tarih, km, maliyet, notlar, fatura_no, belge_url, olusturan_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [aracId, bakim_tipi, gun, km, maliyet, notlarDegeri, faturaNo, belgeUrl, olusturanUserId]
  );

  const row = inserted.rows[0];
  await bindSingleDocumentTx(client, actor, {
    aracId,
    orgId: ownership.rows[0].org_id,
    varlikTipi: 'bakim',
    varlikId: row.bakim_id,
    nextKey: belgeUrl,
    prevKey: null,
  });

  const sifirlanacakParcalar = PERIYODIK_SIFIRLAMA_HARITASI[bakim_tipi] || null;
  if (sifirla_parcalar !== false && sifirlanacakParcalar) {
    await client.query(
      `UPDATE parca_takip
       SET son_degisim_km = $1,
           son_degisim_tarihi = $2
       WHERE arac_id = $3
         AND COALESCE(son_degisim_km, 0) <= $1
         AND parca_adi = ANY($4::text[])`,
      [km, gun, aracId, sifirlanacakParcalar]
    );
  }

  await syncVehicleOdometer(client, { aracId, sayacTipi: hedefArac.sayac_tipi, km });
  return { row, anomalyCtx: null, auditCtx: null };
};

const updateBakimTx = async (client, actor, input) => {
  const bakimId = Number(input.bakimId ?? input.bakim_id);
  const { arac_id, bakim_tipi, tarih, km, maliyet, notlar, aciklama } = input;
  const gun = validateCalendarDate(tarih);

  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const existingQ = await client.query(
    `SELECT b.bakim_id, b.arac_id, b.km, b.fatura_no, b.belge_url, a.org_id AS kaynak_org_id
     FROM bakimlar b
     INNER JOIN araclar a ON b.arac_id = a.arac_id
     WHERE b.bakim_id = $1 AND (${clause})
     FOR UPDATE OF b`,
    [bakimId, ...params]
  );
  if (existingQ.rowCount === 0) {
    throw new AppError(404, null, 'Bakim kaydi bulunamadi veya yetkiniz yok.');
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
    `SELECT a.arac_id, a.org_id FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
    [hedefAracId, ...params]
  );
  if (hedefCheck.rowCount === 0) {
    throw new AppError(403, null, 'Hedef araca erişim yetkiniz yoktur.');
  }
  const kaynakOrg = existing.kaynak_org_id;
  const hedefOrg = hedefCheck.rows[0].org_id;
  if (kaynakAracId !== hedefAracId && (kaynakOrg == null || hedefOrg == null || Number(kaynakOrg) !== Number(hedefOrg))) {
    throw new AppError(403, 'CROSS_TENANT_FORBIDDEN', 'Kayıt farklı bir organizasyonun aracına taşınamaz.');
  }

  const kilitler = await araclariKilitle(client, [kaynakAracId, hedefAracId]);
  const hedefArac = kilitler.find((a) => Number(a.arac_id) === hedefAracId);
  const kaynakArac = kilitler.find((a) => Number(a.arac_id) === kaynakAracId);
  if (!hedefArac) {
    throw new AppError(403, null, 'Hedef araca erişim yetkiniz yoktur.');
  }
  assertNotArchived(kilitler, 'bakım kaydı', 'güncellenemez');

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
    deger: km,
    sayacTipi: hedefArac.sayac_tipi,
    haricTablo: 'bakimlar',
    haricId: bakimId,
  });

  const notlarDegeri = notlar || aciklama || null;
  const faturaNo = input.fatura_no !== undefined
    ? resolveFaturaNo(input.fatura_no, notlarDegeri)
    : (extractFaturaFromNotlar(notlarDegeri) ?? mevcutFaturaNo);
  const belgeUrl = input.belge_url !== undefined ? normalizeBelgeUrl(input.belge_url) : mevcutBelgeUrl;

  const updated = await client.query(
    `UPDATE bakimlar
     SET arac_id = $1, bakim_tipi = $2, tarih = $3, km = $4, maliyet = $5,
         notlar = $6, fatura_no = $7, belge_url = $8
     WHERE bakim_id = $9
     RETURNING *`,
    [hedefAracId, bakim_tipi, gun, km, maliyet, notlarDegeri, faturaNo, belgeUrl, bakimId]
  );

  await aracSayaciniSenkronizeEt(client, {
    aracId: hedefAracId,
    eskiKm: kaynakAracId === hedefAracId ? eskiKm : null,
  });
  if (kaynakAracId !== hedefAracId) {
    await aracSayaciniSenkronizeEt(client, { aracId: kaynakAracId, eskiKm });
  }
  await bindSingleDocumentTx(client, actor, {
    aracId: hedefAracId,
    orgId: hedefCheck.rows[0].org_id,
    varlikTipi: 'bakim',
    varlikId: bakimId,
    nextKey: belgeUrl,
    prevKey: mevcutBelgeUrl,
    kaynakAracId,
  });

  return { row: updated.rows[0], anomalyCtx: null, auditCtx: null };
};

const deleteBakimTx = async (client, actor, input) => {
  const bakimId = Number(input.bakimId ?? input.bakim_id);
  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const bakimCheck = await client.query(
    `SELECT b.bakim_id, b.arac_id, b.km, a.plaka, a.org_id, b.bakim_tipi, b.tarih, b.maliyet
     FROM bakimlar b
     INNER JOIN araclar a ON b.arac_id = a.arac_id
     WHERE b.bakim_id = $1 AND (${clause})
     FOR UPDATE OF b`,
    [bakimId, ...params]
  );
  if (bakimCheck.rowCount === 0) {
    throw new AppError(404, null, 'Bakim kaydi bulunamadi');
  }

  const row = bakimCheck.rows[0];
  const aracId = Number(row.arac_id);
  const [hedefArac] = await araclariKilitle(client, [aracId]);
  assertNotArchived(hedefArac, 'bakım kaydı', 'silinemez');

  await softDeleteEntityDocumentsTx(client, { varlikTipi: 'bakim', varlikId: bakimId });
  await client.query('DELETE FROM bakimlar WHERE bakim_id = $1', [bakimId]);
  await aracSayaciniSenkronizeEt(client, { aracId, eskiKm: row.km });

  return {
    row,
    anomalyCtx: null,
    auditCtx: {
      eylem: 'BAKIM_SILINDI',
      varlik_tipi: 'bakim',
      varlik_id: bakimId,
      org_id: row.org_id,
      ozet: `${row.plaka} plakalı aracın ${row.tarih} tarihli bakım kaydı silindi.`,
      detay: { plaka: row.plaka, bakim_tipi: row.bakim_tipi, tarih: row.tarih, maliyet: row.maliyet },
    },
  };
};

module.exports = {
  PERIYODIK_SIFIRLAMA_HARITASI,
  createBakimTx,
  updateBakimTx,
  deleteBakimTx,
};
