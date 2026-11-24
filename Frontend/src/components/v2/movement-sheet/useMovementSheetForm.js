import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import yakitService from '@/services/yakitService';
import bakimService from '@/services/bakimService';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import { isSmhArac } from '@/utils/aracDurum';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';
import { parseSayacHatasi } from '@/utils/sayacHatasi';
import {
  ISLEM_TURLERI,
  YAKIT_TIPLERI,
  buildInitialForm,
  getMovementSheetMeta,
  resolveDefaultAracId,
  validateAndBuildMovementPayload,
} from './movementSheetHelpers';

export default function useMovementSheetForm({
  open,
  onOpenChange,
  mode,
  initialTip,
  record,
  prefill,
  araclar,
  defaultAracId,
  canAddFuelProp,
  canAddMaintenanceProp,
  onSuccess,
}) {
  const user = useAuthStore((s) => s.user);
  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canAddFuel =
    canAddFuelProp !== undefined
      ? Boolean(canAddFuelProp)
      : canManage || user?.yetkiler?.yakit === true;
  const canAddMaintenance =
    canAddMaintenanceProp !== undefined
      ? Boolean(canAddMaintenanceProp)
      : canManage || user?.yetkiler?.bakim === true;

  const resolveAllowedTip = (requestedTip) => {
    const normalized = requestedTip === 'BAKIM' ? 'BAKIM' : 'YAKIT';
    if (normalized === 'YAKIT' && !canAddFuel && canAddMaintenance) return 'BAKIM';
    if (normalized === 'BAKIM' && !canAddMaintenance && canAddFuel) return 'YAKIT';
    return normalized;
  };

  const makeInitial = () =>
    buildInitialForm({
      mode,
      initialTip: resolveAllowedTip(initialTip),
      record,
      defaultAracId,
      araclar,
      prefill,
    });

  const [form, setForm] = useState(makeInitial);
  const [initialSnapshot, setInitialSnapshot] = useState(makeInitial);
  const [fieldErrors, setFieldErrors] = useState({});
  const [sayacHatasi, setSayacHatasi] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const araclarRef = useRef(araclar);
  araclarRef.current = araclar;

  useEffect(() => {
    if (!open) return;
    const allowedTip =
      mode === 'create'
        ? resolveAllowedTip(initialTip)
        : record?.tip === 'BAKIM'
          ? 'BAKIM'
          : 'YAKIT';
    const next = buildInitialForm({
      mode,
      initialTip: allowedTip,
      record,
      defaultAracId,
      araclar: araclarRef.current,
      prefill,
    });
    setForm(next);
    setInitialSnapshot(next);
    setFieldErrors({});
    setSayacHatasi(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialTip, record, defaultAracId, prefill, canAddFuel, canAddMaintenance]);

  // Araç listesi sheet açıkken sonradan yüklenirse ve araç henüz boşsa ilk aracı varsayılan seç
  useEffect(() => {
    if (!open || mode !== 'create' || form.arac_id || araclar.length === 0) return;
    const fallbackId = resolveDefaultAracId(defaultAracId, araclar);
    if (!fallbackId) return;
    setForm((prev) => (prev.arac_id ? prev : { ...prev, arac_id: fallbackId }));
    setInitialSnapshot((prev) => (prev.arac_id ? prev : { ...prev, arac_id: fallbackId }));
  }, [open, mode, form.arac_id, araclar, defaultAracId]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialSnapshot),
    [form, initialSnapshot]
  );

  const isYakit = form.tip === 'YAKIT';
  const isEditMode = mode === 'edit';
  const isRepeatMode = mode === 'repeat';

  const selectedArac = useMemo(
    () => araclar.find((a) => String(a.arac_id) === String(form.arac_id)) || null,
    [araclar, form.arac_id]
  );

  const isSmh = selectedArac ? isSmhArac(selectedArac) : record?.sayac_tipi === 'SMH';

  const yakitOptions = useMemo(
    () =>
      form.yakit_tipi && !YAKIT_TIPLERI.includes(form.yakit_tipi)
        ? [form.yakit_tipi, ...YAKIT_TIPLERI]
        : YAKIT_TIPLERI,
    [form.yakit_tipi]
  );

  const bakimOptions = useMemo(
    () =>
      form.bakim_tipi && !ISLEM_TURLERI.includes(form.bakim_tipi)
        ? [form.bakim_tipi, ...ISLEM_TURLERI]
        : ISLEM_TURLERI,
    [form.bakim_tipi]
  );

  const selectedAracInList = useMemo(
    () => !form.arac_id || araclar.some((a) => String(a.arac_id) === String(form.arac_id)),
    [araclar, form.arac_id]
  );

  const liveUnitPriceHint = useMemo(() => {
    if (!isYakit) return undefined;
    const litreNum = parseLocaleNumber(form.litre);
    const tutarNum = parseLocaleNumber(form.tutar);
    return litreNum > 0 && tutarNum > 0
      ? `Birim fiyat: ${formatLocaleNumber(tutarNum / litreNum, 2)} ₺/L`
      : undefined;
  }, [isYakit, form.litre, form.tutar]);

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleTipChange = (nextTip) => {
    if (mode !== 'create') return;
    if (nextTip === 'YAKIT' && !canAddFuel) return;
    if (nextTip === 'BAKIM' && !canAddMaintenance) return;
    setForm((prev) => ({ ...prev, tip: nextTip === 'BAKIM' ? 'BAKIM' : 'YAKIT' }));
    setFieldErrors({});
    setSayacHatasi(null);
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const updateSayacRelatedField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setSayacHatasi(null);
    clearFieldError(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (isYakit && !canAddFuel) {
      toast.error('Yakıt kaydı ekleme yetkiniz bulunmuyor.');
      return;
    }
    if (!isYakit && !canAddMaintenance) {
      toast.error('Bakım kaydı ekleme yetkiniz bulunmuyor.');
      return;
    }

    const { errors, payload } = validateAndBuildMovementPayload({ form, isYakit });
    if (errors) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setSayacHatasi(null);

    try {
      if (isYakit) {
        if (isEditMode) await yakitService.yakitGuncelle(record.rawId, payload);
        else await yakitService.yakitEkle(payload);
      } else if (isEditMode) {
        await bakimService.bakimGuncelle(record.rawId, payload);
      } else {
        await bakimService.bakimEkle(payload);
      }

      await onSuccess?.();
      const turLabel = isYakit ? 'Yakıt' : 'Bakım';
      toast.success(`${turLabel} kaydı ${isEditMode ? 'güncellendi' : 'eklendi'}.`);
      onOpenChange?.(false);
    } catch (err) {
      const status = getErrorStatus(err);

      // ADR-03: 422 (ODOMETER_VIOLATION / SAYAC_GERI_GIDEMEZ) hatasında global toast YOK, satır içi gösterilir
      if (status === 422) {
        const rawData =
          err?.response?.data && typeof err.response.data === 'object' ? err.response.data : {};

        if (rawData.code === 'SAYAC_TIPI_UYUSMAZ') {
          setFieldErrors((prev) => ({
            ...prev,
            arac_id:
              rawData.message || 'Kayıt farklı sayaç tipindeki (KM/SMH) bir araca taşınamaz.',
          }));
          return;
        }

        const parsed = parseSayacHatasi(err);
        setSayacHatasi(
          parsed || {
            alanHatasi: rawData.message || 'Sayaç değeri geçersiz.',
            ipucu: null,
          }
        );
        return;
      }

      const turLabel = isYakit ? 'Yakıt' : 'Bakım';
      notifyApiError(err, `${turLabel} kaydı ${isEditMode ? 'güncellenemedi' : 'eklenemedi'}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    fieldErrors,
    sayacHatasi,
    isSubmitting,
    isDirty,
    isYakit,
    isSmh,
    canAddFuel,
    canAddMaintenance,
    yakitOptions,
    bakimOptions,
    selectedAracInList,
    liveUnitPriceHint,
    meta: getMovementSheetMeta({ isEditMode, isRepeatMode, isYakit }),
    handleTipChange,
    handleAracChange: (val) => updateSayacRelatedField('arac_id', val),
    handleTarihChange: (val) => updateSayacRelatedField('tarih', val),
    handleKmChange: (val) => updateSayacRelatedField('km', val),
    updateField,
    handleSubmit,
  };
}
