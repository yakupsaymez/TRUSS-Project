import { useCallback, useRef, useState } from 'react';
import katalogService from '@/services/katalogService';
import hydrateVehicleKatalog, {
  ALL_MANUAL,
  INITIAL_MANUAL,
  buildVaryantCalibrationPatch,
} from './hydrateVehicleKatalog';
import { MANUAL_OPTION, isHeavyEquipmentName } from './vehicleSheetHelpers';

export default function useVehicleKatalog({
  form,
  setForm,
  isEditMode,
  clearFieldError,
  setSayacHatasi,
}) {
  const [kategoriler, setKategoriler] = useState([]);
  const [markalar, setMarkalar] = useState([]);
  const [modeller, setModeller] = useState([]);
  const [varyantlar, setVaryantlar] = useState([]);
  const [loadingKatalog, setLoadingKatalog] = useState(false);
  const [manualFlags, setManualFlags] = useState(INITIAL_MANUAL);

  // Yarış koşulu (stale response) önleyici sayaçlar
  const initRequestIdRef = useRef(0);
  const markaRequestIdRef = useRef(0);
  const modelRequestIdRef = useRef(0);
  const varyantRequestIdRef = useRef(0);

  const patchManual = useCallback((patch) => {
    setManualFlags((prev) => ({ ...prev, ...patch }));
  }, []);

  const invalidateDropdownRequests = useCallback(
    ({ marka = false, model = false, varyant = false }) => {
      if (marka) markaRequestIdRef.current += 1;
      if (model) modelRequestIdRef.current += 1;
      if (varyant) varyantRequestIdRef.current += 1;
    },
    []
  );

  const hydrateForOpen = useCallback(
    async ({ arac, nextForm, onResolvedForm }) => {
      const currentInitId = ++initRequestIdRef.current;
      const isStale = () => initRequestIdRef.current !== currentInitId;
      invalidateDropdownRequests({ marka: true, model: true, varyant: true });
      setMarkalar([]);
      setModeller([]);
      setVaryantlar([]);
      setLoadingKatalog(true);

      try {
        const result = await hydrateVehicleKatalog({ arac, nextForm, isStale });
        if (!result || isStale()) return;

        setKategoriler(result.kategoriler);
        setMarkalar(result.markalar);
        setModeller(result.modeller);
        setVaryantlar(result.varyantlar);
        setManualFlags(result.manualFlags);

        if (result.resolvedForm) {
          onResolvedForm(result.resolvedForm);
        }
      } catch (_err) {
        if (isStale()) return;
        setManualFlags(ALL_MANUAL);
      } finally {
        if (!isStale()) {
          setLoadingKatalog(false);
        }
      }
    },
    [invalidateDropdownRequests]
  );

  // 1. Kademe: Kategori Seçimi
  const handleKategoriSelect = async (val) => {
    clearFieldError('kategori');
    clearFieldError('marka');
    clearFieldError('model');

    if (val === MANUAL_OPTION) {
      invalidateDropdownRequests({ marka: true, model: true, varyant: true });
      setManualFlags(ALL_MANUAL);
      setMarkalar([]);
      setModeller([]);
      setVaryantlar([]);
      setForm((prev) => ({
        ...prev,
        kategori_id: null,
        kategori: prev.kategori || '',
        marka_id: null,
        model_id: null,
        varyant_id: null,
      }));
      return;
    }

    const katId = Number(val);
    const selectedKat = kategoriler.find((k) => Number(k.kategori_id) === katId);
    const katAd = selectedKat?.ad || 'Otomobil';
    const nextIsSmh = !isEditMode && isHeavyEquipmentName(katAd);

    invalidateDropdownRequests({ model: true, varyant: true });
    setManualFlags(INITIAL_MANUAL);
    setMarkalar([]);
    setModeller([]);
    setVaryantlar([]);

    setForm((prev) => ({
      ...prev,
      kategori_id: katId,
      kategori: katAd,
      marka_id: null,
      marka: '',
      model_id: null,
      model: '',
      varyant_id: null,
      ...(nextIsSmh
        ? { sayac_tipi: 'SMH', bakim_periyodu: '250', triger_degisim_km: '' }
        : !isEditMode
          ? { sayac_tipi: 'KM', bakim_periyodu: '15000' }
          : {}),
    }));

    const reqId = ++markaRequestIdRef.current;
    try {
      const list = await katalogService.getMarkalar(katId);
      if (markaRequestIdRef.current !== reqId) return;
      setMarkalar(list);
      if (list.length === 0) {
        patchManual({ manualMarka: true, manualModel: true, manualVaryant: true });
      }
    } catch (_err) {
      if (markaRequestIdRef.current !== reqId) return;
      patchManual({ manualMarka: true, manualModel: true, manualVaryant: true });
    }
  };

  // 2. Kademe: Marka Seçimi
  const handleMarkaSelect = async (val) => {
    clearFieldError('marka');
    clearFieldError('model');

    if (val === MANUAL_OPTION) {
      invalidateDropdownRequests({ model: true, varyant: true });
      patchManual({ manualMarka: true, manualModel: true, manualVaryant: true });
      setModeller([]);
      setVaryantlar([]);
      setForm((prev) => ({
        ...prev,
        marka_id: null,
        marka: '',
        model_id: null,
        model: '',
        varyant_id: null,
      }));
      return;
    }

    const markaId = Number(val);
    const selectedMarka = markalar.find((m) => Number(m.marka_id) === markaId);
    const markaAd = selectedMarka?.ad || '';

    invalidateDropdownRequests({ varyant: true });
    patchManual({ manualMarka: false, manualModel: false, manualVaryant: false });
    setModeller([]);
    setVaryantlar([]);

    setForm((prev) => ({
      ...prev,
      marka_id: markaId,
      marka: markaAd,
      model_id: null,
      model: '',
      varyant_id: null,
    }));

    const reqId = ++modelRequestIdRef.current;
    try {
      const list = await katalogService.getModeller(markaId, form.kategori_id);
      if (modelRequestIdRef.current !== reqId) return;
      setModeller(list);
      if (list.length === 0) {
        patchManual({ manualModel: true, manualVaryant: true });
      }
    } catch (_err) {
      if (modelRequestIdRef.current !== reqId) return;
      patchManual({ manualModel: true, manualVaryant: true });
    }
  };

  // 3. Kademe: Model Seçimi
  const handleModelSelect = async (val) => {
    clearFieldError('model');

    if (val === MANUAL_OPTION) {
      invalidateDropdownRequests({ varyant: true });
      patchManual({ manualModel: true, manualVaryant: true });
      setVaryantlar([]);
      setForm((prev) => ({
        ...prev,
        model_id: null,
        model: '',
        varyant_id: null,
      }));
      return;
    }

    const modelId = Number(val);
    const selectedModel = modeller.find((m) => Number(m.model_id) === modelId);
    const modelAd = selectedModel?.ad || '';

    patchManual({ manualModel: false, manualVaryant: false });
    setVaryantlar([]);

    setForm((prev) => ({
      ...prev,
      model_id: modelId,
      model: modelAd,
      varyant_id: null,
    }));

    const reqId = ++varyantRequestIdRef.current;
    try {
      const list = await katalogService.getVaryantlar(modelId);
      if (varyantRequestIdRef.current !== reqId) return;
      setVaryantlar(list);
      if (list.length === 0) {
        patchManual({ manualVaryant: true });
      }
    } catch (_err) {
      if (varyantRequestIdRef.current !== reqId) return;
      patchManual({ manualVaryant: true });
    }
  };

  // 4. Kademe: Varyant Seçimi (Otomatik Kalibrasyon)
  const handleVaryantSelect = (val) => {
    if (val === MANUAL_OPTION) {
      patchManual({ manualVaryant: true });
      setForm((prev) => ({ ...prev, varyant_id: null }));
      return;
    }

    const varyantId = Number(val);
    const selectedVaryant = varyantlar.find((v) => Number(v.varyant_id) === varyantId);
    if (!selectedVaryant) return;

    patchManual({ manualVaryant: false });
    const calibrationPatch = buildVaryantCalibrationPatch(selectedVaryant);

    setForm((prev) => ({
      ...prev,
      ...calibrationPatch,
    }));

    setSayacHatasi(null);
    clearFieldError('sayac_tipi');
    clearFieldError('bakim_periyodu');
    clearFieldError('triger_degisim_km');
  };

  const { manualKategori, manualMarka, manualModel, manualVaryant } = manualFlags;

  return {
    kategoriler,
    markalar,
    modeller,
    varyantlar,
    loadingKatalog,
    manualKategori,
    manualMarka,
    manualModel,
    manualVaryant,
    manualFlags,
    kategoriSelectValue: manualKategori
      ? MANUAL_OPTION
      : form.kategori_id
        ? String(form.kategori_id)
        : '',
    markaSelectValue: manualMarka ? MANUAL_OPTION : form.marka_id ? String(form.marka_id) : '',
    modelSelectValue: manualModel ? MANUAL_OPTION : form.model_id ? String(form.model_id) : '',
    varyantSelectValue: manualVaryant
      ? MANUAL_OPTION
      : form.varyant_id
        ? String(form.varyant_id)
        : '',
    hydrateForOpen,
    handleKategoriSelect,
    handleMarkaSelect,
    handleModelSelect,
    handleVaryantSelect,
  };
}
