import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Cog,
  LayoutGrid,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { getGuncelSayac } from '@/utils/aracDurum';
import { toLocalIsoDate } from '@/utils/dateUtils';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { usePagination } from '@/hooks/use-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Progress } from '@/components/ui/progress';
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
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const ALL_VALUE = 'all';

const STATUS_FILTER_OPTIONS = [
  { value: ALL_VALUE, label: 'Durum: Tümü' },
  { value: 'kritik', label: 'Değişim Gerekli' },
  { value: 'uyari', label: 'Yaklaşıyor' },
  { value: 'iyi', label: 'Optimal' },
  { value: 'tarih_bazli', label: 'Tarih Bazlı' },
];

export function hesaplaParcaOmru(parca, aracMap) {
  const arac = aracMap instanceof Map ? aracMap.get(String(parca.arac_id)) || null : null;
  const isSmh =
    (parca.sayac_tipi || arac?.sayac_tipi) === 'SMH' ||
    Number(arac?.calisma_saati_bakim) > 0;
  const sayacTipi = isSmh ? 'SMH' : 'KM';
  const birim = sayacTipi === 'SMH' ? 'saat' : 'km';

  const guncelSayac = Number(
    parca.guncel_km ?? (arac ? getGuncelSayac(arac) : 0) ?? 0
  );
  const sonDegisimKm = Number(parca.son_degisim_km || 0);
  const aralik = Number(parca.degisim_araligi_km || 0);
  const kullanilan = Math.max(0, guncelSayac - sonDegisimKm);

  if (aralik <= 0) {
    return {
      sayacTipi,
      birim,
      guncelSayac,
      sonDegisimKm,
      aralik: 0,
      kullanilan,
      durum: 'tarih_bazli',
      etiket: 'Tarih Bazlı',
      kalan: null,
      kalanYuzde: null,
      oncelik: 3,
    };
  }

  const kalan = aralik - kullanilan;
  const kalanYuzde = Math.max(0, Math.min(100, Math.round((kalan / aralik) * 100)));
  const kritik = kalan <= 0;
  const uyari =
    !kritik &&
    (kalanYuzde <= 15 ||
      (sayacTipi === 'KM' && kalan <= 1500) ||
      (sayacTipi === 'SMH' && kalan <= 25));

  if (kritik) {
    return {
      sayacTipi,
      birim,
      guncelSayac,
      sonDegisimKm,
      aralik,
      kullanilan,
      durum: 'kritik',
      etiket: 'Değişim Gerekli',
      kalan,
      kalanYuzde,
      oncelik: 0,
    };
  }

  if (uyari) {
    return {
      sayacTipi,
      birim,
      guncelSayac,
      sonDegisimKm,
      aralik,
      kullanilan,
      durum: 'uyari',
      etiket: 'Değişim Yaklaşıyor',
      kalan,
      kalanYuzde,
      oncelik: 1,
    };
  }

  return {
    sayacTipi,
    birim,
    guncelSayac,
    sonDegisimKm,
    aralik,
    kullanilan,
    durum: 'iyi',
    etiket: 'Optimal Ömür',
    kalan,
    kalanYuzde,
    oncelik: 2,
  };
}

