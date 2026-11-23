import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BarChart3, Info } from 'lucide-react';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import EmptyState from '@/components/v2/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const TR_MONTHS = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

const COST_CHART_CONFIG = {
  toplam_yakit: {
    label: 'Yakıt',
    color: 'var(--chart-1)',
  },
  toplam_bakim: {
    label: 'Bakım',
    color: 'var(--chart-3)',
  },
};

function formatMonthShort(ayStr) {
  const match = String(ayStr || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return String(ayStr || '—');
  const monthIdx = Number(match[2]) - 1;
  return TR_MONTHS[monthIdx] || String(ayStr);
}

function formatMonthFull(ayStr) {
  const match = String(ayStr || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return String(ayStr || '—');
  const monthIdx = Number(match[2]) - 1;
  const label = TR_MONTHS[monthIdx];
  return label ? `${label} ${match[1]}` : String(ayStr);
}

function formatAxisCurrency(value) {
  const num = Number(value) || 0;
  if (num === 0) return '0';
  if (Math.abs(num) >= 1_000_000) {
    return `${formatLocaleNumber(num / 1_000_000, 1)} Mn`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${formatLocaleNumber(num / 1_000, 1)} B`;
  }
  return formatLocaleNumber(num, 0);
}

function safeAmount(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function CostTrendChart({
  aylikTrend = [],
  aracMaliyet = [],
  seciliAracId = 'tum',
  loading = false,
  className,
}) {
  const [activeTab, setActiveTab] = useState('aylik');

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');

  const monthlyData = useMemo(() => {
    const list = Array.isArray(aylikTrend) ? aylikTrend : [];
    return list.map((row) => {
      const yakit = safeAmount(row?.toplam_yakit);
      const bakim = safeAmount(row?.toplam_bakim);
      const toplam = safeAmount(row?.toplam_harcama) || yakit + bakim;
      return {
        label: formatMonthShort(row?.ay),
        tooltipTitle: formatMonthFull(row?.ay),
        toplam_yakit: yakit,
        toplam_bakim: bakim,
        toplam,
      };
    });
  }, [aylikTrend]);

  const vehicleData = useMemo(() => {
    const list = Array.isArray(aracMaliyet) ? aracMaliyet : [];
    const scoped = isSingleVehicle
      ? list.filter((row) => String(row?.arac_id) === String(seciliAracId))
      : [...list]
          .sort((a, b) => safeAmount(b?.toplam_maliyet) - safeAmount(a?.toplam_maliyet))
          .slice(0, 8);

    return scoped.map((row) => {
      const plate = formatTurkishPlate(row?.plaka || '') || String(row?.plaka || '—');
      const modelDesc = [row?.marka, row?.model].filter(Boolean).join(' ').trim();
      const yakit = safeAmount(row?.toplam_yakit);
      const bakim = safeAmount(row?.toplam_bakim);
      const toplam = safeAmount(row?.toplam_maliyet) || yakit + bakim;
      return {
        label: plate,
        tooltipTitle: modelDesc ? `${plate} · ${modelDesc}` : plate,
        toplam_yakit: yakit,
        toplam_bakim: bakim,
        toplam,
      };
    });
  }, [aracMaliyet, isSingleVehicle, seciliAracId]);

  const activeData = activeTab === 'aylik' ? monthlyData : vehicleData;

  const totals = useMemo(
    () =>
      activeData.reduce(
        (acc, item) => {
          acc.yakit += item.toplam_yakit;
          acc.bakim += item.toplam_bakim;
          acc.toplam += item.toplam;
          return acc;
        },
        { yakit: 0, bakim: 0, toplam: 0 }
      ),
    [activeData]
  );

  const hasVisibleSpend = activeData.length > 0 && totals.toplam > 0;

  if (loading) {
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

  return (
    <Card className={cn('gap-0 overflow-hidden border border-border bg-card py-0 shadow-none', className)}>
      <CardHeader className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Maliyet Analizi
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {activeTab === 'aylik'
                ? 'Son 6 aylık yakıt ve bakım harcamaları'
                : isSingleVehicle
                  ? 'Seçili aracın toplam yakıt ve bakım dağılımı'
                  : 'En yüksek maliyetli ilk 8 araç'}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {formatCurrency(totals.toplam, { maximumFractionDigits: 0 })}
            </span>

            <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-xs"
                  style={{ backgroundColor: 'var(--chart-1)' }}
                  aria-hidden="true"
                />
                <span>Yakıt:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(totals.yakit, { maximumFractionDigits: 0 })}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-xs"
                  style={{ backgroundColor: 'var(--chart-3)' }}
                  aria-hidden="true"
                />
                <span>Bakım:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(totals.bakim, { maximumFractionDigits: 0 })}
                </span>
              </span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit shrink-0">
          <TabsList className="h-9">
            <TabsTrigger value="aylik" className="px-3 text-xs">
              Aylık Trend (Son 6 Ay)
            </TabsTrigger>
            <TabsTrigger value="arac" className="px-3 text-xs">
              Araç Bazlı
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        {activeTab === 'aylik' && isSingleVehicle && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Info className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Aylık trend tüm filo verisidir; araç bazlı kırılım için Araç Bazlı sekmesine geçin.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('arac')}
              className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Araç Bazlı Görünüm
            </button>
          </div>
        )}

        {!hasVisibleSpend ? (
          <EmptyState
            variant="card"
            icon={BarChart3}
            title="Gider verisi bulunmuyor"
            description={
              activeTab === 'aylik'
                ? 'Son 6 ayda kaydedilmiş yakıt veya bakım gideri bulunmuyor.'
                : 'Seçili kapsamda kaydedilmiş araç gideri bulunmuyor.'
            }
            className="h-60"
          />
        ) : (
          <ChartContainer config={COST_CHART_CONFIG} className="aspect-auto h-72 w-full">
            <BarChart
              accessibilityLayer
              data={activeData}
              margin={{ top: 12, right: 8, left: 4, bottom: 4 }}
            >
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
                    formatter={(value, name, item, index, rowPayload) => {
                      const label =
                        COST_CHART_CONFIG[name]?.label ||
                        (name === 'toplam_yakit' ? 'Yakıt' : 'Bakım');
                      const numValue = safeAmount(value);
                      const rowTotal = safeAmount(rowPayload?.toplam);
                      const share =
                        rowTotal > 0 ? Math.round((numValue / rowTotal) * 100) : 0;

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
                              <span className="font-mono tabular-nums">
                                {formatCurrency(rowTotal, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar
                dataKey="toplam_yakit"
                stackId="cost"
                fill="var(--color-toplam_yakit)"
                radius={[0, 0, 4, 4]}
                maxBarSize={44}
              />
              <Bar
                dataKey="toplam_bakim"
                stackId="cost"
                fill="var(--color-toplam_bakim)"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
