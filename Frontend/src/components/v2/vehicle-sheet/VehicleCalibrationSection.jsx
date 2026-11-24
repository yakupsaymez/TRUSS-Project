import React from 'react';
import { sayacAria } from '@/utils/sayacHatasi';
import { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import SayacFieldError from '@/components/v2/SayacFieldError';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function VehicleCalibrationSection({
  form,
  isSmh,
  fieldErrors,
  sayacHatasi,
  updateField,
  handleSayacTipiChange,
  handleGuncelSayacChange,
}) {
  const hasSayacError = Boolean(sayacHatasi || fieldErrors.guncel_sayac);

  return (
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
              fieldErrors.bakim_periyodu && 'border-destructive focus-visible:border-destructive'
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
              fieldErrors.triger_degisim_km && 'border-destructive focus-visible:border-destructive'
            )}
          />
        </SheetField>

        <SheetField
          label="Depo Kapasitesi (L)"
          htmlFor="vehicle-depo-kapasitesi"
          error={fieldErrors.depo_kapasitesi_l}
        >
          <Input
            id="vehicle-depo-kapasitesi"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            max="99999.9"
            value={form.depo_kapasitesi_l}
            onChange={(e) => updateField('depo_kapasitesi_l', e.target.value)}
            placeholder="Örn: 60"
            aria-invalid={Boolean(fieldErrors.depo_kapasitesi_l) || undefined}
            className={cn(
              'font-mono tabular-nums',
              fieldErrors.depo_kapasitesi_l && 'border-destructive focus-visible:border-destructive'
            )}
          />
        </SheetField>

        <SheetField
          label={isSmh ? 'Hedef Tüketim (L/saat)' : 'Hedef Tüketim (L/100km)'}
          htmlFor="vehicle-hedef-tuketim"
          error={fieldErrors.hedef_tuketim}
        >
          <Input
            id="vehicle-hedef-tuketim"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max="9999.99"
            value={form.hedef_tuketim}
            onChange={(e) => updateField('hedef_tuketim', e.target.value)}
            placeholder={isSmh ? 'Örn: 12.5' : 'Örn: 7.5'}
            aria-invalid={Boolean(fieldErrors.hedef_tuketim) || undefined}
            className={cn(
              'font-mono tabular-nums',
              fieldErrors.hedef_tuketim && 'border-destructive focus-visible:border-destructive'
            )}
          />
        </SheetField>
      </SheetFormGrid>
    </SheetFormSection>
  );
}
