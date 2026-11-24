import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Cog } from 'lucide-react';
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
import {
  ALL_VALUE,
  buildEnrichedComponentRows,
  filterComponentRows,
  hesaplaParcaOmru,
  summarizeComponentRows,
} from './component-data-table/componentTableHelpers';
import createComponentColumns from './component-data-table/componentTableColumns';
import ComponentTableSummary from './component-data-table/ComponentTableSummary';
import ComponentTableToolbar from './component-data-table/ComponentTableToolbar';
import ComponentTablePagination from './component-data-table/ComponentTablePagination';

export { hesaplaParcaOmru };

export default function ComponentDataTable({
  parcalar = [],
  araclar = [],
  seciliAracId = null,
  onVehicleChange,
  statusFilter,
  onStatusFilterChange,
  showSummary = true,
  loading = false,
  hasLoaded = false,
  canManage = false,
  canViewFinance = true,
  onCreateClick,
  onReplaceClick,
  onEditClick,
  onDeleteRequest,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState(ALL_VALUE);
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const activeStatusFilter = statusFilter !== undefined ? statusFilter : internalStatusFilter;

  const setActiveStatusFilter = (nextVal) => {
    if (onStatusFilterChange) onStatusFilterChange(nextVal);
    else setInternalStatusFilter(nextVal);
  };

  const isVehicleFiltered = Boolean(seciliAracId && seciliAracId !== 'tum');
  const vehicleSelectValue = isVehicleFiltered ? String(seciliAracId) : ALL_VALUE;

  const aracMap = useMemo(() => {
    const map = new Map();
    araclar.forEach((a) => map.set(String(a.arac_id), a));
    return map;
  }, [araclar]);

  const selectedVehicleInList = useMemo(
    () =>
      isVehicleFiltered
        ? araclar.some((a) => String(a.arac_id) === String(seciliAracId))
        : true,
    [araclar, isVehicleFiltered, seciliAracId]
  );

  const enrichedRows = useMemo(
    () => buildEnrichedComponentRows(parcalar, aracMap),
    [parcalar, aracMap]
  );

  const filteredRows = useMemo(
    () =>
      filterComponentRows(enrichedRows, {
        isVehicleFiltered,
        seciliAracId,
        activeStatusFilter,
        searchQuery,
      }),
    [enrichedRows, isVehicleFiltered, seciliAracId, activeStatusFilter, searchQuery]
  );

  const summary = useMemo(() => summarizeComponentRows(filteredRows), [filteredRows]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, activeStatusFilter, seciliAracId, parcalar.length]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || isVehicleFiltered || activeStatusFilter !== ALL_VALUE;

  const handleVehicleSelectChange = (val) => {
    onVehicleChange?.(val === ALL_VALUE ? null : val);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveStatusFilter(ALL_VALUE);
    if (isVehicleFiltered) onVehicleChange?.(null);
  };

  const columns = useMemo(
    () =>
      createComponentColumns({
        canManage,
        canViewFinance,
        onReplaceClick,
        onEditClick,
        onDeleteRequest,
      }),
    [canManage, canViewFinance, onReplaceClick, onEditClick, onDeleteRequest]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageRows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColCount = Math.max(1, visibleColumns.length);

  return (
    <div className="space-y-4">
      {showSummary && <ComponentTableSummary summary={summary} canViewFinance={canViewFinance} />}

      <Card className="gap-0 overflow-hidden border border-border bg-card py-0 shadow-none">
        <ComponentTableToolbar
          table={table}
          araclar={araclar}
          seciliAracId={seciliAracId}
          isVehicleFiltered={isVehicleFiltered}
          selectedVehicleInList={selectedVehicleInList}
          vehicleSelectValue={vehicleSelectValue}
          onVehicleSelectChange={handleVehicleSelectChange}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          activeStatusFilter={activeStatusFilter}
          onStatusFilterChange={setActiveStatusFilter}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          kritikCount={summary.kritik}
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
                  {visibleColumns.map((col, cIdx) => (
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
            ) : pageRows.length > 0 ? (
              pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={
                    row.original.omur.durum === 'kritik'
                      ? 'bg-destructive/5 hover:bg-destructive/10'
                      : undefined
                  }
                >
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
                <TableCell colSpan={visibleColCount} className="p-0">
                  {parcalar.length === 0 ? (
                    <EmptyState
                      compact
                      icon={Cog}
                      title="Henüz takipli parça yok"
                      description="Triger, fren balatası, akü ve kritik bileşenleri takibe alarak ömür eşiklerini izleyin."
                      actionLabel={canManage ? 'Yeni Parça' : undefined}
                      onAction={canManage ? onCreateClick : undefined}
                    />
                  ) : (
                    <EmptyState
                      compact
                      icon={Cog}
                      title="Filtrelerle eşleşen parça bulunamadı"
                      description="Arama metnini, seçili aracı veya durum filtresini temizleyerek tüm parçaları görüntüleyebilirsiniz."
                      actionLabel="Filtreleri Temizle"
                      actionVariant="outline"
                      onAction={handleClearFilters}
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <ComponentTablePagination table={table} totalFiltered={filteredRows.length} />
      </Card>
    </div>
  );
}
