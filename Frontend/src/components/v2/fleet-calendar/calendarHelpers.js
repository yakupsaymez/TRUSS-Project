import { FileCheck2, Shield, ShieldAlert, Wrench } from 'lucide-react';
import { EVRAK_UYARI_GUN } from '@/utils/aracDurum';

export const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export const MAX_VISIBLE_MONTH_EVENTS = 3;
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const VIEW_OPTIONS = [
  { id: 'month', label: 'Ay' },
  { id: 'week', label: 'Hafta' },
  { id: 'day', label: 'Gün' },
];

export const EVENT_TYPE_META = {
  muayene: { label: 'Muayene', icon: FileCheck2 },
  sigorta: { label: 'Sigorta', icon: Shield },
  kasko: { label: 'Kasko', icon: ShieldAlert },
  bakim: { label: 'Bakım', icon: Wrench },
};

export const monthYearFormatter = new Intl.DateTimeFormat('tr-TR', {
  month: 'long',
  year: 'numeric',
});

export const shortMonthFormatter = new Intl.DateTimeFormat('tr-TR', {
  month: 'short',
});

export const fullDayFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
});

export const popoverDayFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'short',
});

export const weekDayHeaderFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
});

export function capitalizeTr(text) {
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

export function addDaysLocal(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function addMonthsLocal(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function getMondayOfWeek(date) {
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
