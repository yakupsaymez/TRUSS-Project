import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Loader2, SlidersHorizontal, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import raporService from '@/services/raporService';
import { notifyApiError } from '@/utils/apiError';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import EmptyState from '@/components/v2/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
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

const BUDGET_CHART_CONFIG = {
  yakit_gerceklesen: {
    label: 'Yakıt Gerçekleşen',
    color: 'var(--chart-1)',
  },
  bakim_gerceklesen: {
    label: 'Bakım Gerçekleşen',
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

function calcUsagePct(actual, target) {
  const a = safeAmount(actual);
  const t = safeAmount(target);
  if (t <= 0) return a > 0 ? 100 : 0;
  return Math.round((a / t) * 100);
}

function resolveStatusTone(pct, isExceeded = false) {
  const n = Number(pct) || 0;
  if (isExceeded || n > 100) {
    return {
      badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive',
      barClass: 'bg-destructive',
      textClass: 'text-destructive',
    };
  }
  if (n >= 86) {
    return {
      badgeClass: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
      barClass: 'bg-status-warning',
      textClass: 'text-status-warning',
    };
  }
  return {
    badgeClass: 'border-status-success/40 bg-status-success/10 text-status-success',
    barClass: 'bg-status-success',
    textClass: 'text-status-success',
  };
}

export default function BudgetVarianceCard({
  butceData = null,
  canManage = false,
  loading = false,
  onBudgetUpdated,
  className,
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [yakitTargetInput, setYakitTargetInput] = useState('50000');
  const [bakimTargetInput, setBakimTargetInput] = useState('25000');
  const [saving, setSaving] = useState(false);

  const butce = butceData?.butce || {};
  const mevcutAy = butceData?.mevcut_ay || {};

  const aylikYakitButcesi = safeAmount(
    butce.aylik_yakit_butcesi ?? mevcutAy.yakit_butce ?? 50000
  );
  const aylikBakimButcesi = safeAmount(
    butce.aylik_bakim_butcesi ?? mevcutAy.bakim_butce ?? 25000
  );
  const toplamButce = safeAmount(
    butce.toplam_butce ?? mevcutAy.toplam_butce ?? aylikYakitButcesi + aylikBakimButcesi
  );

  const yakitGerceklesen = safeAmount(mevcutAy.yakit_gerceklesen);
  const bakimGerceklesen = safeAmount(mevcutAy.bakim_gerceklesen);
  const toplamGerceklesen =
    safeAmount(mevcutAy.toplam_gerceklesen) || yakitGerceklesen + bakimGerceklesen;

  const kullanimYuzdesi =
    mevcutAy.kullanim_yuzdesi !== undefined && mevcutAy.kullanim_yuzdesi !== null
      ? Number(mevcutAy.kullanim_yuzdesi) || 0
      : calcUsagePct(toplamGerceklesen, toplamButce);

  const yakitPct = calcUsagePct(yakitGerceklesen, aylikYakitButcesi);
  const bakimPct = calcUsagePct(bakimGerceklesen, aylikBakimButcesi);

  const isOverallExceeded =
    (toplamButce <= 0 && toplamGerceklesen > 0) ||
    mevcutAy.durum === 'ASIM' ||
    mevcutAy.asim === true ||
    butceData?.durum === 'ASIM' ||
    butceData?.asim === true ||
    kullanimYuzdesi > 100;
  const isYakitExceeded =
    (aylikYakitButcesi <= 0 && yakitGerceklesen > 0) || yakitPct > 100;
  const isBakimExceeded =
    (aylikBakimButcesi <= 0 && bakimGerceklesen > 0) || bakimPct > 100;

  const overallTone = resolveStatusTone(kullanimYuzdesi, isOverallExceeded);
  const yakitTone = resolveStatusTone(yakitPct, isYakitExceeded);
  const bakimTone = resolveStatusTone(bakimPct, isBakimExceeded);

  useEffect(() => {
    setYakitTargetInput(String(Math.round(aylikYakitButcesi)));
    setBakimTargetInput(String(Math.round(aylikBakimButcesi)));
  }, [aylikYakitButcesi, aylikBakimButcesi]);

  const handlePopoverOpenChange = (nextOpen) => {
    if (nextOpen) {
      setYakitTargetInput(String(Math.round(aylikYakitButcesi)));
      setBakimTargetInput(String(Math.round(aylikBakimButcesi)));
    }
    setPopoverOpen(nextOpen);
  };

  const seriesData = useMemo(() => {
    const rawList = Array.isArray(butceData?.aylik_serisi) ? butceData.aylik_serisi : [];
    return rawList.map((row) => {
      const yakit = safeAmount(row?.yakit_gerceklesen);
      const bakim = safeAmount(row?.bakim_gerceklesen);
      const toplam = safeAmount(row?.toplam_gerceklesen) || yakit + bakim;
      const butceRow = safeAmount(row?.toplam_butce) || toplamButce;
      const yuzde =
        row?.kullanim_yuzdesi !== undefined && row?.kullanim_yuzdesi !== null
          ? Number(row.kullanim_yuzdesi) || 0
          : calcUsagePct(toplam, butceRow);
      return {
        label: formatMonthShort(row?.ay),
        tooltipTitle: formatMonthFull(row?.ay),
        yakit_gerceklesen: yakit,
        bakim_gerceklesen: bakim,
        toplam_gerceklesen: toplam,
        toplam_butce: butceRow,
        kullanim_yuzdesi: yuzde,
      };
    });
  }, [butceData?.aylik_serisi, toplamButce]);

  const hasChartData = useMemo(
    () =>
      seriesData.length > 0 &&
      (toplamButce > 0 || seriesData.some((item) => item.toplam_gerceklesen > 0)),
    [seriesData, toplamButce]
  );

  const handleSaveTargets = async (event) => {
    event.preventDefault();
    if (!canManage || saving) return;

    const yakitNum = Number(yakitTargetInput);
    const bakimNum = Number(bakimTargetInput);

    if (
      !Number.isFinite(yakitNum) ||
      yakitNum < 0 ||
      yakitNum > 100_000_000 ||
      !Number.isFinite(bakimNum) ||
      bakimNum < 0 ||
      bakimNum > 100_000_000
    ) {
      toast.error('Bütçe hedefleri 0 ile 100.000.000 ₺ arasında olmalıdır.');
      return;
    }

    setSaving(true);
    try {
      await raporService.updateButceHedefi({
        aylik_yakit_butcesi: yakitNum,
        aylik_bakim_butcesi: bakimNum,
      });
      toast.success('Bütçe hedefleri güncellendi.');
      setPopoverOpen(false);
      onBudgetUpdated?.();
    } catch (err) {
      notifyApiError(err, 'Bütçe hedefleri güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

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
    <Card
      className={cn(
        'gap-0 overflow-hidden border border-border bg-card py-0 shadow-none',
        className
      )}
    >
      <CardHeader className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Aylık Bütçe &amp; Gerçekleşen
            </CardTitle>
            <Badge
              variant="outline"
              className={cn('font-mono text-xs tabular-nums', overallTone.badgeClass)}
            >
              {toplamButce <= 0 && toplamGerceklesen > 0
                ? 'Bütçe Aşıldı'
                : `%${formatLocaleNumber(kullanimYuzdesi, 0)} kullanıldı`}
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Bu ay toplam:{' '}
            <span className="font-mono font-medium tabular-nums text-foreground">
              {formatCurrency(toplamGerceklesen, { maximumFractionDigits: 0 })}
            </span>{' '}
            /{' '}
            <span className="font-mono tabular-nums text-foreground">
              {formatCurrency(toplamButce, { maximumFractionDigits: 0 })}
            </span>
          </CardDescription>
        </div>

        {canManage && (
          <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                <span>Bütçe Hedefi</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4">
              <form onSubmit={handleSaveTargets} className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">Aylık Bütçe Hedefleri</p>
                  <p className="text-[11px] text-muted-foreground">
                    Organizasyon geneli aylık yakıt ve bakım tavanını belirleyin.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="budget-yakit-input" className="text-xs">
                    Aylık Yakıt Bütçesi (₺)
                  </Label>
                  <Input
                    id="budget-yakit-input"
                    type="number"
                    min={0}
                    max={100000000}
                    step="1"
                    value={yakitTargetInput}
                    onChange={(e) => setYakitTargetInput(e.target.value)}
                    className="h-8 font-mono text-xs tabular-nums"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="budget-bakim-input" className="text-xs">
                    Aylık Bakım Bütçesi (₺)
                  </Label>
                  <Input
                    id="budget-bakim-input"
                    type="number"
                    min={0}
                    max={100000000}
                    step="1"
                    value={bakimTargetInput}
                    onChange={(e) => setBakimTargetInput(e.target.value)}
                    className="h-8 font-mono text-xs tabular-nums"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setPopoverOpen(false)}
                    disabled={saving}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-7 gap-1.5 px-3 text-xs"
                    disabled={saving}
                  >
                    {saving && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                    <span>Kaydet</span>
                  </Button>
                </div>
              </form>
            </PopoverContent>
          </Popover>
        )}
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* Bu Ay Kategori Kırılımı (2 Progress Bar) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <span
                  className="size-2 shrink-0 rounded-xs"
                  style={{ backgroundColor: 'var(--chart-1)' }}
                  aria-hidden="true"
                />
                <span>Yakıt Bütçesi</span>
              </span>
              <span className={cn('font-mono text-xs font-semibold tabular-nums', yakitTone.textClass)}>
                {aylikYakitButcesi <= 0 && yakitGerceklesen > 0
                  ? 'Aşım'
                  : `%${formatLocaleNumber(yakitPct, 0)}`}
              </span>
            </div>
            <div className="font-mono text-xs tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatCurrency(yakitGerceklesen, { maximumFractionDigits: 0 })}
              </span>{' '}
              / {formatCurrency(aylikYakitButcesi, { maximumFractionDigits: 0 })}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', yakitTone.barClass)}
                style={{ width: `${isYakitExceeded ? 100 : Math.min(100, Math.max(0, yakitPct))}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <span
                  className="size-2 shrink-0 rounded-xs"
                  style={{ backgroundColor: 'var(--chart-3)' }}
                  aria-hidden="true"
                />
                <span>Bakım Bütçesi</span>
              </span>
              <span className={cn('font-mono text-xs font-semibold tabular-nums', bakimTone.textClass)}>
                {aylikBakimButcesi <= 0 && bakimGerceklesen > 0
                  ? 'Aşım'
                  : `%${formatLocaleNumber(bakimPct, 0)}`}
              </span>
            </div>
            <div className="font-mono text-xs tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatCurrency(bakimGerceklesen, { maximumFractionDigits: 0 })}
              </span>{' '}
              / {formatCurrency(aylikBakimButcesi, { maximumFractionDigits: 0 })}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', bakimTone.barClass)}
                style={{ width: `${isBakimExceeded ? 100 : Math.min(100, Math.max(0, bakimPct))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Son 6 Ay Bütçe vs. Gerçekleşen Grafik */}
        {!hasChartData ? (
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
                <span>Hedef Tavan: {formatCurrency(toplamButce, { maximumFractionDigits: 0 })}</span>
              </span>
            </div>

            <ChartContainer config={BUDGET_CHART_CONFIG} className="aspect-auto h-48 w-full">
              <BarChart
                accessibilityLayer
                data={seriesData}
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
                {toplamButce > 0 && (
                  <ReferenceLine
                    y={toplamButce}
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                )}
                <Bar
                  dataKey="yakit_gerceklesen"
                  stackId="budgetActual"
                  fill="var(--color-yakit_gerceklesen)"
                  radius={[0, 0, 4, 4]}
                  maxBarSize={38}
                />
                <Bar
                  dataKey="bakim_gerceklesen"
                  stackId="budgetActual"
                  fill="var(--color-bakim_gerceklesen)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
