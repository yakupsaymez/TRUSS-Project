import React from 'react';
import { CalendarDays } from 'lucide-react';
import { toLocalIsoDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import {
  EVENT_TYPE_META,
  WEEKDAY_LABELS,
  getEventUrgencyMeta,
  weekDayHeaderFormatter,
} from './calendarHelpers';
import CalendarEventChip from './CalendarEventChip';

export function CalendarWeekView({
  weekDays,
  todayIso,
  eventsByDate,
  onDayFocus,
  onEventSelect,
}) {
  return (
    <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-7 md:divide-x md:divide-y-0">
      {weekDays.map((day, idx) => {
        const iso = toLocalIsoDate(day);
        const isToday = iso === todayIso;
        const dayEvents = eventsByDate.get(iso) || [];

        return (
          <div key={iso} className="flex min-h-40 flex-col md:min-h-80">
            <button
              type="button"
              onClick={() => onDayFocus(day)}
              className={cn(
                'flex items-center justify-between border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/40 md:flex-col md:items-start md:gap-0.5',
                isToday && 'bg-primary/5'
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {WEEKDAY_LABELS[idx]}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  isToday ? 'text-primary' : 'text-foreground'
                )}
              >
                {weekDayHeaderFormatter.format(day)}
              </span>
            </button>

            <div className="flex flex-1 flex-col gap-1.5 p-2">
              {dayEvents.length === 0 ? (
                <span className="py-4 text-center text-[11px] text-muted-foreground/70">
                  Etkinlik yok
                </span>
              ) : (
                dayEvents.map((ev) => (
                  <CalendarEventChip
                    key={ev.id}
                    event={ev}
                    todayIso={todayIso}
                    onSelect={onEventSelect}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CalendarDayView({ selectedDayEvents, todayIso, onEventSelect }) {
  return (
    <div className="p-4 sm:p-5">
      {selectedDayEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            <CalendarDays className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Bu gün için kayıtlı etkinlik yok
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Diğer günlere geçebilir veya Ay görünümünden tüm evrak vadelerini
            inceleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {selectedDayEvents.map((ev) => {
            const urgency = getEventUrgencyMeta(ev, todayIso);
            const typeMeta = EVENT_TYPE_META[ev.type] || EVENT_TYPE_META.muayene;
            const Icon = typeMeta.icon;

            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onEventSelect?.(ev)}
                className="flex w-full flex-col gap-2 rounded-xl border border-border bg-background/60 p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg border',
                      urgency.chipClass
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
                        {ev.plate}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {typeMeta.label}
                        {ev.subtitle ? ` · ${ev.subtitle}` : ''}
                      </span>
                    </div>
                    {ev.vehicleLabel && (
                      <p className="truncate text-xs text-muted-foreground">
                        {ev.vehicleLabel}
                      </p>
                    )}
                    {ev.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tabular-nums',
                      urgency.chipClass
                    )}
                  >
                    {urgency.badgeText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
