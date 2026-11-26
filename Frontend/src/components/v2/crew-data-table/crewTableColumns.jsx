import React from 'react';
import { Car } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import CrewRowActions from './CrewRowActions';
import {
  MemberInfoCell,
  MemberRoleCell,
  PermissionsSummaryCell,
} from './CrewColumnCells';

const DEFAULT_ACCESS = {
  isSelf: false,
  isAdminLocked: false,
  readOnly: false,
  lockMessage: undefined,
};

export function buildCrewColumns({
  assignableRoles,
  getMemberAccess,
  updatingUserId,
  onRoleChange,
  onPermissionsClick,
  onAssignClick,
  onResetPasswordClick,
}) {
  const resolveAccess = (member) =>
    getMemberAccess ? getMemberAccess(member) : DEFAULT_ACCESS;

  return [
    {
      id: 'member',
      header: 'Üye',
      size: 300,
      cell: ({ row }) => (
        <MemberInfoCell member={row.original} access={resolveAccess(row.original)} />
      ),
    },
    {
      id: 'role',
      header: 'Rol',
      size: 210,
      cell: ({ row }) => (
        <MemberRoleCell
          member={row.original}
          access={resolveAccess(row.original)}
          assignableRoles={assignableRoles}
          updatingUserId={updatingUserId}
          onRoleChange={onRoleChange}
        />
      ),
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
      cell: ({ row }) => <PermissionsSummaryCell member={row.original} />,
    },
    {
      id: 'actions',
      header: () => <span className="block text-right">Aksiyonlar</span>,
      size: 310,
      cell: ({ row }) => (
        <CrewRowActions
          member={row.original}
          access={resolveAccess(row.original)}
          onPermissionsClick={onPermissionsClick}
          onResetPasswordClick={onResetPasswordClick}
          onAssignClick={onAssignClick}
        />
      ),
    },
  ];
}
