import React from 'react';
import { sayacAria } from '@/utils/sayacHatasi';
import { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import SayacFieldError from '@/components/v2/SayacFieldError';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function MovementCostSection({
  form,
  isYakit,
  isSmh,
  fieldErrors,
  sayacHatasi,
  liveUnitPriceHint,
  handleKmChange,
  updateField,
}) {
  const hasSayacError = Boolean(sayacHatasi || fieldErrors.km);

  return (
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
          <SheetField label="Litre (L)" htmlFor="movement-litre" required error={fieldErrors.litre}>
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
  );
}
