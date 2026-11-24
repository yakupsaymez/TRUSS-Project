import React from 'react';
import { getGuncelSayac } from '@/utils/aracDurum';
import { formatLocaleNumber } from '@/utils/formatters';
import { sayacAria } from '@/utils/sayacHatasi';
import { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import SayacFieldError from '@/components/v2/SayacFieldError';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { cn } from '@/lib/utils';

export default function ComponentLifecycleSection({
  form,
  selectedArac,
  isSmh,
  birim,
  birimEtiketi,
  fieldErrors,
  sayacHatasi,
  handleSonDegisimKmChange,
  updateField,
}) {
  const hasSayacError = Boolean(sayacHatasi || fieldErrors.son_degisim_km);

  return (
    <>
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

          <SheetField label="Son Değişim Tarihi" required error={fieldErrors.son_degisim_tarihi}>
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
    </>
  );
}
