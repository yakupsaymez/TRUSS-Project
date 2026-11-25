import React from 'react';
import { RotateCcw, Search, Upload, X } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { ALL_VALUE } from './ledgerTableHelpers';

export default function LedgerTableToolbar({
  araclar,
  seciliAracId,
  isVehicleFiltered,
  selectedVehicleInList,
  vehicleSelectValue,
  onVehicleSelectChange,
  searchQuery,
  onSearchQueryChange,
  altTurFilter,
  onAltTurFilterChange,
  altTurOptions,
  baslangicTarihi,
  bitisTarihi,
  onBaslangicChange,
  onBitisChange,
  hasActiveFilters,
  onClearFilters,
  onImportFuel,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-64 lg:w-72">
          <InputGroupAddon>
            <Search className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Plaka, marka, tür, fatura, not ara..."
            aria-label="Hareketlerde ara"
          />
          {searchQuery && (
            <InputGroupAddon align="inline-end">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onSearchQueryChange('')}
                aria-label="Aramayı temizle"
              >
                <X className="size-3.5" />
              </Button>
            </InputGroupAddon>
          )}
        </InputGroup>

        <Select value={vehicleSelectValue} onValueChange={onVehicleSelectChange}>
          <SelectTrigger
            aria-label="Araç filtresi"
            className="h-9 w-full rounded-lg border-border bg-background text-xs sm:w-48"
          >
            <SelectValue placeholder="Tüm Araçlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Araç: Tümü</SelectItem>
            {!selectedVehicleInList && isVehicleFiltered && (
              <SelectItem value={String(seciliAracId)}>Araç #{seciliAracId}</SelectItem>
            )}
            {araclar.map((arac) => (
              <SelectItem key={arac.arac_id} value={String(arac.arac_id)}>
                <span className="font-mono font-medium">{formatTurkishPlate(arac.plaka)}</span>
                {arac.marka ? ` — ${arac.marka}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={altTurFilter} onValueChange={onAltTurFilterChange}>
          <SelectTrigger
            aria-label="Alt tür filtresi"
            className="h-9 w-full rounded-lg border-border bg-background text-xs sm:w-44"
          >
            <SelectValue placeholder="Tür: Tümü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Alt Tür: Tümü</SelectItem>
            {altTurOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <TrussDatePicker
              name="baslangicTarihi"
              value={baslangicTarihi}
              onChange={(e) => onBaslangicChange(e.target.value)}
              placeholder="Başlangıç"
              className="h-9 text-xs"
            />
          </div>
          <div className="w-40">
            <TrussDatePicker
              name="bitisTarihi"
              value={bitisTarihi}
              onChange={(e) => onBitisChange(e.target.value)}
              placeholder="Bitiş"
              className="h-9 text-xs"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            <span>Filtreleri Temizle</span>
          </Button>
        )}

        {onImportFuel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onImportFuel}
            className="h-9 gap-1.5 text-xs sm:ml-auto"
          >
            <Upload className="size-3.5" />
            <span>Ekstre Yükle (CSV)</span>
          </Button>
        )}
      </div>
    </div>
  );
}
