import React from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Gauge } from 'lucide-react';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFleetEfficiency } from './overview/useFleetEfficiency';

const PERIOD_OPTIONS = [
  { value: 90, label: '90 Gün' },
  { value: 180, label: '180 Gün' },
  { value: 365, label: '365 Gün' },
];

const SKOR_BADGE_MAP = {
  optimal: 'border-status-success/30 bg-status-success/10 text-status-success',
  izle: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
  yenileme_adayi: 'border-destructive/30 bg-destructive/10 text-destructive',
  yetersiz_veri: 'border-border bg-muted/50 text-muted-foreground',
};

export default function FleetEfficiencyCard({
  canViewAnalytics = false,
  seciliAracId = 'tum',
  onSelectVehicle,
  donemGun: controlledDonemGun,
  onDonemGunChange,
  className,
}) {
  const {
    donemGun, setDonemGun, loading, expanded, setExpanded,
    filteredItems, ozet, yenilemeSayisi, izleSayisi, displayedItems, hiddenCount,
  } = useFleetEfficiency({
    canViewAnalytics, seciliAracId, donemGun: controlledDonemGun, onDonemGunChange,
  });

  if (!canViewAnalytics) return null;

  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Gauge className="size-4 text-primary" aria-hidden="true" />
            <span>Filo Verimliliği & Yenileme Skoru</span>
          </CardTitle>
          {!loading && yenilemeSayisi > 0 && (
            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[11px] font-medium text-destructive tabular-nums">
              {yenilemeSayisi} Yenileme Adayı
            </Badge>
          )}
          {!loading && izleSayisi > 0 && (
            <Badge variant="outline" className="border-status-warning/30 bg-status-warning/10 text-[11px] font-medium text-status-warning tabular-nums">
              {izleSayisi} İzle
            </Badge>
          )}
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={donemGun === opt.value ? 'default' : 'ghost'}
              onClick={() => setDonemGun(opt.value)}
              className={cn(
                'h-6 rounded-md px-2.5 text-xs tabular-nums',
                donemGun === opt.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            {[0, 1, 2].map((idx) => <Skeleton key={idx} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                <span className="font-medium text-muted-foreground">KM Filo Ort.</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {ozet.km_ort_birim_maliyet != null ? `${formatLocaleNumber(ozet.km_ort_birim_maliyet, 2)} TL/km` : 'Veri yok'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                <span className="font-medium text-muted-foreground">SMH Filo Ort.</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {ozet.smh_ort_birim_maliyet != null ? `${formatLocaleNumber(ozet.smh_ort_birim_maliyet, 2)} TL/saat` : 'Veri yok'}
                </span>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-4 text-xs text-muted-foreground">
                Seçili dönem için verimlilik analizi verisi bulunamadı.
              </div>
            ) : (
              <>
                <div className={cn('divide-y divide-border overflow-hidden rounded-lg border border-border', expanded && 'max-h-96 overflow-y-auto')}>
                  {displayedItems.map((item) => {
                    const durumKey = item?.veri_yeterli && SKOR_BADGE_MAP[item?.skor_durum] ? item.skor_durum : 'yetersiz_veri';
                    const isSmh = item?.sayac_tipi === 'SMH';
                    const costUnit = isSmh ? 'TL/saat' : 'TL/km';
                    const consUnit = isSmh ? 'L/saat' : 'L/100km';
                    const primaryReason = Array.isArray(item?.nedenler) ? item.nedenler[0] : null;
                    const scoreLabel = durumKey === 'yetersiz_veri' || item?.verimlilik_skoru == null
                      ? 'Veri yok'
                      : `${item.verimlilik_skoru}/100`;

                    return (
                      <button
                        key={item.arac_id}
                        type="button"
                        onClick={() => onSelectVehicle?.({ arac_id: item.arac_id, plaka: item.plaka })}
                        className="flex w-full items-center justify-between gap-3 bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-foreground">
                              {formatTurkishPlate(item.plaka)}
                            </span>
                            <Badge variant="outline" className={cn('h-5 px-1.5 font-mono text-[11px] font-semibold tabular-nums', SKOR_BADGE_MAP[durumKey])}>
                              {scoreLabel}
                            </Badge>
                            {item?.birim_maliyet != null && (
                              <span className="font-mono text-xs tabular-nums text-foreground">
                                {formatLocaleNumber(item.birim_maliyet, 2)} {costUnit}
                              </span>
                            )}
                            {item?.ort_tuketim != null && (
                              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                                · {formatLocaleNumber(item.ort_tuketim, 2)} {consUnit}
                              </span>
                            )}
                          </div>
                          {primaryReason && <p className="truncate text-[11px] text-muted-foreground">{primaryReason}</p>}
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>

                {hiddenCount > 0 && (
                  <div className="flex justify-center pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded((prev) => !prev)}
                      className="h-7 gap-1 px-3 text-xs text-primary hover:text-primary"
                    >
                      {expanded ? (
                        <><span>Daralt</span><ChevronUp className="size-3.5" aria-hidden="true" /></>
                      ) : (
                        <><span>Tümünü Göster (+{hiddenCount})</span><ChevronDown className="size-3.5" aria-hidden="true" /></>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
