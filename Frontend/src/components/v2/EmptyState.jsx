import React, { isValidElement } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const HATCHED_TILE_CLASS =
  'h-24 w-full rounded-lg border border-card-foreground/10 bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--card-foreground)_8%,transparent),color-mix(in_oklab,var(--card-foreground)_8%,transparent)_1px,var(--card)_2px,var(--card)_14px)]';

function renderIcon(icon, sizeClass) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Icon = icon;
  return <Icon className={sizeClass} aria-hidden="true" />;
}

export default function EmptyState({
  variant,
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
  const resolvedVariant = variant || (compact ? 'table' : 'page');
  const hasPrimaryAction = Boolean(actionLabel && onAction);
  const hasSecondaryAction = Boolean(secondaryActionLabel && onSecondaryAction);
  const isAccentBadge = hasPrimaryAction && actionVariant === 'default';

  const actionsNode =
    hasPrimaryAction || hasSecondaryAction ? (
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {hasPrimaryAction && (
          <Button type="button" variant={actionVariant} size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {hasSecondaryAction && (
          <Button type="button" variant="outline" size="sm" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    ) : null;

  // empty-state-01: Kart / grafik gövdesi içi kompakt kesikli boş durum
  if (resolvedVariant === 'card') {
    const cardIconNode = renderIcon(icon, 'size-4.5');
    return (
      <div
        className={cn(
          'flex min-h-44 w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border bg-background/50 px-4 py-8 text-center',
          className
        )}
      >
        {cardIconNode && (
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full border',
              isAccentBadge
                ? 'border-primary/25 bg-primary/10 text-primary'
                : 'border-border bg-muted/70 text-muted-foreground'
            )}
          >
            {cardIconNode}
          </div>
        )}
        <div className="max-w-sm space-y-1">
          {title && (
            <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
          )}
          {description && (
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actionsNode}
      </div>
    );
  }

  // empty-state-02: Tablo içi çift halkalı ikon konteynerli boş durum
  if (resolvedVariant === 'table') {
    const tableIconNode = renderIcon(icon, 'size-5');
    return (
      <div className={cn('w-full px-4 py-10', className)}>
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
          {tableIconNode && (
            <div
              className={cn(
                'flex size-14 shrink-0 items-center justify-center rounded-full border border-dashed p-1.5',
                isAccentBadge ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'
              )}
            >
              <div
                className={cn(
                  'flex size-full items-center justify-center rounded-full border',
                  isAccentBadge
                    ? 'border-primary/25 bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                {tableIconNode}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {title && (
              <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
            )}
            {description && (
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {description}
              </p>
            )}
          </div>

          {actionsNode}
        </div>
      </div>
    );
  }

  // empty-state-07: Tam sayfa bento taralı yer tutucu boş durum
  const pageIconNode = renderIcon(icon, 'size-6');
  return (
    <Card className={cn('relative overflow-hidden border-border bg-card', className)}>
      <CardContent className="relative px-6 py-10 sm:py-12">
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
          <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-3.5 py-6 text-center">
            {pageIconNode && (
              <div
                className={cn(
                  'flex size-14 shrink-0 items-center justify-center rounded-full border',
                  isAccentBadge
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                {pageIconNode}
              </div>
            )}

            <div className="space-y-1">
              {title && (
                <p className="text-base font-semibold tracking-tight text-foreground">{title}</p>
              )}
              {description && (
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {description}
                </p>
              )}
            </div>

            {actionsNode}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
