import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import { cn } from '@/lib/utils';

export default function ComponentTableSummary({ summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-[11px] font-medium text-muted-foreground">Toplam Parça</p>
        <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
          {formatLocaleNumber(summary.total, 0)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-muted-foreground">Değişim Gerekli</p>
          {summary.kritik > 0 && <AlertTriangle className="size-3.5 text-destructive" />}
        </div>
        <p
          className={cn(
            'mt-1 font-mono text-lg font-bold tracking-tight tabular-nums',
            summary.kritik > 0 ? 'text-destructive' : 'text-foreground'
          )}
        >
          {formatLocaleNumber(summary.kritik, 0)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-[11px] font-medium text-muted-foreground">Yaklaşıyor</p>
        <p
          className={cn(
            'mt-1 font-mono text-lg font-bold tracking-tight tabular-nums',
            summary.uyari > 0 ? 'text-primary' : 'text-foreground'
          )}
        >
          {formatLocaleNumber(summary.uyari, 0)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-[11px] font-medium text-muted-foreground">Toplam Maliyet</p>
        <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
          {formatCurrency(summary.totalCost, { maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}