function formatTrDate(raw) {
  if (!raw) return '—';
  const str = String(raw).trim();
  const pureDate = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDate) {
    return `${pureDate[3]}.${pureDate[2]}.${pureDate[1]}`;
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '—';
  const iso = toLocalIsoDate(d);
  const [y, m, day] = iso.split('-');
  return `${day}.${m}.${y}`;
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

function statusBadgeClass(durum) {
  if (durum === 'kritik') {
    return 'border-destructive/30 bg-destructive/10 text-destructive';
  }
  if (durum === 'uyari') {
    return 'border-primary/30 bg-primary/10 text-primary';
  }
  if (durum === 'iyi') {
    return 'border-border bg-muted text-foreground';
  }
  return 'border-border bg-background text-muted-foreground';
}

export default function ComponentDataTable({
  parcalar = [],
  araclar = [],
  seciliAracId = null,
  onVehicleChange,
  statusFilter,
  onStatusFilterChange,
  loading = false,
  hasLoaded = false,
  canManage = false,
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

  const activeStatusFilter =
    statusFilter !== undefined ? statusFilter : internalStatusFilter;

  const setActiveStatusFilter = (nextVal) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(nextVal);
    } else {
      setInternalStatusFilter(nextVal);
    }
  };

  const isVehicleFiltered = Boolean(seciliAracId && seciliAracId !== 'tum');
  const vehicleSelectValue = isVehicleFiltered ? String(seciliAracId) : ALL_VALUE;

  const aracMap = useMemo(() => {
    const map = new Map();
    araclar.forEach((a) => {
      map.set(String(a.arac_id), a);
    });
    return map;
  }, [araclar]);

  const selectedVehicleInList = useMemo(
    () =>
      isVehicleFiltered
        ? araclar.some((a) => String(a.arac_id) === String(seciliAracId))
        : true,
    [araclar, isVehicleFiltered, seciliAracId]
  );

  const enrichedRows = useMemo(() => {
    const list = parcalar.map((parca) => {
      const arac = aracMap.get(String(parca.arac_id)) || null;
      const omur = hesaplaParcaOmru(parca, aracMap);
      const plaka = parca.plaka || arac?.plaka || `#${parca.arac_id}`;
      const marka = parca.marka || arac?.marka || '';
      const model = parca.model || arac?.model || '';
      const maliyet = Number(parca.maliyet || 0);
      const notlar = String(parca.notlar || '').trim();

      return {
        id: String(parca.parca_id),
        parca,
        plaka,
        formattedPlaka: formatTurkishPlate(plaka) || plaka,
        marka,
        model,
        maliyet,
        notlar,
        tarihFormatted: formatTrDate(parca.son_degisim_tarihi),
        omur,
      };
    });

    list.sort((a, b) => {
      if (a.omur.oncelik !== b.omur.oncelik) {
        return a.omur.oncelik - b.omur.oncelik;
      }
      const aYuzde = a.omur.kalanYuzde === null ? Number.POSITIVE_INFINITY : a.omur.kalanYuzde;
      const bYuzde = b.omur.kalanYuzde === null ? Number.POSITIVE_INFINITY : b.omur.kalanYuzde;
      if (aYuzde !== bYuzde) {
        return aYuzde - bYuzde;
      }
      return String(a.parca.parca_adi || '').localeCompare(
        String(b.parca.parca_adi || ''),
        'tr-TR'
      );
    });

    return list;
  }, [parcalar, aracMap]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');

    return enrichedRows.filter((row) => {
      if (isVehicleFiltered && String(row.parca.arac_id) !== String(seciliAracId)) {
        return false;
      }

      if (activeStatusFilter !== ALL_VALUE && row.omur.durum !== activeStatusFilter) {
        return false;
      }

      if (!q) return true;

      const haystack = [
        row.parca.parca_adi,
        row.plaka,
        row.formattedPlaka,
        row.marka,
        row.model,
        row.notlar,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return haystack.includes(q);
    });
  }, [enrichedRows, isVehicleFiltered, seciliAracId, activeStatusFilter, searchQuery]);

  // Kritik ("Değişim Gerekli") satırlar otomatik olarak üst gruba sabitlenir (datatable-example-05 rowPinning)
  const rowPinning = useMemo(
    () => ({
      top: filteredRows
        .filter((row) => row.omur.durum === 'kritik')
        .map((row) => row.id),
      bottom: [],
    }),
    [filteredRows]
  );

  const summary = useMemo(() => {
    let kritik = 0;
    let uyari = 0;
    let totalCost = 0;

    filteredRows.forEach((row) => {
      if (row.omur.durum === 'kritik') kritik += 1;
      else if (row.omur.durum === 'uyari') uyari += 1;
      totalCost += row.maliyet;
    });

    return {
      total: filteredRows.length,
      kritik,
      uyari,
      totalCost,
    };
  }, [filteredRows]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, activeStatusFilter, seciliAracId, parcalar.length]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    isVehicleFiltered ||
    activeStatusFilter !== ALL_VALUE;

  const handleVehicleSelectChange = (val) => {
    if (val === ALL_VALUE) {
      onVehicleChange?.(null);
    } else {
      onVehicleChange?.(val);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveStatusFilter(ALL_VALUE);
    if (isVehicleFiltered) {
      onVehicleChange?.(null);
    }
  };

  const columns = useMemo(() => {
    const cols = [
      {
        id: 'parca',
        accessorFn: (row) => row.parca.parca_adi || '',
        enableHiding: false,
        meta: { label: 'Parça' },
        header: ({ column }) => <SortableHeader column={column} label="Parça" />,
        cell: ({ row }) => {
          const { parca, omur } = row.original;
          const isPinned = row.getIsPinned() === 'top';
          return (
            <div className="flex min-w-0 flex-col items-start gap-1">
              <div className="flex items-center gap-1.5">
                {isPinned && (
                  <Pin
                    className="size-3.5 shrink-0 text-destructive"
                    aria-label="Üste sabitlenen kritik parça"
                  />
                )}
                <span className="max-w-52 truncate text-sm font-medium text-foreground">
                  {parca.parca_adi}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'h-5 px-1.5 text-[11px] font-medium',
                  statusBadgeClass(omur.durum)
                )}
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
              <span className="font-mono text-[11px] text-muted-foreground">
                {tarihFormatted}
              </span>
            </div>
          );
        },
      },
      {
        id: 'aralik',
        accessorFn: (row) => row.omur.aralik,
        meta: { label: 'Aralık' },
        header: ({ column }) => (
          <SortableHeader column={column} label="Aralık" align="right" />
        ),
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
        header: ({ column }) => (
          <SortableHeader column={column} label="Maliyet" align="right" />
        ),
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
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Not</span>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const { notlar } = row.original;
          if (!notlar) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
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
  }, [canManage, onReplaceClick, onEditClick, onDeleteRequest]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    getRowId: (row) => row.id,
    enableRowPinning: true,
    keepPinnedRows: true,
    state: {
      sorting,
      columnVisibility,
      rowPinning,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const topRows = table.getTopRows();
  const centerRows = table.getCenterRows();
  const visibleColCount = Math.max(1, table.getVisibleLeafColumns().length);

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
      {/* Özet Şerit */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">Toplam Parça</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
            {formatLocaleNumber(summary.total, 0)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">Değişim Gerekli</p>
            {summary.kritik > 0 && (
              <AlertTriangle className="size-3.5 text-destructive" />
            )}
          </div>
          <p
            className={cn(
              'mt-1 font-mono text-lg font-bold tracking-tight tabular-nums',
              summary.kritik > 0 ? 'text-destructive' : 'text-foreground'
            )}
          >
            {formatLocaleNumber(summary.kritik, 0)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">Yaklaşıyor</p>
          <p
            className={cn(
              'mt-1 font-mono text-lg font-bold tracking-tight tabular-nums',
              summary.uyari > 0 ? 'text-primary' : 'text-foreground'
            )}
          >
            {formatLocaleNumber(summary.uyari, 0)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">Toplam Maliyet</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight tabular-nums text-foreground">
            {formatCurrency(summary.totalCost, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tablo Kartı */}
      <Card className="gap-0 overflow-hidden border border-border bg-card py-0 shadow-none">
        {/* Filtre & Kolon Görünürlüğü Çubuğu (datatable-example-05 düzeni) */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <InputGroup className="w-full sm:w-64 lg:w-72">
              <InputGroupAddon>
                <Search className="size-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Parça adı, plaka, marka, not ara..."
                aria-label="Parçalarda ara"
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
                <SelectValue placeholder="Araç: Tümü" />
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

            <Select value={activeStatusFilter} onValueChange={setActiveStatusFilter}>
              <SelectTrigger
                aria-label="Durum filtresi"
                className="h-9 w-full rounded-lg border-border bg-background text-xs sm:w-44"
              >
                <SelectValue placeholder="Durum: Tümü" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

          <div className="flex items-center gap-2">
            {topRows.length > 0 && (
              <Badge
                variant="outline"
                className="h-8 gap-1.5 border-destructive/30 bg-destructive/10 px-2.5 text-xs font-medium tabular-nums text-destructive"
              >
                <Pin className="size-3.5" />
                <span>{formatLocaleNumber(topRows.length, 0)} kritik sabit</span>
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs"
                  aria-label="Kolon görünürlüğü"
                >
                  <LayoutGrid className="size-3.5" />
                  <span>Kolonlar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">Görünür Kolonlar</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        onSelect={(e) => e.preventDefault()}
                        className="text-xs"
                      >
                        {column.columnDef.meta?.label || column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  {Array.from({ length: visibleColCount }).map((__, cIdx) => (
                    <TableCell
                      key={`${idx}-${cIdx}`}
                      className="py-3 first:pl-4 last:pr-4"
                    >
                      <Skeleton className="h-5 w-full max-w-36" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : topRows.length > 0 || centerRows.length > 0 ? (
              <>
                {topRows.length > 0 && (
                  <>
                    <TableRow className="bg-destructive/5 hover:bg-destructive/5">
                      <TableCell
                        colSpan={visibleColCount}
                        className="px-4 py-2 text-xs font-semibold text-destructive"
                      >
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <Pin className="size-3.5" />
                          <span>
                            Sabitlenen Kritik Parçalar ({formatLocaleNumber(topRows.length, 0)})
                          </span>
                        </span>
                      </TableCell>
                    </TableRow>
                    {topRows.map((row) => (
                      <TableRow key={row.id} className="bg-destructive/5 hover:bg-destructive/10">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3 first:pl-4 last:pr-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </>
                )}

                {centerRows.length > 0 && topRows.length > 0 && (
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell
                      colSpan={visibleColCount}
                      className="px-4 py-2 text-xs font-medium text-muted-foreground"
                    >
                      Diğer Parçalar
                    </TableCell>
                  </TableRow>
                )}

                {centerRows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 first:pl-4 last:pr-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleColCount} className="py-14 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                      <Cog className="size-5" />
                    </div>
                    {parcalar.length === 0 ? (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Henüz takipli parça yok
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Triger, fren balatası, akü ve kritik bileşenleri takibe alarak ömür
                            eşiklerini izleyin.
                          </p>
                        </div>
                        {canManage && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={onCreateClick}
                            className="gap-1.5"
                          >
                            <Plus className="size-3.5" />
                            <span>Yeni Parça</span>
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Filtrelerle eşleşen parça bulunamadı
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Arama metnini, seçili aracı veya durum filtresini temizleyerek tüm
                            parçaları görüntüleyebilirsiniz.
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
              {formatLocaleNumber(totalFiltered, 0)} parça
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
