import React from 'react';
import { Fuel, Wrench } from 'lucide-react';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ALL_VALUE } from './ledgerTableHelpers';

export default function LedgerTableHeader({
  activeTab,
  onTabChange,
  tabCounts,
  summary,
  canViewFinance = true,
}) {
  return (
    <>
      {/* Üst Sekmeler (Tümü / Yakıt / Bakım) */}
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value={ALL_VALUE} className="gap-1.5 text-xs">
            <span>Tümü</span>
            <Badge
              variant="secondary"
              className="h-5 min-w-5 px-1.5 font-mono text-[11px] tabular-nums"
            >
              {formatLocaleNumber(tabCounts.all, 0)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="YAKIT" className="gap-1.5 text-xs">
            <Fuel className="size-3.5" />
            <span>Yakıt</span>
            <Badge
              variant="secondary"
              className="h-5 min-w-5 px-1.5 font-mono text-[11px] tabular-nums"
            >
              {formatLocaleNumber(tabCounts.yakit, 0)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="BAKIM" className="gap-1.5 text-xs">
            <Wrench className="size-3.5" />
            <span>Bakım</span>
            <Badge
              variant="secondary"
              className="h-5 min-w-5 px-1.5 font-mono text-[11px] tabular-nums"
            >
              {formatLocaleNumber(tabCounts.bakim, 0)}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Özet Toplam Barı */}
      <div className={cn('grid grid-cols-2 gap-3', canViewFinance && 'lg:grid-cols-4')}>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">Kayıt Sayısı</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
            {formatLocaleNumber(summary.count, 0)}
          </p>
        </div>

        {canViewFinance ? (
          <>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground">Toplam Gider</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-primary">
                {formatCurrency(summary.totalCost, { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-muted-foreground">Yakıt Toplamı</p>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatLocaleNumber(summary.totalLitres, 2)} L
                </span>
              </div>
              <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
                {formatCurrency(summary.fuelCost, { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground">Bakım Toplamı</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
                {formatCurrency(summary.maintenanceCost, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground">Toplam Yakıt</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
              {formatLocaleNumber(summary.totalLitres, 2)} L
            </p>
          </div>
        )}
      </div>
    </>
  );
}
