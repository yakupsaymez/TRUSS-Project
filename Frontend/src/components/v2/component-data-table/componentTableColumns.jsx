import React from 'react';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import {
  ComponentActionsCell,
  ComponentLifeCell,
  ComponentNameCell,
  ComponentVehicleCell,
  SortableHeader,
} from './ComponentColumnCells';

export default function createComponentColumns({
  canManage,
  canViewFinance = true,
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
      cell: ({ row }) => (
        <ComponentNameCell parca={row.original.parca} omur={row.original.omur} />
      ),
    },
    {
      id: 'arac',
      accessorFn: (row) => `${row.formattedPlaka} ${row.marka} ${row.model}`,
      meta: { label: 'Araç' },
      header: ({ column }) => <SortableHeader column={column} label="Araç" />,
      cell: ({ row }) => <ComponentVehicleCell {...row.original} />,
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
      cell: ({ row }) => <ComponentLifeCell omur={row.original.omur} />,
    },
    ...(canViewFinance
      ? [
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
        ]
      : []),
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
          <span className="block max-w-44 truncate text-xs text-muted-foreground" title={notlar}>
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
      cell: ({ row }) => (
        <ComponentActionsCell
          parca={row.original.parca}
          onReplaceClick={onReplaceClick}
          onEditClick={onEditClick}
          onDeleteRequest={onDeleteRequest}
        />
      ),
    });
  }

  return cols;
}
