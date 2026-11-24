import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  FileText,
  Fuel,
  Pencil,
  Trash2,
  Wrench,
} from 'lucide-react';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatTrDate } from './ledgerTableHelpers';

function SortableHeader({ column, label, align = 'left' }) {
  const sorted = column.getIsSorted();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'h-8 gap-1.5 px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground',
        align === 'right' && 'ml-auto flex-row-reverse'
      )}
    >
      <span>{label}</span>
      {sorted === 'asc' ? (
        <ArrowUp className="size-3.5 text-primary" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3.5 text-primary" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-60" />
      )}
    </Button>
  );
}

export default function createLedgerColumns({
  canManage,
  canAddFuel,
  canAddMaintenance,
  canViewFinance = true,
  onRepeatRow,
  onEditRow,
  onDeleteRequest,
}) {
  const cols = [
    {
      id: 'tarih',
      accessorKey: 'timestamp',
      sortingFn: (rowA, rowB) => {
        const diff = (rowA.original.timestamp || 0) - (rowB.original.timestamp || 0);
        if (diff !== 0) return diff;
        return (rowA.original.rawId || 0) - (rowB.original.rawId || 0);
      },
      header: ({ column }) => <SortableHeader column={column} label="Tarih" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-foreground whitespace-nowrap">
          {formatTrDate(row.original.tarih)}
        </span>
      ),
    },
    {
      id: 'arac',
      accessorFn: (row) => `${row.plaka} ${row.marka} ${row.model}`,
      header: () => <span className="text-xs font-medium text-muted-foreground">Araç</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const { plaka, marka, model } = row.original;
        const subtitle = [marka, model].filter(Boolean).join(' ');
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-mono text-sm font-semibold tracking-tight tabular-nums text-foreground whitespace-nowrap">
              {formatTurkishPlate(plaka) || plaka}
            </span>
            <span className="max-w-44 truncate text-xs text-muted-foreground">
              {subtitle || '—'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'tur',
      accessorFn: (row) => `${row.tip} ${row.altTur}`,
      header: () => <span className="text-xs font-medium text-muted-foreground">Tür</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const isYakit = row.original.tip === 'YAKIT';
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge
              variant="outline"
              className={cn(
                'h-5 gap-1 px-1.5 text-[11px] font-medium',
                isYakit
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-muted text-foreground'
              )}
            >
              {isYakit ? <Fuel className="size-3" /> : <Wrench className="size-3" />}
              <span>{isYakit ? 'Yakıt' : 'Bakım'}</span>
            </Badge>
            <span className="max-w-40 truncate text-xs text-muted-foreground">
              {row.original.altTur}
            </span>
          </div>
        );
      },
    },
    {
      id: 'sayac',
      accessorFn: (row) => (row.km == null ? -1 : row.km),
      header: ({ column }) => <SortableHeader column={column} label="Sayaç" align="right" />,
      cell: ({ row }) => {
        const { km, sayac_tipi: sayacTipi } = row.original;
        if (km === null || km === undefined) {
          return <div className="text-right text-xs tabular-nums text-muted-foreground">—</div>;
        }
        const isSmh = sayacTipi === 'SMH';
        return (
          <div className="flex items-center justify-end gap-1.5 tabular-nums whitespace-nowrap">
            <span className="font-mono text-sm font-medium text-foreground">
              {formatLocaleNumber(km, 0)}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'h-5 px-1.5 font-mono text-[10px] font-semibold',
                isSmh
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-muted text-muted-foreground'
              )}
            >
              {isSmh ? 'SMH' : 'KM'}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'detay',
      accessorFn: (row) => (row.tip === 'YAKIT' ? row.litre || 0 : row.altTur),
      header: () => (
        <span className="text-xs font-medium text-muted-foreground">Litre / Detay</span>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const { tip, litre, birimFiyat, altTur } = row.original;
        if (tip === 'YAKIT') {
          return (
            <div className="flex flex-col gap-0.5 tabular-nums whitespace-nowrap">
              <span className="font-mono text-sm font-medium text-foreground">
                {formatLocaleNumber(litre, 2)} L
              </span>
              {canViewFinance && birimFiyat !== null && (
                <span className="text-[11px] text-muted-foreground">
                  {formatLocaleNumber(birimFiyat, 2)} ₺/L
                </span>
              )}
            </div>
          );
        }
        return (
          <span className="block max-w-44 truncate text-xs text-foreground" title={altTur}>
            {altTur}
          </span>
        );
      },
    },
    ...(canViewFinance
      ? [
          {
            id: 'tutar',
            accessorKey: 'tutar',
            header: ({ column }) => <SortableHeader column={column} label="Tutar" align="right" />,
            cell: ({ row }) => (
              <div className="text-right font-mono text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                {formatCurrency(row.original.tutar, { maximumFractionDigits: 2 })}
              </div>
            ),
          },
        ]
      : []),
    {
      id: 'notlar',
      accessorFn: (row) => `${row.fatura_bilgisi || ''} ${row.notlar || ''}`,
      header: () => (
        <span className="text-xs font-medium text-muted-foreground">Not / Fatura</span>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const { fatura_bilgisi: fatura, notlar } = row.original;
        if (!fatura && !notlar) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        const fullTitle = [fatura ? `Fatura: ${fatura}` : '', notlar]
          .filter(Boolean)
          .join(' • ');

        return (
          <div className="flex max-w-52 flex-col items-start gap-1" title={fullTitle}>
            {fatura && (
              <Badge
                variant="outline"
                className="h-5 max-w-full gap-1 border-border bg-background px-1.5 font-mono text-[10px] text-foreground"
              >
                <FileText className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{fatura}</span>
              </Badge>
            )}
            {notlar && (
              <span className="w-full truncate text-xs text-muted-foreground">{notlar}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => (
        <span className="block text-right text-xs font-medium text-muted-foreground">
          Aksiyonlar
        </span>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        const canRepeat =
          Boolean(onRepeatRow) && (item.tip === 'BAKIM' ? canAddMaintenance : canAddFuel);

        if (!canRepeat && !canManage) {
          return <span className="block text-right text-xs text-muted-foreground">—</span>;
        }

        return (
          <div className="flex items-center justify-end gap-1">
            {canRepeat && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onRepeatRow?.(item)}
                title="Son kaydı tekrarla"
                aria-label="Son kaydı tekrarla"
              >
                <Copy className="size-4" />
              </Button>
            )}

            {canManage && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onEditRow?.(item)}
                title="Kaydı düzenle"
                aria-label="Kaydı düzenle"
              >
                <Pencil className="size-4" />
              </Button>
            )}

            {canManage && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onDeleteRequest?.(item)}
                title="Kaydı sil"
                aria-label="Kaydı sil"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return cols;
}
