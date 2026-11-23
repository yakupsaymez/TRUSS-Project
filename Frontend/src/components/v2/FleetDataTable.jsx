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
  ExternalLink,
  MoreVertical,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  EVRAK_UYARI_GUN,
  evrakRiskliMi,
  getBakimPeriyodu,
  getGuncelSayac,
  getSayacBirimi,
  hesaplaBakimDurumu,
  isSmhArac,
} from '@/utils/aracDurum';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { usePagination } from '@/hooks/use-pagination';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function getInitials(name) {
  const clean = String(name || '').trim();
  if (!clean) return 'ŞF';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('tr-TR');
  }
  return clean.slice(0, 2).toLocaleUpperCase('tr-TR');
}

function formatTrDate(isoLike) {
  if (!isoLike) return '—';
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function computeDocumentSummary(arac) {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  const items = [
    { key: 'muayene', short: 'M', ad: 'Muayene', tarih: arac?.muayene_tarihi || null },
    { key: 'sigorta', short: 'S', ad: 'Sigorta', tarih: arac?.sigorta_tarihi || null },
    { key: 'kasko', short: 'K', ad: 'Kasko', tarih: arac?.kasko_tarihi || null },
  ].map((item) => {
    if (!item.tarih) {
      return { ...item, gun: null, formatted: '—' };
    }
    const hedef = new Date(item.tarih);
    if (Number.isNaN(hedef.getTime())) {
      return { ...item, gun: null, formatted: '—' };
    }
    hedef.setHours(0, 0, 0, 0);
    const gun = Math.ceil((hedef - bugun) / MILLISECONDS_IN_DAY);
    return { ...item, gun, formatted: formatTrDate(item.tarih) };
  });

  const valid = items.filter((i) => i.gun !== null);
  if (valid.length === 0) {
    return { items, nearest: null, sortValue: Number.POSITIVE_INFINITY };
  }

  const nearest = valid.reduce((min, curr) => (curr.gun < min.gun ? curr : min), valid[0]);
  return { items, nearest, sortValue: nearest.gun };
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

export default function FleetDataTable({
  araclar = [],
  driverByAracId = {},
  loading = false,
  hasLoaded = false,
  canManage = false,
  globalVehicleActive = false,
  onClearGlobalVehicle,
  onDetail,
  onDeleteRequest,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sayacFilter, setSayacFilter] = useState('all');
  const [durumFilter, setDurumFilter] = useState('all');
  const [kategoriFilter, setKategoriFilter] = useState('all');
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const kategoriler = useMemo(() => {
    const set = new Set();
    araclar.forEach((arac) => {
      set.add(arac.kategori || 'Otomobil');
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [araclar]);

  const enrichedRows = useMemo(() => {
    return araclar.map((arac) => {
      const sayac = getGuncelSayac(arac);
      const smh = isSmhArac(arac);
      const birim = getSayacBirimi(arac);
      const bakim = hesaplaBakimDurumu(arac);
      const periyot = getBakimPeriyodu(arac);
      const evrakRiskli = evrakRiskliMi(arac);
      const docSummary = computeDocumentSummary(arac);
      const driverName = driverByAracId[String(arac.arac_id)] || '';
      const formattedPlaka = formatTurkishPlate(arac.plaka);
      const kategori = arac.kategori || 'Otomobil';

      return {
        arac,
        id: String(arac.arac_id),
        formattedPlaka,
        kategori,
        sayac,
        smh,
        birim,
        bakim,
        periyot,
        evrakRiskli,
        docSummary,
        driverName,
      };
    });
  }, [araclar, driverByAracId]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');

    return enrichedRows.filter((row) => {
      if (sayacFilter === 'KM' && row.smh) return false;
      if (sayacFilter === 'SMH' && !row.smh) return false;

      if (kategoriFilter !== 'all' && row.kategori !== kategoriFilter) return false;

      if (durumFilter === 'kritik_bakim' && row.bakim.durum !== 'tehlike') return false;
      if (durumFilter === 'riskli_evrak' && !row.evrakRiskli) return false;
      if (
        durumFilter === 'sorunsuz' &&
        (row.bakim.durum === 'tehlike' || row.evrakRiskli)
      ) {
        return false;
      }

      if (!q) return true;

      const haystack = [
        row.arac.plaka,
        row.formattedPlaka,
        row.arac.marka,
        row.arac.model,
        row.kategori,
        row.driverName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return haystack.includes(q);
    });
  }, [enrichedRows, searchQuery, sayacFilter, kategoriFilter, durumFilter]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, sayacFilter, durumFilter, kategoriFilter, araclar.length]);

  useEffect(() => {
    if (!canManage) {
      setRowSelection({});
    }
  }, [canManage]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    sayacFilter !== 'all' ||
    durumFilter !== 'all' ||
    kategoriFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSayacFilter('all');
    setDurumFilter('all');
    setKategoriFilter('all');
    if (globalVehicleActive && onClearGlobalVehicle) {
      onClearGlobalVehicle();
    }
  };

  const columns = useMemo(() => {
    const cols = [];

    if (canManage) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Sayfadaki tüm araçları seç"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`${row.original.formattedPlaka} satırını seç`}
          />
        ),
        enableSorting: false,
        size: 44,
      });
    }

    cols.push(
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
        cell: ({ row }) => {
          const { items, nearest } = row.original.docSummary;

          let badgeEl;
          if (!nearest) {
            badgeEl = (
              <Badge variant="outline" className="text-muted-foreground">
                Evrak Yok
              </Badge>
            );
          } else if (nearest.gun < 0) {
            badgeEl = (
              <Badge variant="destructive" className="tabular-nums">
                {Math.abs(nearest.gun)}g gecikti · {nearest.ad}
              </Badge>
            );
          } else if (nearest.gun <= EVRAK_UYARI_GUN) {
            badgeEl = (
              <Badge
                variant="outline"
                className="border-status-warning/40 bg-status-warning/10 text-status-warning tabular-nums"
              >
                {nearest.gun}g kaldı · {nearest.ad}
              </Badge>
            );
          } else {
            badgeEl = (
              <Badge variant="secondary" className="text-muted-foreground tabular-nums">
                {nearest.gun}g kaldı · {nearest.ad}
              </Badge>
            );
          }

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-default flex-col items-start gap-1">
                  {badgeEl}
                  <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
                    {items.map((doc) => (
                      <span key={doc.key}>
                        {doc.short}: {doc.formatted}
                      </span>
                    ))}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="space-y-1 text-xs">
                {items.map((doc) => (
                  <div
                    key={doc.key}
                    className="flex items-center justify-between gap-4 tabular-nums"
                  >
                    <span className="font-medium">{doc.ad}:</span>
                    <span>
                      {doc.formatted}
                      {doc.gun !== null
                        ? doc.gun < 0
                          ? ` (${Math.abs(doc.gun)}g gecikti)`
                          : ` (${doc.gun}g kaldı)`
                        : ''}
                    </span>
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: 'bakim',
        accessorFn: (row) =>
          row.bakim.kalan === null ? Number.POSITIVE_INFINITY : row.bakim.kalan,
        header: ({ column }) => <SortableHeader column={column} label="Bakıma Kalan" />,
        cell: ({ row }) => {
          const { bakim, periyot } = row.original;
          const { durum, kalan, birim } = bakim;

          if (durum === 'bilinmiyor' || kalan === null) {
            return (
              <div className="flex w-44 flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Bakım kaydı yok</span>
                </div>
                <Progress value={0} className="h-1.5 bg-muted" />
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  Periyot: {formatLocaleNumber(periyot, 0)} {birim}
                </span>
              </div>
            );
          }

          const pct = Math.max(0, Math.min(100, Math.round((kalan / periyot) * 100)));
          const isTehlike = durum === 'tehlike';
          const isUyari = durum === 'uyari';

          return (
            <div className="flex w-44 flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                <span
                  className={cn(
                    'font-medium',
                    isTehlike
                      ? 'text-destructive'
                      : isUyari
                        ? 'text-primary'
                        : 'text-foreground'
                  )}
                >
                  {isTehlike
                    ? `${formatLocaleNumber(Math.abs(kalan), 0)} ${birim} aşıldı`
                    : `${formatLocaleNumber(kalan, 0)} ${birim} kaldı`}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  %{pct}
                </span>
              </div>
              <Progress
                value={isTehlike ? 100 : pct}
                className={cn(
                  'h-1.5 bg-muted',
                  isTehlike
                    ? '[&_[data-slot=progress-indicator]]:bg-destructive'
                    : '[&_[data-slot=progress-indicator]]:bg-primary'
                )}
              />
              <span className="text-[11px] tabular-nums text-muted-foreground">
                Periyot: {formatLocaleNumber(periyot, 0)} {birim}
              </span>
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
          const { arac } = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDetail?.(arac)}
                className="h-8 gap-1 px-2 text-xs"
              >
                <span>Detay</span>
                <ExternalLink className="size-3.5" />
              </Button>

              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${row.original.formattedPlaka} işlemleri`}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuGroup>
                      <span
                        title="S4'te etkinleştirilecek"
                        className="block cursor-not-allowed"
                      >
                        <DropdownMenuItem disabled>
                          <Pencil className="size-4" />
                          <span>Düzenle</span>
                        </DropdownMenuItem>
                      </span>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDeleteRequest?.(arac)}
                      >
                        <Trash2 className="size-4" />
                        <span>Sil</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        },
      }
    );

    return cols;
  }, [canManage, onDetail, onDeleteRequest]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    enableRowSelection: canManage,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalFiltered = filteredData.length;
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

  const selectedCount = canManage ? Object.keys(rowSelection).length : 0;

  return (
    <Card className="gap-0 overflow-hidden border border-border bg-card py-0 shadow-none">
      {/* Arama ve Filtre Çubuğu */}
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <InputGroup className="w-full sm:w-72">
            <InputGroupAddon>
              <Search className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Plaka, marka, model, şoför ara..."
              aria-label="Araç ara"
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

          <Select value={sayacFilter} onValueChange={setSayacFilter}>
            <SelectTrigger
              aria-label="Sayaç tipi filtresi"
              className="h-9 w-32 rounded-lg border-border bg-background text-xs"
            >
              <SelectValue placeholder="Sayaç tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sayaç: Tümü</SelectItem>
              <SelectItem value="KM">KM</SelectItem>
              <SelectItem value="SMH">SMH</SelectItem>
            </SelectContent>
          </Select>

          <Select value={durumFilter} onValueChange={setDurumFilter}>
            <SelectTrigger
              aria-label="Durum filtresi"
              className="h-9 w-40 rounded-lg border-border bg-background text-xs"
            >
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Durum: Tümü</SelectItem>
              <SelectItem value="kritik_bakim">Kritik Bakım</SelectItem>
              <SelectItem value="riskli_evrak">Riskli Evrak</SelectItem>
              <SelectItem value="sorunsuz">Sorunsuz</SelectItem>
            </SelectContent>
          </Select>

          <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
            <SelectTrigger
              aria-label="Kategori filtresi"
              className="h-9 w-44 rounded-lg border-border bg-background text-xs"
            >
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kategori: Tümü</SelectItem>
              {kategoriler.map((kat) => (
                <SelectItem key={kat} value={kat}>
                  {kat}
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

        {canManage && selectedCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="tabular-nums">
              {selectedCount} seçili
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
              className="h-7 px-2 text-xs"
            >
              Seçimi temizle
            </Button>
          </div>
        )}
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
            Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                {columns.map((col, cIdx) => (
                  <TableCell key={`${idx}-${col.id || cIdx}`} className="first:pl-4 last:pr-4">
                    <Skeleton className="h-5 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={canManage && row.getIsSelected() ? 'selected' : undefined}
              >
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
                    <Truck className="size-5" />
                  </div>
                  {araclar.length === 0 && !globalVehicleActive ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Henüz kayıtlı araç yok
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Filonuza ilk aracınızı ekleyerek sayaç, bakım ve evrak takibini başlatın.
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          type="button"
                          size="sm"
                          disabled
                          title="S4'te etkinleştirilecek"
                        >
                          + Yeni Araç
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Filtrelerle eşleşen araç bulunamadı
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Arama metnini veya aktif filtreleri temizleyerek tüm araçları görüntüleyebilirsiniz.
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
            {formatLocaleNumber(totalFiltered, 0)} araç
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
  );
}
