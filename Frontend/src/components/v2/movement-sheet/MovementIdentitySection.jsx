import React from 'react';
import { formatTurkishPlate } from '@/utils/formatters';
import { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { cn } from '@/lib/utils';

export default function MovementIdentitySection({
  form,
  isYakit,
  araclar,
  record,
  selectedAracInList,
  yakitOptions,
  bakimOptions,
  fieldErrors,
  handleAracChange,
  handleTarihChange,
  updateField,
}) {
  return (
    <SheetFormSection
      title="Araç & Tarih"
      description="İşlemin ait olduğu araç, işlem tarihi ve kayıt alt türü"
    >
      <SheetFormGrid columns={2}>
        <SheetField label="Araç" htmlFor="movement-arac" required error={fieldErrors.arac_id}>
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
  );
}
