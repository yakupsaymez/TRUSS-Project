import React from 'react';
import { Calendar, Loader2, Lock, Mail, Phone } from 'lucide-react';
import { ROLES } from '@/components/v2/channelAccess';
import { formatLocaleNumber } from '@/utils/formatters';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PERMISSION_DEFINITIONS, ROLE_META, formatTrDate, getInitials, resolveMemberPerms } from './crewTableHelpers';

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

export function MemberInfoCell({ member, access }) {
  const joinedDate = formatTrDate(member.kayit_tarihi);
  return (
    <div className="flex items-start gap-3 py-0.5">
      <Avatar className="mt-0.5 size-9 shrink-0 border border-border">
        <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{getInitials(member.ad_soyad)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{member.ad_soyad || 'İsimsiz Üye'}</span>
          {access.isSelf && (
            <Badge variant="outline" className="h-5 border-primary/40 bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
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
}

export function MemberRoleCell({ member, access, assignableRoles, updatingUserId, onRoleChange }) {
  const memberRole = member.role || ROLES.DRIVER;
  const meta = ROLE_META[memberRole] || ROLE_META[ROLES.DRIVER];
  const RoleIcon = meta.icon;

  if (access.readOnly) {
    return (
      <div className="inline-flex items-center" title={access.lockMessage}>
        <Badge variant="outline" title={access.lockMessage} className={cn('gap-1.5 px-2.5 py-1 text-xs font-medium', meta.badgeClass)}>
          <Lock className="size-3 shrink-0 opacity-80" aria-hidden="true" />
          <RoleIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{meta.label}</span>
        </Badge>
      </div>
    );
  }

  const isUpdating = updatingUserId !== null && String(updatingUserId) === String(member.user_id);

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={memberRole}
        disabled={isUpdating}
        onValueChange={(nextRole) => {
          if (nextRole && nextRole !== memberRole) onRoleChange?.(member, nextRole);
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
              <SelectItem key={roleKey} value={roleKey}>{renderRoleOption(roleKey)}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {isUpdating && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-label="Rol güncelleniyor" />}
    </div>
  );
}

export function PermissionsSummaryCell({ member }) {
  const memberRole = member.role || ROLES.DRIVER;
  const isManagerRole = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(memberRole);
  const perms = isManagerRole ? null : resolveMemberPerms(member);
  const activeDefs = isManagerRole
    ? PERMISSION_DEFINITIONS
    : PERMISSION_DEFINITIONS.filter((def) => Boolean(perms[def.key]));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[11px] font-semibold tabular-nums">
          {formatLocaleNumber(activeDefs.length, 0)}/{formatLocaleNumber(PERMISSION_DEFINITIONS.length, 0)}
        </Badge>
        {isManagerRole ? (
          <span className="text-xs font-medium text-muted-foreground">Tam Yetki (Rol)</span>
        ) : activeDefs.length === 0 ? (
          <span className="text-xs text-muted-foreground">Yetki yok</span>
        ) : null}
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
}
