import katalogService from '@/services/katalogService';

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
        manualFlags: {
          manualKategori: true,
          manualMarka: true,
          manualModel: true,
          manualVaryant: true,
        },
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
      manualFlags: {
        manualKategori: false,
        manualMarka: false,
        manualModel: false,
        manualVaryant: false,
      },
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
      manualFlags: {
        manualKategori: true,
        manualMarka: true,
        manualModel: true,
        manualVaryant: true,
      },
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
