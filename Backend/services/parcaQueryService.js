const pool = require('../db');
const AppError = require('../utils/AppError');
const { buildVehicleAccessFilter } = require('../middlewares/rbacMiddleware');
const { hasFinanceAccess } = require('./docVaultHelpers');

const PARCA_SELECT_COLUMNS = `
  p.parca_id,
  p.arac_id,
  p.parca_adi,
  p.son_degisim_km,
  p.degisim_araligi_km,
  p.son_degisim_tarihi,
  p.maliyet,
  p.notlar,
  a.plaka,
  a.marka,
  a.model,
  a.sayac_tipi,
  GREATEST(
    COALESCE(CASE WHEN a.sayac_tipi = 'SMH' THEN a.guncel_calisma_saati ELSE a.guncel_km END, 0),
    COALESCE((SELECT MAX(km) FROM bakimlar WHERE arac_id = a.arac_id), 0),
    COALESCE((SELECT MAX(km) FROM yakitlar WHERE arac_id = a.arac_id), 0)
  ) AS guncel_km
`;

const maskParcaRows = (actor, rows) =>
  hasFinanceAccess(actor) ? rows : rows.map((row) => ({ ...row, maliyet: null }));

const listParcalar = async (db, actor) => {
  const executor = db || pool;
  const { clause, params } = buildVehicleAccessFilter(actor);
  const result = await executor.query(
    `SELECT ${PARCA_SELECT_COLUMNS}
     FROM parca_takip p
     INNER JOIN araclar a ON a.arac_id = p.arac_id
     WHERE (${clause}) AND a.arsivlendi_mi = FALSE
     ORDER BY a.plaka ASC, p.parca_adi ASC`,
    params
  );
  return { parcalar: maskParcaRows(actor, result.rows) };
};

const listParcalarByArac = async (db, actor, aracIdInput) => {
  const executor = db || pool;
  const aracId = Number(aracIdInput);
  if (!Number.isInteger(aracId) || aracId <= 0) {
    throw new AppError(400, null, 'Gecersiz arac id');
  }

  const { clause, params } = buildVehicleAccessFilter(actor, 2);
  const sahiplik = await executor.query(
    `SELECT 1 FROM araclar a WHERE a.arac_id = $1 AND (${clause})`,
    [aracId, ...params]
  );
  if (sahiplik.rowCount === 0) {
    throw new AppError(404, null, 'Arac bulunamadi');
  }

  const result = await executor.query(
    `SELECT ${PARCA_SELECT_COLUMNS}
     FROM parca_takip p
     INNER JOIN araclar a ON a.arac_id = p.arac_id
     WHERE p.arac_id = $1 AND (${clause})
     ORDER BY p.parca_adi ASC`,
    [aracId, ...params]
  );
  return { parcalar: maskParcaRows(actor, result.rows) };
};

module.exports = {
  listParcalar,
  listParcalarByArac,
};
