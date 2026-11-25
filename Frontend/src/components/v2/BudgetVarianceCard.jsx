import React from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Target } from 'lucide-react';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import EmptyState from '@/components/v2/EmptyState';
import BudgetTargetSection from '@/components/v2/budget-variance/BudgetTargetSection';
import useBudgetVariance, {
  BUDGET_CHART_CONFIG,
  formatAxisCurrency,
  safeAmount,
} from '@/components/v2/budget-variance/useBudgetVariance';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function BudgetVarianceCard({
  butceData = null,
  canManage = false,
  loading = false,
  onBudgetUpdated,
  className,
}) {
  const vm = useBudgetVariance({ butceData, canManage, onBudgetUpdated });

  if (loading) {
    return (
      <Card className={cn('gap-0 border border-border bg-card py-0 shadow-none', className)}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('gap-0 overflow-hidden border border-border bg-card py-0 shadow-none', className)}>
      <BudgetTargetSection
        canManage={canManage}
        toplamButce={vm.toplamButce}
        toplamGerceklesen={vm.toplamGerceklesen}
        kullanimYuzdesi={vm.kullanimYuzdesi}
        overallTone={vm.overallTone}
        aylikYakitButcesi={vm.aylikYakitButcesi}
        yakitGerceklesen={vm.yakitGerceklesen}
        yakitPct={vm.yakitPct}
        isYakitExceeded={vm.isYakitExceeded}
        yakitTone={vm.yakitTone}
        aylikBakimButcesi={vm.aylikBakimButcesi}
        bakimGerceklesen={vm.bakimGerceklesen}
        bakimPct={vm.bakimPct}
        isBakimExceeded={vm.isBakimExceeded}
        bakimTone={vm.bakimTone}
        popoverOpen={vm.popoverOpen}
        onPopoverOpenChange={vm.handlePopoverOpenChange}
        onClosePopover={() => vm.setPopoverOpen(false)}
        yakitTargetInput={vm.yakitTargetInput}
        onYakitTargetChange={vm.setYakitTargetInput}
        bakimTargetInput={vm.bakimTargetInput}
        onBakimTargetChange={vm.setBakimTargetInput}
        saving={vm.saving}
        onSaveTargets={vm.handleSaveTargets}
      >
        {!vm.hasChartData ? (
          <EmptyState
            variant="card"
            icon={Target}
            title="Bütçe karşılaştırma verisi yok"
            description="Son 6 ay için bütçe ve gerçekleşen gider serisi bulunamadı."
            className="h-44"
          />
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Son 6 Ay Bütçe vs. Gerçekleşen</span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span className="h-0.5 w-3 border-t border-dashed border-primary" aria-hidden="true" />
                <span>Hedef Tavan: {formatCurrency(vm.toplamButce, { maximumFractionDigits: 0 })}</span>
              </span>
            </div>

            <ChartContainer config={BUDGET_CHART_CONFIG} className="aspect-auto h-48 w-full">
              <BarChart
                accessibilityLayer
                data={vm.seriesData}
                margin={{ top: 10, right: 8, left: 4, bottom: 2 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={formatAxisCurrency}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.45 }}
                  content={
                    <ChartTooltipContent
                      className="min-w-52"
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipTitle || ''}
                      formatter={(value, name, item, index, rowPayload) => {
                        const label =
                          BUDGET_CHART_CONFIG[name]?.label ||
                          (name === 'yakit_gerceklesen' ? 'Yakıt Gerçekleşen' : 'Bakım Gerçekleşen');
                        const numValue = safeAmount(value);
                        const rowTotal = safeAmount(rowPayload?.toplam_gerceklesen);
                        const rowBudget = safeAmount(rowPayload?.toplam_butce);
                        const rowPct = Number(rowPayload?.kullanim_yuzdesi) || 0;

                        return (
                          <div className="flex w-full flex-col gap-1.5">
                            <div className="flex w-full items-center justify-between gap-4">
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                <span
                                  className="size-2 shrink-0 rounded-xs"
                                  style={{ backgroundColor: item.color }}
                                  aria-hidden="true"
                                />
                                <span>{label}</span>
                              </span>
                              <span className="font-mono font-medium tabular-nums text-foreground">
                                {formatCurrency(numValue, { maximumFractionDigits: 0 })}
                              </span>
                            </div>

                            {index === 1 && (
                              <div className="mt-0.5 flex flex-col gap-1 border-t border-border pt-1.5 text-xs">
                                <div className="flex items-center justify-between gap-4 font-semibold text-foreground">
                                  <span>Toplam Gerçekleşen</span>
                                  <span className="font-mono tabular-nums">
                                    {formatCurrency(rowTotal, { maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                  <span>Aylık Bütçe</span>
                                  <span className="font-mono tabular-nums">
                                    {formatCurrency(rowBudget, { maximumFractionDigits: 0 })} (%
                                    {formatLocaleNumber(rowPct, 0)})
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  }
                />
                {vm.toplamButce > 0 && (
                  <ReferenceLine y={vm.toplamButce} stroke="var(--primary)" strokeDasharray="4 4" strokeWidth={1.5} />
                )}
                <Bar dataKey="yakit_gerceklesen" stackId="budgetActual" fill="var(--color-yakit_gerceklesen)" radius={[0, 0, 4, 4]} maxBarSize={38} />
                <Bar dataKey="bakim_gerceklesen" stackId="budgetActual" fill="var(--color-bakim_gerceklesen)" radius={[4, 4, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </BudgetTargetSection>
    </Card>
  );
}
