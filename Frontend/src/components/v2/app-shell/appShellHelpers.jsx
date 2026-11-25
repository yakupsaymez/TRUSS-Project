import React from 'react';
import { ROLES } from '@/components/v2/channelAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const REFRESH_THROTTLE_MS = 60 * 1000;
export const ALL_VEHICLES_VALUE = '__ALL__';

export const ROUTE_LABELS = {
  '/app': 'Genel Bakış',
  '/app/filo': 'Filo',
  '/app/harita': 'Harita',
  '/app/hareketler': 'Hareketler',
  '/app/parcalar': 'Parçalar',
  '/app/is-emirleri': 'İş Emirleri',
  '/app/takvim': 'Takvim',
  '/app/ekip': 'Ekip',
  '/app/ayarlar': 'Ayarlar',
};

export function getInitials(name, email) {
  const source = (name || email || 'TR').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('tr-TR');
  }
  return source.slice(0, 2).toLocaleUpperCase('tr-TR');
}

export function RoleBadge({ role, className }) {
  const isDriver = role === ROLES.DRIVER;
  return (
    <span
      title="Oturum rolü"
      className={cn(
        'inline-flex h-7 items-center rounded-md border bg-card px-2 font-mono text-[10px] font-semibold uppercase tracking-wider',
        isDriver ? 'border-border text-muted-foreground' : 'border-primary text-primary',
        className
      )}
    >
      {role}
    </span>
  );
}

export function ContentFallback() {
  return (
    <div role="status" aria-label="İçerik yükleniyor" className="space-y-4 bg-background">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
