import React, { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/v2/EmptyState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import createLedgerColumns from './ledger-data-table/ledgerTableColumns';
import useLedgerTableState from './ledger-data-table/useLedgerTableState';
import LedgerTableHeader from './ledger-data-table/LedgerTableHeader';
import LedgerTableToolbar from './ledger-data-table/LedgerTableToolbar';
import LedgerTablePagination from './ledger-data-table/LedgerTablePagination';

export default function LedgerDataTable({
  rows = [],
  araclar = [],
  seciliAracId = null,
  onVehicleChange,
  loading = false,
  hasLoaded = false,
  canManage = false,
  canAddFuel = true,
  canAddMaintenance = true,
  canViewFinance = true,
  onCreateYakit,
  onCreateBakim,
  onRepeatRow,
  onEditRow,
  onDeleteRequest,
  onImportFuel,
}) {
  const state = useLedgerTableState({ rows, araclar, seciliAracId, onVehicleChange });

  const columns = useMemo(
    () =>
      createLedgerColumns({
        canManage,
        canAddFuel,
        canAddMaintenance,
        canViewFinance,
        onRepeatRow,
        onEditRow,
        onDeleteRequest,
      }),
    [canManage, canAddFuel, canAddMaintenance, canViewFinance, onRepeatRow, onEditRow, onDeleteRequest]
  );

  const table = useReactTable({
    data: state.filteredRows,
    columns,
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    state: { sorting: state.sorting, pagination: state.pagination },
    onSortingChange: state.setSorting,
    onPaginationChange: state.setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <LedgerTableHeader
        activeTab={state.activeTab}
        onTabChange={state.handleTabChange}
        tabCounts={state.tabCounts}
        summary={state.summary}
        canViewFinance={canViewFinance}
      />

      <Card className="gap-0 overflow-hidden border border-border bg-card py-0 shadow-none">
        <LedgerTableToolbar
          araclar={araclar}
          seciliAracId={seciliAracId}
          isVehicleFiltered={state.isVehicleFiltered}
          selectedVehicleInList={state.selectedVehicleInList}
          vehicleSelectValue={state.vehicleSelectValue}
          onVehicleSelectChange={state.handleVehicleSelectChange}
          searchQuery={state.searchQuery}
          onSearchQueryChange={state.setSearchQuery}
          altTurFilter={state.altTurFilter}
          onAltTurFilterChange={state.setAltTurFilter}
          altTurOptions={state.altTurOptions}
          baslangicTarihi={state.baslangicTarihi}
          bitisTarihi={state.bitisTarihi}
          onBaslangicChange={state.handleBaslangicChange}
          onBitisChange={state.handleBitisChange}
          hasActiveFilters={state.hasActiveFilters}
          onClearFilters={state.handleClearFilters}
          onImportFuel={onImportFuel}
        />

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'first:pl-4 last:pr-4',
                      header.column.id === 'actions'
                        ? 'sticky right-0 z-10 border-l border-border/70 bg-card pr-4'
                        : 'bg-background/60'
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading && !hasLoaded ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  {columns.map((col, cIdx) => (
                    <TableCell
                      key={`${idx}-${col.id || cIdx}`}
                      className={cn(
                        'py-3 first:pl-4 last:pr-4',
                        col.id === 'actions' &&
                          'sticky right-0 z-10 border-l border-border/70 bg-card pr-4'
                      )}
                    >
                      <Skeleton className="h-5 w-full max-w-36" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'py-3 first:pl-4 last:pr-4',
                        cell.column.id === 'actions' &&
                          'sticky right-0 z-10 border-l border-border/70 bg-card pr-4'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  {rows.length === 0 ? (
                    <EmptyState
                      compact
                      icon={ReceiptText}
                      title="Henüz hareket kaydı yok"
                      description="İlk yakıt ikmalinizi veya servis bakım kaydınızı ekleyerek gider defterini başlatın."
                      actionLabel={
                        canAddFuel && onCreateYakit
                          ? 'Yeni Yakıt'
                          : canAddMaintenance && onCreateBakim
                            ? 'Yeni Bakım'
                            : undefined
                      }
                      onAction={
                        canAddFuel && onCreateYakit
                          ? onCreateYakit
                          : canAddMaintenance && onCreateBakim
                            ? onCreateBakim
                            : undefined
                      }
                      secondaryActionLabel={
                        canAddFuel && canAddMaintenance && onCreateYakit && onCreateBakim
                          ? 'Yeni Bakım'
                          : undefined
                      }
                      onSecondaryAction={
                        canAddFuel && canAddMaintenance && onCreateYakit && onCreateBakim
                          ? onCreateBakim
                          : undefined
                      }
                    />
                  ) : (
                    <EmptyState
                      compact
                      icon={ReceiptText}
                      title="Filtrelerle eşleşen kayıt bulunamadı"
                      description="Arama metnini, seçili aracı veya tarih aralığını temizleyerek tüm hareketleri görüntüleyebilirsiniz."
                      actionLabel="Filtreleri Temizle"
                      actionVariant="outline"
                      onAction={state.handleClearFilters}
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <LedgerTablePagination table={table} totalFiltered={state.filteredRows.length} />
      </Card>
    </div>
  );
}
