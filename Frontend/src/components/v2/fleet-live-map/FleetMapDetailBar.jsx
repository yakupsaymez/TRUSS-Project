import React from 'react';
import { ExternalLink, MapPin, Truck } from 'lucide-react';
import { getGuncelSayac, getSayacBirimi } from '@/utils/aracDurum';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  formatCoord,
  formatDateTimeTr,
  hasValidCoordinates,
  resolveVehicleHealthMeta,
} from './mapHelpers';

export default function FleetMapDetailBar({
  activeVehicle,
  onOpenCheckIn,
  onOpenInFleet,
}) {
  if (!activeVehicle) return null;

  const activeHealth = resolveVehicleHealthMeta(activeVehicle);
  const activeHasCoords = hasValidCoordinates(activeVehicle);
  const activeSayac = getGuncelSayac(activeVehicle);
  const activeBirim = getSayacBirimi(activeVehicle);

  return (
    <Card className="gap-0 border border-border bg-card p-4 shadow-none">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground">
            <Truck className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold tracking-tight tabular-nums text-foreground">
                {formatTurkishPlate(activeVehicle.plaka)}
              </span>
              {activeHealth && (
                <Badge variant="outline" className={cn('text-xs', activeHealth.badgeClass)}>
                  {activeHealth.label}
                </Badge>
              )}
              {!activeHasCoords && (
                <Badge variant="secondary" className="text-xs text-muted-foreground">
                  Konum bildirilmedi
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {[activeVehicle.marka, activeVehicle.model, activeVehicle.yil]
                .filter(Boolean)
                .join(' ') || 'Filo Aracı'}
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 border-y border-border py-3 sm:grid-cols-4 xl:border-x xl:border-y-0 xl:px-6 xl:py-0">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Son Konum / Terminal</span>
            <p className="truncate text-xs font-semibold text-foreground">
              {activeHasCoords
                ? activeVehicle.son_konum_adi || 'Koordinat Kayıtlı'
                : 'Konum bildirilmedi'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Koordinatlar (Enlem / Boylam)</span>
            <p className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {activeHasCoords
                ? `${formatCoord(activeVehicle.son_enlem)}° K, ${formatCoord(activeVehicle.son_boylam)}° D`
                : '—'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Güncel Sayaç &amp; Bakım</span>
            <p className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {formatLocaleNumber(activeSayac)} {activeBirim}
              {activeHealth?.bakim?.kalan !== null && activeHealth?.bakim?.kalan !== undefined && (
                <span className="ml-1 font-normal text-muted-foreground">
                  ({activeHealth.bakim.kalan > 0 ? `${formatLocaleNumber(activeHealth.bakim.kalan)} kaldı` : 'Gecikti'})
                </span>
              )}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Son Güncelleme</span>
            <p className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {activeHasCoords ? formatDateTimeTr(activeVehicle.son_konum_zamani) : '—'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onOpenCheckIn?.(activeVehicle)}
          >
            <MapPin className="size-3.5" aria-hidden="true" />
            <span>Konum Bildir (Check-In)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onOpenInFleet?.(activeVehicle)}
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span>Filoda Aç</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
