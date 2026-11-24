import { toLocalIsoDate } from '@/utils/dateUtils';
import { formatLocaleNumber, formatTurkishPlate, parseLocaleNumber } from '@/utils/formatters';
import { parseSayacHatasi } from '@/utils/sayacHatasi';

export const MANUAL_OPTION = '__MANUAL__';
export const CURRENT_DEFAULT_YEAR = String(Math.min(2027, Math.max(1950, new Date().getFullYear())));

export function normalizeLocalIsoDate(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return toLocalIsoDate(parsed);
  }
  return str.slice(0, 10);
}

export function isHeavyEquipmentName(kategoriName) {
  const lower = String(kategoriName || '').toLocaleLowerCase('tr-TR');
  return lower.includes('iş makine') || lower.includes('is makine');
}

export function buildInitialForm(arac) {
  if (!arac) {
    return {
      plaka: '',
      kategori_id: null,
      kategori: 'Otomobil',
      marka_id: null,
      marka: '',
      model_id: null,
      model: '',
      varyant_id: null,
      yil: CURRENT_DEFAULT_YEAR,
      sayac_tipi: 'KM',
      guncel_sayac: '0',
      bakim_periyodu: '15000',
      triger_degisim_km: '',
      muayene_tarihi: '',
      sigorta_tarihi: '',
      kasko_tarihi: '',
    };
  }

  const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
  const mevcutSayac =
    arac.guncel_sayac ?? (isSmh ? arac.guncel_calisma_saati : arac.guncel_km) ?? 0;
  const mevcutPeriyot =
    (isSmh ? arac.calisma_saati_bakim : arac.onerilen_bakim_km) ||
    arac.bakim_periyodu ||
    (isSmh ? 250 : 15000);

  return {
    plaka: formatTurkishPlate(arac.plaka || ''),
    kategori_id: arac.kategori_id ? Number(arac.kategori_id) : null,
    kategori: arac.kategori || 'Otomobil',
    marka_id: null,
    marka: arac.marka || '',
    model_id: null,
    model: arac.model || '',
    varyant_id: arac.varyant_id ? Number(arac.varyant_id) : null,
    yil: arac.yil !== null && arac.yil !== undefined ? String(arac.yil) : CURRENT_DEFAULT_YEAR,
    sayac_tipi: isSmh ? 'SMH' : 'KM',
    guncel_sayac: formatLocaleNumber(mevcutSayac, 0),
    bakim_periyodu: formatLocaleNumber(mevcutPeriyot, 0),
    triger_degisim_km: arac.triger_degisim_km
      ? formatLocaleNumber(arac.triger_degisim_km, 0)
      : '',
    muayene_tarihi: normalizeLocalIsoDate(arac.muayene_tarihi),
    sigorta_tarihi: normalizeLocalIsoDate(arac.sigorta_tarihi),
    kasko_tarihi: normalizeLocalIsoDate(arac.kasko_tarihi),
  };
}

export function serializeFormForDirtyCheck(f) {
  return JSON.stringify({
    plaka: f.plaka,
    kategori_id: f.kategori_id ?? null,
    kategori: f.kategori,
    marka: f.marka,
    model: f.model,
    varyant_id: f.varyant_id ?? null,
    yil: f.yil,
    sayac_tipi: f.sayac_tipi,
    guncel_sayac: f.guncel_sayac,
    bakim_periyodu: f.bakim_periyodu,
    triger_degisim_km: f.triger_degisim_km,
    muayene_tarihi: f.muayene_tarihi,
    sigorta_tarihi: f.sigorta_tarihi,
    kasko_tarihi: f.kasko_tarihi,
  });
}

export function parseNonNegativeInteger(raw, { required = false } = {}) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return required ? { valid: false, value: null } : { valid: true, value: null };
  }
  const parsed = parseLocaleNumber(trimmed);
  if (parsed === null || !Number.isInteger(parsed) || parsed < 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value: parsed };
}

