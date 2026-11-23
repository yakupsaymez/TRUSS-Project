import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import aracService from '@/services/aracService';
import katalogService from '@/services/katalogService';
import useVehicleStore from '@/store/useVehicleStore';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { toLocalIsoDate } from '@/utils/dateUtils';
import { formatLocaleNumber, formatTurkishPlate, parseLocaleNumber } from '@/utils/formatters';
import { parseSayacHatasi, sayacAria } from '@/utils/sayacHatasi';
import AppSheet, {
  SheetField,
  SheetFormGrid,
  SheetFormSection,
} from '@/components/v2/AppSheet';
import SayacFieldError from '@/components/v2/SayacFieldError';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { cn } from '@/lib/utils';

const MANUAL_OPTION = '__MANUAL__';
const CURRENT_DEFAULT_YEAR = String(Math.min(2027, Math.max(1950, new Date().getFullYear())));

function normalizeLocalIsoDate(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return toLocalIsoDate(parsed);
  }
  return str.slice(0, 10);
}

function isHeavyEquipmentName(kategoriName) {
  const lower = String(kategoriName || '').toLocaleLowerCase('tr-TR');
  return lower.includes('iş makine') || lower.includes('is makine');
}

function buildInitialForm(arac) {
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

function serializeFormForDirtyCheck(f) {
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

function parseNonNegativeInteger(raw, { required = false } = {}) {
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

export default function VehicleSheet({ open, onOpenChange, arac = null, onSuccess }) {
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const isEditMode = Boolean(arac);

  const [form, setForm] = useState(() => buildInitialForm(arac));
  const [initialSnapshot, setInitialSnapshot] = useState(() => buildInitialForm(arac));
  const [fieldErrors, setFieldErrors] = useState({});
  const [sayacHatasi, setSayacHatasi] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 4 Kademeli Araç Katalogu Durumu
  const [kategoriler, setKategoriler] = useState([]);
  const [markalar, setMarkalar] = useState([]);
  const [modeller, setModeller] = useState([]);
  const [varyantlar, setVaryantlar] = useState([]);

  const [loadingKatalog, setLoadingKatalog] = useState(false);
  const [manualKategori, setManualKategori] = useState(false);
  const [manualMarka, setManualMarka] = useState(false);
  const [manualModel, setManualModel] = useState(false);
  const [manualVaryant, setManualVaryant] = useState(false);

  // Yarış koşulu (stale response) önleyici sayaçlar
  const initRequestIdRef = useRef(0);
  const markaRequestIdRef = useRef(0);
  const modelRequestIdRef = useRef(0);
  const varyantRequestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    const nextForm = buildInitialForm(arac);
    setForm(nextForm);
    setInitialSnapshot(nextForm);
    setFieldErrors({});
    setSayacHatasi(null);

    const currentInitId = ++initRequestIdRef.current;
    setLoadingKatalog(true);

    (async () => {
      try {
        const katList = await katalogService.getKategoriler();
        if (initRequestIdRef.current !== currentInitId) return;
        setKategoriler(katList);

        if (!arac) {
          // Yeni araç: varsayılan ilk kategori (veya Otomobil)
          const defaultKat =
            katList.find(
              (k) =>
                String(k.ad || '').toLocaleLowerCase('tr-TR') ===
                String(nextForm.kategori || 'Otomobil').toLocaleLowerCase('tr-TR')
            ) ||
            katList[0] ||
            null;

          if (!defaultKat) {
            setManualKategori(true);
            setManualMarka(true);
            setManualModel(true);
            setManualVaryant(true);
            setMarkalar([]);
            setModeller([]);
            setVaryantlar([]);
            return;
          }

          const resolvedKatId = Number(defaultKat.kategori_id);
          const resolvedKatAd = defaultKat.ad;

          setManualKategori(false);
          setManualMarka(false);
          setManualModel(false);
          setManualVaryant(false);

          const resolvedForm = {
            ...nextForm,
            kategori_id: resolvedKatId,
            kategori: resolvedKatAd,
          };
          setForm(resolvedForm);
          setInitialSnapshot(resolvedForm);

          const markaList = await katalogService.getMarkalar(resolvedKatId);
          if (initRequestIdRef.current !== currentInitId) return;
          setMarkalar(markaList);
          setModeller([]);
          setVaryantlar([]);
          return;
        }

        // Düzenleme modu: arac.kategori_id / arac.kategori -> arac.marka -> arac.model -> arac.varyant_id eşleştir
        const matchedKat =
          (arac.kategori_id
            ? katList.find((k) => Number(k.kategori_id) === Number(arac.kategori_id))
            : null) ||
          katList.find(
            (k) =>
              String(k.ad || '').toLocaleLowerCase('tr-TR') ===
              String(arac.kategori || '').toLocaleLowerCase('tr-TR')
          ) ||
          null;

        if (!matchedKat) {
          setManualKategori(true);
          setManualMarka(true);
          setManualModel(true);
          setManualVaryant(true);
          setMarkalar([]);
          setModeller([]);
          setVaryantlar([]);
          return;
        }

        const resolvedKatId = Number(matchedKat.kategori_id);
        setManualKategori(false);

        const markaList = await katalogService.getMarkalar(resolvedKatId);
        if (initRequestIdRef.current !== currentInitId) return;
        setMarkalar(markaList);

        const matchedMarka =
          markaList.find(
            (m) =>
              String(m.ad || '').toLocaleLowerCase('tr-TR') ===
              String(arac.marka || '').toLocaleLowerCase('tr-TR')
          ) || null;

        if (!matchedMarka) {
          setManualMarka(true);
          setManualModel(true);
          setManualVaryant(true);
          setModeller([]);
          setVaryantlar([]);
          const updated = {
            ...nextForm,
            kategori_id: resolvedKatId,
            kategori: matchedKat.ad,
          };
          setForm(updated);
          setInitialSnapshot(updated);
          return;
        }

        const resolvedMarkaId = Number(matchedMarka.marka_id);
        setManualMarka(false);

        const modelList = await katalogService.getModeller(resolvedMarkaId, resolvedKatId);
        if (initRequestIdRef.current !== currentInitId) return;
        setModeller(modelList);

        const matchedModel =
          modelList.find(
            (mod) =>
              String(mod.ad || '').toLocaleLowerCase('tr-TR') ===
              String(arac.model || '').toLocaleLowerCase('tr-TR')
          ) || null;

        if (!matchedModel) {
          setManualModel(true);
          setManualVaryant(true);
          setVaryantlar([]);
          const updated = {
            ...nextForm,
            kategori_id: resolvedKatId,
            kategori: matchedKat.ad,
            marka_id: resolvedMarkaId,
            marka: matchedMarka.ad,
          };
          setForm(updated);
          setInitialSnapshot(updated);
          return;
        }

        const resolvedModelId = Number(matchedModel.model_id);
        setManualModel(false);

        const varyantList = await katalogService.getVaryantlar(resolvedModelId);
        if (initRequestIdRef.current !== currentInitId) return;
        setVaryantlar(varyantList);

        const matchedVaryant = arac.varyant_id
          ? varyantList.find((v) => Number(v.varyant_id) === Number(arac.varyant_id)) || null
          : null;

        setManualVaryant(!matchedVaryant);

        const updated = {
          ...nextForm,
          kategori_id: resolvedKatId,
          kategori: matchedKat.ad,
          marka_id: resolvedMarkaId,
          marka: matchedMarka.ad,
          model_id: resolvedModelId,
          model: matchedModel.ad,
          varyant_id: matchedVaryant ? Number(matchedVaryant.varyant_id) : null,
        };
        setForm(updated);
        setInitialSnapshot(updated);
      } catch (_err) {
        if (initRequestIdRef.current !== currentInitId) return;
        setManualKategori(true);
        setManualMarka(true);
        setManualModel(true);
        setManualVaryant(true);
      } finally {
        if (initRequestIdRef.current === currentInitId) {
          setLoadingKatalog(false);
        }
      }
    })();
  }, [open, arac]);

  const isDirty = useMemo(
    () => serializeFormForDirtyCheck(form) !== serializeFormForDirtyCheck(initialSnapshot),
    [form, initialSnapshot]
  );

  const isSmh = form.sayac_tipi === 'SMH';

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  // 1. Kademe: Kategori Seçimi
  const handleKategoriSelect = async (val) => {
    clearFieldError('kategori');
    clearFieldError('marka');
    clearFieldError('model');

    if (val === MANUAL_OPTION) {
      setManualKategori(true);
      setManualMarka(true);
      setManualModel(true);
      setManualVaryant(true);
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

    setManualKategori(false);
    setManualMarka(false);
    setManualModel(false);
    setManualVaryant(false);
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
        setManualMarka(true);
        setManualModel(true);
        setManualVaryant(true);
      }
    } catch (_err) {
      if (markaRequestIdRef.current !== reqId) return;
      setManualMarka(true);
      setManualModel(true);
      setManualVaryant(true);
    }
  };

  // 2. Kademe: Marka Seçimi
  const handleMarkaSelect = async (val) => {
    clearFieldError('marka');
    clearFieldError('model');

    if (val === MANUAL_OPTION) {
      setManualMarka(true);
      setManualModel(true);
      setManualVaryant(true);
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

    setManualMarka(false);
    setManualModel(false);
    setManualVaryant(false);
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
        setManualModel(true);
        setManualVaryant(true);
      }
    } catch (_err) {
      if (modelRequestIdRef.current !== reqId) return;
      setManualModel(true);
      setManualVaryant(true);
    }
  };

  // 3. Kademe: Model Seçimi
  const handleModelSelect = async (val) => {
    clearFieldError('model');

    if (val === MANUAL_OPTION) {
      setManualModel(true);
      setManualVaryant(true);
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

    setManualModel(false);
    setManualVaryant(false);

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
        setManualVaryant(true);
      }
    } catch (_err) {
      if (varyantRequestIdRef.current !== reqId) return;
      setManualVaryant(true);
    }
  };

  // 4. Kademe: Varyant Seçimi (Otomatik Kalibrasyon)
  const handleVaryantSelect = (val) => {
    if (val === MANUAL_OPTION) {
      setManualVaryant(true);
      setForm((prev) => ({
        ...prev,
        varyant_id: null,
      }));
      return;
    }

    const varyantId = Number(val);
    const selectedVaryant = varyantlar.find((v) => Number(v.varyant_id) === varyantId);
    if (!selectedVaryant) return;

    setManualVaryant(false);

    const hasSmhInterval = Number(selectedVaryant.calisma_saati_bakim) > 0;
    const nextSayacTipi = hasSmhInterval ? 'SMH' : 'KM';
    const rawPeriyot = hasSmhInterval
      ? Number(selectedVaryant.calisma_saati_bakim)
      : Number(selectedVaryant.onerilen_bakim_km) || 15000;
    const rawTriger =
      !hasSmhInterval && Number(selectedVaryant.triger_degisim_km) > 0
        ? formatLocaleNumber(Number(selectedVaryant.triger_degisim_km), 0)
        : '';

    setForm((prev) => ({
      ...prev,
      varyant_id: varyantId,
      sayac_tipi: nextSayacTipi,
      bakim_periyodu: formatLocaleNumber(rawPeriyot, 0),
      triger_degisim_km: rawTriger,
    }));

    setSayacHatasi(null);
    clearFieldError('sayac_tipi');
    clearFieldError('bakim_periyodu');
    clearFieldError('triger_degisim_km');
  };

  const handleSayacTipiChange = (nextTip) => {
    setForm((prev) => ({
      ...prev,
      sayac_tipi: nextTip,
      ...(isEditMode ? {} : { bakim_periyodu: nextTip === 'SMH' ? '250' : '15000' }),
    }));
    setSayacHatasi(null);
    clearFieldError('sayac_tipi');
    clearFieldError('bakim_periyodu');
    clearFieldError('triger_degisim_km');
  };

  const handleGuncelSayacChange = (value) => {
    setForm((prev) => ({ ...prev, guncel_sayac: value }));
    setSayacHatasi(null);
    clearFieldError('guncel_sayac');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

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
      setFieldErrors(errors);
      return;
    }

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

    const payload = {
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
    };

    setIsSubmitting(true);
    setFieldErrors({});
    setSayacHatasi(null);

    try {
      if (isEditMode) {
        await aracService.aracGuncelle(arac.arac_id, payload);
      } else {
        await aracService.aracEkle(payload);
      }

      await fetchAraclar();
      toast.success(isEditMode ? 'Araç güncellendi.' : 'Araç eklendi.');
      onOpenChange?.(false);
      onSuccess?.();
    } catch (err) {
      const status = getErrorStatus(err);

      if (status === 422) {
        const parsed = parseSayacHatasi(err);
        const rawData =
          err?.response?.data && typeof err.response.data === 'object' ? err.response.data : {};
        const expectedBirim = isSmh ? 'saat' : 'km';

        if (parsed) {
          let ipucu = parsed.ipucu;
          if (ipucu && !rawData.sayac_tipi && !rawData.birim) {
            ipucu = ipucu.replace(/\b(km|saat)\b$/i, expectedBirim);
          }
          setSayacHatasi({ ...parsed, ipucu });
        } else {
          setSayacHatasi({
            alanHatasi: rawData.message || 'Sayaç değeri geçersiz.',
            ipucu: null,
          });
        }
        return;
      }

      if (status === 409) {
        setFieldErrors((prev) => ({
          ...prev,
          plaka: err?.response?.data?.message || 'Bu plaka zaten kayıtlı.',
        }));
        return;
      }

      notifyApiError(err, isEditMode ? 'Araç güncellenemedi.' : 'Araç eklenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSayacError = Boolean(sayacHatasi || fieldErrors.guncel_sayac);

  const kategoriSelectValue = manualKategori
    ? MANUAL_OPTION
    : form.kategori_id
      ? String(form.kategori_id)
      : '';

  const markaSelectValue = manualMarka
    ? MANUAL_OPTION
    : form.marka_id
      ? String(form.marka_id)
      : '';

  const modelSelectValue = manualModel
    ? MANUAL_OPTION
    : form.model_id
      ? String(form.model_id)
      : '';

  const varyantSelectValue = manualVaryant
    ? MANUAL_OPTION
    : form.varyant_id
      ? String(form.varyant_id)
      : '';

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Aracı Düzenle' : 'Yeni Araç Ekle'}
      description={
        isEditMode
          ? 'Araç kimliği, katalog varyantı, sayaç kalibrasyonu, bakım periyodu ve belge vadelerini güncelleyin.'
          : 'Filoya yeni araç ekleyin; 4 kademeli araç katalogundan varyant seçerek bakım periyotlarını otomatik doldurun.'
      }
      badge={isEditMode ? formatTurkishPlate(arac.plaka) : null}
      submitLabel={isEditMode ? 'Değişiklikleri Kaydet' : 'Aracı Ekle'}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      {/* 1. Bölüm: Kimlik & Sınıflandırma (4 Kademeli Araç Katalogu) */}
      <SheetFormSection
        title="Kimlik & Sınıflandırma"
        description="Plaka, kategori, marka, model ve motor/kasa varyantı seçimi"
      >
        <SheetFormGrid columns={2}>
          <SheetField
            label="Plaka"
            htmlFor="vehicle-plaka"
            required
            error={fieldErrors.plaka}
          >
            <Input
              id="vehicle-plaka"
              value={form.plaka}
              onChange={(e) => updateField('plaka', formatTurkishPlate(e.target.value))}
              placeholder="34 ABC 123"
              maxLength={11}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.plaka) || undefined}
              className={cn(
                'font-mono uppercase tabular-nums',
                fieldErrors.plaka && 'border-destructive focus-visible:border-destructive'
              )}
            />
          </SheetField>

          <SheetField
            label="Kategori"
            htmlFor="vehicle-kategori"
            required
            error={fieldErrors.kategori}
          >
            <div className="space-y-2">
              <Select
                value={kategoriSelectValue}
                onValueChange={handleKategoriSelect}
                disabled={loadingKatalog}
              >
                <SelectTrigger id="vehicle-kategori" className="w-full">
                  <SelectValue
                    placeholder={loadingKatalog ? 'Katalog yükleniyor...' : 'Kategori seçin'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {kategoriler.map((kat) => (
                    <SelectItem key={kat.kategori_id} value={String(kat.kategori_id)}>
                      {kat.ad}
                    </SelectItem>
                  ))}
                  <SelectItem value={MANUAL_OPTION}>Diğer / Manuel Gir</SelectItem>
                </SelectContent>
              </Select>

              {manualKategori && (
                <Input
                  id="vehicle-kategori-manual"
                  value={form.kategori}
                  onChange={(e) => updateField('kategori', e.target.value)}
                  placeholder="Kategori adı girin (Örn: Özel Amaçlı Araç)"
                  aria-invalid={Boolean(fieldErrors.kategori) || undefined}
                  className={cn(
                    fieldErrors.kategori && 'border-destructive focus-visible:border-destructive'
                  )}
                />
              )}
            </div>
          </SheetField>

          <SheetField
            label="Marka"
            htmlFor="vehicle-marka"
            required
            error={fieldErrors.marka}
          >
            <div className="space-y-2">
              {!manualKategori && markalar.length > 0 && (
                <Select value={markaSelectValue} onValueChange={handleMarkaSelect}>
                  <SelectTrigger id="vehicle-marka-select" className="w-full">
                    <SelectValue placeholder="Marka seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {markalar.map((m) => (
                      <SelectItem key={m.marka_id} value={String(m.marka_id)}>
                        {m.ad}
                      </SelectItem>
                    ))}
                    <SelectItem value={MANUAL_OPTION}>Diğer / Manuel Gir</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {(manualKategori || manualMarka || markalar.length === 0) && (
                <Input
                  id="vehicle-marka"
                  value={form.marka}
                  onChange={(e) => updateField('marka', e.target.value)}
                  placeholder="Örn: Mercedes-Benz"
                  aria-invalid={Boolean(fieldErrors.marka) || undefined}
                  className={cn(
                    fieldErrors.marka && 'border-destructive focus-visible:border-destructive'
                  )}
                />
              )}
            </div>
          </SheetField>

          <SheetField
            label="Model"
            htmlFor="vehicle-model"
            required
            error={fieldErrors.model}
          >
            <div className="space-y-2">
              {!manualKategori && !manualMarka && modeller.length > 0 && (
                <Select value={modelSelectValue} onValueChange={handleModelSelect}>
                  <SelectTrigger id="vehicle-model-select" className="w-full">
                    <SelectValue placeholder="Model seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {modeller.map((mod) => (
                      <SelectItem key={mod.model_id} value={String(mod.model_id)}>
                        {mod.ad}
                      </SelectItem>
                    ))}
                    <SelectItem value={MANUAL_OPTION}>Diğer / Manuel Gir</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {(manualKategori ||
                manualMarka ||
                manualModel ||
                !form.marka_id ||
                modeller.length === 0) && (
                <Input
                  id="vehicle-model"
                  value={form.model}
                  onChange={(e) => updateField('model', e.target.value)}
                  placeholder="Örn: Actros 1848"
                  aria-invalid={Boolean(fieldErrors.model) || undefined}
                  className={cn(
                    fieldErrors.model && 'border-destructive focus-visible:border-destructive'
                  )}
                />
              )}
            </div>
          </SheetField>

          <SheetField
            label="Motor / Kasa Varyantı"
            htmlFor="vehicle-varyant"
            hint="Varyant seçildiğinde sayaç tipi ve bakım periyotları otomatik kalibre edilir"
          >
            <Select
              value={varyantSelectValue}
              onValueChange={handleVaryantSelect}
              disabled={manualKategori || manualMarka || manualModel || varyantlar.length === 0}
            >
              <SelectTrigger id="vehicle-varyant" className="w-full">
                <SelectValue
                  placeholder={
                    manualKategori || manualMarka || manualModel || varyantlar.length === 0
                      ? 'Diğer / Manuel Kalibrasyon'
                      : 'Varyant seçin (opsiyonel)'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {varyantlar.map((v) => {
                  const label =
                    v.etiket ||
                    [v.kasa_tipi, v.motor_adi, v.sanziman_tipi, v.yakit_tipi]
                      .filter(Boolean)
                      .join(' • ');
                  return (
                    <SelectItem key={v.varyant_id} value={String(v.varyant_id)}>
                      {label}
                    </SelectItem>
                  );
                })}
                <SelectItem value={MANUAL_OPTION}>Diğer / Manuel Gir</SelectItem>
              </SelectContent>
            </Select>
          </SheetField>

          <SheetField
            label="Model Yılı"
            htmlFor="vehicle-yil"
            required
            error={fieldErrors.yil}
          >
            <Input
              id="vehicle-yil"
              type="number"
              min={1950}
              max={2027}
              value={form.yil}
              onChange={(e) => updateField('yil', e.target.value)}
              placeholder={CURRENT_DEFAULT_YEAR}
              aria-invalid={Boolean(fieldErrors.yil) || undefined}
              className={cn(
                'font-mono tabular-nums',
                fieldErrors.yil && 'border-destructive focus-visible:border-destructive'
              )}
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>

      {/* 2. Bölüm: Sayaç & Bakım Kalibrasyonu */}
      <SheetFormSection
        title="Sayaç & Bakım Kalibrasyonu"
        description="Kilometre veya çalışma saati sayacı ile periyodik bakım aralıkları"
      >
        <SheetFormGrid columns={2}>
          <SheetField
            label="Sayaç Tipi"
            htmlFor="vehicle-sayac-tipi"
            error={fieldErrors.sayac_tipi}
          >
            <Select value={form.sayac_tipi} onValueChange={handleSayacTipiChange}>
              <SelectTrigger id="vehicle-sayac-tipi" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KM">KM (Kilometre)</SelectItem>
                <SelectItem value="SMH">SMH (Çalışma Saati)</SelectItem>
              </SelectContent>
            </Select>
          </SheetField>

          <SheetField
            label={isSmh ? 'Güncel Çalışma Saati (SMH)' : 'Güncel Kilometre (KM)'}
            htmlFor="vehicle-guncel-sayac"
            error={sayacHatasi ? undefined : fieldErrors.guncel_sayac}
          >
            <Input
              id="vehicle-guncel-sayac"
              type="text"
              inputMode="numeric"
              value={form.guncel_sayac}
              onChange={(e) => handleGuncelSayacChange(e.target.value)}
              placeholder={isSmh ? 'Örn: 1.250' : 'Örn: 128.000'}
              aria-invalid={hasSayacError || undefined}
              {...sayacAria(sayacHatasi, 'vehicle-sayac-error')}
              className={cn(
                'font-mono tabular-nums',
                hasSayacError && 'border-destructive focus-visible:border-destructive'
              )}
            />
            <SayacFieldError id="vehicle-sayac-error" hata={sayacHatasi} />
          </SheetField>

          <SheetField
            label={`Bakım Periyodu (${form.sayac_tipi})`}
            htmlFor="vehicle-bakim-periyodu"
            error={fieldErrors.bakim_periyodu}
          >
            <Input
              id="vehicle-bakim-periyodu"
              type="text"
              inputMode="numeric"
              value={form.bakim_periyodu}
              onChange={(e) => updateField('bakim_periyodu', e.target.value)}
              placeholder={isSmh ? '250' : '15.000'}
              aria-invalid={Boolean(fieldErrors.bakim_periyodu) || undefined}
              className={cn(
                'font-mono tabular-nums',
                fieldErrors.bakim_periyodu &&
                  'border-destructive focus-visible:border-destructive'
              )}
            />
          </SheetField>

          <SheetField
            label="Triger Değişim Aralığı (KM)"
            htmlFor="vehicle-triger-km"
            hint={isSmh ? 'SMH araçlarda uygulanmaz' : undefined}
            error={fieldErrors.triger_degisim_km}
          >
            <Input
              id="vehicle-triger-km"
              type="text"
              inputMode="numeric"
              disabled={isSmh}
              value={isSmh ? '' : form.triger_degisim_km}
              onChange={(e) => updateField('triger_degisim_km', e.target.value)}
              placeholder="90.000"
              aria-invalid={Boolean(fieldErrors.triger_degisim_km) || undefined}
              className={cn(
                'font-mono tabular-nums',
                fieldErrors.triger_degisim_km &&
                  'border-destructive focus-visible:border-destructive'
              )}
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>

      {/* 3. Bölüm: Resmi Evrak Vadeleri */}
      <SheetFormSection
        title="Resmi Evrak Vadeleri"
        description="Muayene, trafik sigortası ve kasko bitiş tarihleri"
      >
        <SheetFormGrid columns={2}>
          <SheetField label="Muayene Tarihi" htmlFor="vehicle-muayene-tarihi">
            <TrussDatePicker
              id="vehicle-muayene-tarihi"
              name="muayene_tarihi"
              value={form.muayene_tarihi}
              onChange={(e) => updateField('muayene_tarihi', e.target.value)}
              placeholder="Muayene tarihi seçin"
            />
          </SheetField>

          <SheetField label="Trafik Sigortası Tarihi" htmlFor="vehicle-sigorta-tarihi">
            <TrussDatePicker
              id="vehicle-sigorta-tarihi"
              name="sigorta_tarihi"
              value={form.sigorta_tarihi}
              onChange={(e) => updateField('sigorta_tarihi', e.target.value)}
              placeholder="Sigorta tarihi seçin"
            />
          </SheetField>

          <SheetField label="Kasko Tarihi" htmlFor="vehicle-kasko-tarihi">
            <TrussDatePicker
              id="vehicle-kasko-tarihi"
              name="kasko_tarihi"
              value={form.kasko_tarihi}
              onChange={(e) => updateField('kasko_tarihi', e.target.value)}
              placeholder="Kasko tarihi seçin"
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>
    </AppSheet>
  );
}
