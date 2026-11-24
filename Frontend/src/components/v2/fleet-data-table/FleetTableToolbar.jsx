import React from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function FleetTableToolbar({
  searchQuery,
  onSearchQueryChange,
  sayacFilter,
  onSayacFilterChange,
  durumFilter,
  onDurumFilterChange,
  kategoriFilter,
  onKategoriFilterChange,
  kategoriler,
  hasActiveFilters,
  onClearFilters,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <Search className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Plaka, marka, model, şoför ara..."
            aria-label="Araç ara"
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

        <Select value={sayacFilter} onValueChange={onSayacFilterChange}>
          <SelectTrigger
            aria-label="Sayaç tipi filtresi"
            className="h-9 w-32 rounded-lg border-border bg-background text-xs"
          >
            <SelectValue placeholder="Sayaç tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sayaç: Tümü</SelectItem>
            <SelectItem value="KM">KM</SelectItem>
            <SelectItem value="SMH">SMH</SelectItem>
          </SelectContent>
        </Select>

        <Select value={durumFilter} onValueChange={onDurumFilterChange}>
          <SelectTrigger
            aria-label="Durum filtresi"
            className="h-9 w-40 rounded-lg border-border bg-background text-xs"
          >
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Durum: Tümü</SelectItem>
            <SelectItem value="kritik_bakim">Kritik Bakım</SelectItem>
            <SelectItem value="riskli_evrak">Riskli Evrak</SelectItem>
            <SelectItem value="eksik_evrak">Eksik Evrak</SelectItem>
            <SelectItem value="sorunsuz">Sorunsuz</SelectItem>
          </SelectContent>
        </Select>

        <Select value={kategoriFilter} onValueChange={onKategoriFilterChange}>
          <SelectTrigger
            aria-label="Kategori filtresi"
            className="h-9 w-44 rounded-lg border-border bg-background text-xs"
          >
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Kategori: Tümü</SelectItem>
            {kategoriler.map((kat) => (
              <SelectItem key={kat} value={kat}>
                {kat}
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
    </div>
  );
}