export function validateAndBuildVehiclePayload({ form, arac, isSmh, manualFlags }) {
  const errors = {};
  const formattedPlaka = formatTurkishPlate(form.plaka);
  if (!formattedPlaka) {
    errors.plaka = 'Plaka zorunludur.';
  } else if (formattedPlaka.length < 5 || formattedPlaka.length > 11) {
    errors.plaka = 'Plaka 5 ile 11 karakter arasında olmalıdır.';
  }

  const trimmedKategori = String(form.kategori || '').trim();
  if (!trimmedKategori) {
    errors.kategori = 'Kategori zorunludur.';
  }

  const trimmedMarka = String(form.marka || '').trim();
  if (trimmedMarka.length < 2) {
    errors.marka = 'Marka en az 2 karakter olmalıdır.';
  }

  const trimmedModel = String(form.model || '').trim();
  if (trimmedModel.length < 1) {
    errors.model = 'Model zorunludur.';
  }

  const parsedYil = Number(form.yil);
  if (
    !String(form.yil).trim() ||
    !Number.isInteger(parsedYil) ||
    parsedYil < 1950 ||
    parsedYil > 2027
  ) {
    errors.yil = 'Model yılı 1950 ile 2027 arasında bir tam sayı olmalıdır.';
  }

  const sayacRes = parseNonNegativeInteger(form.guncel_sayac, { required: true });
  if (!sayacRes.valid) {
    errors.guncel_sayac = 'Geçerli bir tam sayı (≥ 0) girin.';
  }

  const periyotRes = parseNonNegativeInteger(form.bakim_periyodu, { required: true });
  if (!periyotRes.valid) {
    errors.bakim_periyodu = 'Geçerli bir tam sayı (≥ 0) girin.';
  }

  const trigerRes = isSmh
    ? { valid: true, value: null }
    : parseNonNegativeInteger(form.triger_degisim_km, { required: false });
  if (!trigerRes.valid) {
    errors.triger_degisim_km = 'Geçerli bir tam sayı (≥ 0) girin.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, payload: null };
  }

  const { manualKategori, manualMarka, manualModel, manualVaryant } = manualFlags;
  const resolvedKategoriId = manualKategori
    ? null
    : form.kategori_id
      ? Number(form.kategori_id)
      : null;
  const resolvedVaryantId =
    manualKategori || manualMarka || manualModel || manualVaryant
      ? null
      : form.varyant_id
        ? Number(form.varyant_id)
        : null;

  return {
    errors: null,
    payload: {
      plaka: formattedPlaka,
      kategori_id: resolvedKategoriId,
      kategori: trimmedKategori || 'Otomobil',
      varyant_id: resolvedVaryantId,
      sayac_tipi: form.sayac_tipi,
      marka: trimmedMarka,
      model: trimmedModel,
      yil: parsedYil,
      guncel_km: isSmh ? Number(arac?.guncel_km || 0) : Number(sayacRes.value),
      guncel_calisma_saati: isSmh
        ? Number(sayacRes.value)
        : Number(arac?.guncel_calisma_saati || 0),
      onerilen_bakim_km: isSmh ? null : Number(periyotRes.value),
      calisma_saati_bakim: isSmh ? Number(periyotRes.value) : null,
      triger_degisim_km: !isSmh && trigerRes.value !== null ? Number(trigerRes.value) : null,
      muayene_tarihi: form.muayene_tarihi || null,
      sigorta_tarihi: form.sigorta_tarihi || null,
      kasko_tarihi: form.kasko_tarihi || null,
    },
  };
}

export function resolveSayac422Error(err, isSmh) {
  const parsed = parseSayacHatasi(err);
  const rawData =
    err?.response?.data && typeof err.response.data === 'object' ? err.response.data : {};
  const expectedBirim = isSmh ? 'saat' : 'km';

  if (parsed) {
    let ipucu = parsed.ipucu;
    if (ipucu && !rawData.sayac_tipi && !rawData.birim) {
      ipucu = ipucu.replace(/\b(km|saat)\b$/i, expectedBirim);
    }
    return { ...parsed, ipucu };
  }

  return {
    alanHatasi: rawData.message || 'Sayaç değeri geçersiz.',
    ipucu: null,
  };
}
