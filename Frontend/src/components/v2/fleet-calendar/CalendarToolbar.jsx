import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EVRAK_UYARI_GUN } from '@/utils/aracDurum';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VIEW_OPTIONS } from './calendarHelpers';

export default function CalendarToolbar({
  periodTitle,
  periodEventCount,
  loading,
  view,
  onViewChange,
  onPrevious,
  onToday,
  onNext,
  filterChips,
  typeFilter,
  onTypeFilterChange,
  showMaintenance,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onPrevious}
              aria-label="Önceki dönem"
              className="size-7 rounded-md"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToday}
              className="h-7 rounded-md px-2.5 text-xs font-medium"
            >
              Bugün
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onNext}
              aria-label="Sonraki dönem"
              className="size-7 rounded-md"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <h2 className="text-base font-semibold tracking-tight text-foreground tabular-nums sm:text-lg">
            {periodTitle}
          </h2>

          {!loading && (
            <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
              {periodEventCount} etkinlik
            </Badge>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Takvim görünümü"
          className="inline-flex items-center rounded-lg border border-border bg-background p-0.5"
        >
          {VIEW_OPTIONS.map((option) => {
            const isActive = view === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onViewChange(option.id)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Etkinlik türü filtresi"
        >
          {filterChips.map((chip) => {
            const active = typeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => onTypeFilterChange(chip.id)}
                className={cn(
                  'inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
            Gecikmiş
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-status-warning" aria-hidden="true" />
            Yaklaşan (≤{EVRAK_UYARI_GUN}g)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            Sağlıklı
          </span>
          {showMaintenance && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full border border-border bg-muted"
                aria-hidden="true"
              />
              Bakım
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
