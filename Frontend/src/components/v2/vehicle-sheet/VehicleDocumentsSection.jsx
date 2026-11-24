import React from 'react';
import { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';

export default function VehicleDocumentsSection({ form, updateField }) {
  return (
    <SheetFormSection
      title="Resmi Evrak Vadeleri"
      description="Muayene, trafik sigortası ve kasko bitiş tarihleri"
    >
      <SheetFormGrid columns={2}>
        <SheetField label="Muayene Tarihi" htmlFor="vehicle-muayene-tarihi">
          <TrussDatePicker
            id="vehicle-muayene-tarihi"
            name="muayene_tarihi"
            value={form.muayene_tarihi}
            onChange={(e) => updateField('muayene_tarihi', e.target.value)}
            placeholder="Muayene tarihi seçin"
          />
        </SheetField>

        <SheetField label="Trafik Sigortası Tarihi" htmlFor="vehicle-sigorta-tarihi">
          <TrussDatePicker
            id="vehicle-sigorta-tarihi"
            name="sigorta_tarihi"
            value={form.sigorta_tarihi}
            onChange={(e) => updateField('sigorta_tarihi', e.target.value)}
            placeholder="Sigorta tarihi seçin"
          />
        </SheetField>

        <SheetField label="Kasko Tarihi" htmlFor="vehicle-kasko-tarihi">
          <TrussDatePicker
            id="vehicle-kasko-tarihi"
            name="kasko_tarihi"
            value={form.kasko_tarihi}
            onChange={(e) => updateField('kasko_tarihi', e.target.value)}
            placeholder="Kasko tarihi seçin"
          />
        </SheetField>
      </SheetFormGrid>
    </SheetFormSection>
  );
}
