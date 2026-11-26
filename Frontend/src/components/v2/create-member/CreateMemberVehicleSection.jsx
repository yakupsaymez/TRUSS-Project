import React from 'react';
import { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { formatTurkishPlate } from '@/utils/formatters';

const NO_VEHICLE_VALUE = '__none__';

export default function CreateMemberVehicleSection({
  form,
  fieldErrors,
  vehicles,
  isSubmitting,
  onChange,
}) {
  return (
    <SheetFormSection
      title="İlk Araç Zimmeti (Opsiyonel)"
      description="Yalnızca Şoför rolündeki üyeye kayıt sırasında araç zimmetlenebilir."
    >
      <SheetFormGrid>
        <SheetField label="Zimmetlenecek Araç" htmlFor="create-member-vehicle">
          <Select
            value={form.arac_id || NO_VEHICLE_VALUE}
            onValueChange={(value) =>
              onChange('arac_id', value === NO_VEHICLE_VALUE ? '' : value)
            }
            disabled={isSubmitting}
          >
            <SelectTrigger id="create-member-vehicle">
              <SelectValue placeholder="Zimmetleme" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NO_VEHICLE_VALUE}>Zimmetleme</SelectItem>
                {vehicles.map((v) => {
                  const plate = formatTurkishPlate(v.plaka || '') || v.plaka;
                  const desc = [v.marka, v.model].filter(Boolean).join(' ').trim();
                  return (
                    <SelectItem key={v.arac_id} value={String(v.arac_id)}>
                      <span className="font-mono tabular-nums">{plate}</span>
                      {desc ? ` · ${desc}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </SheetField>

        <SheetField
          label="Zimmet Tarihi"
          htmlFor="create-member-assign-date"
          error={fieldErrors.atanma_tarihi}
        >
          <TrussDatePicker
            id="create-member-assign-date"
            name="atanma_tarihi"
            value={form.atanma_tarihi}
            onChange={(e) => onChange('atanma_tarihi', e?.target?.value ?? '')}
            disabled={isSubmitting || !form.arac_id}
          />
        </SheetField>
      </SheetFormGrid>
    </SheetFormSection>
  );
}
