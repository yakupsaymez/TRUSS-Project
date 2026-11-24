import React from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { statusBadgeClass } from './componentTableHelpers';

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

export default function createComponentColumns({
  canManage,
  onReplaceClick,
  onEditClick,
  onDeleteRequest,
}) {
  const cols = [
    {
      id: 'parca',
      accessorFn: (row) => row.parca.parca_adi || '',
      enableHiding: false,
      meta: { label: 'Parça' },
      header: ({ column }) => <SortableHeader column={column} label="Parça" />,
      cell: ({ row }) => {
        const { parca, omur } = row.original;
        const isKritik = omur.durum === 'kritik';
        return (
          <div className="flex min-w-0 flex-col items-start gap-1">
            <div className="flex items-center gap-1.5">
              {isKritik && (
                <AlertTriangle
                  className="size-3.5 shrink-0 text-destructive"
                  aria-label="Kritik parça uyarısı"
                />
              )}
              <span className="max-w-52 truncate text-sm font-medium text-foreground">
                {parca.parca_adi}
              </span>
            </div>
            <Badge
              variant="outline"
              className={cn('h-5 px-1.5 text-[11px] font-medium', statusBadgeClass(omur.durum))}
            >
              {omur.etiket}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'arac',
      accessorFn: (row) => `${row.formattedPlaka} ${row.marka} ${row.model}`,
      meta: { label: 'Araç' },
      header: ({ column }) => <SortableHeader column={column} label="Araç" />,
      cell: ({ row }) => {
        const { formattedPlaka, marka, model, omur } = row.original;
        const subtitle = [marka, model].filter(Boolean).join(' ');
        const isSmh = omur.sayacTipi === 'SMH';
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-mono text-sm font-semibold tracking-tight tabular-nums text-foreground">
                {formattedPlaka}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'h-4.5 px-1 font-mono text-[10px] font-semibold',
                  isSmh
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                {omur.sayacTipi}
              </Badge>
            </div>
            <span className="max-w-44 truncate text-xs text-muted-foreground">
              {subtitle || '—'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'son_degisim',
      accessorFn: (row) => row.omur.sonDegisimKm,
      meta: { label: 'Son Değişim' },
      header: ({ column }) => <SortableHeader column={column} label="Son Değişim" />,
      cell: ({ row }) => {
        const { omur, tarihFormatted } = row.original;
        return (
          <div className="flex flex-col gap-0.5 tabular-nums whitespace-nowrap">
            <span className="font-mono text-sm font-medium text-foreground">
              {formatLocaleNumber(omur.sonDegisimKm, 0)} {omur.birim}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{tarihFormatted}</span>
          </div>
        );
      },
    },
    {
      id: 'aralik',
      accessorFn: (row) => row.omur.aralik,
      meta: { label: 'Aralık' },
      header: ({ column }) => <SortableHeader column={column} label="Aralık" align="right" />,
      cell: ({ row }) => {
        const { omur } = row.original;
        if (omur.aralik <= 0) {
          return (
            <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
              Tarih Bazlı
            </div>
          );
        }
        return (
          <div className="text-right font-mono text-sm tabular-nums text-foreground whitespace-nowrap">
            {formatLocaleNumber(omur.aralik, 0)} {omur.birim}
          </div>
        );
      },
    },
    {
      id: 'kalan_omur',
      accessorFn: (row) =>
        row.omur.kalanYuzde === null ? Number.POSITIVE_INFINITY : row.omur.kalanYuzde,
      meta: { label: 'Kalan Ömür' },
      header: ({ column }) => <SortableHeader column={column} label="Kalan Ömür" />,
      cell: ({ row }) => {
        const { omur } = row.original;
        if (omur.durum === 'tarih_bazli' || omur.kalan === null) {
          return (
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">—</span>
              <Badge
                variant="outline"
                className="h-5 border-border bg-background px-1.5 text-[10px] text-muted-foreground"
              >
                Tarih Bazlı
              </Badge>
            </div>
          );
        }

        const isKritik = omur.durum === 'kritik';
        const isUyari = omur.durum === 'uyari';

        return (
          <div className="flex w-44 flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
              <span
                className={cn(
                  'font-medium',
                  isKritik
                    ? 'text-destructive'
                    : isUyari
                      ? 'text-primary'
                      : 'text-foreground'
                )}
              >
                {isKritik
                  ? `${formatLocaleNumber(Math.abs(omur.kalan), 0)} ${omur.birim} aşıldı`
                  : `${formatLocaleNumber(omur.kalan, 0)} ${omur.birim} kaldı`}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                %{omur.kalanYuzde}
              </span>
            </div>
            <Progress
              value={isKritik ? 100 : omur.kalanYuzde}
              className={cn(
                'h-1.5 bg-muted',
                isKritik
                  ? '[&_[data-slot=progress-indicator]]:bg-destructive'
                  : '[&_[data-slot=progress-indicator]]:bg-primary'
              )}
            />
          </div>
        );
      },
    },
    {
      id: 'maliyet',
      accessorKey: 'maliyet',
      meta: { label: 'Maliyet' },
      header: ({ column }) => <SortableHeader column={column} label="Maliyet" align="right" />,
      cell: ({ row }) => (
        <div className="text-right font-mono text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
          {formatCurrency(row.original.maliyet, { maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      id: 'notlar',
      accessorKey: 'notlar',
      meta: { label: 'Not' },
      header: () => <span className="text-xs font-medium text-muted-foreground">Not</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const { notlar } = row.original;
        if (!notlar) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span
            className="block max-w-44 truncate text-xs text-muted-foreground"
            title={notlar}
          >
            {notlar}
          </span>
        );
      },
    },
  ];

  if (canManage) {
    cols.push({
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      meta: { label: 'Aksiyonlar' },
      header: () => (
        <span className="block text-right text-xs font-medium text-muted-foreground">
          Aksiyonlar
        </span>
      ),
      cell: ({ row }) => {
        const { parca } = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onReplaceClick?.(parca)}
              title="Değişim kaydet"
              aria-label="Değişim kaydet"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onEditClick?.(parca)}
              title="Parçayı düzenle"
              aria-label="Parçayı düzenle"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onDeleteRequest?.(parca)}
              title="Parçayı sil"
              aria-label="Parçayı sil"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
    });
  }

  return cols;
}
