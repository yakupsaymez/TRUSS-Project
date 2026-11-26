import React from 'react';
import { MapPin, MapPinOff, X } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HaritaUnpositionedPanel({
  vehicles = [],
  open = false,
  onClose,
  onOpenCheckIn,
}) {
  if (!open || vehicles.length === 0) return null;

  return (
    <Card className="gap-3 border border-status-warning/35 bg-card p-4 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md border border-status-warning/30 bg-status-warning/10 text-status-warning">
            <MapPinOff className="size-3.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Koordinatsız Aktif Araçlar
            </h2>
            <p className="text-xs text-muted-foreground">
              Haritada pinlenmemiş araçlara tek tıkla saha check-in konumu atayın.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs tabular-nums">
            {vehicles.length} araç
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Koordinatsız araçlar panelini kapat"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((arac) => (
          <div
            key={arac.arac_id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-semibold tabular-nums text-foreground">
                {formatTurkishPlate(arac.plaka)}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {[arac.marka, arac.model].filter(Boolean).join(' ') || 'Filo Aracı'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 text-xs"
              onClick={() => onOpenCheckIn?.(arac)}
            >
              <MapPin className="size-3 text-primary" aria-hidden="true" />
              <span>Konum Bildir</span>
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
