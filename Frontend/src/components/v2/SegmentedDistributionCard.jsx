import React, { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { formatLocaleNumber } from '@/utils/formatters';
import EmptyState from '@/components/v2/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function SegmentedDistributionCard({
  title,
  description,
  totalLabel,
  totalValue,
  segments = [],
  activeKey = null,
  onSelectSegment,
  loading = false,
  emptyText = 'Gösterilecek dağılım verisi yok.',
  className,
}) {
  const computedTotal = useMemo(
    () => segments.reduce((sum, seg) => sum + Math.max(0, Number(seg.count) || 0), 0),
    [segments]
  );

  const isInteractive = typeof onSelectSegment === 'function';
  const resolvedTotalValue =
    totalValue !== undefined && totalValue !== null
      ? totalValue
      : formatLocaleNumber(computedTotal, 0);

  const handleToggle = (key) => {
    if (!isInteractive) return;
    onSelectSegment(activeKey === key ? null : key);
  };

  if (loading) {
    return (
      <Card className={cn('gap-4 border border-border bg-card shadow-none', className)}>
        <CardHeader className="gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3.5 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`seg-skeleton-${idx}`}
                className="space-y-2 rounded-lg border border-border p-2.5"
              >
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('gap-4 border border-border bg-card shadow-none', className)}>
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          {title && (
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
          )}
          <div className="flex items-baseline gap-2">
            <CardTitle className="font-mono text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {resolvedTotalValue}
            </CardTitle>
            {totalLabel && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {totalLabel}
              </span>
            )}
          </div>
          {description && (
            <CardDescription className="text-xs text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </div>

        {isInteractive && activeKey && (
          <button
            type="button"
            onClick={() => onSelectSegment(null)}
            className="self-start rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
          >
            Filtreyi temizle
          </button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {computedTotal === 0 ? (
          <EmptyState
            variant="card"
            icon={PieChart}
            description={emptyText}
            className="min-h-36 py-6"
          />
        ) : (
          <>
            {/* Orantılı yatay segment çubuğu */}
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${title || 'Dağılım'} çubuğu`}
            >
              {segments.map((seg) => {
                const count = Math.max(0, Number(seg.count) || 0);
                if (count === 0) return null;
                const pct = (count / computedTotal) * 100;
                const isDimmed = Boolean(activeKey && activeKey !== seg.key);

                return (
                  <div
                    key={seg.key}
                    style={{ width: `${pct}%` }}
                    title={`${seg.label}: ${formatLocaleNumber(count, 0)} (%${formatLocaleNumber(pct, 1)})`}
                    onClick={isInteractive ? () => handleToggle(seg.key) : undefined}
                    className={cn(
                      'h-full transition-opacity first:rounded-l-full last:rounded-r-full',
                      seg.barClass || 'bg-primary',
                      isInteractive && 'cursor-pointer',
                      isDimmed && 'opacity-30'
                    )}
                  />
                );
              })}
            </div>

            {/* Gösterge / Lejant satırı */}
            <div
              className={cn(
                'grid grid-cols-2 gap-2.5',
                segments.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'
              )}
            >
              {segments.map((seg) => {
                const count = Math.max(0, Number(seg.count) || 0);
                const pct = computedTotal > 0 ? (count / computedTotal) * 100 : 0;
                const isActive = activeKey === seg.key;
                const isDimmed = Boolean(activeKey && !isActive);

                const content = (
                  <>
                    <div className="flex items-baseline justify-between gap-2 tabular-nums">
                      <span className="font-mono text-base font-semibold text-foreground">
                        %{formatLocaleNumber(pct, 1)}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatLocaleNumber(count, 0)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={cn(
                          'size-2 shrink-0 rounded-sm',
                          seg.dotClass || seg.barClass || 'bg-primary'
                        )}
                      />
                      <span className="truncate text-xs text-muted-foreground">
                        {seg.label}
                      </span>
                    </div>
                  </>
                );

                if (isInteractive) {
                  return (
                    <button
                      key={seg.key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => handleToggle(seg.key)}
                      className={cn(
                        'flex flex-col rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background/50 hover:bg-muted/60',
                        isDimmed && 'opacity-65 hover:opacity-100'
                      )}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div
                    key={seg.key}
                    className="flex flex-col rounded-xl border border-border bg-background/50 px-3 py-2.5"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
