import React from 'react';
import { formatLocaleNumber } from '@/utils/formatters';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from './fleetTableHelpers';
import {
  FleetDocumentCell,
  FleetMaintenanceCell,
  FleetRowActions,
  SortableHeader,
} from './FleetTableCells';
import FleetEfficiencyCell from './FleetEfficiencyCell';

const ARCHIVE_DATE_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatArchiveDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : ARCHIVE_DATE_FORMATTER.format(date);
}

export function buildFleetColumns({
  canManage,
  canViewAnalytics = false,
  loadingTco = false,
  isArchivedView = false,
  restoringId = null,
  onDetail,
  onEditClick,
  onDeleteRequest,
  onRestoreClick,
  onHandoverClick,
}) {
  return [
    {
      id: 'plaka',
      accessorFn: (row) => row.formattedPlaka,
      header: ({ column }) => <SortableHeader column={column} label="Plaka & Araç" />,
      cell: ({ row }) => {
        const { arac, formattedPlaka, kategori } = row.original;
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-mono text-sm font-semibold tabular-nums text-foreground">
                {formattedPlaka || arac.plaka}
              </span>
              {isArchivedView && (
                <Badge
                  variant="outline"
                  className="h-5 shrink-0 border-status-warning/30 bg-status-warning/10 px-1.5 text-[10px] font-medium text-status-warning"
                >
                  Arşiv
                </Badge>
              )}
            </div>
            <span className="truncate text-xs text-muted-foreground">
              {[arac.marka, arac.model].filter(Boolean).join(' ')}
              {arac.yil ? (
                <span className="tabular-nums"> ({arac.yil})</span>
              ) : null}
              <span> · {kategori}</span>
            </span>
          </div>
        );
      },
    },
    {
      id: 'sayac',
      accessorFn: (row) => row.sayac,
      header: ({ column }) => (
        <SortableHeader column={column} label="Sayaç" align="right" />
      ),
      cell: ({ row }) => {
        const { sayac, smh, birim } = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <span
              className="font-mono text-sm font-semibold tabular-nums text-foreground"
              title={`${formatLocaleNumber(sayac, 0)} ${birim}`}
            >
              {formatLocaleNumber(sayac, 0)}
            </span>
            <Badge
              variant="outline"
              className="font-mono text-[10px] font-semibold uppercase tracking-wider"
            >
              {smh ? 'SMH' : 'KM'}
            </Badge>
          </div>
        );
      },
    },
    ...(isArchivedView
      ? [
          {
            id: 'arsiv_tarihi',
            accessorFn: (row) => row.arac?.arsiv_tarihi || '',
            header: ({ column }) => <SortableHeader column={column} label="Arşiv Tarihi" />,
            cell: ({ row }) => (
              <span className="font-mono text-xs tabular-nums text-foreground">
                {formatArchiveDate(row.original.arac?.arsiv_tarihi)}
              </span>
            ),
          },
          {
            id: 'arsiv_nedeni',
            accessorFn: (row) => row.arac?.arsiv_nedeni || '',
            header: () => (
              <span className="text-xs font-medium text-muted-foreground">Arşiv Nedeni</span>
            ),
            enableSorting: false,
            cell: ({ row }) => (
              <span className="block max-w-xs whitespace-normal break-words text-xs text-muted-foreground">
                {row.original.arac?.arsiv_nedeni || '—'}
              </span>
            ),
          },
        ]
      : [
          {
            id: 'sofor',
            accessorFn: (row) => row.driverName,
            header: () => (
              <span className="text-xs font-medium text-muted-foreground">
                Zimmetli Şoför
              </span>
            ),
            enableSorting: false,
            cell: ({ row }) => {
              const { driverName } = row.original;
              if (!driverName) {
                return <span className="text-sm text-muted-foreground">—</span>;
              }
              return (
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="size-7 shrink-0 border border-border">
                    <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                      {getInitials(driverName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-36 truncate text-sm text-foreground">
                    {driverName}
                  </span>
                </div>
              );
            },
          },
          {
            id: 'evrak',
            accessorFn: (row) => row.docSummary.sortValue,
            header: ({ column }) => (
              <SortableHeader column={column} label="Belge Uyarıları" />
            ),
            cell: ({ row }) => <FleetDocumentCell docSummary={row.original.docSummary} />,
          },
          {
            id: 'bakim',
            accessorFn: (row) =>
              row.bakim.kalan === null ? Number.POSITIVE_INFINITY : row.bakim.kalan,
            header: ({ column }) => <SortableHeader column={column} label="Bakıma Kalan" />,
            cell: ({ row }) => (
              <FleetMaintenanceCell
                bakim={row.original.bakim}
                periyot={row.original.periyot}
              />
            ),
          },
          ...(canViewAnalytics
            ? [
                {
                  id: 'verimlilik',
                  accessorFn: (row) =>
                    row.tco?.veri_yeterli && typeof row.tco.verimlilik_skoru === 'number'
                      ? row.tco.verimlilik_skoru
                      : Number.POSITIVE_INFINITY,
                  header: ({ column }) => (
                    <SortableHeader column={column} label="Verimlilik" />
                  ),
                  cell: ({ row }) => (
                    <FleetEfficiencyCell tco={row.original.tco} loading={loadingTco} />
                  ),
                },
              ]
            : []),
        ]),
    {
      id: 'actions',
      header: () => (
        <span className="block text-right text-xs font-medium text-muted-foreground">
          Aksiyonlar
        </span>
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <FleetRowActions
          arac={row.original.arac}
          formattedPlaka={row.original.formattedPlaka}
          canManage={canManage}
          isArchivedView={isArchivedView}
          restoringId={restoringId}
          onDetail={onDetail}
          onEditClick={onEditClick}
          onDeleteRequest={onDeleteRequest}
          onRestoreClick={onRestoreClick}
          onHandoverClick={onHandoverClick}
        />
      ),
    },
  ];
}
