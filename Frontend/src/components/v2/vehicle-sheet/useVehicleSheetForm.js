import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import aracService from '@/services/aracService';
import useVehicleStore from '@/store/useVehicleStore';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { isSmhArac } from '@/utils/aracDurum';
import { DATA_SCOPES, emitDataChanged } from '@/utils/dataEvents';
import useVehicleKatalog from './useVehicleKatalog';
import {
  buildInitialForm,
  resolveSayac422Error,
  serializeFormForDirtyCheck,
  validateAndBuildVehiclePayload,
} from './vehicleSheetHelpers';

export default function useVehicleSheetForm({ open, arac, onOpenChange, onSuccess }) {
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const isEditMode = Boolean(arac);

  const [form, setForm] = useState(() => buildInitialForm(arac));
  const [initialSnapshot, setInitialSnapshot] = useState(() => buildInitialForm(arac));
  const [fieldErrors, setFieldErrors] = useState({});
  const [sayacHatasi, setSayacHatasi] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFieldError = useCallback((name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const katalog = useVehicleKatalog({
    form,
    setForm,
    isEditMode,
    clearFieldError,
    setSayacHatasi,
  });

  const { hydrateForOpen, manualFlags } = katalog;

  useEffect(() => {
    if (!open) return;

    const nextForm = buildInitialForm(arac);
    setForm(nextForm);
    setInitialSnapshot(nextForm);
    setFieldErrors({});
    setSayacHatasi(null);

    hydrateForOpen({
      arac,
      nextForm,
      onResolvedForm: (resolved) => {
        const katalogPatch = {
          kategori_id: resolved.kategori_id,
          kategori: resolved.kategori,
          marka_id: resolved.marka_id,
          marka: resolved.marka,
          model_id: resolved.model_id,
          model: resolved.model,
          varyant_id: resolved.varyant_id,
        };
        setForm((prev) => ({ ...prev, ...katalogPatch }));
        setInitialSnapshot((prev) => ({ ...prev, ...katalogPatch }));
      },
    });
  }, [open, arac, hydrateForOpen]);

  const isDirty = useMemo(
    () => serializeFormForDirtyCheck(form) !== serializeFormForDirtyCheck(initialSnapshot),
    [form, initialSnapshot]
  );

  const isSmh = isSmhArac(form);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
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

    const { errors, payload } = validateAndBuildVehiclePayload({
      form,
      arac,
      isSmh,
      manualFlags,
    });

    if (errors) {
      setFieldErrors(errors);
      return;
    }

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
      emitDataChanged(DATA_SCOPES.VEHICLE);
      toast.success(isEditMode ? 'Araç güncellendi.' : 'Araç eklendi.');
      onOpenChange?.(false);
      onSuccess?.();
    } catch (err) {
      const status = getErrorStatus(err);

      // P0 Odometer Guard: 422 hatası global toast yerine satır içi <SayacFieldError /> ile gösterilir
      if (status === 422) {
        setSayacHatasi(resolveSayac422Error(err, isSmh));
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

  return {
    form,
    fieldErrors,
    sayacHatasi,
    isSubmitting,
    isEditMode,
    isDirty,
    isSmh,
    katalog,
    updateField,
    handleSayacTipiChange,
    handleGuncelSayacChange,
    handleSubmit,
  };
}
