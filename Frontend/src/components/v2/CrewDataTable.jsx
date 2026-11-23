import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  Mail,
  Phone,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  User,
  Users,
  X,
} from 'lucide-react';
import { ROLES } from '@/components/v2/channelAccess';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { usePagination } from '@/hooks/use-pagination';
import EmptyState from '@/components/v2/EmptyState';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
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

export const SELF_LOCK_MESSAGE = 'Kendi rol ve yetkinizi değiştiremezsiniz.';
export const ADMIN_LOCK_MESSAGE =
  'Sistem Admini kayıtları Filo Yöneticisi tarafından değiştirilemez.';

export const ROLE_META = {
  [ROLES.SYSTEM_ADMIN]: {
    key: ROLES.SYSTEM_ADMIN,
    label: 'Sistem Admini',
    shortLabel: 'Sistem Admini',
    icon: ShieldAlert,
    iconClass: 'text-destructive',
    badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  [ROLES.FLEET_MANAGER]: {
    key: ROLES.FLEET_MANAGER,
    label: 'Filo Yöneticisi',
    shortLabel: 'Filo Yöneticisi',
    icon: Shield,
    iconClass: 'text-primary',
    badgeClass: 'border-primary/40 bg-primary/10 text-primary',
  },
  [ROLES.DRIVER]: {
    key: ROLES.DRIVER,
    label: 'Şoför',
    shortLabel: 'Şoför',
    icon: User,
    iconClass: 'text-muted-foreground',
    badgeClass: 'border-border bg-muted text-muted-foreground',
  },
};

export const PERMISSION_DEFINITIONS = [
  { key: 'yakit', label: 'Yakıt', fullLabel: 'Yakıt Girişi', desc: 'Yakıt ikmali ve litre kaydı' },
  { key: 'bakim', label: 'Bakım', fullLabel: 'Servis Onayı', desc: 'Bakım ve onarım emri kaydı' },
  { key: 'finans', label: 'Finans', fullLabel: 'Finansal Rapor', desc: 'Bütçe ve maliyet telemetrisi' },
  { key: 'zimmet', label: 'Zimmet', fullLabel: 'Filo Atama', desc: 'Operatör ve araç zimmetleme' },
  { key: 'envanter', label: 'Parça', fullLabel: 'Parça & Envanter', desc: 'Yedek parça ömür takibi' },
  { key: 'ekip', label: 'Ekip', fullLabel: 'Ekip Yönetimi', desc: 'Rol ve davet yetkilendirmesi' },
];

export const INITIAL_PERMS = {
  [ROLES.SYSTEM_ADMIN]: {
    yakit: true,
    bakim: true,
    finans: true,
    zimmet: true,
    envanter: true,
    ekip: true,
  },
  [ROLES.FLEET_MANAGER]: {
    yakit: true,
    bakim: true,
    finans: true,
    zimmet: true,
    envanter: true,
    ekip: true,
  },
  [ROLES.DRIVER]: {
    yakit: true,
    bakim: false,
    finans: false,
    zimmet: false,
    envanter: false,
    ekip: false,
  },
};

export function resolveMemberPerms(member) {
  const roleKey = member?.role || ROLES.DRIVER;
  const base = INITIAL_PERMS[roleKey] || INITIAL_PERMS[ROLES.DRIVER];
  const serverPerms =
    member?.yetkiler && typeof member.yetkiler === 'object' ? member.yetkiler : {};
  return { ...base, ...serverPerms };
}

function getInitials(name) {
  const clean = String(name || '').trim();
  if (!clean) return 'EK';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('tr-TR');
  }
  return clean.slice(0, 2).toLocaleUpperCase('tr-TR');
}

function formatTrDate(isoLike) {
  if (!isoLike) return null;
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function renderRoleOption(roleKey) {
  const meta = ROLE_META[roleKey] || ROLE_META[ROLES.DRIVER];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className={cn('size-3.5 shrink-0', meta.iconClass)} aria-hidden="true" />
      <span className="truncate">{meta.label}</span>
    </span>
  );
}

