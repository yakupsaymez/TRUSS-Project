import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Truck } from 'lucide-react';
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
  enrichFleetRows,
  extractCategories,
  filterFleetRows,
} from './fleet-data-table/fleetTableHelpers';
import { buildFleetColumns } from './fleet-data-table/fleetTableColumns';
import FleetTableToolbar from './fleet-data-table/FleetTableToolbar';
import FleetTablePagination from './fleet-data-table/FleetTablePagination';

export default function FleetDataTable({
  araclar = [],
  loading = false,
  hasLoaded = false,
  canManage = false,
  canViewAnalytics = false,
  tcoByAracId = null,
  loadingTco = false,
  isArchivedView = false,
  restoringId = null,
  globalVehicleActive = false,
  initialDurumFilter = 'all',
  onDurumFilterChange,
  onClearGlobalVehicle,
  onDetail,
  onCreateClick,
  onEditClick,
  onDeleteRequest,
  onRestoreClick,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sayacFilter, setSayacFilter] = useState('all');
  const [durumFilter, setDurumFilter] = useState(initialDurumFilter || 'all');
  const [kategoriFilter, setKategoriFilter] = useState('all');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  useEffect(() => {
    setDurumFilter(initialDurumFilter || 'all');
  }, [initialDurumFilter]);

  const handleDurumFilterChange = (val) => {
    setDurumFilter(val);
    onDurumFilterChange?.(val);
  };

  const kategoriler = useMemo(() => extractCategories(araclar), [araclar]);

  useEffect(() => {
    if (kategoriFilter !== 'all' && !kategoriler.includes(kategoriFilter)) {
      setKategoriFilter('all');
    }
  }, [kategoriFilter, kategoriler]);

  const enrichedRows = useMemo(
    () => enrichFleetRows(araclar, {}, tcoByAracId),
    [araclar, tcoByAracId]
  );

  const effectiveDurumFilter = isArchivedView ? 'all' : durumFilter;

  const filteredData = useMemo(
    () =>
      filterFleetRows(enrichedRows, {
        searchQuery,
        sayacFilter,
        kategoriFilter,
        durumFilter: effectiveDurumFilter,
      }),
    [enrichedRows, searchQuery, sayacFilter, kategoriFilter, effectiveDurumFilter]
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, sayacFilter, effectiveDurumFilter, kategoriFilter, isArchivedView]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredData.length / pagination.pageSize) - 1);
    setPagination((prev) => (prev.pageIndex > maxPage ? { ...prev, pageIndex: maxPage } : prev));
  }, [filteredData.length, pagination.pageSize]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    sayacFilter !== 'all' ||
    effectiveDurumFilter !== 'all' ||
    kategoriFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSayacFilter('all');
    setDurumFilter('all');
    setKategoriFilter('all');
    onDurumFilterChange?.('all');
    if (globalVehicleActive && onClearGlobalVehicle) {
      onClearGlobalVehicle();
    }
  };

  const columns = useMemo(
    () =>
      buildFleetColumns({
        canManage,
        canViewAnalytics,
        loadingTco,
        isArchivedView,
        restoringId,
        onDetail,
        onEditClick,
        onDeleteRequest,
        onRestoreClick,
      }),
    [
      canManage,
      canViewAnalytics,
      loadingTco,
      isArchivedView,
      restoringId,
      onDetail,
      onEditClick,
      onDeleteRequest,
      onRestoreClick,
    ]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Card className="gap-0 overflow-hidden border border-border bg-card py-0 shadow-none">
      <FleetTableToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        sayacFilter={sayacFilter}
        onSayacFilterChange={setSayacFilter}
        durumFilter={durumFilter}
        onDurumFilterChange={handleDurumFilterChange}
        kategoriFilter={kategoriFilter}
        onKategoriFilterChange={setKategoriFilter}
        kategoriler={kategoriler}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        isArchivedView={isArchivedView}
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
            Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                {columns.map((col, cIdx) => (
                  <TableCell
                    key={`${idx}-${col.id || cIdx}`}
                    className={cn(
                      'first:pl-4 last:pr-4',
                      col.id === 'actions' &&
                        'sticky right-0 z-10 border-l border-border/70 bg-card pr-4'
                    )}
                  >
                    <Skeleton className="h-5 w-full max-w-40" />
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
                {araclar.length === 0 && !globalVehicleActive ? (
                  <EmptyState
                    compact
                    icon={Truck}
                    title={
                      isArchivedView
                        ? 'Arşivlenmiş araç bulunmuyor'
                        : canManage
                          ? 'Henüz kayıtlı araç yok'
                          : 'Henüz zimmetli aracınız yok'
                    }
                    description={
                      isArchivedView
                        ? 'Geçmiş hareketi veya maliyeti nedeniyle arşivlenen araçlar burada listelenir.'
                        : canManage
                          ? 'Filonuza ilk aracınızı ekleyerek sayaç, bakım ve evrak takibini başlatın.'
                          : 'Filo yöneticiniz size bir araç zimmetlediğinde araçlarınız burada listelenecektir.'
                    }
                    actionLabel={!isArchivedView && canManage ? 'Araç Ekle' : undefined}
                    onAction={!isArchivedView && canManage ? onCreateClick : undefined}
                  />
                ) : (
                  <EmptyState
                    compact
                    icon={Truck}
                    title="Filtrelerle eşleşen araç bulunamadı"
                    description="Arama metnini veya aktif filtreleri temizleyerek tüm araçları görüntüleyebilirsiniz."
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

      <FleetTablePagination table={table} totalFiltered={filteredData.length} />
    </Card>
  );
}
