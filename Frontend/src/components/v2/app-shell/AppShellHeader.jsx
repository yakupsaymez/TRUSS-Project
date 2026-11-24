import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Search, Sun } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import NotificationBell from '@/components/v2/NotificationBell';
import { ALL_VEHICLES_VALUE, RoleBadge } from './appShellHelpers';

export default function AppShellHeader({
  seciliArac,
  normalizedPath,
  currentRouteLabel,
  onClearVehicle,
  selectValue,
  onVehicleSelectChange,
  araclar,
  onOpenPalette,
  isDark,
  onToggleTheme,
  role,
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <SidebarTrigger className="[&_svg]:size-4!" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {seciliArac ? (
                <BreadcrumbLink asChild>
                  <Link to={normalizedPath} onClick={onClearVehicle}>
                    {currentRouteLabel}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{currentRouteLabel}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {seciliArac && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono font-semibold tabular-nums">
                    {formatTurkishPlate(seciliArac.plaka)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectValue} onValueChange={onVehicleSelectChange}>
          <SelectTrigger
            aria-label="Global araç filtresi"
            className="h-8 w-32 rounded-lg border-border bg-card text-xs font-medium tabular-nums sm:w-52"
          >
            <SelectValue placeholder="Tüm araçlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VEHICLES_VALUE} className="text-xs tabular-nums">
              Tüm araçlar ({araclar.length})
            </SelectItem>
            {araclar.map((arac) => (
              <SelectItem
                key={arac.arac_id}
                value={String(arac.arac_id)}
                className="font-mono text-xs tabular-nums"
              >
                {formatTurkishPlate(arac.plaka)}
                {arac.marka ? ` · ${arac.marka}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onOpenPalette}
          aria-label="Komut paletini aç"
          title="Komut paletini aç (⌘K)"
          className="size-8 rounded-lg border-border bg-card text-foreground/80 hover:text-foreground sm:hidden"
        >
          <Search className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenPalette}
          aria-label="Komut paletini aç"
          className="hidden h-8 items-center gap-2 rounded-lg border-border bg-card px-2.5 text-xs text-foreground/80 hover:text-foreground sm:inline-flex"
        >
          <Search className="size-3.5" />
          <span>Ara...</span>
          <Kbd>⌘K</Kbd>
        </Button>

        <NotificationBell />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
          title={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
          className="size-8 rounded-lg border border-border bg-card text-foreground/80 hover:text-foreground"
        >
          {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </Button>

        <RoleBadge role={role} className="hidden md:inline-flex" />
      </div>
    </header>
  );
}
