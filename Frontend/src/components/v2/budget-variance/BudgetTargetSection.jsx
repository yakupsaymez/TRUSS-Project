import React from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function CategoryBudgetBar({ label, dotVar, actual, target, pct, isExceeded, tone }) {
  const widthPct = isExceeded ? 100 : Math.min(100, Math.max(0, pct));
  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <span
            className="size-2 shrink-0 rounded-xs"
            style={{ backgroundColor: dotVar }}
            aria-hidden="true"
          />
          <span>{label}</span>
        </span>
        <span className={cn('font-mono text-xs font-semibold tabular-nums', tone.textClass)}>
          {target <= 0 && actual > 0 ? 'Aşım' : `%${formatLocaleNumber(pct, 0)}`}
        </span>
      </div>
      <div className="font-mono text-xs tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">
          {formatCurrency(actual, { maximumFractionDigits: 0 })}
        </span>{' '}
        / {formatCurrency(target, { maximumFractionDigits: 0 })}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', tone.barClass)}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

export default function BudgetTargetSection({
  canManage,
  toplamButce,
  toplamGerceklesen,
  kullanimYuzdesi,
  overallTone,
  aylikYakitButcesi,
  yakitGerceklesen,
  yakitPct,
  isYakitExceeded,
  yakitTone,
  aylikBakimButcesi,
  bakimGerceklesen,
  bakimPct,
  isBakimExceeded,
  bakimTone,
  popoverOpen,
  onPopoverOpenChange,
  onClosePopover,
  yakitTargetInput,
  onYakitTargetChange,
  bakimTargetInput,
  onBakimTargetChange,
  saving,
  onSaveTargets,
  children,
}) {
  return (
    <>
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
          <Popover open={popoverOpen} onOpenChange={onPopoverOpenChange}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                <span>Bütçe Hedefi</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4">
              <form onSubmit={onSaveTargets} className="space-y-3">
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
                    onChange={(e) => onYakitTargetChange(e.target.value)}
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
                    onChange={(e) => onBakimTargetChange(e.target.value)}
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
                    onClick={onClosePopover}
                    disabled={saving}
                  >
                    İptal
                  </Button>
                  <Button type="submit" size="sm" className="h-7 gap-1.5 px-3 text-xs" disabled={saving}>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CategoryBudgetBar
            label="Yakıt Bütçesi"
            dotVar="var(--chart-1)"
            actual={yakitGerceklesen}
            target={aylikYakitButcesi}
            pct={yakitPct}
            isExceeded={isYakitExceeded}
            tone={yakitTone}
          />
          <CategoryBudgetBar
            label="Bakım Bütçesi"
            dotVar="var(--chart-3)"
            actual={bakimGerceklesen}
            target={aylikBakimButcesi}
            pct={bakimPct}
            isExceeded={isBakimExceeded}
            tone={bakimTone}
          />
        </div>
        {children}
      </CardContent>
    </>
  );
}
