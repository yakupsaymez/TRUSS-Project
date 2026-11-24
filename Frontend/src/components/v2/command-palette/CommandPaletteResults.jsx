import React from 'react';
import { ArrowDown, ArrowUp, CornerDownLeft, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

export function CommandPaletteResults({
  groups,
  activeIndex,
  setActiveIndex,
  itemRefs,
}) {
  let runningIndex = -1;

  return (
    <div
      role="listbox"
      aria-label="Komut sonuçları"
      className="max-h-[60vh] overflow-y-auto divide-y divide-border"
    >
      {groups.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Sonuç bulunamadı</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Farklı bir anahtar kelime deneyin veya doğal dil komutu girin (ör.{' '}
            <span className="font-mono text-foreground">34 ABC 123 45L 1950TL</span>).
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="p-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              {group.id === 'natural' && (
                <Sparkles className="size-3 text-primary" aria-hidden="true" />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </span>
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                runningIndex += 1;
                const idx = runningIndex;
                const isActive = idx === activeIndex;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => item.onSelect?.()}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-muted/60'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card',
                        group.id === 'natural'
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-sm font-medium text-foreground',
                          item.isMono && 'font-mono tabular-nums'
                        )}
                      >
                        {item.label}
                      </p>
                      {item.subtitle && (
                        <p className="truncate text-xs tabular-nums text-muted-foreground">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {item.badge && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-[10px]',
                          group.id === 'natural'
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground'
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function CommandPaletteFooter() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <Kbd className="h-5 min-w-5 px-1">
            <ArrowUp className="size-3" aria-hidden="true" />
          </Kbd>
          <Kbd className="h-5 min-w-5 px-1">
            <ArrowDown className="size-3" aria-hidden="true" />
          </Kbd>
          <span>Gezin</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd className="h-5 min-w-5 px-1">
            <CornerDownLeft className="size-3" aria-hidden="true" />
          </Kbd>
          <span>Seç</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd className="h-5 px-1.5">Esc</Kbd>
          <span>Kapat</span>
        </span>
      </div>

      <span className="hidden text-[11px] sm:inline">
        Doğal dil: <span className="font-mono text-foreground">34 ABC 123 45L 1950TL</span>
      </span>
    </div>
  );
}
