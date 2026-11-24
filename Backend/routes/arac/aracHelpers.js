const pool = require('../../db');
const Joi = require('joi');

// Araç tipine, yakıt türüne ve varyant periyoduna göre dinamik parça şablonu üretir
const olusturDinamikParcaSablonu = ({
  yakitTipi,
  kategoriAdi,
  sayacTipi,
  onerilenBakimKm,
  trigerDegisimKm,
  calismaSaatiBakim,
}) => {
  const normalizedYakit = String(yakitTipi || '').toLocaleLowerCase('tr-TR');
  const normalizedKategori = String(kategoriAdi || '').toLocaleLowerCase('tr-TR');
  const isElektrik =
    normalizedYakit.includes('elektrik') || normalizedKategori.includes('elektrik');
  const isIsMakinesi =
    sayacTipi === 'SMH' ||
    Boolean(calismaSaatiBakim) ||
    normalizedKategori.includes('iş makine') ||
    normalizedKategori.includes('is makine');
  const isAgirVasita =
    normalizedKategori.includes('ağır vasıta') || normalizedKategori.includes('agir vasita');

  // 1. İŞ MAKİNESİ (Çalışma Saati - SMH Bazlı Endüstriyel Şablon)
  if (isIsMakinesi) {
    const saatPeriyot = Number(calismaSaatiBakim) > 0 ? Number(calismaSaatiBakim) : 250;
    return [
      { parca_adi: 'Motor Yağı', degisim_araligi_km: saatPeriyot },
      { parca_adi: 'Yağ Filtresi', degisim_araligi_km: saatPeriyot },
      { parca_adi: 'Hidrolik Yağ & Filtre', degisim_araligi_km: saatPeriyot * 2 },
      { parca_adi: 'Hava Filtresi (İç/Dış)', degisim_araligi_km: saatPeriyot },
      { parca_adi: 'Yakıt / Su Ayırıcı Filtre', degisim_araligi_km: saatPeriyot },
      { parca_adi: 'Şanzıman / Cer Yağı', degisim_araligi_km: saatPeriyot * 4 },
      { parca_adi: 'Akü', degisim_araligi_km: null },
      { parca_adi: 'Lastikler / Palet Takımı', degisim_araligi_km: null },
    ];
  }

  // 2. ELEKTRİKLİ ARAÇ (EV - Motor Yağı, Yağ Filtresi ve Triger Kayışı YOK)
  if (isElektrik) {
    const evBakimKm = Number(onerilenBakimKm) > 0 ? Number(onerilenBakimKm) : 20000;
    return [
      { parca_adi: 'Polen / Kabin Filtresi', degisim_araligi_km: evBakimKm },
      { parca_adi: 'Fren Balataları', degisim_araligi_km: 40000 },
      { parca_adi: 'Fren Hidroliği', degisim_araligi_km: evBakimKm * 2 },
      { parca_adi: 'Batarya Soğutma Sıvısı', degisim_araligi_km: evBakimKm * 4 },
      { parca_adi: '12V Yardımcı Akü', degisim_araligi_km: null },
      { parca_adi: 'Lastikler', degisim_araligi_km: null },
    ];
  }

  // 3. AĞIR VASITA / BİNEK / SUV / TİCARİ (İçten Yanmalı & Hibrit)
  const bakimKm =
    Number(onerilenBakimKm) > 0
      ? Number(onerilenBakimKm)
      : isAgirVasita
        ? 60000
        : 15000;

  const frenBalataKm = isAgirVasita ? 100000 : 30000;

  const parcalar = [
    { parca_adi: 'Motor Yağı', degisim_araligi_km: bakimKm },
    { parca_adi: 'Yağ Filtresi', degisim_araligi_km: bakimKm },
    { parca_adi: 'Hava Filtresi', degisim_araligi_km: bakimKm },
    { parca_adi: 'Polen Filtresi', degisim_araligi_km: bakimKm },
    { parca_adi: 'Fren Balataları', degisim_araligi_km: frenBalataKm },
    { parca_adi: 'Akü', degisim_araligi_km: null },
    { parca_adi: 'Lastikler', degisim_araligi_km: null },
  ];

  // Triger kayışı/zinciri yalnızca varyantta tanımlıysa veya standart binek/ticari ise eklenir
  if (trigerDegisimKm !== null) {
    const trigerKm =
      Number(trigerDegisimKm) > 0
        ? Number(trigerDegisimKm)
        : isAgirVasita
          ? 300000
          : 90000;
    parcalar.splice(5, 0, { parca_adi: 'Triger Kayışı', degisim_araligi_km: trigerKm });
  }

  return parcalar;
};

