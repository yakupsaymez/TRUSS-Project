import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES } from '@/components/v2/channelAccess';
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
  ADMIN_LOCK_MESSAGE,
  INITIAL_PERMS,
  PERMISSION_DEFINITIONS,
  ROLE_META,
  SELF_LOCK_MESSAGE,
  countCrewRoles,
  filterCrewUsers,
  resolveMemberPerms,
} from './crew-data-table/crewTableHelpers';
import { buildCrewColumns } from './crew-data-table/crewTableColumns';
import CrewTableToolbar from './crew-data-table/CrewTableToolbar';
import CrewTablePagination from './crew-data-table/CrewTablePagination';

export {
  ADMIN_LOCK_MESSAGE,
  INITIAL_PERMS,
  PERMISSION_DEFINITIONS,
  ROLE_META,
  SELF_LOCK_MESSAGE,
  resolveMemberPerms,
};

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

  const roleCounts = useMemo(() => countCrewRoles(users), [users]);

  const filteredUsers = useMemo(
    () => filterCrewUsers(users, searchQuery, roleFilter),
    [users, searchQuery, roleFilter]
  );

  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredUsers.length / pagination.pageSize) - 1);
    setPagination((prev) => (prev.pageIndex > maxPage ? { ...prev, pageIndex: maxPage } : prev));
  }, [filteredUsers.length, pagination.pageSize]);

  const hasActiveFilters = Boolean(searchQuery.trim() || roleFilter !== 'ALL');

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
  };

  const columns = useMemo(
    () =>
      buildCrewColumns({
        assignableRoles,
        getMemberAccess,
        updatingUserId,
        onRoleChange,
        onPermissionsClick,
        onAssignClick,
        onResetPasswordClick,
      }),
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
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: { pagination },
  });

  const isInitialLoading = loading && !hasLoaded;

  return (
    <Card className="gap-0 overflow-hidden border border-border bg-card py-0 shadow-none">
      <CrewTableToolbar
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        roleCounts={roleCounts}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div className="overflow-x-auto">
        <Table className="min-w-[840px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    className={cn(
                      'h-11 text-xs font-medium text-muted-foreground first:pl-4 last:pr-4',
                      header.column.id === 'actions' &&
                        'sticky right-0 z-10 border-l border-border/70 bg-card pr-4'
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
                  <TableCell className="sticky right-0 z-10 border-l border-border/70 bg-card pr-4">
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
                      className={cn(
                        'py-3 align-middle first:pl-4 last:pr-4',
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

      <CrewTablePagination table={table} totalFiltered={filteredUsers.length} />
    </Card>
  );
}
