import React from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { ROLES } from '@/components/v2/channelAccess';
import { formatLocaleNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

export default function CrewTableToolbar({
  roleFilter,
  onRoleFilterChange,
  roleCounts,
  searchQuery,
  onSearchQueryChange,
  hasActiveFilters,
  onClearFilters,
}) {
  const roleFilterOptions = [
    { key: 'ALL', label: 'Tümü', count: roleCounts.ALL },
    { key: ROLES.SYSTEM_ADMIN, label: 'Sistem Admini', count: roleCounts[ROLES.SYSTEM_ADMIN] },
    { key: ROLES.FLEET_MANAGER, label: 'Filo Yöneticisi', count: roleCounts[ROLES.FLEET_MANAGER] },
    { key: ROLES.DRIVER, label: 'Şoför', count: roleCounts[ROLES.DRIVER] },
  ];

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rol filtresi">
        {roleFilterOptions.map((opt) => {
          const isActive = roleFilter === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onRoleFilterChange(opt.key)}
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
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Ad, e-posta, telefon veya plaka ara..."
            aria-label="Ekip üyelerinde ara"
          />
          {searchQuery && (
            <InputGroupAddon align="inline-end">
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
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
            onClick={onClearFilters}
            className="h-9 gap-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Temizle</span>
          </Button>
        )}
      </div>
    </div>
  );
}
