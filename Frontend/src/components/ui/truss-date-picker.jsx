import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { toLocalIsoDate } from '@/utils/dateUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const AYLAR_UZUN = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const AYLAR_KISA = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const pad2 = (n) => String(n).padStart(2, '0');

const parseIsoDate = (val) => {
  if (!val) return null;
  const raw = String(val).trim();
  const isoStr = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : raw.includes('T')
      ? toLocalIsoDate(new Date(raw))
      : raw.slice(0, 10);
  const parts = isoStr.split('-');
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
  id,
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
  const [viewYear, setViewYear] = useState(() =>
    selectedDate ? selectedDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(() =>
    selectedDate ? selectedDate.getMonth() : today.getMonth()
  );

  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

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
      <Popover open={disabled ? false : open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3.5 py-2 text-left text-sm text-foreground shadow-xs transition-all',
              'hover:border-primary/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              open && 'border-primary ring-2 ring-ring/30',
              disabled && 'cursor-not-allowed opacity-50 bg-muted',
              className
            )}
          >
            <span
              className={cn(
                'truncate tabular-nums',
                displayValue ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}
            >
              {displayValue || placeholder}
            </span>
            <Calendar
              className={cn(
                'size-4 shrink-0 transition-colors',
                open || displayValue ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="z-[60] w-72 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
        >
          {/* Üst Başlık: Hızlı Ay / Yıl Seçimi ve Oklar */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Önceki ay"
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                aria-label="Ay seçimi"
                className="h-7 cursor-pointer rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              >
                {AYLAR_UZUN.map((ay, idx) => (
                  <option key={ay} value={idx} className="bg-popover text-popover-foreground">
                    {ay}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                aria-label="Yıl seçimi"
                className="h-7 cursor-pointer rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-popover text-popover-foreground">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Sonraki ay"
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Haftanın Günleri (Pzt -> Paz) */}
          <div className="grid grid-cols-7 text-center">
            {GUNLER.map((gun) => (
              <span
                key={gun}
                className="py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
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
                    'flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium tabular-nums transition-colors',
                    isSelected
                      ? 'bg-primary font-semibold text-primary-foreground shadow-xs'
                      : isToday
                        ? 'border border-primary/60 bg-primary/10 font-semibold text-primary hover:bg-primary/20'
                        : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Alt Kısayollar: Bugün & Temizle */}
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              className="rounded-lg bg-primary/15 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Bugün
            </button>
          </div>
        </PopoverContent>
      </Popover>

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
    </div>
  );
}

export default TrussDatePicker;
