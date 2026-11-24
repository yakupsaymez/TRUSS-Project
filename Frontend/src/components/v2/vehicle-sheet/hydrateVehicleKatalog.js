import katalogService from '@/services/katalogService';
import { formatLocaleNumber } from '@/utils/formatters';

export const INITIAL_MANUAL = {
  manualKategori: false,
  manualMarka: false,
  manualModel: false,
  manualVaryant: false,
};

export const ALL_MANUAL = {
  manualKategori: true,
  manualMarka: true,
  manualModel: true,
  manualVaryant: true,
};

export function buildVaryantCalibrationPatch(selectedVaryant) {
  const hasSmhInterval = Number(selectedVaryant.calisma_saati_bakim) > 0;
  const nextSayacTipi = hasSmhInterval ? 'SMH' : 'KM';
  const rawPeriyot = hasSmhInterval
    ? Number(selectedVaryant.calisma_saati_bakim)
    : Number(selectedVaryant.onerilen_bakim_km) || 15000;
  const rawTriger =
    !hasSmhInterval && Number(selectedVaryant.triger_degisim_km) > 0
      ? formatLocaleNumber(Number(selectedVaryant.triger_degisim_km), 0)
      : '';

  return {
    varyant_id: Number(selectedVaryant.varyant_id),
    sayac_tipi: nextSayacTipi,
    bakim_periyodu: formatLocaleNumber(rawPeriyot, 0),
    triger_degisim_km: rawTriger,
  };
}

function sameTrText(a, b) {
  return String(a || '').toLocaleLowerCase('tr-TR') === String(b || '').toLocaleLowerCase('tr-TR');
}

export default async function hydrateVehicleKatalog({ arac, nextForm, isStale }) {
  const katList = await katalogService.getKategoriler();
  if (isStale()) return null;

  if (!arac) {
    const defaultKat =
      katList.find((k) => sameTrText(k.ad, nextForm.kategori || 'Otomobil')) || katList[0] || null;

    if (!defaultKat) {
      return {
        kategoriler: katList,
        markalar: [],
        modeller: [],
        varyantlar: [],
        manualFlags: ALL_MANUAL,
        resolvedForm: null,
      };
    }

    const resolvedKatId = Number(defaultKat.kategori_id);
    const resolvedForm = {
      ...nextForm,
      kategori_id: resolvedKatId,
      kategori: defaultKat.ad,
    };

    const markaList = await katalogService.getMarkalar(resolvedKatId);
    if (isStale()) return null;

    return {
      kategoriler: katList,
      markalar: markaList,
      modeller: [],
      varyantlar: [],
      manualFlags: INITIAL_MANUAL,
      resolvedForm,
    };
  }

  // Düzenleme modu: arac.kategori_id / arac.kategori -> arac.marka -> arac.model -> arac.varyant_id eşleştir
  const matchedKat =
    (arac.kategori_id
      ? katList.find((k) => Number(k.kategori_id) === Number(arac.kategori_id))
      : null) ||
    katList.find((k) => sameTrText(k.ad, arac.kategori)) ||
    null;

  if (!matchedKat) {
    return {
      kategoriler: katList,
      markalar: [],
      modeller: [],
      varyantlar: [],
      manualFlags: ALL_MANUAL,
      resolvedForm: null,
    };
  }

  const resolvedKatId = Number(matchedKat.kategori_id);
  const markaList = await katalogService.getMarkalar(resolvedKatId);
  if (isStale()) return null;

  const matchedMarka = markaList.find((m) => sameTrText(m.ad, arac.marka)) || null;
  if (!matchedMarka) {
    return {
      kategoriler: katList,
      markalar: markaList,
      modeller: [],
      varyantlar: [],
      manualFlags: {
        manualKategori: false,
        manualMarka: true,
        manualModel: true,
        manualVaryant: true,
      },
      resolvedForm: {
        ...nextForm,
        kategori_id: resolvedKatId,
        kategori: matchedKat.ad,
      },
    };
  }

  const resolvedMarkaId = Number(matchedMarka.marka_id);
  const modelList = await katalogService.getModeller(resolvedMarkaId, resolvedKatId);
  if (isStale()) return null;

  const matchedModel = modelList.find((mod) => sameTrText(mod.ad, arac.model)) || null;
  if (!matchedModel) {
    return {
      kategoriler: katList,
      markalar: markaList,
      modeller: modelList,
      varyantlar: [],
      manualFlags: {
        manualKategori: false,
        manualMarka: false,
        manualModel: true,
        manualVaryant: true,
      },
      resolvedForm: {
        ...nextForm,
        kategori_id: resolvedKatId,
        kategori: matchedKat.ad,
        marka_id: resolvedMarkaId,
        marka: matchedMarka.ad,
      },
    };
  }

  const resolvedModelId = Number(matchedModel.model_id);
  const varyantList = await katalogService.getVaryantlar(resolvedModelId);
  if (isStale()) return null;

  const matchedVaryant = arac.varyant_id
    ? varyantList.find((v) => Number(v.varyant_id) === Number(arac.varyant_id)) || null
    : null;

  return {
    kategoriler: katList,
    markalar: markaList,
    modeller: modelList,
    varyantlar: varyantList,
    manualFlags: {
      manualKategori: false,
      manualMarka: false,
      manualModel: false,
      manualVaryant: !matchedVaryant,
    },
    resolvedForm: {
      ...nextForm,
      kategori_id: resolvedKatId,
      kategori: matchedKat.ad,
      marka_id: resolvedMarkaId,
      marka: matchedMarka.ad,
      model_id: resolvedModelId,
      model: matchedModel.ad,
      varyant_id: matchedVaryant ? Number(matchedVaryant.varyant_id) : null,
    },
  };
}
