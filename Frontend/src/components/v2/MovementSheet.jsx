import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Fuel, Wrench } from 'lucide-react';
import yakitService from '@/services/yakitService';
import bakimService from '@/services/bakimService';
import { isSmhArac } from '@/utils/aracDurum';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { getTodayIso } from '@/utils/dateUtils';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { cn } from '@/lib/utils';

const YAKIT_TIPLERI = ['Dizel', 'Benzin', 'LPG', 'Elektrik', 'Diğer'];

const ISLEM_TURLERI = [
  'Periyodik Bakım',
  'Yağ & Filtre Bakımı',
  'Fren Sistemi Bakımı',
  'Triger & Ağır Bakım',
  'Arıza & Mekanik Onarım',
  'Lastik & Rot Balans',
  'Kaporta & Boya',
  'Akü & Elektrik',
  'Muayene & Resmi Evrak',
  'Diğer Servis',
];

function cozumleNotVeFatura(rawNotlar, rawFatura) {
  const ham = String(rawNotlar || '').trim();
  if (rawFatura) {
    return { fatura_bilgisi: String(rawFatura).trim(), notlar: ham };
  }
  const match = ham.match(/^\[Fatura:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return { fatura_bilgisi: match[1].trim(), notlar: match[2].trim() };
  }
  return { fatura_bilgisi: '', notlar: ham };
}

function birlestirNotVeFatura(notlar, faturaBilgisi) {
  const temizNot = String(notlar || '').trim();
  const temizFatura = String(faturaBilgisi || '').trim();
  if (temizFatura && temizNot) {
    return `[Fatura: ${temizFatura}] ${temizNot}`;
  }
  if (temizFatura) {
    return `[Fatura: ${temizFatura}]`;
  }
  return temizNot || null;
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

function buildInitialForm({ mode, initialTip, record, defaultAracId, araclar, prefill = null }) {
  const todayIso = getTodayIso();

  if (mode === 'edit' && record) {
    const tip = record.tip === 'BAKIM' ? 'BAKIM' : 'YAKIT';
    const hasParsedMeta = record.fatura_bilgisi !== undefined;
    const { fatura_bilgisi, notlar } = hasParsedMeta
      ? {
          fatura_bilgisi: String(record.fatura_bilgisi || ''),
          notlar: String(record.notlar || ''),
        }
      : cozumleNotVeFatura(
          record.notlar || record.raw?.notlar || record.raw?.aciklama,
          record.raw?.fatura_no || record.raw?.fatura_bilgisi
        );

    return {
      tip,
      arac_id: record.arac_id !== undefined && record.arac_id !== null ? String(record.arac_id) : '',
      tarih: record.tarih ? String(record.tarih).slice(0, 10) : todayIso,
      yakit_tipi:
        tip === 'YAKIT' ? record.altTur || record.raw?.yakit_tipi || 'Dizel' : 'Dizel',
      bakim_tipi:
        tip === 'BAKIM'
          ? record.altTur || record.raw?.bakim_tipi || 'Periyodik Bakım'
          : 'Periyodik Bakım',
      km:
        record.km !== null && record.km !== undefined && record.km !== ''
          ? formatLocaleNumber(record.km, 0)
          : '',
      litre:
        tip === 'YAKIT' && record.litre !== null && record.litre !== undefined && record.litre !== ''
          ? formatLocaleNumber(record.litre, 2)
          : '',
      tutar:
        record.tutar !== null && record.tutar !== undefined && record.tutar !== ''
          ? formatLocaleNumber(record.tutar, 2)
          : '',
      fatura_bilgisi,
      notlar,
    };
  }

  if (mode === 'repeat' && record) {
    // §10.4 kesin kuralı: araç, tür, yakıt/bakım tipi, litre (yakıtsa) kopyalanır;
    // tarih bugün olur; sayaç (km), tutar, fatura ve notlar BOŞ açılır.
    const tip = record.tip === 'BAKIM' ? 'BAKIM' : 'YAKIT';
    return {
      tip,
      arac_id: record.arac_id !== undefined && record.arac_id !== null ? String(record.arac_id) : '',
      tarih: todayIso,
      yakit_tipi:
        tip === 'YAKIT' ? record.altTur || record.raw?.yakit_tipi || 'Dizel' : 'Dizel',
      bakim_tipi:
        tip === 'BAKIM'
          ? record.altTur || record.raw?.bakim_tipi || 'Periyodik Bakım'
          : 'Periyodik Bakım',
      km: '',
      litre:
        tip === 'YAKIT' && record.litre !== null && record.litre !== undefined && record.litre !== ''
          ? formatLocaleNumber(record.litre, 2)
          : '',
      tutar: '',
      fatura_bilgisi: '',
      notlar: '',
    };
  }

  const tip = initialTip === 'BAKIM' ? 'BAKIM' : 'YAKIT';
  const prefillAracId =
    prefill?.arac_id !== undefined && prefill?.arac_id !== null && prefill?.arac_id !== ''
      ? String(prefill.arac_id)
      : resolveDefaultAracId(defaultAracId, araclar);

  return {
    tip,
    arac_id: prefillAracId,
    tarih: todayIso,
    yakit_tipi: prefill?.yakit_tipi || 'Dizel',
    bakim_tipi: prefill?.bakim_tipi || 'Periyodik Bakım',
    km:
      prefill?.km !== undefined && prefill?.km !== null && prefill?.km !== ''
        ? formatLocaleNumber(prefill.km, 0)
        : '',
    litre:
      tip === 'YAKIT' &&
      prefill?.litre !== undefined &&
      prefill?.litre !== null &&
      prefill?.litre !== ''
        ? formatLocaleNumber(prefill.litre, 2)
        : '',
    tutar:
      prefill?.tutar !== undefined && prefill?.tutar !== null && prefill?.tutar !== ''
        ? formatLocaleNumber(prefill.tutar, 2)
        : '',
    fatura_bilgisi: prefill?.fatura_bilgisi ? String(prefill.fatura_bilgisi) : '',
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

function parsePositiveDecimal(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { valid: false, value: null };
  const parsed = parseLocaleNumber(trimmed);
  if (parsed === null || !Number.isFinite(parsed) || parsed <= 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value: parsed };
}

export default function MovementSheet({
  open,
  onOpenChange,
  mode = 'create',
  initialTip = 'YAKIT',
  record = null,
  prefill = null,
  araclar = [],
  defaultAracId = null,
  onSuccess,
}) {
  const [form, setForm] = useState(() =>
    buildInitialForm({ mode, initialTip, record, defaultAracId, araclar, prefill })
  );
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    buildInitialForm({ mode, initialTip, record, defaultAracId, araclar, prefill })
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
      initialTip,
      record,
      defaultAracId,
      araclar: araclarRef.current,
      prefill,
    });
    setForm(next);
    setInitialSnapshot(next);
    setFieldErrors({});
    setSayacHatasi(null);
  }, [open, mode, initialTip, record, defaultAracId, prefill]);

  // Araç listesi sheet açıkken sonradan yüklenirse ve araç henüz boşsa ilk aracı varsayılan seç (snapshot ile senkron)
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

  const yakitOptions = useMemo(() => {
    if (form.yakit_tipi && !YAKIT_TIPLERI.includes(form.yakit_tipi)) {
      return [form.yakit_tipi, ...YAKIT_TIPLERI];
    }
    return YAKIT_TIPLERI;
  }, [form.yakit_tipi]);

  const bakimOptions = useMemo(() => {
    if (form.bakim_tipi && !ISLEM_TURLERI.includes(form.bakim_tipi)) {
      return [form.bakim_tipi, ...ISLEM_TURLERI];
    }
    return ISLEM_TURLERI;
  }, [form.bakim_tipi]);

  const selectedAracInList = useMemo(
    () => !form.arac_id || araclar.some((a) => String(a.arac_id) === String(form.arac_id)),
    [araclar, form.arac_id]
  );

  const liveUnitPriceHint = useMemo(() => {
    if (!isYakit) return undefined;
    const litreNum = parseLocaleNumber(form.litre);
    const tutarNum = parseLocaleNumber(form.tutar);
    if (litreNum > 0 && tutarNum > 0) {
      return `Birim fiyat: ${formatLocaleNumber(tutarNum / litreNum, 2)} ₺/L`;
    }
    return undefined;
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
    setForm((prev) => ({ ...prev, tip: nextTip === 'BAKIM' ? 'BAKIM' : 'YAKIT' }));
    setFieldErrors({});
    setSayacHatasi(null);
  };

  const handleAracChange = (nextAracId) => {
    setForm((prev) => ({ ...prev, arac_id: nextAracId }));
    setSayacHatasi(null);
    clearFieldError('arac_id');
  };

  const handleTarihChange = (nextTarih) => {
    setForm((prev) => ({ ...prev, tarih: nextTarih }));
    setSayacHatasi(null);
    clearFieldError('tarih');
  };

  const handleKmChange = (nextKm) => {
    setForm((prev) => ({ ...prev, km: nextKm }));
    setSayacHatasi(null);
    clearFieldError('km');
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors = {};
    const todayIso = getTodayIso();

    if (!form.arac_id) {
      errors.arac_id = 'Araç seçimi zorunludur.';
    }

    if (!form.tarih) {
      errors.tarih = 'Tarih zorunludur.';
    } else if (form.tarih > todayIso) {
      errors.tarih = 'İleri tarihli kayıt girilemez.';
    }

    const kmRes = parseNonNegativeInteger(form.km, { required: !isYakit });
    if (!kmRes.valid) {
      errors.km = isYakit
        ? 'Geçerli bir tam sayı (≥ 0) girin veya boş bırakın.'
        : 'Geçerli bir tam sayı (≥ 0) girin.';
    }

    let litreRes = { valid: true, value: null };
    if (isYakit) {
      litreRes = parsePositiveDecimal(form.litre);
      if (!litreRes.valid) {
        errors.litre = "Litre 0'dan büyük olmalıdır.";
      }
    }

    const tutarRes = parsePositiveDecimal(form.tutar);
    if (!tutarRes.valid) {
      errors.tutar = isYakit
        ? "Tutar 0'dan büyük olmalıdır."
        : "Maliyet 0'dan büyük olmalıdır.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const combinedNotes = birlestirNotVeFatura(form.notlar, form.fatura_bilgisi);
    const aracIdNum = Number(form.arac_id);

    setIsSubmitting(true);
    setFieldErrors({});
    setSayacHatasi(null);

    try {
      if (isYakit) {
        const payload = {
          arac_id: aracIdNum,
          yakit_tipi: form.yakit_tipi || 'Dizel',
          tarih: form.tarih,
          litre: litreRes.value,
          tutar: tutarRes.value,
          km: kmRes.value,
          notlar: combinedNotes,
        };

        if (isEditMode) {
          await yakitService.yakitGuncelle(record.rawId, payload);
        } else {
          await yakitService.yakitEkle(payload);
        }
      } else {
        const payload = {
          arac_id: aracIdNum,
          bakim_tipi: form.bakim_tipi || 'Periyodik Bakım',
          tarih: form.tarih,
          km: kmRes.value,
          maliyet: tutarRes.value,
          notlar: combinedNotes,
        };

        if (isEditMode) {
          await bakimService.bakimGuncelle(record.rawId, payload);
        } else {
          await bakimService.bakimEkle(payload);
        }
      }

      await onSuccess?.();
      toast.success(
        isEditMode
          ? isYakit
            ? 'Yakıt kaydı güncellendi.'
            : 'Bakım kaydı güncellendi.'
          : isYakit
            ? 'Yakıt kaydı eklendi.'
            : 'Bakım kaydı eklendi.'
      );
      onOpenChange?.(false);
    } catch (err) {
      const status = getErrorStatus(err);

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

      notifyApiError(
        err,
        isEditMode
          ? isYakit
            ? 'Yakıt kaydı güncellenemedi.'
            : 'Bakım kaydı güncellenemedi.'
          : isYakit
            ? 'Yakıt kaydı eklenemedi.'
            : 'Bakım kaydı eklenemedi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isEditMode
    ? isYakit
      ? 'Yakıt Kaydını Düzenle'
      : 'Bakım Kaydını Düzenle'
    : isRepeatMode
      ? isYakit
        ? 'Yakıt Kaydını Tekrarla'
        : 'Bakım Kaydını Tekrarla'
      : isYakit
        ? 'Yeni Yakıt Kaydı'
        : 'Yeni Bakım Kaydı';

  const description = isEditMode
    ? 'Kayıt tarihini, sayaç değerini, maliyet ve fatura/not bilgilerini güncelleyin.'
    : isRepeatMode
      ? 'Araç ve tür bilgileri önceki kayıttan alındı. Güncel sayaç ve tutar bilgilerini girerek yeni kayıt oluşturun.'
      : 'Filo aracına yeni yakıt ikmali veya servis/bakım harcaması ekleyin.';

  const badge = isEditMode || isRepeatMode ? (isYakit ? 'Yakıt' : 'Bakım') : null;
  const submitLabel = isEditMode ? 'Değişiklikleri Kaydet' : 'Kaydı Ekle';
  const hasSayacError = Boolean(sayacHatasi || fieldErrors.km);

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
      {/* Kayıt Türü Seçimi (Yalnızca Yeni Kayıt Modunda) */}
      {mode === 'create' && (
        <Tabs value={form.tip} onValueChange={handleTipChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="YAKIT" className="gap-1.5 text-xs">
              <Fuel className="size-3.5" />
              <span>Yakıt</span>
            </TabsTrigger>
            <TabsTrigger value="BAKIM" className="gap-1.5 text-xs">
              <Wrench className="size-3.5" />
              <span>Bakım</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* 1. Bölüm: Araç & Tarih */}
      <SheetFormSection
        title="Araç & Tarih"
        description="İşlemin ait olduğu araç, işlem tarihi ve kayıt alt türü"
      >
        <SheetFormGrid columns={2}>
          <SheetField
            label="Araç"
            htmlFor="movement-arac"
            required
            error={fieldErrors.arac_id}
          >
            <Select value={form.arac_id} onValueChange={handleAracChange}>
              <SelectTrigger
                id="movement-arac"
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
                    {record?.plaka ? formatTurkishPlate(record.plaka) : `Araç #${form.arac_id}`}
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

          <SheetField label="Tarih" required error={fieldErrors.tarih}>
            <TrussDatePicker
              name="tarih"
              value={form.tarih}
              onChange={(e) => handleTarihChange(e.target.value)}
              placeholder="Tarih seçin"
            />
          </SheetField>

          {isYakit ? (
            <SheetField
              label="Yakıt Tipi"
              htmlFor="movement-yakit-tipi"
              error={fieldErrors.yakit_tipi}
            >
              <Select
                value={form.yakit_tipi}
                onValueChange={(val) => updateField('yakit_tipi', val)}
              >
                <SelectTrigger id="movement-yakit-tipi" className="w-full">
                  <SelectValue placeholder="Yakıt tipi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {yakitOptions.map((tip) => (
                    <SelectItem key={tip} value={tip}>
                      {tip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SheetField>
          ) : (
            <SheetField
              label="Bakım Türü"
              htmlFor="movement-bakim-tipi"
              required
              error={fieldErrors.bakim_tipi}
            >
              <Select
                value={form.bakim_tipi}
                onValueChange={(val) => updateField('bakim_tipi', val)}
              >
                <SelectTrigger id="movement-bakim-tipi" className="w-full">
                  <SelectValue placeholder="Bakım türü seçin" />
                </SelectTrigger>
                <SelectContent>
                  {bakimOptions.map((tur) => (
                    <SelectItem key={tur} value={tur}>
                      {tur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SheetField>
          )}
        </SheetFormGrid>
      </SheetFormSection>

      {/* 2. Bölüm: Sayaç & Maliyet */}
      <SheetFormSection
        title="Sayaç & Maliyet"
        description={
          isYakit
            ? 'Sayaç okuması, yakıt miktarı ve toplam ikmal tutarı'
            : 'Bakım anındaki sayaç okuması ve toplam servis maliyeti'
        }
      >
        <SheetFormGrid columns={2}>
          <SheetField
            label={isSmh ? 'Çalışma Saati (SMH)' : 'Kilometre (KM)'}
            htmlFor="movement-km"
            required={!isYakit}
            hint={isYakit ? 'Opsiyonel — boş bırakılabilir' : undefined}
            error={sayacHatasi ? undefined : fieldErrors.km}
          >
            <Input
              id="movement-km"
              type="text"
              inputMode="numeric"
              value={form.km}
              onChange={(e) => handleKmChange(e.target.value)}
              placeholder={isSmh ? 'Örn: 1.420' : 'Örn: 128.500'}
              aria-invalid={hasSayacError || undefined}
              {...sayacAria(sayacHatasi, 'movement-sayac-error')}
              className={cn(
                'font-mono tabular-nums',
                hasSayacError && 'border-destructive focus-visible:border-destructive'
              )}
            />
            <SayacFieldError id="movement-sayac-error" hata={sayacHatasi} />
          </SheetField>

          {isYakit && (
            <SheetField
              label="Litre (L)"
              htmlFor="movement-litre"
              required
              error={fieldErrors.litre}
            >
              <Input
                id="movement-litre"
                type="text"
                inputMode="decimal"
                value={form.litre}
                onChange={(e) => updateField('litre', e.target.value)}
                placeholder="Örn: 65,50"
                aria-invalid={Boolean(fieldErrors.litre) || undefined}
                className={cn(
                  'font-mono tabular-nums',
                  fieldErrors.litre && 'border-destructive focus-visible:border-destructive'
                )}
              />
            </SheetField>
          )}

          <SheetField
            label={isYakit ? 'Tutar (₺)' : 'Maliyet (₺)'}
            htmlFor="movement-tutar"
            required
            hint={liveUnitPriceHint}
            error={fieldErrors.tutar}
          >
            <Input
              id="movement-tutar"
              type="text"
              inputMode="decimal"
              value={form.tutar}
              onChange={(e) => updateField('tutar', e.target.value)}
              placeholder={isYakit ? 'Örn: 2.850,00' : 'Örn: 7.400,00'}
              aria-invalid={Boolean(fieldErrors.tutar) || undefined}
              className={cn(
                'font-mono tabular-nums',
                fieldErrors.tutar && 'border-destructive focus-visible:border-destructive'
              )}
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>

      {/* 3. Bölüm: Fatura & Notlar */}
      <SheetFormSection
        title="Fatura & Notlar"
        description="İsteğe bağlı belge numarası ve işlem açıklaması"
      >
        <SheetFormGrid columns={1}>
          <SheetField
            label="Fatura / Fiş No"
            htmlFor="movement-fatura"
            error={fieldErrors.fatura_bilgisi}
          >
            <Input
              id="movement-fatura"
              type="text"
              value={form.fatura_bilgisi}
              onChange={(e) => updateField('fatura_bilgisi', e.target.value)}
              placeholder="Örn: FT-2026-0412"
              className="font-mono"
            />
          </SheetField>

          <SheetField label="Notlar" htmlFor="movement-notlar" error={fieldErrors.notlar}>
            <Textarea
              id="movement-notlar"
              rows={3}
              value={form.notlar}
              onChange={(e) => updateField('notlar', e.target.value)}
              placeholder={
                isYakit
                  ? 'İstasyon, güzergâh veya ikmal notu...'
                  : 'Yapılan işlemler, değişen parçalar veya servis notu...'
              }
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>
    </AppSheet>
  );
}