export default function CrewDataTable({
  users = [],
  loading = false,
  hasLoaded = false,
  assignableRoles = [ROLES.FLEET_MANAGER, ROLES.DRIVER],
  getMemberAccess,
  updatingUserId = null,
  onRoleChange,
  onPermissionsClick,
  onAssignClick,
  onResetPasswordClick,
  onCreateClick,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const roleCounts = useMemo(() => {
    const counts = {
      ALL: users.length,
      [ROLES.SYSTEM_ADMIN]: 0,
      [ROLES.FLEET_MANAGER]: 0,
      [ROLES.DRIVER]: 0,
    };
    users.forEach((member) => {
      const r = member?.role || ROLES.DRIVER;
      if (counts[r] !== undefined) counts[r] += 1;
    });
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    const compactQ = q.replace(/\s+/g, '');

    return users.filter((member) => {
      if (roleFilter !== 'ALL' && (member?.role || ROLES.DRIVER) !== roleFilter) {
        return false;
      }

      if (!q) return true;

      const name = String(member?.ad_soyad || '').toLocaleLowerCase('tr-TR');
      const email = String(member?.email || '').toLocaleLowerCase('tr-TR');
      const phone = String(member?.telefon || '').toLocaleLowerCase('tr-TR');
      const compactPhone = phone.replace(/\s+/g, '');

      if (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        (compactQ && compactPhone.includes(compactQ))
      ) {
        return true;
      }

      const assigned = Array.isArray(member?.zimmetli_araclar) ? member.zimmetli_araclar : [];
      return assigned.some((arac) => {
        const rawPlate = String(arac?.plaka || '').toLocaleLowerCase('tr-TR');
        const formattedPlate = formatTurkishPlate(arac?.plaka || '').toLocaleLowerCase('tr-TR');
        const compactPlate = rawPlate.replace(/\s+/g, '');
        return (
          rawPlate.includes(q) ||
          formattedPlate.includes(q) ||
          (compactQ && compactPlate.includes(compactQ))
        );
      });
    });
  }, [users, searchQuery, roleFilter]);

  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [searchQuery, roleFilter]);

  const hasActiveFilters = Boolean(searchQuery.trim() || roleFilter !== 'ALL');

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
  };

  const columns = useMemo(
    () => [
      {
        id: 'member',
        header: 'Üye',
        size: 300,
        cell: ({ row }) => {
          const member = row.original;
          const access = getMemberAccess
            ? getMemberAccess(member)
            : { isSelf: false, isAdminLocked: false, readOnly: false, lockMessage: undefined };
          const joinedDate = formatTrDate(member.kayit_tarihi);

          return (
            <div className="flex items-start gap-3 py-0.5">
              <Avatar className="mt-0.5 size-9 shrink-0 border border-border">
                <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                  {getInitials(member.ad_soyad)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {member.ad_soyad || 'İsimsiz Üye'}
                  </span>
                  {access.isSelf && (
                    <Badge
                      variant="outline"
                      className="h-5 border-primary/40 bg-primary/10 px-1.5 text-[10px] font-medium text-primary"
                    >
                      Siz
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {member.email && (
                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                      <Mail className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{member.email}</span>
                    </span>
                  )}
                  {member.telefon && (
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Phone className="size-3 shrink-0" aria-hidden="true" />
                      <span>{member.telefon}</span>
                    </span>
                  )}
                  {joinedDate && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="size-3 shrink-0" aria-hidden="true" />
                      <span>{joinedDate}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'role',
        header: 'Rol',
        size: 210,
        cell: ({ row }) => {
          const member = row.original;
          const memberRole = member.role || ROLES.DRIVER;
          const meta = ROLE_META[memberRole] || ROLE_META[ROLES.DRIVER];
          const RoleIcon = meta.icon;
          const access = getMemberAccess
            ? getMemberAccess(member)
            : { isSelf: false, isAdminLocked: false, readOnly: false, lockMessage: undefined };

          if (access.readOnly) {
            return (
              <div className="inline-flex items-center" title={access.lockMessage}>
                <Badge
                  variant="outline"
                  title={access.lockMessage}
                  className={cn(
                    'gap-1.5 px-2.5 py-1 text-xs font-medium',
                    meta.badgeClass
                  )}
                >
                  <Lock className="size-3 shrink-0 opacity-80" aria-hidden="true" />
                  <RoleIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{meta.label}</span>
                </Badge>
              </div>
            );
          }

          const isUpdating =
            updatingUserId !== null && String(updatingUserId) === String(member.user_id);

          return (
            <div className="flex items-center gap-1.5">
              <Select
                value={memberRole}
                disabled={isUpdating}
                onValueChange={(nextRole) => {
                  if (!nextRole || nextRole === memberRole) return;
                  onRoleChange?.(member, nextRole);
                }}
              >
                <SelectTrigger
                  aria-label={`${member.ad_soyad || 'Üye'} rol seçimi`}
                  className="h-8 w-44 rounded-lg border-transparent bg-transparent px-2 text-xs font-medium shadow-none transition-colors hover:border-border hover:bg-muted data-[state=open]:border-border data-[state=open]:bg-muted"
                >
                  <SelectValue>{renderRoleOption(memberRole)}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {assignableRoles.map((roleKey) => (
                      <SelectItem key={roleKey} value={roleKey}>
                        {renderRoleOption(roleKey)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {isUpdating && (
                <Loader2
                  className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                  aria-label="Rol güncelleniyor"
                />
              )}
            </div>
          );
        },
      },
      {
        id: 'assignedVehicles',
        header: 'Zimmetli Araçlar',
        size: 210,
        cell: ({ row }) => {
          const assigned = Array.isArray(row.original.zimmetli_araclar)
            ? row.original.zimmetli_araclar
            : [];

          if (assigned.length === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {assigned.map((arac, idx) => {
                const plate = formatTurkishPlate(arac?.plaka || '') || arac?.plaka || '—';
                const tooltip = [arac?.marka, arac?.model].filter(Boolean).join(' ').trim();
                return (
                  <Badge
                    key={arac?.atama_id || arac?.arac_id || `${plate}-${idx}`}
                    variant="outline"
                    title={tooltip || plate}
                    className="gap-1 border-border bg-background px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-foreground"
                  >
                    <Car className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span>{plate}</span>
                  </Badge>
                );
              })}
            </div>
          );
        },
      },
      {
        id: 'permissions',
        header: 'Yetki Özeti',
        size: 250,
        cell: ({ row }) => {
          const perms = resolveMemberPerms(row.original);
          const activeDefs = PERMISSION_DEFINITIONS.filter((def) => Boolean(perms[def.key]));
          const totalCount = PERMISSION_DEFINITIONS.length;

          return (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 font-mono text-[11px] font-semibold tabular-nums"
                >
                  {formatLocaleNumber(activeDefs.length, 0)}/{formatLocaleNumber(totalCount, 0)}
                </Badge>
                {activeDefs.length === 0 && (
                  <span className="text-xs text-muted-foreground">Yetki yok</span>
                )}
              </div>
              {activeDefs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {activeDefs.map((def) => (
                    <span
                      key={def.key}
                      title={`${def.fullLabel}: ${def.desc}`}
                      className="inline-flex items-center rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {def.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <span className="block text-right">Aksiyonlar</span>,
        size: 310,
        cell: ({ row }) => {
          const member = row.original;
          const access = getMemberAccess
            ? getMemberAccess(member)
            : { isSelf: false, isAdminLocked: false, readOnly: false, lockMessage: undefined };
          const isDriver = (member.role || ROLES.DRIVER) === ROLES.DRIVER;

          const permsEnabled = typeof onPermissionsClick === 'function';
          const permsTitle = access.readOnly
            ? access.lockMessage
            : permsEnabled
              ? 'Yetkileri düzenle'
              : "S11'de etkinleştirilecek";

          const resetEnabled = !access.readOnly && typeof onResetPasswordClick === 'function';
          const resetTitle = access.readOnly
            ? access.lockMessage
            : typeof onResetPasswordClick === 'function'
              ? 'Şifreyi sıfırla'
              : undefined;

          const assignEnabled = Boolean(isDriver && typeof onAssignClick === 'function');
          const assignTitle = assignEnabled ? 'Araç zimmetle' : "S11'de etkinleştirilecek";

          return (
            <div className="flex items-center justify-end gap-1.5">
              <span title={permsTitle} className="inline-flex">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!permsEnabled}
                  onClick={permsEnabled ? () => onPermissionsClick(member) : undefined}
                  title={permsTitle}
                  className="h-8 gap-1.5 px-2.5 text-xs"
                >
                  {access.readOnly ? (
                    <Lock className="size-3.5" aria-hidden="true" />
                  ) : (
                    <KeyRound className="size-3.5" aria-hidden="true" />
                  )}
                  <span>Yetkiler</span>
                </Button>
              </span>

              <span title={resetTitle} className="inline-flex">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!resetEnabled}
                  onClick={resetEnabled ? () => onResetPasswordClick(member) : undefined}
                  title={resetTitle}
                  className="h-8 gap-1.5 px-2.5 text-xs"
                >
                  {access.readOnly ? (
                    <Lock className="size-3.5" aria-hidden="true" />
                  ) : (
                    <KeyRound className="size-3.5" aria-hidden="true" />
                  )}
                  <span>Şifre Sıfırla</span>
                </Button>
              </span>

              {isDriver && (
                <span title={assignTitle} className="inline-flex">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!assignEnabled}
                    onClick={assignEnabled ? () => onAssignClick(member) : undefined}
                    title={assignTitle}
                    className="h-8 gap-1.5 px-2.5 text-xs"
                  >
                    <Link2 className="size-3.5" aria-hidden="true" />
                    <span>Zimmetle</span>
                  </Button>
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [
      assignableRoles,
      getMemberAccess,
      updatingUserId,
      onRoleChange,
      onPermissionsClick,
      onAssignClick,
      onResetPasswordClick,
    ]
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    getRowId: (row, index) => String(row.user_id ?? row.email ?? index),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: { pagination },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = Math.max(1, table.getPageCount());
  const totalFiltered = filteredUsers.length;
  const rangeStart = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: pageIndex + 1,
    totalPages: pageCount,
    paginationItemsToDisplay: 5,
  });

  const roleFilterOptions = [
    { key: 'ALL', label: 'Tümü', count: roleCounts.ALL },
    { key: ROLES.SYSTEM_ADMIN, label: 'Sistem Admini', count: roleCounts[ROLES.SYSTEM_ADMIN] },
    { key: ROLES.FLEET_MANAGER, label: 'Filo Yöneticisi', count: roleCounts[ROLES.FLEET_MANAGER] },
    { key: ROLES.DRIVER, label: 'Şoför', count: roleCounts[ROLES.DRIVER] },
  ];

  const isInitialLoading = loading && !hasLoaded;

  return (
    <Card className="gap-0 overflow-hidden border border-border bg-card py-0 shadow-none">
      {/* Arama ve Rol Filtre Çubuğu */}
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rol filtresi">
          {roleFilterOptions.map((opt) => {
            const isActive = roleFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setRoleFilter(opt.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{opt.label}</span>
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {formatLocaleNumber(opt.count, 0)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-full sm:w-72">
            <InputGroupAddon>
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ad, e-posta, telefon veya plaka ara..."
              aria-label="Ekip üyelerinde ara"
            />
            {searchQuery && (
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Aramayı temizle"
                  className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-1.5 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Temizle</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto">
        <Table className="min-w-[960px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    className="h-11 text-xs font-medium text-muted-foreground first:pl-4 last:pr-4"
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
            {isInitialLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={`crew-skeleton-${idx}`}>
                  <TableCell className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-36 rounded-lg" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-10" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: `${cell.column.getSize()}px` }}
                      className="py-3 align-middle first:pl-4 last:pr-4"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  {users.length === 0 ? (
                    <EmptyState
                      compact
                      icon={Users}
                      title="Henüz kayıtlı ekip üyesi yok"
                      description="Organizasyonunuza yeni ekip üyesi ekleyerek rol, yetki ve zimmet yönetimini başlatın."
                      actionLabel={onCreateClick ? 'Yeni Üye' : undefined}
                      onAction={onCreateClick}
                    />
                  ) : (
                    <EmptyState
                      compact
                      icon={Users}
                      title="Filtrelere uygun ekip üyesi bulunamadı"
                      description="Arama terimini veya rol filtresini değiştirerek tekrar deneyebilirsiniz."
                      actionLabel="Filtreleri Temizle"
                      actionVariant="outline"
                      onAction={clearFilters}
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sayfalama Alt Çubuğu */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs text-muted-foreground">Sayfa başına</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => value && table.setPageSize(Number(value))}
          >
            <SelectTrigger aria-label="Sayfa başına satır sayısı" className="h-8 w-20 text-xs tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="min-w-20">
              <SelectGroup>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)} className="tabular-nums">
                    {size}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <p className="whitespace-nowrap text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {totalFiltered === 0
              ? '0 kayıt'
              : `${formatLocaleNumber(rangeStart, 0)}–${formatLocaleNumber(rangeEnd, 0)} / ${formatLocaleNumber(totalFiltered, 0)} kayıt`}
          </p>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Önceki sayfa"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>

            {showLeftEllipsis && (
              <span className="px-1 text-xs text-muted-foreground">...</span>
            )}

            {pages.map((page) => {
              const isActive = page === pageIndex + 1;
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
              <span className="px-1 text-xs text-muted-foreground">...</span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Sonraki sayfa"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
