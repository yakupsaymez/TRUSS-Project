const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../db');
const { parseFuelCsv, normalizePlate } = require('../utils/csvFuelParser');
const { bugunTR, gunEkleTR } = require('../utils/dateUtils');
const {
  evalTankOverflowRule,
  evalConsecutiveFillRule,
  evalUnitPriceRule,
  evalHighConsumptionRule,
} = require('../services/fuelAnomalyRules');
const { buildVehicleAccessFilter, requirePermission } = require('../middlewares/rbacMiddleware');
const AppError = require('../utils/AppError');
const withTransaction = require('../utils/withTransaction');
const { assertNotArchived } = require('../utils/odometerGuard');

describe('FORGE Core Pure Tests (0-DB)', () => {
  it('csvFuelParser: plaka TR harfleri, birim sonekleri ve ADR-02 TR tarih', () => {
    assert.equal(normalizePlate('34 iıİ 123'), '34III123');
    assert.equal(normalizePlate('06-abc_45'), '06ABC45');

    const csv = [
      'Plaka;Tarih;Litre;Tutar;Kilometre',
      '34 iıİ 123;15.01.2026;45,50 L;1.950,25 TL;120.500',
      '06 abc 45;2026-01-16;50.00 LT;TRY 2000;121000',
    ].join('\n');

    const rows = parseFuelCsv(csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].plaka, '34III123');
    assert.equal(rows[0].tarih, '2026-01-15');
    assert.equal(rows[0].litre, 45.5);
    assert.equal(rows[0].tutar, 1950.25);
    assert.equal(rows[0].km, 120500);
    assert.equal(rows[0].neden_kodu, null);

    assert.equal(rows[1].plaka, '06ABC45');
    assert.equal(rows[1].tarih, '2026-01-16');
    assert.equal(rows[1].litre, 50);
    assert.equal(rows[1].tutar, 2000);
    assert.equal(rows[1].km, 121000);

    const yarin = gunEkleTR(bugunTR(), 1);
    const futureRows = parseFuelCsv(`plaka;tarih;litre;tutar\n34AAA01;${yarin};40;1600`);
    assert.equal(futureRows[0].neden_kodu, 'GELECEK_TARIH');
  });

  it('csvFuelParser: >1000 satirda 413 ve eksik baslikta 400 firlatir', () => {
    assert.throws(
      () => parseFuelCsv('plaka;tarih;litre\n34AAA01;2026-01-10;40'),
      (err) => err.status === 400 && err.code === 'CSV_MISSING_HEADERS'
    );

    const lines = ['plaka;tarih;litre;tutar'];
    for (let i = 0; i < 1001; i += 1) {
      lines.push('34AAA01;2026-01-10;10;400');
    }
    assert.throws(
      () => parseFuelCsv(lines.join('\n')),
      (err) => err.status === 413 && err.code === 'CSV_ROW_LIMIT_EXCEEDED'
    );
  });

  it('fuelAnomalyRules: 4 kural + 0/null korumalari', () => {
    assert.equal(evalTankOverflowRule({ plaka: '34A', depo: null, litre: 100 }), null);
    assert.equal(evalTankOverflowRule({ plaka: '34A', depo: 100, litre: 105 }), null);
    const overflow = evalTankOverflowRule({ plaka: '34A', depo: 100, litre: 106 });
    assert.equal(overflow.tip, 'depo_asimi');
    assert.equal(overflow.seviye, 'kritik');

    assert.equal(evalConsecutiveFillRule({ plaka: '34A', curTarih: '2026-01-10', curKm: 1000, prev: { tarih: '2026-01-10', km: 0 }, sayacTipi: 'KM' }), null);
    const consecCrit = evalConsecutiveFillRule({ plaka: '34A', curTarih: '2026-01-10', curKm: 1000, prev: { tarih: '2026-01-10', km: 1000 }, sayacTipi: 'KM' });
    assert.equal(consecCrit.tip, 'ardisik_dolum');
    assert.equal(consecCrit.seviye, 'kritik');
    const consecSmh = evalConsecutiveFillRule({ plaka: '34A', curTarih: '2026-01-11', curKm: 101, prev: { tarih: '2026-01-10', km: 100 }, sayacTipi: 'SMH' });
    assert.equal(consecSmh.seviye, 'uyari');

    assert.equal(evalUnitPriceRule({ plaka: '34A', litre: 0, tutar: 100, cnt: 5, ortBirimFiyat: 40 }), null);
    assert.equal(evalUnitPriceRule({ plaka: '34A', litre: 10, tutar: 500, cnt: 2, ortBirimFiyat: 40 }), null);
    const unitRes = evalUnitPriceRule({ plaka: '34A', litre: 10, tutar: 500, cnt: 3, ortBirimFiyat: 40 });
    assert.equal(unitRes.tip, 'birim_fiyat_sapma');

    assert.equal(evalHighConsumptionRule({ plaka: '34A', curKm: 100, prev: { km: 100 }, litre: 10, sayacTipi: 'KM', hedef: 8 }), null);
    const highGoal = evalHighConsumptionRule({ plaka: '34A', curKm: 200, prev: { km: 100 }, litre: 13, sayacTipi: 'KM', hedef: 8 });
    assert.equal(highGoal.tip, 'yuksek_tuketim');
    assert.equal(highGoal.seviye, 'kritik');
    const highAvg = evalHighConsumptionRule({ plaka: '34A', curKm: 200, prev: { km: 100 }, litre: 14, sayacTipi: 'KM', hedef: null, cnt: 3, ortTuketim: 10 });
    assert.equal(highAvg.tip, 'yuksek_tuketim');
  });

  it('rbacMiddleware: buildVehicleAccessFilter rolleri + requirePermission 0 ek DB sorgusu', async () => {
    assert.deepEqual(buildVehicleAccessFilter({ role: 'SYSTEM_ADMIN', org_id: 5 }, 2), { clause: 'a.org_id = $2', params: [5] });
    assert.deepEqual(buildVehicleAccessFilter({ role: 'SYSTEM_ADMIN', org_id: null }), { clause: '1=1', params: [] });
    assert.deepEqual(buildVehicleAccessFilter({ role: 'FLEET_MANAGER', org_id: 7, user_id: 9 }), { clause: 'a.org_id = $1', params: [7] });
    assert.deepEqual(buildVehicleAccessFilter({ role: 'FLEET_MANAGER', org_id: null, user_id: 9 }), { clause: 'a.kullanici_id = $1', params: [9] });
    const driverFilter = buildVehicleAccessFilter({ role: 'DRIVER', user_id: 12 }, 3);
    assert.match(driverFilter.clause, /asa\.sofor_user_id = \$3/);
    assert.deepEqual(driverFilter.params, [12]);

    const origQuery = pool.query;
    let queryCalls = 0;
    pool.query = async () => {
      queryCalls += 1;
      throw new Error('DB_SHOULD_NOT_BE_CALLED');
    };
    const makeRes = () => ({
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; },
    });

    try {
      const mw = requirePermission('yakit');
      let nextCalled = 0;
      await mw({ user: { user_id: 1, role: 'DRIVER', yetkiler: { yakit: true } } }, makeRes(), () => { nextCalled += 1; });
      assert.equal(nextCalled, 1);

      const deniedRes = makeRes();
      await mw({ user: { user_id: 2, role: 'DRIVER', yetkiler: { yakit: false } } }, deniedRes, () => { nextCalled += 1; });
      assert.equal(deniedRes.statusCode, 403);
      assert.equal(deniedRes.body.code, 'FORBIDDEN_PERMISSION');

      await mw({ user: { user_id: 3, role: 'FLEET_MANAGER', yetkiler: {} } }, makeRes(), () => { nextCalled += 1; });
      assert.equal(nextCalled, 2);
      assert.equal(queryCalls, 0);
    } finally {
      pool.query = origQuery;
    }
  });

  it('AppError.toBody ve assertNotArchived (409 VEHICLE_ARCHIVED)', () => {
    const err = new AppError(422, 'SAYAC_KRONOLOJI_IHLALI', 'Hata', { alt_sinir: 100, birim: 'km' });
    assert.deepEqual(err.toBody(), {
      code: 'SAYAC_KRONOLOJI_IHLALI',
      message: 'Hata',
      alt_sinir: 100,
      birim: 'km',
    });
    const noCode = new AppError(404, null, 'Yok');
    assert.deepEqual(noCode.toBody(), { message: 'Yok' });

    assert.doesNotThrow(() => assertNotArchived([{ arsivlendi_mi: false }]));
    assert.throws(
      () => assertNotArchived([{ arsivlendi_mi: false }, { arsivlendi_mi: true }], 'bakım kaydı', 'güncellenemez'),
      (e) => e instanceof AppError && e.statusCode === 409 && e.code === 'VEHICLE_ARCHIVED'
    );
  });

  it('withTransaction: normal AppError -> ROLLBACK + release() 0 arg; kirik ROLLBACK -> release(true) + orijinal hata', async () => {
    const makeMockPool = (failRollback) => {
      const calls = [];
      const mockClient = {
        async query(sql) {
          calls.push(`q:${sql}`);
          if (sql === 'ROLLBACK' && failRollback) throw new Error('ROLLBACK_BROKEN');
        },
        release(...args) {
          calls.push({ releaseArgs: args });
        },
      };
      return { calls, dbPool: { async connect() { return mockClient; } } };
    };

    const m1 = makeMockPool(false);
    const appErr = new AppError(422, 'TEST_ERR', 'Gecersiz');
    await assert.rejects(
      () => withTransaction(async () => { throw appErr; }, m1.dbPool),
      (e) => e === appErr
    );
    assert.deepEqual(m1.calls, ['q:BEGIN', 'q:ROLLBACK', { releaseArgs: [] }]);

    const m2 = makeMockPool(true);
    const origErr = new Error('ORIGINAL_FAILURE');
    await assert.rejects(
      () => withTransaction(async () => { throw origErr; }, m2.dbPool),
      (e) => e === origErr
    );
    assert.deepEqual(m2.calls, ['q:BEGIN', 'q:ROLLBACK', { releaseArgs: [true] }]);
  });

  it('ai-gate: ESM izolasyonu + 301-600 ratchet (411->412 FAIL, 405 shrinkable) + computeNextBaseline', async () => {
    const { evaluateLineRatchet, computeNextBaseline } = await import('../../scripts/ai-gate.mjs');
    assert.equal(typeof evaluateLineRatchet, 'function');
    assert.equal(typeof computeNextBaseline, 'function');

    const base = { 'Backend/controllers/parcaController.js': 411 };
    const rFail = evaluateLineRatchet({ 'Backend/controllers/parcaController.js': 412 }, base);
    assert.equal(rFail.status, 'FAIL');
    assert.equal(rFail.failures.length, 1);

    const rPass = evaluateLineRatchet({ 'Backend/controllers/parcaController.js': 411 }, base);
    assert.equal(rPass.status, 'PASS');
    assert.equal(rPass.failures.length, 0);

    const rShrink = evaluateLineRatchet({ 'Backend/controllers/parcaController.js': 405 }, base);
    assert.equal(rShrink.status, 'PASS');
    assert.equal(rShrink.shrinkHints.length, 1);

    const next1 = computeNextBaseline(
      { maxNewFileLines: 600, warnFileLines: 300, targetChunkKb: 450, maxChunkKb: 228, files: base },
      { 'Backend/controllers/parcaController.js': 415, 'Backend/foo.js': 350 }
    );
    assert.equal(next1.files['Backend/controllers/parcaController.js'], 411);
    assert.equal(next1.files['Backend/foo.js'], 350);

    const next2 = computeNextBaseline(next1, {
      'Backend/controllers/parcaController.js': 411,
      'Backend/foo.js': 300,
    });
    assert.equal(Object.prototype.hasOwnProperty.call(next2.files, 'Backend/foo.js'), false);
    assert.equal(next2.files['Backend/controllers/parcaController.js'], 411);
  });
});
