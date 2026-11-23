import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import parcaService from '@/services/parcaService';
import { getGuncelSayac, isSmhArac } from '@/utils/aracDurum';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { getTodayIso, toLocalIsoDate } from '@/utils/dateUtils';
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
import { Textarea } from '@/components/ui/textarea';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { cn } from '@/lib/utils';

function extractIsoDate(raw, fallback) {
  if (!raw) return fallback;
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return fallback;
  return toLocalIsoDate(d);
}

function findVehicle(araclar, aracId) {
  if (!aracId || !Array.isArray(araclar)) return null;
  return araclar.find((a) => String(a.arac_id) === String(aracId)) || null;
}

function resolveDefaultAracId(defaultAracId, araclar) {
  if (defaultAracId && defaultAracId !== 'tum') {
    return String(defaultAracId);
  }
  if (Array.isArray(araclar) && araclar.length > 0) {
    return String(araclar[0].arac_id);
  }
  return '';
}

function buildInitialForm({ mode, parca, defaultAracId, araclar, prefill = null }) {
  const todayIso = getTodayIso();

  if (mode === 'replace' && parca) {
    const matchedArac = findVehicle(araclar, parca.arac_id);
    const guncelSayac = Number(
      parca.guncel_km ?? (matchedArac ? getGuncelSayac(matchedArac) : 0) ?? 0
    );
    return {
      arac_id: parca.arac_id !== undefined && parca.arac_id !== null ? String(parca.arac_id) : '',
      parca_adi: parca.parca_adi || '',
      son_degisim_km: formatLocaleNumber(guncelSayac, 0),
      degisim_araligi_km:
        parca.degisim_araligi_km !== null &&
        parca.degisim_araligi_km !== undefined &&
        parca.degisim_araligi_km !== ''
          ? formatLocaleNumber(parca.degisim_araligi_km, 0)
          : '',
      son_degisim_tarihi: todayIso,
      maliyet: '',
      notlar: '',
    };
  }

  if (mode === 'edit' && parca) {
    return {
      arac_id: parca.arac_id !== undefined && parca.arac_id !== null ? String(parca.arac_id) : '',
      parca_adi: parca.parca_adi || '',
      son_degisim_km:
        parca.son_degisim_km !== null && parca.son_degisim_km !== undefined
          ? formatLocaleNumber(parca.son_degisim_km, 0)
          : '0',
      degisim_araligi_km:
        parca.degisim_araligi_km !== null &&
        parca.degisim_araligi_km !== undefined &&
        parca.degisim_araligi_km !== ''
          ? formatLocaleNumber(parca.degisim_araligi_km, 0)
          : '',
      son_degisim_tarihi: extractIsoDate(parca.son_degisim_tarihi, todayIso),
      maliyet:
        parca.maliyet !== null && parca.maliyet !== undefined && Number(parca.maliyet) > 0
          ? formatLocaleNumber(parca.maliyet, 2)
          : parca.maliyet === 0 || parca.maliyet === '0'
            ? '0'
            : '',
      notlar: parca.notlar || '',
    };
  }

  const resolvedId =
    prefill?.arac_id !== undefined && prefill?.arac_id !== null && prefill?.arac_id !== ''
      ? String(prefill.arac_id)
      : resolveDefaultAracId(defaultAracId, araclar);
  const matchedArac = findVehicle(araclar, resolvedId);
  const isSmh = matchedArac ? isSmhArac(matchedArac) : false;
  const guncelSayac = matchedArac ? getGuncelSayac(matchedArac) : 0;

  return {
    arac_id: resolvedId,
    parca_adi: prefill?.parca_adi ? String(prefill.parca_adi) : '',
    son_degisim_km:
      prefill?.son_degisim_km !== undefined &&
      prefill?.son_degisim_km !== null &&
      prefill?.son_degisim_km !== ''
        ? formatLocaleNumber(prefill.son_degisim_km, 0)
        : formatLocaleNumber(guncelSayac, 0),
    degisim_araligi_km:
      prefill?.degisim_araligi_km !== undefined &&
      prefill?.degisim_araligi_km !== null &&
      prefill?.degisim_araligi_km !== ''
        ? formatLocaleNumber(prefill.degisim_araligi_km, 0)
        : isSmh
          ? '250'
          : formatLocaleNumber(30000, 0),
    son_degisim_tarihi: todayIso,
    maliyet:
      prefill?.maliyet !== undefined &&
      prefill?.maliyet !== null &&
      prefill?.maliyet !== '' &&
      Number(prefill.maliyet) > 0
        ? formatLocaleNumber(prefill.maliyet, 2)
        : '',
    notlar: prefill?.notlar ? String(prefill.notlar) : '',
  };
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

function parseNonNegativeDecimal(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { valid: true, value: 0 };
  const parsed = parseLocaleNumber(trimmed);
  if (parsed === null || !Number.isFinite(parsed) || parsed < 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value: parsed };
}

export default function ComponentSheet({
  open,
  onOpenChange,
  mode = 'create',
  parca = null,
  prefill = null,
  araclar = [],
  defaultAracId = null,
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

  const isSmh = selectedArac
    ? isSmhArac(selectedArac)
    : parca?.sayac_tipi === 'SMH';
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
    const nextVehicle = findVehicle(araclar, nextAracId);
    setForm((prev) => {
      if (isCreateMode && nextVehicle) {
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

    const errors = {};
    const todayIso = getTodayIso();

    if (!form.arac_id) {
      errors.arac_id = 'Araç seçimi zorunludur.';
    }

    const trimmedAdi = form.parca_adi.trim();
    if (trimmedAdi.length < 2 || trimmedAdi.length > 120) {
      errors.parca_adi = 'Parça adı 2 ile 120 karakter arasında olmalıdır.';
    }

    const sonKmRes = parseNonNegativeInteger(form.son_degisim_km, { required: true });
    if (!sonKmRes.valid) {
      errors.son_degisim_km = 'Geçerli bir tam sayı (≥ 0) girin.';
    }

    const aralikRes = parseNonNegativeInteger(form.degisim_araligi_km, { required: false });
    if (!aralikRes.valid) {
      errors.degisim_araligi_km = 'Geçerli bir tam sayı (≥ 0) girin veya boş bırakın.';
    }

    if (!form.son_degisim_tarihi) {
      errors.son_degisim_tarihi = 'Değişim tarihi zorunludur.';
    } else if (form.son_degisim_tarihi > todayIso) {
      errors.son_degisim_tarihi = 'İleri tarihli kayıt girilemez.';
    }

    const maliyetRes = parseNonNegativeDecimal(form.maliyet);
    if (!maliyetRes.valid) {
      errors.maliyet = 'Geçerli bir tutar (≥ 0) girin.';
    }

    const trimmedNotlar = form.notlar.trim();
    if (trimmedNotlar.length > 1000) {
      errors.notlar = 'Notlar en fazla 1000 karakter olabilir.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const payload = {
      arac_id: Number(form.arac_id),
      parca_adi: trimmedAdi,
      son_degisim_km: sonKmRes.value,
      degisim_araligi_km: aralikRes.value,
      son_degisim_tarihi: form.son_degisim_tarihi,
      maliyet: maliyetRes.value,
      notlar: trimmedNotlar || null,
    };

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
        if (parsed) {
          setSayacHatasi(parsed);
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

  const title = isReplaceMode
    ? 'Değişim Kaydet'
    : isEditMode
      ? 'Parçayı Düzenle'
      : 'Yeni Parça Ekle';

  const description = isReplaceMode
    ? 'Parça yenilendiğinde güncel sayaç, değişim tarihi ve servis maliyetini kaydedin.'
    : isEditMode
      ? 'Parça adı, değişim sayacı, ömür aralığı, maliyet ve not bilgilerini güncelleyin.'
      : 'Araç bileşenini ömür takibine alın; kalan kullanım eşiği otomatik izlenir.';

  const badge =
    (isEditMode || isReplaceMode) && parca?.plaka
      ? formatTurkishPlate(parca.plaka)
      : null;

  const submitLabel = isReplaceMode
    ? 'Değişimi Kaydet'
    : isEditMode
      ? 'Değişiklikleri Kaydet'
      : 'Parçayı Ekle';

  const hasSayacError = Boolean(sayacHatasi || fieldErrors.son_degisim_km);

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      badge={badge}
      submitLabel={submitLabel}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      {/* 1. Bölüm: Araç & Parça Kimliği */}
      <SheetFormSection
        title="Araç & Parça Kimliği"
        description="Takibe alınacak araç ve bileşen adı"
      >
        <SheetFormGrid columns={2}>
          <SheetField
            label="Araç"
            htmlFor="component-arac"
            required
            error={fieldErrors.arac_id}
          >
            <Select
              value={form.arac_id}
              onValueChange={handleAracChange}
              disabled={isReplaceMode}
            >
              <SelectTrigger
                id="component-arac"
                aria-invalid={Boolean(fieldErrors.arac_id) || undefined}
                className={cn(
                  'w-full',
                  fieldErrors.arac_id && 'border-destructive focus-visible:border-destructive'
                )}
              >
                <SelectValue placeholder="Araç seçin" />
              </SelectTrigger>
              <SelectContent>
                {!selectedAracInList && form.arac_id && (
                  <SelectItem value={form.arac_id}>
                    {parca?.plaka ? formatTurkishPlate(parca.plaka) : `Araç #${form.arac_id}`}
                  </SelectItem>
                )}
                {araclar.map((arac) => {
                  const detay = [arac.marka, arac.model].filter(Boolean).join(' ');
                  return (
                    <SelectItem key={arac.arac_id} value={String(arac.arac_id)}>
                      <span className="font-mono font-medium">
                        {formatTurkishPlate(arac.plaka)}
                      </span>
                      {detay ? ` · ${detay}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </SheetField>

          <SheetField
            label="Parça Adı"
            htmlFor="component-parca-adi"
            required
            error={fieldErrors.parca_adi}
          >
            <Input
              id="component-parca-adi"
              type="text"
              value={form.parca_adi}
              onChange={(e) => updateField('parca_adi', e.target.value)}
              disabled={isReplaceMode}
              placeholder="Örn: Ön Fren Balatası"
              maxLength={120}
              aria-invalid={Boolean(fieldErrors.parca_adi) || undefined}
              className={cn(
                fieldErrors.parca_adi && 'border-destructive focus-visible:border-destructive'
              )}
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>

      {/* 2. Bölüm: Değişim & Ömür Parametreleri */}
      <SheetFormSection
        title="Değişim & Ömür Parametreleri"
        description={`Son değişim sayacı (${birimEtiketi}), periyodik ömür aralığı ve işlem tarihi`}
      >
        <SheetFormGrid columns={2}>
          <SheetField
            label={`Son Değişim Sayacı (${birimEtiketi})`}
            htmlFor="component-son-km"
            required
            hint={
              selectedArac
                ? `Araç güncel: ${formatLocaleNumber(getGuncelSayac(selectedArac), 0)} ${birim}`
                : undefined
            }
            error={sayacHatasi ? undefined : fieldErrors.son_degisim_km}
          >
            <Input
              id="component-son-km"
              type="text"
              inputMode="numeric"
              value={form.son_degisim_km}
              onChange={(e) => handleSonDegisimKmChange(e.target.value)}
              placeholder={isSmh ? 'Örn: 1.250' : 'Örn: 115.000'}
              aria-invalid={hasSayacError || undefined}
              {...sayacAria(sayacHatasi, 'component-sayac-error')}
              className={cn(
                'font-mono tabular-nums',
                hasSayacError && 'border-destructive focus-visible:border-destructive'
              )}
            />
            <SayacFieldError id="component-sayac-error" hata={sayacHatasi} />
          </SheetField>

          <SheetField
            label={`Değişim Aralığı (${birimEtiketi})`}
            htmlFor="component-aralik-km"
            hint="Boş bırakılırsa Tarih Bazlı izlenir"
            error={fieldErrors.degisim_araligi_km}
          >
            <Input
              id="component-aralik-km"
              type="text"
              inputMode="numeric"
              value={form.degisim_araligi_km}
              onChange={(e) => updateField('degisim_araligi_km', e.target.value)}
              placeholder={isSmh ? 'Örn: 250' : 'Örn: 30.000'}
              aria-invalid={Boolean(fieldErrors.degisim_araligi_km) || undefined}
              className={cn(
                'font-mono tabular-nums',
                fieldErrors.degisim_araligi_km &&
                  'border-destructive focus-visible:border-destructive'
              )}
            />
          </SheetField>

          <SheetField
            label="Son Değişim Tarihi"
            required
            error={fieldErrors.son_degisim_tarihi}
          >
            <TrussDatePicker
              name="son_degisim_tarihi"
              value={form.son_degisim_tarihi}
              onChange={(e) => updateField('son_degisim_tarihi', e.target.value)}
              placeholder="Değişim tarihi seçin"
            />
          </SheetField>

          <SheetField
            label="Maliyet (₺)"
            htmlFor="component-maliyet"
            hint="Opsiyonel — boşsa 0 TL"
            error={fieldErrors.maliyet}
          >
            <Input
              id="component-maliyet"
              type="text"
              inputMode="decimal"
              value={form.maliyet}
              onChange={(e) => updateField('maliyet', e.target.value)}
              placeholder="Örn: 4.500,00"
              aria-invalid={Boolean(fieldErrors.maliyet) || undefined}
              className={cn(
                'font-mono tabular-nums',
                fieldErrors.maliyet && 'border-destructive focus-visible:border-destructive'
              )}
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>

      {/* 3. Bölüm: Notlar */}
      <SheetFormSection
        title="Notlar"
        description="Marka, parça kodu, garanti veya servis açıklaması"
      >
        <SheetFormGrid columns={1}>
          <SheetField label="Notlar" htmlFor="component-notlar" error={fieldErrors.notlar}>
            <Textarea
              id="component-notlar"
              rows={3}
              maxLength={1000}
              value={form.notlar}
              onChange={(e) => updateField('notlar', e.target.value)}
              placeholder="Örn: OEM set, yetkili serviste değiştirildi..."
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>
    </AppSheet>
  );
}
