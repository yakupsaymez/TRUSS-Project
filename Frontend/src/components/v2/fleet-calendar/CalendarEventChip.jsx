import React from 'react';
import { cn } from '@/lib/utils';
import { EVENT_TYPE_META, getEventUrgencyMeta } from './calendarHelpers';

export default function CalendarEventChip({ event, todayIso, onSelect, compact = true }) {
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