// Merkezi Araç Gümrük Kuralları
const aracSchema = Joi.object({
  plaka: Joi.string().min(5).max(11).required(),
  kategori_id: Joi.number().integer().optional().allow(null, ''),
  kategori: Joi.string().max(100).optional().allow(null, ''),
  marka: Joi.string().min(2).required(),
  model: Joi.string().min(1).required(),
  yil: Joi.number().integer().min(1950).max(2027).required(),
  guncel_km: Joi.number().integer().min(0).max(2147483647).optional().allow(null, ''),
  guncel_calisma_saati: Joi.number().integer().min(0).max(2147483647).optional().allow(null, ''),
  sayac_tipi: Joi.string().valid('KM', 'SMH').optional().allow(null, ''),
  varyant_id: Joi.number().integer().positive().optional().allow(null, ''),
  onerilen_bakim_km: Joi.number().integer().min(0).optional().allow(null, ''),
  triger_degisim_km: Joi.number().integer().min(0).optional().allow(null, ''),
  calisma_saati_bakim: Joi.number().integer().min(0).optional().allow(null, ''),
  muayene_tarihi: Joi.date().iso().raw().optional().allow(null, ''),
  kasko_tarihi: Joi.date().iso().raw().optional().allow(null, ''),
  sigorta_tarihi: Joi.date().iso().raw().optional().allow(null, ''),
});

// Varyant bilgilerini veritabanından çözüp eksik bakım periyotlarını tamamlar
const cozumleVaryantBilgileri = async (client, {
  varyant_id,
  onerilen_bakim_km,
  triger_degisim_km,
  calisma_saati_bakim,
}) => {
  let varyantRow = null;
  if (varyant_id) {
    const vRes = await client.query(
      `SELECT varyant_id, yakit_tipi, onerilen_bakim_km, triger_degisim_km, calisma_saati_bakim
       FROM ref_arac_varyantlari
       WHERE varyant_id = $1
       LIMIT 1`,
      [Number(varyant_id)]
    );
    varyantRow = vRes.rows[0] || null;
  }

  const cozulmusBakimKm =
    onerilen_bakim_km !== undefined && onerilen_bakim_km !== '' && onerilen_bakim_km !== null
      ? Number(onerilen_bakim_km)
      : varyantRow?.onerilen_bakim_km ?? null;

  const cozulmusTrigerKm =
    triger_degisim_km !== undefined && triger_degisim_km !== '' && triger_degisim_km !== null
      ? Number(triger_degisim_km)
      : varyantRow
        ? varyantRow.triger_degisim_km
        : undefined;

  const cozulmusCalismaSaatiBakim =
    calisma_saati_bakim !== undefined && calisma_saati_bakim !== '' && calisma_saati_bakim !== null
      ? Number(calisma_saati_bakim)
      : varyantRow?.calisma_saati_bakim ?? null;

  return {
    varyantId: varyantRow ? varyantRow.varyant_id : varyant_id ? Number(varyant_id) : null,
    yakitTipi: varyantRow?.yakit_tipi || null,
    onerilenBakimKm: cozulmusBakimKm,
    trigerDegisimKm: cozulmusTrigerKm === undefined ? null : cozulmusTrigerKm,
    trigerDegisimKmRaw: cozulmusTrigerKm,
    calismaSaatiBakim: cozulmusCalismaSaatiBakim,
  };
};

let locationColsEnsured = false;
const ensureLocationColumns = async () => {
  if (locationColsEnsured) return;
  await pool.query(`
    ALTER TABLE araclar
      ADD COLUMN IF NOT EXISTS son_enlem NUMERIC(9, 6),
      ADD COLUMN IF NOT EXISTS son_boylam NUMERIC(9, 6),
      ADD COLUMN IF NOT EXISTS son_konum_adi VARCHAR(160),
      ADD COLUMN IF NOT EXISTS son_konum_zamani TIMESTAMPTZ
  `);
  locationColsEnsured = true;
};

module.exports = {
  olusturDinamikParcaSablonu,
  aracSchema,
  cozumleVaryantBilgileri,
  ensureLocationColumns,
};
