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
import { CURRENT_DEFAULT_YEAR, MANUAL_OPTION } from './vehicleSheetHelpers';

export default function VehicleCatalogSection({ form, fieldErrors, katalog, updateField }) {
  const {
    kategoriler,
    markalar,
    modeller,
    varyantlar,
    loadingKatalog,
    manualKategori,
    manualMarka,
    manualModel,
    kategoriSelectValue,
    markaSelectValue,
    modelSelectValue,
    varyantSelectValue,
    handleKategoriSelect,
    handleMarkaSelect,
    handleModelSelect,
    handleVaryantSelect,
  } = katalog;

  return (
    <SheetFormSection
      title="Kimlik & Sınıflandırma"
      description="Plaka, kategori, marka, model ve motor/kasa varyantı seçimi"
    >
      <SheetFormGrid columns={2}>
        <SheetField label="Plaka" htmlFor="vehicle-plaka" required error={fieldErrors.plaka}>
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

        <SheetField
          label="Kategori"
          htmlFor={manualKategori ? 'vehicle-kategori-manual' : 'vehicle-kategori'}
          required
          error={fieldErrors.kategori}
        >
          <div className="space-y-2">
            <Select
              value={kategoriSelectValue}
              onValueChange={handleKategoriSelect}
              disabled={loadingKatalog}
            >
              <SelectTrigger id="vehicle-kategori" className="w-full">
                <SelectValue
                  placeholder={loadingKatalog ? 'Katalog yükleniyor...' : 'Kategori seçin'}
                />
              </SelectTrigger>
              <SelectContent>
                {kategoriler.map((kat) => (
                  <SelectItem key={kat.kategori_id} value={String(kat.kategori_id)}>
                    {kat.ad}
                  </SelectItem>
                ))}
                <SelectItem value={MANUAL_OPTION}>Diğer / Manuel Gir</SelectItem>
              </SelectContent>
            </Select>

            {manualKategori && (
              <Input
                id="vehicle-kategori-manual"
                value={form.kategori}
                onChange={(e) => updateField('kategori', e.target.value)}
                placeholder="Kategori adı girin (Örn: Özel Amaçlı Araç)"
                aria-invalid={Boolean(fieldErrors.kategori) || undefined}
                className={cn(
                  fieldErrors.kategori && 'border-destructive focus-visible:border-destructive'
                )}
              />
            )}
          </div>
        </SheetField>

        <SheetField
          label="Marka"
          htmlFor={
            !manualKategori && !manualMarka && markalar.length > 0
              ? 'vehicle-marka-select'
              : 'vehicle-marka'
          }
          required
          error={fieldErrors.marka}
        >
          <div className="space-y-2">
            {!manualKategori && markalar.length > 0 && (
              <Select value={markaSelectValue} onValueChange={handleMarkaSelect}>
                <SelectTrigger id="vehicle-marka-select" className="w-full">
                  <SelectValue placeholder="Marka seçin" />
                </SelectTrigger>
                <SelectContent>
                  {markalar.map((m) => (
                    <SelectItem key={m.marka_id} value={String(m.marka_id)}>
                      {m.ad}
                    </SelectItem>
                  ))}
                  <SelectItem value={MANUAL_OPTION}>Diğer / Manuel Gir</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(manualKategori || manualMarka || markalar.length === 0) && (
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
            )}
          </div>
        </SheetField>

        <SheetField
          label="Model"
          htmlFor={
            !manualKategori &&
            !manualMarka &&
            !manualModel &&
            Boolean(form.marka_id) &&
            modeller.length > 0
              ? 'vehicle-model-select'
              : 'vehicle-model'
          }
          required
          error={fieldErrors.model}
        >
          <div className="space-y-2">
            {!manualKategori && !manualMarka && modeller.length > 0 && (
              <Select value={modelSelectValue} onValueChange={handleModelSelect}>
                <SelectTrigger id="vehicle-model-select" className="w-full">
                  <SelectValue placeholder="Model seçin" />
                </SelectTrigger>
                <SelectContent>
                  {modeller.map((mod) => (
                    <SelectItem key={mod.model_id} value={String(mod.model_id)}>
                      {mod.ad}
                    </SelectItem>
                  ))}
                  <SelectItem value={MANUAL_OPTION}>Diğer / Manuel Gir</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(manualKategori ||
              manualMarka ||
              manualModel ||
              !form.marka_id ||
              modeller.length === 0) && (
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
            )}
          </div>
        </SheetField>

        <SheetField
          label="Motor / Kasa Varyantı"
          htmlFor="vehicle-varyant"
          hint="Varyant seçildiğinde sayaç tipi ve bakım periyotları otomatik kalibre edilir"
        >
          <Select
            value={varyantSelectValue}
            onValueChange={handleVaryantSelect}
            disabled={manualKategori || manualMarka || manualModel || varyantlar.length === 0}
          >
            <SelectTrigger id="vehicle-varyant" className="w-full">
              <SelectValue
                placeholder={
                  manualKategori || manualMarka || manualModel || varyantlar.length === 0
                    ? 'Diğer / Manuel Kalibrasyon'
                    : 'Varyant seçin (opsiyonel)'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {varyantlar.map((v) => {
                const label =
                  v.etiket ||
                  [v.kasa_tipi, v.motor_adi, v.sanziman_tipi, v.yakit_tipi]
                    .filter(Boolean)
                    .join(' • ');
                return (
                  <SelectItem key={v.varyant_id} value={String(v.varyant_id)}>
                    {label}
                  </SelectItem>
                );
              })}
              <SelectItem value={MANUAL_OPTION}>Diğer / Manuel Gir</SelectItem>
            </SelectContent>
          </Select>
        </SheetField>

        <SheetField label="Model Yılı" htmlFor="vehicle-yil" required error={fieldErrors.yil}>
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
  );
}
