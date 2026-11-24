import React from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  WEEKDAY_LABELS,
  diffCalendarDays,
  getEventUrgencyMeta,
  parseIsoLocal,
} from './fleet-calendar/calendarHelpers';
import { useFleetCalendarState } from './fleet-calendar/useFleetCalendarState';
import CalendarToolbar from './fleet-calendar/CalendarToolbar';
import CalendarMonthView from './fleet-calendar/CalendarMonthView';
import { CalendarDayView, CalendarWeekView } from './fleet-calendar/CalendarWeekDayView';

export { diffCalendarDays, getEventUrgencyMeta, parseIsoLocal };

export default function FleetCalendar({
  events = [],
  loading = false,
  showMaintenance = true,
  onEventSelect,
  className,
}) {
  const {
    todayIso,
    view,
    cursorDate,
    typeFilter,
    setTypeFilter,
    openPopoverIso,
    setOpenPopoverIso,
    filterChips,
    eventsByDate,
    monthDays,
    weekDays,
    periodEventCount,
    periodTitle,
    selectedDayEvents,
    handlePrevious,
    handleNext,
    handleToday,
    handleDayFocus,
    handleViewChange,
  } = useFleetCalendarState({ events, showMaintenance });

  return (
    <Card className={cn('gap-0 overflow-hidden border-border bg-card py-0 shadow-none', className)}>
      <CalendarToolbar
        periodTitle={periodTitle}
        periodEventCount={periodEventCount}
        loading={loading}
        view={view}
        onViewChange={handleViewChange}
        onPrevious={handlePrevious}
        onToday={handleToday}
        onNext={handleNext}
        filterChips={filterChips}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        showMaintenance={showMaintenance}
      />

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

          {view === 'month' && (
            <CalendarMonthView
              monthDays={monthDays}
              cursorDate={cursorDate}
              todayIso={todayIso}
              eventsByDate={eventsByDate}
              openPopoverIso={openPopoverIso}
              setOpenPopoverIso={setOpenPopoverIso}
              onDayFocus={handleDayFocus}
              onEventSelect={onEventSelect}
            />
          )}

          {view === 'week' && (
            <CalendarWeekView
              weekDays={weekDays}
              todayIso={todayIso}
              eventsByDate={eventsByDate}
              onDayFocus={handleDayFocus}
              onEventSelect={onEventSelect}
            />
          )}

          {view === 'day' && (
            <CalendarDayView
              selectedDayEvents={selectedDayEvents}
              todayIso={todayIso}
              onEventSelect={onEventSelect}
            />
          )}
        </>
      )}
    </Card>
  );
}
