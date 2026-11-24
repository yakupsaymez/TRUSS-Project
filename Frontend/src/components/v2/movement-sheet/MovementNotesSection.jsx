import React from 'react';
import { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function MovementNotesSection({ form, isYakit, fieldErrors, updateField }) {
  return (
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
  );
}
