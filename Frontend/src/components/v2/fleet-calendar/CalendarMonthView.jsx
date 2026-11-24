import React from 'react';
import { toLocalIsoDate } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  MAX_VISIBLE_MONTH_EVENTS,
  WEEKDAY_LABELS,
  capitalizeTr,
  fullDayFormatter,
  popoverDayFormatter,
} from './calendarHelpers';
import CalendarEventChip from './CalendarEventChip';

export default function CalendarMonthView({
  monthDays,
  cursorDate,
  todayIso,
  eventsByDate,
  openPopoverIso,
  setOpenPopoverIso,
  onDayFocus,
  onEventSelect,
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-border bg-background/60">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {monthDays.map((day, idx) => {
            const iso = toLocalIsoDate(day);
            const isCurrentMonth = day.getMonth() === cursorDate.getMonth();
            const isToday = iso === todayIso;
            const dayEvents = eventsByDate.get(iso) || [];
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_MONTH_EVENTS);
            const remainingCount = dayEvents.length - visibleEvents.length;
            const isLastCol = (idx + 1) % 7 === 0;

            return (
              <div
                key={iso}
                className={cn(
                  'flex min-h-28 flex-col gap-1 border-b border-border p-1.5 sm:min-h-32 sm:p-2',
                  !isLastCol && 'border-r',
                  !isCurrentMonth && 'bg-muted/25 text-muted-foreground/70'
                )}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onDayFocus(day)}
                    aria-label={fullDayFormatter.format(day)}
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors',
                      isToday
                        ? 'bg-primary font-semibold text-primary-foreground'
                        : isCurrentMonth
                          ? 'text-foreground hover:bg-muted'
                          : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {day.getDate()}
                  </button>
                  {dayEvents.length > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  {visibleEvents.map((ev) => (
                    <CalendarEventChip
                      key={ev.id}
                      event={ev}
                      todayIso={todayIso}
                      onSelect={onEventSelect}
                    />
                  ))}

                  {remainingCount > 0 && (
                    <Popover
                      open={openPopoverIso === iso}
                      onOpenChange={(open) => setOpenPopoverIso(open ? iso : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 flex h-6 w-full items-center rounded-md px-1.5 text-left text-[11px] font-medium text-muted-foreground tabular-nums transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          +{remainingCount} daha
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-3">
                        <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                          <span className="text-xs font-semibold text-foreground tabular-nums">
                            {capitalizeTr(popoverDayFormatter.format(day))}
                          </span>
                          <Badge variant="secondary" className="font-mono text-[10px] tabular-nums">
                            {dayEvents.length}
                          </Badge>
                        </div>
                        <div className="flex max-h-60 flex-col gap-1.5 overflow-y-auto pt-1">
                          {dayEvents.map((ev) => (
                            <CalendarEventChip
                              key={ev.id}
                              event={ev}
                              todayIso={todayIso}
                              onSelect={(selected) => {
                                setOpenPopoverIso(null);
                                onEventSelect?.(selected);
                              }}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
