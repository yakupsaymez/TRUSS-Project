import React from 'react';
import { Gauge, MapPin, Navigation, Search } from 'lucide-react';
import { getGuncelSayac, getSayacBirimi } from '@/utils/aracDurum';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import EmptyState from '@/components/v2/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  formatCoord,
  formatDateTimeTr,
  hasValidCoordinates,
  resolveVehicleHealthMeta,
} from './mapHelpers';

export default function FleetMapSidebar({
  counts,
  search,
  onSearchChange,
  filterTab,
  onFilterTabChange,
  filteredVehicles,
  activeVehicle,
  onSelectArac,
  onOpenCheckIn,
}) {
  return (
    <Card className="flex h-[540px] flex-col gap-0 overflow-hidden border border-border bg-card py-0 shadow-none lg:col-span-4">
      <CardHeader className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-foreground">Filo Konum Listesi</CardTitle>
          <Badge variant="secondary" className="font-mono text-xs tabular-nums">
            {counts.known}/{counts.all} aktif konum
          </Badge>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Plaka, marka veya konum ara..."
            className="h-8 pl-8 text-xs"
            aria-label="Plaka, marka veya konum ara"
          />
        </div>

        <Tabs value={filterTab} onValueChange={onFilterTabChange} className="w-full">
          <TabsList className="grid h-8 w-full grid-cols-3">
            <TabsTrigger value="all" className="min-w-0 truncate px-1.5 text-[11px]">
              Tümü ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="known" className="min-w-0 truncate px-1.5 text-[11px]">
              Bilinen ({counts.known})
            </TabsTrigger>
            <TabsTrigger value="pending" className="min-w-0 truncate px-1.5 text-[11px]">
              Bekleyen ({counts.pending})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <ScrollArea className="min-h-0 flex-1">
          {filteredVehicles.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="card"
                icon={MapPin}
                title="Eşleşen araç bulunamadı"
                description="Arama veya konum filtresini değiştirerek tekrar deneyin."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredVehicles.map((arac) => {
                const isSelected =
                  activeVehicle && String(arac.arac_id) === String(activeVehicle.arac_id);
                const hasCoord = hasValidCoordinates(arac);
                const health = resolveVehicleHealthMeta(arac);
                const sayac = getGuncelSayac(arac);
                const birim = getSayacBirimi(arac);

                return (
                  <div
                    key={arac.arac_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectArac?.(String(arac.arac_id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectArac?.(String(arac.arac_id));
                      }
                    }}
                    className={cn(
                      'group relative flex cursor-pointer flex-col gap-2 p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'border-l-4 border-l-primary bg-muted/60 pl-3'
                        : 'hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn('size-2 shrink-0 rounded-full', health.dotClass)}
                            aria-hidden="true"
                          />
                          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                            {formatTurkishPlate(arac.plaka)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {[arac.marka, arac.model, arac.yil].filter(Boolean).join(' ')}
                        </p>
                      </div>

                      {hasCoord ? (
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 text-[11px]', health.badgeClass)}
                        >
                          {health.label}
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[11px] text-muted-foreground"
                        >
                          Konum bildirilmedi
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                        <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate">
                          {hasCoord
                            ? arac.son_konum_adi ||
                              `${formatCoord(arac.son_enlem)}° K, ${formatCoord(arac.son_boylam)}° D`
                            : 'Henüz check-in yapılmadı'}
                        </span>
                      </span>

                      <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] tabular-nums">
                        <Gauge className="size-3 text-muted-foreground" aria-hidden="true" />
                        {formatLocaleNumber(sayac)} {birim}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {hasCoord ? formatDateTimeTr(arac.son_konum_zamani) : '—'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-[11px] text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCheckIn?.(arac);
                        }}
                      >
                        <Navigation className="size-3" aria-hidden="true" />
                        <span>Check-In</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
