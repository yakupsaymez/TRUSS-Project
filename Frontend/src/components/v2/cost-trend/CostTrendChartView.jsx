import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BarChart3, Info } from 'lucide-react';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import EmptyState from '@/components/v2/EmptyState';
import {
  COST_CHART_CONFIG,
  computeShare,
  formatAxisCurrency,
  safeAmount,
} from '@/components/v2/cost-trend/useCostTrendController';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function CostTrendSkeleton({ className }) {
  return (
    <Card className={cn('gap-0 border border-border bg-card py-0 shadow-none', className)}>
      <CardHeader className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3.5 w-60" />
        </div>
        <Skeleton className="h-9 w-56 rounded-full" />
      </CardHeader>
      <CardContent className="p-4">
        <Skeleton className="h-64 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

function renderTooltipRow(value, name, item, index, rowPayload) {
  const label = COST_CHART_CONFIG[name]?.label || (name === 'toplam_yakit' ? 'Yakıt' : 'Bakım');
  const numValue = safeAmount(value);
  const rowTotal = safeAmount(rowPayload?.toplam);
  const share = computeShare(numValue, rowTotal);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex w-full items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 shrink-0 rounded-xs" style={{ backgroundColor: item.color }} aria-hidden="true" />
          <span>{label}</span>
        </span>
        <span className="font-mono font-medium tabular-nums text-foreground">
          {formatCurrency(numValue, { maximumFractionDigits: 0 })}
          {rowTotal > 0 && (
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">
              (%{formatLocaleNumber(share, 0)})
            </span>
          )}
        </span>
      </div>
      {index === 1 && (
        <div className="mt-0.5 flex w-full items-center justify-between gap-4 border-t border-border pt-1.5 font-semibold text-foreground">
          <span>Toplam</span>
          <span className="font-mono tabular-nums">{formatCurrency(rowTotal, { maximumFractionDigits: 0 })}</span>
        </div>
      )}
    </div>
  );
}

export default function CostTrendChartView({
  effectiveTab,
  isSingleVehicle,
  activeData,
  totals,
  hasVisibleSpend,
  loading,
  className,
  onTabChange,
}) {
  if (loading) {
    return <CostTrendSkeleton className={className} />;
  }

  return (
    <Card className={cn('gap-0 overflow-hidden border border-border bg-card py-0 shadow-none', className)}>
      <CardHeader className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold text-foreground">Maliyet Analizi</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {effectiveTab === 'aylik'
                ? 'Son 6 aylık yakıt ve bakım harcamaları'
                : 'En yüksek maliyetli ilk 8 araç'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {formatCurrency(totals.toplam, { maximumFractionDigits: 0 })}
            </span>
            <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-xs" style={{ backgroundColor: 'var(--chart-1)' }} aria-hidden="true" />
                <span>Yakıt:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(totals.yakit, { maximumFractionDigits: 0 })}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-xs" style={{ backgroundColor: 'var(--chart-3)' }} aria-hidden="true" />
                <span>Bakım:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(totals.bakim, { maximumFractionDigits: 0 })}
                </span>
              </span>
            </div>
          </div>
        </div>

        <Tabs value={effectiveTab} onValueChange={onTabChange} className="w-fit shrink-0">
          <TabsList className="h-9">
            <TabsTrigger value="aylik" className="px-3 text-xs">Aylık Trend (Son 6 Ay)</TabsTrigger>
            <TabsTrigger value="arac" disabled={isSingleVehicle} className="px-3 text-xs">Araç Bazlı</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        {isSingleVehicle && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>Aylık trend tüm filo verisidir; araç bazlı kıyaslama için tüm filoyu seçin.</span>
          </div>
        )}

        {!hasVisibleSpend ? (
          <EmptyState
            variant="card"
            icon={BarChart3}
            title="Gider verisi bulunmuyor"
            description={
              effectiveTab === 'aylik'
                ? 'Son 6 ayda kaydedilmiş yakıt veya bakım gideri bulunmuyor.'
                : 'Seçili kapsamda kaydedilmiş araç gideri bulunmuyor.'
            }
            className="h-60"
          />
        ) : (
          <ChartContainer config={COST_CHART_CONFIG} className="aspect-auto h-72 w-full">
            <BarChart accessibilityLayer data={activeData} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                interval={0}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={formatAxisCurrency}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.45 }}
                content={
                  <ChartTooltipContent
                    className="min-w-48"
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipTitle || ''}
                    formatter={renderTooltipRow}
                  />
                }
              />
              <Bar dataKey="toplam_yakit" stackId="cost" fill="var(--color-toplam_yakit)" radius={[0, 0, 4, 4]} maxBarSize={44} />
              <Bar dataKey="toplam_bakim" stackId="cost" fill="var(--color-toplam_bakim)" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
