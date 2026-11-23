import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Shield,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { EVRAK_UYARI_GUN } from '@/utils/aracDurum';
import { getTodayIso, toLocalIsoDate } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MAX_VISIBLE_MONTH_EVENTS = 3;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const VIEW_OPTIONS = [
  { id: 'month', label: 'Ay' },
  { id: 'week', label: 'Hafta' },
  { id: 'day', label: 'Gün' },
];

const EVENT_TYPE_META = {
  muayene: { label: 'Muayene', icon: FileCheck2 },
  sigorta: { label: 'Sigorta', icon: Shield },
  kasko: { label: 'Kasko', icon: ShieldAlert },
  bakim: { label: 'Bakım', icon: Wrench },
};

const monthYearFormatter = new Intl.DateTimeFormat('tr-TR', {
  month: 'long',
  year: 'numeric',
});
const shortMonthFormatter = new Intl.DateTimeFormat('tr-TR', {
  month: 'short',
});
const fullDayFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
});
const popoverDayFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'short',
});
const weekDayHeaderFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
});

function capitalizeTr(text) {
  if (!text) return '';
  return text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1);
}

export function parseIsoLocal(iso) {
  if (!iso) return null;
  const parts = String(iso).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function diffCalendarDays(targetIso, todayIso) {
  const target = parseIsoLocal(targetIso);
  const today = parseIsoLocal(todayIso);
  if (!target || !today) return null;
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

function addDaysLocal(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function addMonthsLocal(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getMondayOfWeek(date) {
  const day = date.getDay(); // 0 = Paz, 1 = Pzt ... 6 = Cmt
  const offset = (day + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

export function getEventUrgencyMeta(event, todayIso) {
  if (event.type === 'bakim') {
    return {
      status: 'bakim',
      chipClass:
        'border-border bg-muted text-foreground hover:bg-muted/80',
      badgeText: 'Bakım',
      diffDays: diffCalendarDays(event.date, todayIso),
    };
  }

  const diffDays = diffCalendarDays(event.date, todayIso);
  if (diffDays !== null && diffDays < 0) {
    return {
      status: 'overdue',
      chipClass:
        'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15',
      badgeText: `${Math.abs(diffDays)} gün gecikti`,
      diffDays,
    };
  }

  if (diffDays !== null && diffDays <= EVRAK_UYARI_GUN) {
    return {
      status: 'upcoming',
      chipClass:
        'border-status-warning/40 bg-status-warning/10 text-status-warning hover:bg-status-warning/15',
      badgeText: diffDays === 0 ? 'Bugün' : `${diffDays} gün kaldı`,
      diffDays,
    };
  }

  return {
    status: 'healthy',
    chipClass:
      'border-primary/35 bg-primary/10 text-primary hover:bg-primary/15',
    badgeText: diffDays !== null ? `${diffDays} gün kaldı` : 'Geçerli',
    diffDays,
  };
}

function EventChip({ event, todayIso, onSelect, compact = true }) {
  const urgency = getEventUrgencyMeta(event, todayIso);
  const typeMeta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.muayene;
  const Icon = typeMeta.icon;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(event);
      }}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        compact ? 'px-1.5 py-1 text-[11px] leading-tight' : 'px-2.5 py-2 text-xs',
        urgency.chipClass
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium">
        {event.shortLabel || event.title}
      </span>
    </button>
  );
}

export default function FleetCalendar({
  events = [],
  loading = false,
  showMaintenance = true,
  onEventSelect,
  className,
}) {
  const todayIso = useMemo(() => getTodayIso(), []);
  const [view, setView] = useState('month');
  const [cursorDate, setCursorDate] = useState(() => parseIsoLocal(getTodayIso()) || new Date());
  const [typeFilter, setTypeFilter] = useState('all');
  const [openPopoverIso, setOpenPopoverIso] = useState(null);

  useEffect(() => {
    if (!showMaintenance && typeFilter === 'bakim') {
      setTypeFilter('all');
    }
  }, [showMaintenance, typeFilter]);

  const filterChips = useMemo(() => {
    const chips = [
      { id: 'all', label: 'Tümü' },
      { id: 'muayene', label: 'Muayene' },
      { id: 'sigorta', label: 'Sigorta' },
      { id: 'kasko', label: 'Kasko' },
    ];
    if (showMaintenance) {
      chips.push({ id: 'bakim', label: 'Bakım' });
    }
    return chips;
  }, [showMaintenance]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (!showMaintenance && ev.type === 'bakim') return false;
      if (typeFilter !== 'all' && ev.type !== typeFilter) return false;
      return true;
    });
  }, [events, showMaintenance, typeFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    const orderWeight = { muayene: 0, sigorta: 1, kasko: 2, bakim: 3 };

    filteredEvents.forEach((ev) => {
      if (!ev?.date) return;
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });

    map.forEach((list) => {
      list.sort((a, b) => {
        const wa = orderWeight[a.type] ?? 9;
        const wb = orderWeight[b.type] ?? 9;
        if (wa !== wb) return wa - wb;
        return String(a.title || '').localeCompare(String(b.title || ''), 'tr-TR');
      });
    });

    return map;
  }, [filteredEvents]);

  // Görünüm tarih aralıkları (Pazartesi başlangıç)
  const monthDays = useMemo(() => {
    const monthStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const monthEnd = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0);
    const gridStart = getMondayOfWeek(monthStart);
    const endMonday = getMondayOfWeek(monthEnd);
    const gridEnd = addDaysLocal(endMonday, 6);

    const days = [];
    let current = gridStart;
    while (current <= gridEnd) {
      days.push(current);
      current = addDaysLocal(current, 1);
    }
    return days;
  }, [cursorDate]);

  const weekDays = useMemo(() => {
    const start = getMondayOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, idx) => addDaysLocal(start, idx));
  }, [cursorDate]);

  const activePeriodDates = useMemo(() => {
    if (view === 'month') {
      return monthDays.filter((d) => d.getMonth() === cursorDate.getMonth());
    }
    if (view === 'week') {
      return weekDays;
    }
    return [cursorDate];
  }, [view, monthDays, weekDays, cursorDate]);

  const periodEventCount = useMemo(() => {
    return activePeriodDates.reduce((sum, date) => {
      const iso = toLocalIsoDate(date);
      return sum + (eventsByDate.get(iso)?.length || 0);
    }, 0);
  }, [activePeriodDates, eventsByDate]);

  const periodTitle = useMemo(() => {
    if (view === 'month') {
      return capitalizeTr(monthYearFormatter.format(cursorDate));
    }
    if (view === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} – ${end.getDate()} ${capitalizeTr(monthYearFormatter.format(start))}`;
      }
      return `${start.getDate()} ${capitalizeTr(shortMonthFormatter.format(start))} – ${end.getDate()} ${capitalizeTr(shortMonthFormatter.format(end))} ${end.getFullYear()}`;
    }
    return capitalizeTr(fullDayFormatter.format(cursorDate));
  }, [view, cursorDate, weekDays]);

  const handlePrevious = () => {
    setOpenPopoverIso(null);
    setCursorDate((prev) => {
      if (view === 'month') return addMonthsLocal(prev, -1);
      if (view === 'week') return addDaysLocal(prev, -7);
      return addDaysLocal(prev, -1);
    });
  };

  const handleNext = () => {
    setOpenPopoverIso(null);
    setCursorDate((prev) => {
      if (view === 'month') return addMonthsLocal(prev, 1);
      if (view === 'week') return addDaysLocal(prev, 7);
      return addDaysLocal(prev, 1);
    });
  };

  const handleToday = () => {
    setOpenPopoverIso(null);
    setCursorDate(parseIsoLocal(todayIso) || new Date());
  };

  const handleDayFocus = (date) => {
    setOpenPopoverIso(null);
    setCursorDate(date);
    setView('day');
  };

  const selectedDayIso = toLocalIsoDate(cursorDate);
  const selectedDayEvents = eventsByDate.get(selectedDayIso) || [];

  return (
    <Card className={cn('gap-0 overflow-hidden border-border bg-card py-0 shadow-none', className)}>
      {/* Üst Araç Çubuğu */}
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handlePrevious}
                aria-label="Önceki dönem"
                className="size-7 rounded-md"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-7 rounded-md px-2.5 text-xs font-medium"
              >
                Bugün
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleNext}
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

          {/* Görünüm Sekmeleri (Ay / Hafta / Gün) */}
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
                  onClick={() => {
                    setOpenPopoverIso(null);
                    setView(option.id);
                  }}
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

        {/* Tür Filtresi Çipleri + Renk Açıklaması */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Etkinlik türü filtresi">
            {filterChips.map((chip) => {
              const active = typeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTypeFilter(chip.id)}
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
                <span className="size-2 rounded-full border border-border bg-muted" aria-hidden="true" />
                Bakım
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Yükleme İskeleti */}
      {loading ? (
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_LABELS.map((label) => (
              <Skeleton key={label} className="h-5 w-full rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Seçili dönem/filtrede 0 etkinlik özeti */}
          {periodEventCount === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>Seçili dönem ve filtre için planlı belge vadesi veya bakım kaydı bulunmuyor.</span>
              </div>
              {typeFilter !== 'all' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setTypeFilter('all')}
                  className="text-primary hover:text-primary"
                >
                  Tüm Türleri Göster
                </Button>
              )}
            </div>
          )}

          {/* AY GÖRÜNÜMÜ */}
          {view === 'month' && (
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
                            onClick={() => handleDayFocus(day)}
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
                            <EventChip
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
                                    <EventChip
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
          )}

          {/* HAFTA GÖRÜNÜMÜ */}
          {view === 'week' && (
            <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-7 md:divide-x md:divide-y-0">
              {weekDays.map((day, idx) => {
                const iso = toLocalIsoDate(day);
                const isToday = iso === todayIso;
                const dayEvents = eventsByDate.get(iso) || [];

                return (
                  <div key={iso} className="flex min-h-40 flex-col md:min-h-80">
                    <button
                      type="button"
                      onClick={() => handleDayFocus(day)}
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
                          <EventChip
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
          )}

          {/* GÜN GÖRÜNÜMÜ */}
          {view === 'day' && (
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
          )}
        </>
      )}
    </Card>
  );
}
