import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Truck } from 'lucide-react';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import EmptyState from '@/components/v2/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { HEALTH_STATUS_META } from './useFleetHealthController';

function HealthRing({ percent, size = 52, strokeWidth = 5, strokeClass = 'stroke-primary', labelClassName }) {
  const safePercent =
    percent !== null && percent !== undefined && Number.isFinite(percent)
      ? Math.max(0, Math.min(100, Math.round(percent)))
      : null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = safePercent === null ? circumference : circumference - (safePercent / 100) * circumference;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={safePercent === null ? 'Bakım ömrü belirsiz' : `Kalan ömür %${safePercent}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90 overflow-visible">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
        {safePercent !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={cn('transition-all duration-500 ease-out', strokeClass)}
          />
        )}
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center font-mono text-[11px] font-semibold tabular-nums text-foreground', labelClassName)}>
        {safePercent === null ? '—' : `%${formatLocaleNumber(safePercent, 0)}`}
      </span>
    </div>
  );
}

export default function FleetHealthView({
  loading,
  totalCount,
  items,
  visibleItems,
  counts,
  avgHealth,
  measurableCount,
  overallStrokeClass,
  onSelectVehicle,
  className,
}) {
  if (loading) {
    return (
      <Card className={cn('gap-0 border border-border bg-card py-0 shadow-none', className)}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-border p-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-44" />
          </div>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-4 rounded-xl border border-border p-3">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`health-sk-${idx}`} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-11 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('flex flex-col gap-0 overflow-hidden border border-border bg-card py-0 shadow-none', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-border p-4">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold text-foreground">Filo Sağlığı</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Periyodik bakım kalan ömür durumu</CardDescription>
        </div>
        <Link to="/app/filo" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span>Tüm Filoyu Gör</span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {totalCount === 0 ? (
          <EmptyState variant="card" icon={Truck} description="Kayıtlı araç eklendiğinde bakım sağlığı özetleri burada görünecektir." className="flex-1" />
        ) : (
          <>
            <div className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-3">
              <HealthRing percent={avgHealth} size={68} strokeWidth={6} strokeClass={overallStrokeClass} labelClassName="text-sm font-bold" />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-xs font-medium text-foreground">Ortalama Kalan Ömür</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {formatLocaleNumber(measurableCount, 0)} / {formatLocaleNumber(totalCount, 0)} araçta bakım periyodu aktif
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={cn('h-5 px-2 text-[11px] font-medium tabular-nums', counts.tehlike > 0 ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border bg-muted/50 text-muted-foreground')}>
                    Tehlike: {formatLocaleNumber(counts.tehlike, 0)}
                  </Badge>
                  <Badge variant="outline" className={cn('h-5 px-2 text-[11px] font-medium tabular-nums', counts.uyari > 0 ? 'border-status-warning/40 bg-status-warning/10 text-status-warning' : 'border-border bg-muted/50 text-muted-foreground')}>
                    Uyarı: {formatLocaleNumber(counts.uyari, 0)}
                  </Badge>
                  <Badge variant="outline" className={cn('h-5 px-2 text-[11px] font-medium tabular-nums', counts.sorunsuz > 0 ? 'border-status-success/40 bg-status-success/10 text-status-success' : 'border-border bg-muted/50 text-muted-foreground')}>
                    Sorunsuz: {formatLocaleNumber(counts.sorunsuz, 0)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {visibleItems.map(({ arac, bakim, durum, guncelSayac, kalanYuzde }) => {
                const meta = HEALTH_STATUS_META[durum];
                const plate = formatTurkishPlate(arac?.plaka || '') || arac?.plaka || '—';
                const modelText = [arac?.marka, arac?.model].filter(Boolean).join(' ').trim();
                const detailText =
                  bakim.kalan === null
                    ? `Son bakım kaydı yok · ${formatLocaleNumber(guncelSayac, 0)} ${bakim.birim}`
                    : bakim.kalan <= 0
                      ? `${formatLocaleNumber(Math.abs(bakim.kalan), 0)} ${bakim.birim} aşıldı · ${formatLocaleNumber(guncelSayac, 0)} ${bakim.birim}`
                      : `${formatLocaleNumber(bakim.kalan, 0)} ${bakim.birim} kaldı · ${formatLocaleNumber(guncelSayac, 0)} ${bakim.birim}`;

                return (
                  <button
                    key={arac.arac_id}
                    type="button"
                    onClick={() => onSelectVehicle?.(arac)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <HealthRing percent={kalanYuzde} size={44} strokeWidth={4.5} strokeClass={meta.strokeClass} />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">{plate}</span>
                          {modelText && <span className="truncate text-xs text-muted-foreground">{modelText}</span>}
                        </div>
                        <p className="truncate text-[11px] tabular-nums text-muted-foreground">{detailText}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', meta.badgeClass)}>
                      {meta.label}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {items.length > 6 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="tabular-nums">İlk 6 / {formatLocaleNumber(items.length, 0)} araç gösteriliyor</span>
                <Link to="/app/filo" className="font-medium text-primary underline-offset-2 hover:underline">
                  Tümünü incele
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
