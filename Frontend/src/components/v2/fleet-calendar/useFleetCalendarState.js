import { useEffect, useMemo, useState } from 'react';
import { getTodayIso, toLocalIsoDate } from '@/utils/dateUtils';
import {
  addDaysLocal,
  addMonthsLocal,
  capitalizeTr,
  fullDayFormatter,
  getMondayOfWeek,
  monthYearFormatter,
  parseIsoLocal,
  shortMonthFormatter,
} from './calendarHelpers';

const EVENT_ORDER_WEIGHT = { muayene: 0, sigorta: 1, kasko: 2, bakim: 3 };

export function useFleetCalendarState({ events, showMaintenance }) {
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

    filteredEvents.forEach((ev) => {
      if (!ev?.date) return;
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });

    map.forEach((list) => {
      list.sort((a, b) => {
        const wa = EVENT_ORDER_WEIGHT[a.type] ?? 9;
        const wb = EVENT_ORDER_WEIGHT[b.type] ?? 9;
        if (wa !== wb) return wa - wb;
        return String(a.title || '').localeCompare(String(b.title || ''), 'tr-TR');
      });
    });

    return map;
  }, [filteredEvents]);

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

  const handleViewChange = (nextView) => {
    setOpenPopoverIso(null);
    setView(nextView);
  };

  const selectedDayIso = toLocalIsoDate(cursorDate);
  const selectedDayEvents = eventsByDate.get(selectedDayIso) || [];

  return {
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
  };
}
