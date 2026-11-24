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

export function buildFleetColumns({
  canManage,
  canViewAnalytics = false,
  onDetail,
  onEditClick,
  onDeleteRequest,
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
            <span className="truncate font-mono text-sm font-semibold tabular-nums text-foreground">
              {formattedPlaka || arac.plaka}
            </span>
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
            cell: ({ row }) => <FleetEfficiencyCell tco={row.original.tco} />,
          },
        ]
      : []),
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
          onDetail={onDetail}
          onEditClick={onEditClick}
          onDeleteRequest={onDeleteRequest}
        />
      ),
    },
  ];
}
