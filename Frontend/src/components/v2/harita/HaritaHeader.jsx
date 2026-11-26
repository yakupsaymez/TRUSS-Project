import React from 'react';
import { MapPinOff, Navigation, X } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function HaritaHeader({
  isFleetEmpty,
  knownLocationCount,
  totalCount,
  unpositionedCount,
  unpositionedOpen,
  onToggleUnpositioned,
  isSingleVehicle,
  selectedGlobalVehicle,
  onResetVehicleFilter,
  onOpenCheckIn,
  canCheckIn,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Harita</h1>
          {!isFleetEmpty && (
            <Badge variant="secondary" className="font-mono text-xs tabular-nums">
              {knownLocationCount}/{totalCount} konum aktif
            </Badge>
          )}
          {!isFleetEmpty && unpositionedCount > 0 && (
            <button
              type="button"
              onClick={onToggleUnpositioned}
              aria-pressed={unpositionedOpen}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-colors',
                unpositionedOpen
                  ? 'border-status-warning bg-status-warning/15 text-status-warning'
                  : 'border-status-warning/40 bg-status-warning/10 text-status-warning hover:bg-status-warning/20'
              )}
            >
              <MapPinOff className="size-3" aria-hidden="true" />
              <span>Koordinatsız Araçlar ({unpositionedCount})</span>
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Canlı filo konum takibi, Türkiye lojistik koridoru ve saha check-in bildirimleri
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isSingleVehicle && !isFleetEmpty && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
            <span className="tabular-nums">
              Tek araç görünümü
              {selectedGlobalVehicle?.plaka
                ? ` · ${formatTurkishPlate(selectedGlobalVehicle.plaka)}`
                : ''}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetVehicleFilter}
              className="h-6 gap-1 rounded-full px-2 text-xs text-primary hover:bg-primary/15 hover:text-primary"
            >
              <span>Tümünü Göster</span>
              <X className="size-3" aria-hidden="true" />
            </Button>
          </div>
        )}

        {!isFleetEmpty && canCheckIn && (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onOpenCheckIn()}
          >
            <Navigation className="size-3.5" aria-hidden="true" />
            <span>Konum Bildir (Check-In)</span>
          </Button>
        )}
      </div>
    </div>
  );
}
