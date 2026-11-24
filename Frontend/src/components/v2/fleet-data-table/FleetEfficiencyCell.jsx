import React from 'react';
import { formatLocaleNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const SKOR_DURUM_META = {
  optimal: {
    label: 'Optimal',
    badgeClass: 'border-status-success/30 bg-status-success/10 text-status-success',
  },
  izle: {
    label: 'İzle',
    badgeClass: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
  },
  yenileme_adayi: {
    label: 'Yenileme Adayı',
    badgeClass: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  yetersiz_veri: {
    label: 'Yetersiz Veri',
    badgeClass: 'border-border bg-muted/50 text-muted-foreground',
  },
};

export default function FleetEfficiencyCell({ tco }) {
  if (!tco || !tco.veri_yeterli) {
    return (
      <div className="min-w-28">
        <Badge variant="outline" className="text-muted-foreground">
          Veri yok
        </Badge>
      </div>
    );
  }

  const durumMeta = SKOR_DURUM_META[tco.skor_durum] || SKOR_DURUM_META.yetersiz_veri;
  const isSmh = tco.sayac_tipi === 'SMH';
  const costUnit = isSmh ? 'TL/saat' : 'TL/km';
  const consUnit = isSmh ? 'L/saat' : 'L/100km';
  const nedenler = Array.isArray(tco.nedenler) ? tco.nedenler.filter(Boolean) : [];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex min-w-28 cursor-default flex-col items-start gap-1">
          <Badge
            variant="outline"
            className={cn(
              'font-mono text-[11px] font-semibold tabular-nums',
              durumMeta.badgeClass
            )}
          >
            {tco.verimlilik_skoru}/100
          </Badge>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {tco.birim_maliyet != null
              ? `${formatLocaleNumber(tco.birim_maliyet, 2)} ${costUnit}`
              : '—'}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 flex-col items-start space-y-1 text-xs">
        <div className="font-medium">{durumMeta.label}</div>
        {tco.ort_tuketim != null && (
          <div className="font-mono tabular-nums">
            Tüketim: {formatLocaleNumber(tco.ort_tuketim, 2)} {consUnit}
          </div>
        )}
        {nedenler.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4 text-[11px]">
            {nedenler.map((neden, idx) => (
              <li key={idx}>{neden}</li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
