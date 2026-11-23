import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Fuel,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { usePagination } from '@/hooks/use-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const ALL_VALUE = 'all';

function formatTrDate(isoDate) {
  if (!isoDate) return '—';
  const parts = String(isoDate).slice(0, 10).split('-');
  if (parts.length !== 3) return '—';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

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

export default function LedgerDataTable({
  rows = [],
  araclar = [],
  seciliAracId = null,
  onVehicleChange,
  loading = false,
  hasLoaded = false,
  canManage = false,
  onDeleteRequest,
}) {
  const [activeTab, setActiveTab] = useState(ALL_VALUE);
  const [searchQuery, setSearchQuery] = useState('');
  const [altTurFilter, setAltTurFilter] = useState(ALL_VALUE);
  const [baslangicTarihi, setBaslangicTarihi] = useState('');
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const isVehicleFiltered = Boolean(seciliAracId && seciliAracId !== 'tum');
  const vehicleSelectValue = isVehicleFiltered ? String(seciliAracId) : ALL_VALUE;

  const selectedVehicleInList = useMemo(
    () =>
      isVehicleFiltered
        ? araclar.some((a) => String(a.arac_id) === String(seciliAracId))
        : true,
    [araclar, isVehicleFiltered, seciliAracId]
  );

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setAltTurFilter(ALL_VALUE);
  };

  const handleVehicleSelectChange = (val) => {
    if (val === ALL_VALUE) {
      onVehicleChange?.(null);
    } else {
      onVehicleChange?.(val);
    }
  };

  // Sekme dışındaki ortak filtreler (araç + arama + tarih aralığı) → sekme sayaçları doğru kalır
  const baseFilteredRows = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');

    return rows.filter((row) => {
      if (isVehicleFiltered && String(row.arac_id) !== String(seciliAracId)) {
        return false;
      }

      if (baslangicTarihi && (!row.tarih || row.tarih < baslangicTarihi)) {
        return false;
      }

      if (bitisTarihi && (!row.tarih || row.tarih > bitisTarihi)) {
        return false;
      }

      if (!q) return true;

      const haystack = [
        row.plaka,
        formatTurkishPlate(row.plaka),
        row.marka,
        row.model,
        row.altTur,
        row.fatura_bilgisi,
        row.notlar,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return haystack.includes(q);
    });
  }, [rows, isVehicleFiltered, seciliAracId, baslangicTarihi, bitisTarihi, searchQuery]);

  const tabCounts = useMemo(() => {
    let yakit = 0;
    let bakim = 0;
    baseFilteredRows.forEach((row) => {
      if (row.tip === 'YAKIT') yakit += 1;
      else if (row.tip === 'BAKIM') bakim += 1;
    });
    return {
      all: baseFilteredRows.length,
      yakit,
      bakim,
    };
  }, [baseFilteredRows]);

  const altTurOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      if (activeTab !== ALL_VALUE && row.tip !== activeTab) return;
      if (row.altTur) set.add(row.altTur);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [rows, activeTab]);

  useEffect(() => {
    if (altTurFilter !== ALL_VALUE && !altTurOptions.includes(altTurFilter)) {
      setAltTurFilter(ALL_VALUE);
    }
  }, [altTurFilter, altTurOptions]);

  const filteredRows = useMemo(() => {
    return baseFilteredRows.filter((row) => {
      if (activeTab !== ALL_VALUE && row.tip !== activeTab) return false;
      if (altTurFilter !== ALL_VALUE && row.altTur !== altTurFilter) return false;
      return true;
    });
  }, [baseFilteredRows, activeTab, altTurFilter]);

  const summary = useMemo(() => {
    let totalCost = 0;
    let fuelCost = 0;
    let totalLitres = 0;
    let maintenanceCost = 0;

    filteredRows.forEach((row) => {
      const tutar = Number(row.tutar) || 0;
      totalCost += tutar;
      if (row.tip === 'YAKIT') {
        fuelCost += tutar;
        totalLitres += Number(row.litre) || 0;
      } else if (row.tip === 'BAKIM') {
        maintenanceCost += tutar;
      }
    });

    return {
      count: filteredRows.length,
      totalCost,
      fuelCost,
      totalLitres,
      maintenanceCost,
    };
  }, [filteredRows]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    activeTab,
    searchQuery,
    altTurFilter,
    baslangicTarihi,
    bitisTarihi,
    seciliAracId,
    rows.length,
  ]);

  const hasActiveFilters =
    activeTab !== ALL_VALUE ||
    searchQuery.trim().length > 0 ||
    isVehicleFiltered ||
    altTurFilter !== ALL_VALUE ||
    Boolean(baslangicTarihi) ||
    Boolean(bitisTarihi);

  const handleClearFilters = () => {
    setActiveTab(ALL_VALUE);
    setSearchQuery('');
    setAltTurFilter(ALL_VALUE);
    setBaslangicTarihi('');
    setBitisTarihi('');
    if (isVehicleFiltered) {
      onVehicleChange?.(null);
    }
  };

  const columns = useMemo(
    () => [
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
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Araç</span>
        ),
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
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Tür</span>
        ),
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
        accessorFn: (row) => (row.km === null ? -1 : row.km),
        header: ({ column }) => (
          <SortableHeader column={column} label="Sayaç" align="right" />
        ),
        cell: ({ row }) => {
          const { km, sayac_tipi: sayacTipi } = row.original;
          if (km === null || km === undefined) {
            return (
              <div className="text-right text-xs tabular-nums text-muted-foreground">—</div>
            );
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
                {birimFiyat !== null && (
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
      {
        id: 'tutar',
        accessorKey: 'tutar',
        header: ({ column }) => (
          <SortableHeader column={column} label="Tutar" align="right" />
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
            {formatCurrency(row.original.tutar, { maximumFractionDigits: 2 })}
          </div>
        ),
      },
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
                <span className="w-full truncate text-xs text-muted-foreground">
                  {notlar}
                </span>
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
          return (
            <div className="flex items-center justify-end gap-1">
              <span
                title="S6'da etkinleştirilecek"
                className="inline-flex cursor-not-allowed"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled
                  aria-label="Son kaydı tekrarla"
                >
                  <Copy className="size-4" />
                </Button>
              </span>

              {canManage && (
                <span
                  title="S6'da etkinleştirilecek"
                  className="inline-flex cursor-not-allowed"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled
                    aria-label="Kaydı düzenle"
                  >
                    <Pencil className="size-4" />
                  </Button>
                </span>
              )}

              {canManage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDeleteRequest?.(item)}
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
    ],
    [canManage, onDeleteRequest]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getRowId: (row) => row.id,
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

  const totalFiltered = filteredRows.length;
  const pageCount = Math.max(1, table.getPageCount());
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageSize = table.getState().pagination.pageSize;
  const rangeStart = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalFiltered);

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages: pageCount,
    paginationItemsToDisplay: 5,
  });

  return (
    <div className="space-y-4">
      {/* Üst Sekmeler (Tümü / Yakıt / Bakım) */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value={ALL_VALUE} className="gap-1.5 text-xs">
            <span>Tümü</span>
            <Badge
              variant="secondary"
              className="h-5 min-w-5 px-1.5 font-mono text-[11px] tabular-nums"
            >
              {formatLocaleNumber(tabCounts.all, 0)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="YAKIT" className="gap-1.5 text-xs">
            <Fuel className="size-3.5" />
            <span>Yakıt</span>
            <Badge
              variant="secondary"
              className="h-5 min-w-5 px-1.5 font-mono text-[11px] tabular-nums"
            >
              {formatLocaleNumber(tabCounts.yakit, 0)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="BAKIM" className="gap-1.5 text-xs">
            <Wrench className="size-3.5" />
            <span>Bakım</span>
            <Badge
              variant="secondary"
              className="h-5 min-w-5 px-1.5 font-mono text-[11px] tabular-nums"
            >
              {formatLocaleNumber(tabCounts.bakim, 0)}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Özet Toplam Barı */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">Kayıt Sayısı</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
            {formatLocaleNumber(summary.count, 0)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">Toplam Gider</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-primary">
            {formatCurrency(summary.totalCost, { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">Yakıt Toplamı</p>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatLocaleNumber(summary.totalLitres, 2)} L
            </span>
          </div>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
            {formatCurrency(summary.fuelCost, { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">Bakım Toplamı</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
            {formatCurrency(summary.maintenanceCost, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tablo Kartı */}
      <Card className="gap-0 overflow-hidden border border-border bg-card py-0 shadow-none">
        {/* Filtre Çubuğu (datatable-filtering-02 düzeni) */}
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="w-full sm:w-64 lg:w-72">
              <InputGroupAddon>
                <Search className="size-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Plaka, marka, tür, fatura, not ara..."
                aria-label="Hareketlerde ara"
              />
              {searchQuery && (
                <InputGroupAddon align="inline-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setSearchQuery('')}
                    aria-label="Aramayı temizle"
                  >
                    <X className="size-3.5" />
                  </Button>
                </InputGroupAddon>
              )}
            </InputGroup>

            <Select value={vehicleSelectValue} onValueChange={handleVehicleSelectChange}>
              <SelectTrigger
                aria-label="Araç filtresi"
                className="h-9 w-full rounded-lg border-border bg-background text-xs sm:w-48"
              >
                <SelectValue placeholder="Tüm Araçlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Araç: Tümü</SelectItem>
                {!selectedVehicleInList && isVehicleFiltered && (
                  <SelectItem value={String(seciliAracId)}>
                    Araç #{seciliAracId}
                  </SelectItem>
                )}
                {araclar.map((arac) => (
                  <SelectItem key={arac.arac_id} value={String(arac.arac_id)}>
                    <span className="font-mono font-medium">
                      {formatTurkishPlate(arac.plaka)}
                    </span>
                    {arac.marka ? ` — ${arac.marka}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={altTurFilter} onValueChange={setAltTurFilter}>
              <SelectTrigger
                aria-label="Alt tür filtresi"
                className="h-9 w-full rounded-lg border-border bg-background text-xs sm:w-44"
              >
                <SelectValue placeholder="Tür: Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Alt Tür: Tümü</SelectItem>
                {altTurOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-40">
                <TrussDatePicker
                  name="baslangicTarihi"
                  value={baslangicTarihi}
                  onChange={(e) => setBaslangicTarihi(e.target.value)}
                  placeholder="Başlangıç"
                  className="h-9 text-xs"
                />
              </div>
              <div className="w-40">
                <TrussDatePicker
                  name="bitisTarihi"
                  value={bitisTarihi}
                  onChange={(e) => setBitisTarihi(e.target.value)}
                  placeholder="Bitiş"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                <span>Filtreleri Temizle</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tablo Gövdesi */}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-background/60 first:pl-4 last:pr-4"
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
                      className="py-3 first:pl-4 last:pr-4"
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
                    <TableCell key={cell.id} className="py-3 first:pl-4 last:pr-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-14 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                      <ReceiptText className="size-5" />
                    </div>
                    {rows.length === 0 ? (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Henüz hareket kaydı yok
                          </p>
                          <p className="text-xs text-muted-foreground">
                            İlk yakıt ikmalinizi veya servis bakım kaydınızı ekleyerek gider
                            defterini başlatın.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <span
                            title="S6'da etkinleştirilecek"
                            className="inline-flex cursor-not-allowed"
                          >
                            <Button type="button" size="sm" disabled className="gap-1.5">
                              <Plus className="size-3.5" />
                              <span>Yeni Yakıt</span>
                            </Button>
                          </span>
                          <span
                            title="S6'da etkinleştirilecek"
                            className="inline-flex cursor-not-allowed"
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              className="gap-1.5"
                            >
                              <Plus className="size-3.5" />
                              <span>Yeni Bakım</span>
                            </Button>
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Filtrelerle eşleşen kayıt bulunamadı
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Arama metnini, seçili aracı veya tarih aralığını temizleyerek tüm
                            hareketleri görüntüleyebilirsiniz.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                        >
                          Filtreleri Temizle
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Sayfalama Alt Çubuğu */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Sayfa başına
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger
                aria-label="Sayfa başına satır sayısı"
                className="h-8 w-20 rounded-lg border-border bg-background text-xs tabular-nums"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                    className="text-xs tabular-nums"
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {formatLocaleNumber(rangeStart, 0)}–{formatLocaleNumber(rangeEnd, 0)} /{' '}
              {formatLocaleNumber(totalFiltered, 0)} kayıt
            </p>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Önceki sayfa"
              >
                <ChevronLeft className="size-4" />
              </Button>

              {showLeftEllipsis && (
                <span className="px-1 text-xs text-muted-foreground">…</span>
              )}

              {pages.map((page) => {
                const isActive = page === currentPage;
                return (
                  <Button
                    key={page}
                    type="button"
                    size="icon-sm"
                    variant={isActive ? 'secondary' : 'ghost'}
                    onClick={() => table.setPageIndex(page - 1)}
                    aria-current={isActive ? 'page' : undefined}
                    className="tabular-nums"
                  >
                    {page}
                  </Button>
                );
              })}

              {showRightEllipsis && (
                <span className="px-1 text-xs text-muted-foreground">…</span>
              )}

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Sonraki sayfa"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
