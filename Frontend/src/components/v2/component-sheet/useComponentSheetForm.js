import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import parcaService from '@/services/parcaService';
import { getGuncelSayac, isSmhArac } from '@/utils/aracDurum';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber } from '@/utils/formatters';
import { parseSayacHatasi } from '@/utils/sayacHatasi';
import {
  buildInitialForm,
  findVehicle,
  getComponentSheetMeta,
  validateAndBuildComponentPayload,
} from './componentSheetHelpers';

export default function useComponentSheetForm({
  open,
  onOpenChange,
  mode,
  parca,
  prefill,
  araclar,
  defaultAracId,
  onSuccess,
}) {
  const [form, setForm] = useState(() =>
    buildInitialForm({ mode, parca, defaultAracId, araclar, prefill })
  );
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    buildInitialForm({ mode, parca, defaultAracId, araclar, prefill })
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [sayacHatasi, setSayacHatasi] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const araclarRef = useRef(araclar);
  araclarRef.current = araclar;

  useEffect(() => {
    if (!open) return;
    const next = buildInitialForm({
      mode,
      parca,
      defaultAracId,
      araclar: araclarRef.current,
      prefill,
    });
    setForm(next);
    setInitialSnapshot(next);
    setFieldErrors({});
    setSayacHatasi(null);
  }, [open, mode, parca, defaultAracId, prefill]);

  useEffect(() => {
    if (!open || mode !== 'create' || form.arac_id || araclar.length === 0) return;
    const next = buildInitialForm({
      mode: 'create',
      parca: null,
      defaultAracId,
      araclar,
      prefill,
    });
    setForm((prev) => (prev.arac_id ? prev : next));
    setInitialSnapshot((prev) => (prev.arac_id ? prev : next));
  }, [open, mode, form.arac_id, araclar, defaultAracId, prefill]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialSnapshot),
    [form, initialSnapshot]
  );

  const isEditMode = mode === 'edit';
  const isReplaceMode = mode === 'replace';
  const isCreateMode = mode === 'create';

  const selectedArac = useMemo(
    () => findVehicle(araclar, form.arac_id),
    [araclar, form.arac_id]
  );

  const isSmh = selectedArac ? isSmhArac(selectedArac) : parca?.sayac_tipi === 'SMH';
  const birim = isSmh ? 'saat' : 'km';
  const birimEtiketi = isSmh ? 'SMH' : 'KM';

  const selectedAracInList = useMemo(
    () => !form.arac_id || araclar.some((a) => String(a.arac_id) === String(form.arac_id)),
    [araclar, form.arac_id]
  );

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

  const handleAracChange = (nextAracId) => {
    // ADR-09: Edit / replace modunda arac_id değiştirilemez
    if (!isCreateMode) return;
    const nextVehicle = findVehicle(araclar, nextAracId);
    setForm((prev) => {
      if (nextVehicle) {
        const nextIsSmh = isSmhArac(nextVehicle);
        const prevVehicle = findVehicle(araclar, prev.arac_id);
        const prevIsSmh = prevVehicle ? isSmhArac(prevVehicle) : false;
        const shouldSwitchDefaultInterval =
          nextIsSmh !== prevIsSmh &&
          (prev.degisim_araligi_km === '250' ||
            prev.degisim_araligi_km === '30000' ||
            prev.degisim_araligi_km === formatLocaleNumber(30000, 0));

        return {
          ...prev,
          arac_id: nextAracId,
          son_degisim_km: formatLocaleNumber(getGuncelSayac(nextVehicle), 0),
          ...(shouldSwitchDefaultInterval
            ? { degisim_araligi_km: nextIsSmh ? '250' : formatLocaleNumber(30000, 0) }
            : {}),
        };
      }
      return { ...prev, arac_id: nextAracId };
    });
    setSayacHatasi(null);
    clearFieldError('arac_id');
    clearFieldError('son_degisim_km');
  };

  const handleSonDegisimKmChange = (value) => {
    setForm((prev) => ({ ...prev, son_degisim_km: value }));
    setSayacHatasi(null);
    clearFieldError('son_degisim_km');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const { errors, payload } = validateAndBuildComponentPayload({ form, isCreateMode, parca });
    if (errors) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setSayacHatasi(null);

    try {
      if (isCreateMode) {
        await parcaService.parcaEkle(payload);
      } else {
        await parcaService.parcaGuncelle(parca.parca_id, payload);
      }

      await onSuccess?.();
      toast.success(
        isCreateMode
          ? 'Parça takibe alındı.'
          : isReplaceMode
            ? 'Parça değişimi kaydedildi.'
            : 'Parça kaydı güncellendi.'
      );
      onOpenChange?.(false);
    } catch (err) {
      const status = getErrorStatus(err);

      if (status === 422) {
        const parsed = parseSayacHatasi(err);
        const rawData =
          err?.response?.data && typeof err.response.data === 'object' ? err.response.data : {};
        setSayacHatasi(
          parsed || {
            alanHatasi: rawData.message || 'Sayaç değeri geçersiz.',
            ipucu: null,
          }
        );
        return;
      }

      if (status === 409) {
        setFieldErrors((prev) => ({
          ...prev,
          parca_adi: err?.response?.data?.message || 'Bu parça zaten takipte.',
        }));
        return;
      }

      notifyApiError(
        err,
        isCreateMode
          ? 'Parça eklenemedi.'
          : isReplaceMode
            ? 'Değişim kaydedilemedi.'
            : 'Parça güncellenemedi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const meta = getComponentSheetMeta({ isEditMode, isReplaceMode, parca });

  return {
    form,
    fieldErrors,
    sayacHatasi,
    isSubmitting,
    isDirty,
    isCreateMode,
    isReplaceMode,
    selectedArac,
    isSmh,
    birim,
    birimEtiketi,
    selectedAracInList,
    meta,
    updateField,
    handleAracChange,
    handleSonDegisimKmChange,
    handleSubmit,
  };
}
