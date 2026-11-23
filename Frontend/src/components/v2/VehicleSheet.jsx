import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import aracService from '@/services/aracService';
import useVehicleStore from '@/store/useVehicleStore';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
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

const ARAC_TIPLERI = [
  'Otomobil',
  'Ticari / Hafif Ticari',
  'Ağır Vasıta / Çekici',
  'SUV / Pick-Up',
  'İş Makinesi',
  'Elektrikli Araç',
];

const CURRENT_DEFAULT_YEAR = String(Math.min(2027, Math.max(1950, new Date().getFullYear())));

function buildInitialForm(arac) {
  if (!arac) {
    return {
      plaka: '',
      kategori: 'Otomobil',
      marka: '',
      model: '',
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
    kategori: arac.kategori || 'Otomobil',
    marka: arac.marka || '',
    model: arac.model || '',
    yil: arac.yil !== null && arac.yil !== undefined ? String(arac.yil) : CURRENT_DEFAULT_YEAR,
    sayac_tipi: isSmh ? 'SMH' : 'KM',
    guncel_sayac: formatLocaleNumber(mevcutSayac, 0),
    bakim_periyodu: formatLocaleNumber(mevcutPeriyot, 0),
    triger_degisim_km: arac.triger_degisim_km
      ? formatLocaleNumber(arac.triger_degisim_km, 0)
      : '',
    muayene_tarihi: arac.muayene_tarihi ? String(arac.muayene_tarihi).slice(0, 10) : '',
    sigorta_tarihi: arac.sigorta_tarihi ? String(arac.sigorta_tarihi).slice(0, 10) : '',
    kasko_tarihi: arac.kasko_tarihi ? String(arac.kasko_tarihi).slice(0, 10) : '',
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

export default function VehicleSheet({ open, onOpenChange, arac = null, onSuccess }) {
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const isEditMode = Boolean(arac);

  const [form, setForm] = useState(() => buildInitialForm(arac));
  const [initialSnapshot, setInitialSnapshot] = useState(() => buildInitialForm(arac));
  const [fieldErrors, setFieldErrors] = useState({});
  const [sayacHatasi, setSayacHatasi] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = buildInitialForm(arac);
    setForm(next);
    setInitialSnapshot(next);
    setFieldErrors({});
    setSayacHatasi(null);
  }, [open, arac]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialSnapshot),
    [form, initialSnapshot]
  );

  const kategoriOptions = useMemo(() => {
    if (form.kategori && !ARAC_TIPLERI.includes(form.kategori)) {
      return [form.kategori, ...ARAC_TIPLERI];
    }
    return ARAC_TIPLERI;
  }, [form.kategori]);

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

  const handleKategoriChange = (nextKategori) => {
    setForm((prev) => {
      if (!isEditMode && nextKategori === 'İş Makinesi') {
        return {
          ...prev,
          kategori: nextKategori,
          sayac_tipi: 'SMH',
          bakim_periyodu: '250',
        };
      }
      return { ...prev, kategori: nextKategori };
    });
    clearFieldError('kategori');
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

    const trimmedMarka = form.marka.trim();
    if (trimmedMarka.length < 2) {
      errors.marka = 'Marka en az 2 karakter olmalıdır.';
    }

    const trimmedModel = form.model.trim();
    if (trimmedModel.length < 1) {
      errors.model = 'Model zorunludur.';
    }

    const parsedYil = Number(form.yil);
    if (!String(form.yil).trim() || !Number.isInteger(parsedYil) || parsedYil < 1950 || parsedYil > 2027) {
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

    const payload = {
      plaka: formattedPlaka,
      kategori_id: arac?.kategori_id || null,
      kategori: form.kategori || 'Otomobil',
      varyant_id: arac?.varyant_id || null,
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

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Aracı Düzenle' : 'Yeni Araç Ekle'}
      description={
        isEditMode
          ? 'Araç kimliği, sayaç kalibrasyonu, bakım periyodu ve belge vadelerini güncelleyin.'
          : 'Filoya yeni araç ekleyin; sayaç tipi, bakım periyodu ve resmi evrak vadelerini tanımlayın.'
      }
      badge={isEditMode ? formatTurkishPlate(arac.plaka) : null}
      submitLabel={isEditMode ? 'Değişiklikleri Kaydet' : 'Aracı Ekle'}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      {/* 1. Bölüm: Kimlik & Sınıflandırma */}
      <SheetFormSection
        title="Kimlik & Sınıflandırma"
        description="Plaka, araç kategorisi ve temel marka/model bilgileri"
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

          <SheetField label="Kategori" htmlFor="vehicle-kategori" error={fieldErrors.kategori}>
            <Select value={form.kategori} onValueChange={handleKategoriChange}>
              <SelectTrigger id="vehicle-kategori" className="w-full">
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {kategoriOptions.map((tip) => (
                  <SelectItem key={tip} value={tip}>
                    {tip}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>

          <SheetField
            label="Marka"
            htmlFor="vehicle-marka"
            required
            error={fieldErrors.marka}
          >
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
          </SheetField>

          <SheetField
            label="Model"
            htmlFor="vehicle-model"
            required
            error={fieldErrors.model}
          >
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
          <SheetField label="Muayene Tarihi">
            <TrussDatePicker
              name="muayene_tarihi"
              value={form.muayene_tarihi}
              onChange={(e) => updateField('muayene_tarihi', e.target.value)}
              placeholder="Muayene tarihi seçin"
            />
          </SheetField>

          <SheetField label="Trafik Sigortası Tarihi">
            <TrussDatePicker
              name="sigorta_tarihi"
              value={form.sigorta_tarihi}
              onChange={(e) => updateField('sigorta_tarihi', e.target.value)}
              placeholder="Sigorta tarihi seçin"
            />
          </SheetField>

          <SheetField label="Kasko Tarihi">
            <TrussDatePicker
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
