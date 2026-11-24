import React from 'react';
import { formatTurkishPlate } from '@/utils/formatters';
import { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function ComponentIdentitySection({
  form,
  araclar,
  parca,
  selectedAracInList,
  isCreateMode,
  isReplaceMode,
  fieldErrors,
  handleAracChange,
  updateField,
}) {
  return (
    <SheetFormSection
      title="Araç & Parça Kimliği"
      description="Takibe alınacak araç ve bileşen adı"
    >
      <SheetFormGrid columns={2}>
        <SheetField label="Araç" htmlFor="component-arac" required error={fieldErrors.arac_id}>
          {/* ADR-09: Edit & replace modunda arac_id değiştirilemez */}
          <Select
            value={form.arac_id}
            onValueChange={handleAracChange}
            disabled={!isCreateMode}
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
  );
}
