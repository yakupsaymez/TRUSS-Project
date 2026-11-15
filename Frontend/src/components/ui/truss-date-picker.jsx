import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const AYLAR_UZUN = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const AYLAR_KISA = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const pad2 = (n) => String(n).padStart(2, '0');

const parseIsoDate = (val) => {
  if (!val || typeof val !== 'string') return null;
  const clean = val.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
};

const toIsoDateString = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const formatDisplayDate = (val) => {
  const d = parseIsoDate(val);
  if (!d) return '';
  return `${pad2(d.getDate())} ${AYLAR_KISA[d.getMonth()]} ${d.getFullYear()}`;
};

export function TrussDatePicker({
  name,
  value = '',
  onChange,
  placeholder = 'Tarih seçin',
  disabled = false,
  required = false,
  className,
}) {
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (selectedDate ? selectedDate.getFullYear() : today.getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selectedDate ? selectedDate.getMonth() : today.getMonth()));
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 288 });

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 340;
    const popoverWidth = 288;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < popoverHeight && rect.top > popoverHeight
        ? rect.top - popoverHeight - 6
        : rect.bottom + 6;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - popoverWidth - 8
    );
    setCoords({ top, left, width: popoverWidth });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleOutsideClick = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popoverRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const emitChange = (nextIsoString) => {
    if (!onChange) return;
    onChange({
      target: {
        name,
        value: nextIsoString,
      },
    });
  };

  const handleSelectDay = (dayNumber) => {
    const nextDate = new Date(viewYear, viewMonth, dayNumber);
    emitChange(toIsoDateString(nextDate));
    setOpen(false);
  };

  const handleSelectToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    emitChange(toIsoDateString(today));
    setOpen(false);
  };

  const handleClear = () => {
    emitChange('');
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    // Pazartesi = 0 ... Pazar = 6
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(d);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear();
    const years = [];
    for (let y = currentYear - 15; y <= currentYear + 10; y += 1) {
      years.push(y);
    }
    return years;
  }, [today]);

  const displayValue = formatDisplayDate(value);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-truss-border bg-truss-bg px-3.5 py-2 text-left text-sm text-truss-text transition-all',
          'hover:border-truss-purple/50 focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/30',
          open && 'border-truss-purple ring-2 ring-truss-purple/30',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <span className={cn('truncate tabular-nums', displayValue ? 'text-truss-text font-medium' : 'text-truss-muted')}>
          {displayValue || placeholder}
        </span>
        <Calendar className={cn('size-4 shrink-0 transition-colors', open || displayValue ? 'text-truss-purple' : 'text-truss-muted')} />
      </button>

      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required={required}
          value={value || ''}
          onChange={() => {}}
          className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
        />
      )}

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}
            className="fixed z-[9999] rounded-2xl border border-truss-border bg-truss-surface p-3.5 text-truss-text shadow-2xl backdrop-blur-xl animate-scale-in"
          >
            {/* Üst Başlık: Hızlı Ay / Yıl Seçimi ve Oklar */}
            <div className="mb-3 flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="flex size-7 items-center justify-center rounded-lg border border-truss-border bg-truss-bg text-truss-muted hover:border-truss-purple/50 hover:bg-truss-purple/15 hover:text-truss-text transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="h-7 cursor-pointer rounded-lg border border-truss-border bg-truss-bg px-2 text-xs font-semibold text-truss-text focus:border-truss-purple focus:outline-none"
                >
                  {AYLAR_UZUN.map((ay, idx) => (
                    <option key={ay} value={idx} className="bg-truss-surface text-truss-text">
                      {ay}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="h-7 cursor-pointer rounded-lg border border-truss-border bg-truss-bg px-2 text-xs font-semibold text-truss-text focus:border-truss-purple focus:outline-none"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y} className="bg-truss-surface text-truss-text">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="flex size-7 items-center justify-center rounded-lg border border-truss-border bg-truss-bg text-truss-muted hover:border-truss-purple/50 hover:bg-truss-purple/15 hover:text-truss-text transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Haftanın Günleri (Pzt -> Paz) */}
            <div className="mb-1.5 grid grid-cols-7 text-center">
              {GUNLER.map((gun) => (
                <span key={gun} className="py-1 text-[11px] font-semibold uppercase tracking-wider text-truss-muted">
                  {gun}
                </span>
              ))}
            </div>

            {/* 7 Sütunlu Gün Izgarası */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-8" />;
                }

                const isSelected =
                  selectedDate &&
                  selectedDate.getFullYear() === viewYear &&
                  selectedDate.getMonth() === viewMonth &&
                  selectedDate.getDate() === day;

                const isToday =
                  today.getFullYear() === viewYear &&
                  today.getMonth() === viewMonth &&
                  today.getDate() === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      'flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium tabular-nums transition-all',
                      isSelected
                        ? 'bg-truss-purple text-truss-text font-semibold shadow-md shadow-truss-purple/30'
                        : isToday
                        ? 'border border-truss-purple/60 bg-truss-purple/10 text-truss-purple font-semibold hover:bg-truss-purple/20'
                        : 'text-truss-text hover:bg-truss-bg hover:text-truss-text'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Alt Kısayollar: Bugün & Temizle */}
            <div className="mt-3 flex items-center justify-between border-t border-truss-border pt-2.5">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-truss-muted hover:bg-truss-bg hover:text-truss-text transition-colors"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={handleSelectToday}
                className="rounded-lg bg-truss-purple/15 px-3 py-1 text-xs font-semibold text-truss-purple hover:bg-truss-purple hover:text-truss-text transition-colors"
              >
                Bugün
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default TrussDatePicker;
