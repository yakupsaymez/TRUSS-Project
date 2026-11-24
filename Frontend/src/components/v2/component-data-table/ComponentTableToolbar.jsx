import React from 'react';
import { AlertTriangle, LayoutGrid, RotateCcw, Search, X } from 'lucide-react';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_VALUE, STATUS_FILTER_OPTIONS } from './componentTableHelpers';

export default function ComponentTableToolbar({
  table,
  araclar,
  seciliAracId,
  isVehicleFiltered,
  selectedVehicleInList,
  vehicleSelectValue,
  onVehicleSelectChange,
  searchQuery,
  onSearchQueryChange,
  activeStatusFilter,
  onStatusFilterChange,
  hasActiveFilters,
  onClearFilters,
  kritikCount,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-64 lg:w-72">
          <InputGroupAddon>
            <Search className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Parça adı, plaka, marka, not ara..."
            aria-label="Parçalarda ara"
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
            <SelectValue placeholder="Araç: Tümü" />
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

        <Select value={activeStatusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger
            aria-label="Durum filtresi"
            className="h-9 w-full rounded-lg border-border bg-background text-xs sm:w-44"
          >
            <SelectValue placeholder="Durum: Tümü" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
      </div>

      <div className="flex items-center gap-2">
        {kritikCount > 0 && (
          <Badge
            variant="outline"
            className="h-8 gap-1.5 border-destructive/30 bg-destructive/10 px-2.5 text-xs font-medium tabular-nums text-destructive"
          >
            <AlertTriangle className="size-3.5" />
            <span>{formatLocaleNumber(kritikCount, 0)} kritik</span>
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              aria-label="Kolon görünürlüğü"
            >
              <LayoutGrid className="size-3.5" />
              <span>Kolonlar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs">Görünür Kolonlar</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    {column.columnDef.meta?.label || column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
