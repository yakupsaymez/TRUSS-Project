import React, { isValidElement } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const HATCHED_TILE_CLASS =
  'h-24 w-full rounded-lg border border-card-foreground/10 bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--card-foreground)_8%,transparent),color-mix(in_oklab,var(--card-foreground)_8%,transparent)_1px,var(--card)_2px,var(--card)_14px)]';

function renderIcon(icon, compact) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Icon = icon;
  return <Icon className={compact ? 'size-5' : 'size-6'} aria-hidden="true" />;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  actionVariant = 'default',
  compact = false,
  className,
}) {
  const hasPrimaryAction = Boolean(actionLabel && onAction);
  const hasSecondaryAction = Boolean(secondaryActionLabel && onSecondaryAction);
  const isAccentBadge = hasPrimaryAction && actionVariant === 'default';

  const iconNode = renderIcon(icon, compact);

  const innerContent = (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center text-center',
        compact ? 'gap-3 py-8' : 'relative z-10 gap-3.5 py-6'
      )}
    >
      {iconNode && (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full border',
            compact ? 'size-11' : 'size-14',
            isAccentBadge
              ? 'border-primary/20 bg-primary/10 text-primary'
              : 'border-border bg-muted text-muted-foreground'
          )}
        >
          {iconNode}
        </div>
      )}

      <div className="space-y-1">
        {title && (
          <p
            className={cn(
              'font-semibold tracking-tight text-foreground',
              compact ? 'text-sm' : 'text-base'
            )}
          >
            {title}
          </p>
        )}
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </p>
        )}
      </div>

      {(hasPrimaryAction || hasSecondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {hasPrimaryAction && (
            <Button
              type="button"
              variant={actionVariant}
              size="sm"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
          {hasSecondaryAction && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className={cn('w-full px-4', className)}>
        {innerContent}
      </div>
    );
  }

  return (
    <Card className={cn('relative overflow-hidden border-border bg-card', className)}>
      <CardContent className="relative px-6 py-10 sm:py-12">
        {/* empty-state-07 görsel şablonundan türetilen soyut bento yer tutucu arka plan */}
        <div
          aria-hidden="true"
          className="pointer-events-none mx-auto mb-4 grid max-w-3xl grid-cols-2 gap-3 opacity-80 select-none md:grid-cols-3"
        >
          <div className={cn(HATCHED_TILE_CLASS, 'md:row-span-2 md:h-52')} />
          <div className={cn(HATCHED_TILE_CLASS, 'md:col-span-2')} />
          <div className={HATCHED_TILE_CLASS} />
          <div className={cn(HATCHED_TILE_CLASS, 'max-sm:hidden')} />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 top-12 bg-linear-to-t from-card via-card/95 to-transparent"
        />

        <div className="-mt-28 sm:-mt-32">
          {innerContent}
        </div>
      </CardContent>
    </Card>
  );
}
