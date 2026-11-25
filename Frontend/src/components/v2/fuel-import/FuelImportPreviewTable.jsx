import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DURUM_BADGES,
  formatImportDate,
  getUyariTipLabel,
  UYARI_SEVIYE_BADGES,
} from './fuelImportHelpers';

const PAGE_STEP = 100;

const FILTER_TABS = [
  { id: 'tumu', label: 'Tümü' },
  { id: 'gecerli', label: 'Geçerli' },
  { id: 'hatali', label: 'Hatalı' },
  { id: 'mukerrer', label: 'Mükerrer' },
];

export default function FuelImportPreviewTable({ rows = [], ozet = null }) {
  const [filter, setFilter] = useState('tumu');
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [filter, rows]);

  const counts = useMemo(() => {
    if (ozet) {
      return {
        tumu: Number(ozet.toplam ?? rows.length),
        gecerli: Number(ozet.gecerli ?? ozet.eklenen ?? 0),
        hatali: Number(ozet.hatali ?? 0),
        mukerrer: Number(ozet.mukerrer ?? 0),
      };
    }
    return {
      tumu: rows.length,
      gecerli: rows.filter((r) => r.durum === 'gecerli').length,
      hatali: rows.filter((r) => r.durum === 'hatali').length,
      mukerrer: rows.filter((r) => r.durum === 'mukerrer').length,
    };
  }, [ozet, rows]);

  const filteredRows = useMemo(
    () => (filter === 'tumu' ? rows : rows.filter((r) => r.durum === filter)),
    [rows, filter]
  );

  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  );
  const remaining = Math.max(0, filteredRows.length - visibleRows.length);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              filter === tab.id
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            )}
          >
            <span>{tab.label}</span>
            <span className="font-mono text-[11px] tabular-nums">({counts[tab.id] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 bg-background/60 text-xs">#</TableHead>
                <TableHead className="bg-background/60 text-xs">Plaka</TableHead>
                <TableHead className="bg-background/60 text-xs">Tarih</TableHead>
                <TableHead className="bg-background/60 text-right text-xs">Litre</TableHead>
                <TableHead className="bg-background/60 text-right text-xs">Tutar</TableHead>
                <TableHead className="bg-background/60 text-right text-xs">KM/SMH</TableHead>
                <TableHead className="min-w-56 bg-background/60 text-xs">Durum & Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">
                    Seçili filtrede gösterilecek satır bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => {
                  const statusMeta = DURUM_BADGES[row.durum] || DURUM_BADGES.hatali;
                  const uyarilar = Array.isArray(row.uyarilar) ? row.uyarilar : [];
                  return (
                    <TableRow key={`${row.satir_no}-${row.plaka_ham || row.plaka || 'row'}`}>
                      <TableCell className="align-top font-mono text-xs text-muted-foreground tabular-nums">
                        {row.satir_no}
                      </TableCell>
                      <TableCell className="align-top font-mono text-xs font-medium text-foreground">
                        {row.plaka_ham || row.plaka || '—'}
                      </TableCell>
                      <TableCell className="align-top font-mono text-xs text-foreground tabular-nums">
                        {formatImportDate(row.tarih)}
                      </TableCell>
                      <TableCell className="align-top text-right font-mono text-xs text-foreground tabular-nums">
                        {row.litre !== null && row.litre !== undefined ? formatLocaleNumber(row.litre, 2) : '—'}
                      </TableCell>
                      <TableCell className="align-top text-right font-mono text-xs text-foreground tabular-nums">
                        {row.tutar !== null && row.tutar !== undefined
                          ? formatCurrency(row.tutar, { maximumFractionDigits: 2 })
                          : '—'}
                      </TableCell>
                      <TableCell className="align-top text-right font-mono text-xs text-foreground tabular-nums">
                        {row.km !== null && row.km !== undefined ? formatLocaleNumber(row.km, 0) : '—'}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-medium', statusMeta.className)}>
                            {statusMeta.label}
                          </Badge>
                          {row.neden_mesaj && (
                            <p className="text-xs leading-snug text-muted-foreground">{row.neden_mesaj}</p>
                          )}
                          {uyarilar.map((u, idx) => (
                            <div key={`${u.tip}-${idx}`} className="flex flex-wrap items-start gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'h-5 shrink-0 px-1.5 text-[10px] font-medium',
                                  UYARI_SEVIYE_BADGES[u.seviye] || UYARI_SEVIYE_BADGES.uyari
                                )}
                              >
                                {getUyariTipLabel(u.tip)}
                              </Badge>
                              {u.aciklama && (
                                <span className="text-[11px] leading-snug text-muted-foreground">{u.aciklama}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {remaining > 0 && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + PAGE_STEP)}
            className="h-8 text-xs font-mono tabular-nums"
          >
            Daha Fazla Göster (kalan {remaining})
          </Button>
        </div>
      )}
    </div>
  );
}
