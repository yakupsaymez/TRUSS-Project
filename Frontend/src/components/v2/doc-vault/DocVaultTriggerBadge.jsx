import React from 'react';
import { FileText, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DocVaultTriggerBadge({
  label = 'Belge',
  title,
  count = 0,
  variant = 'single',
  onClick,
  disabled = false,
  className,
}) {
  const Icon = variant === 'multi' ? Paperclip : FileText;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={title || label}
      aria-label={title || label}
      className={cn(
        'inline-flex h-5 max-w-full items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        className
      )}
    >
      <Icon className="size-3 shrink-0 text-primary" aria-hidden="true" />
      <span className="truncate">{label}</span>
      {count > 0 && (
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          ({count})
        </span>
      )}
    </button>
  );
}
