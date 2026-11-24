import React from 'react';
import { Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import {
  parseLedgerNaturalInput,
  parsePartNaturalInput,
} from './command-palette/commandPaletteParsers';
import { useCommandPaletteState } from './command-palette/useCommandPaletteState';
import {
  CommandPaletteFooter,
  CommandPaletteResults,
} from './command-palette/CommandPaletteResults';

export { parseLedgerNaturalInput, parsePartNaturalInput };

export default function CommandPalette({
  open,
  onOpenChange,
  canManage = false,
  canAddFuel = true,
  canAddMaintenance = true,
  visibleNavItems = [],
  araclar = [],
  seciliAracId = 'tum',
  onNavigate,
  onSelectVehicle,
  onOpenMovementSheet,
  onOpenComponentSheet,
  onOpenVehicleSheet,
}) {
  const {
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    inputRef,
    itemRefs,
    groups,
    handleKeyDown,
  } = useCommandPaletteState({
    open,
    onOpenChange,
    canManage,
    canAddFuel,
    canAddMaintenance,
    visibleNavItems,
    araclar,
    seciliAracId,
    onNavigate,
    onSelectVehicle,
    onOpenMovementSheet,
    onOpenComponentSheet,
    onOpenVehicleSheet,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 overflow-hidden border border-border bg-popover p-0 shadow-xl sm:max-w-xl"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Komut Paleti</DialogTitle>

        <div className="flex h-12 items-center gap-2.5 border-b border-border px-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara veya hızlı komut yaz (ör. 34 ABC 123 45L 1950TL)..."
            aria-label="Komut paletinde ara"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Aramayı temizle"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <Kbd>Esc</Kbd>
        </div>

        <CommandPaletteResults
          groups={groups}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          itemRefs={itemRefs}
        />

        <CommandPaletteFooter />
      </DialogContent>
    </Dialog>
  );
}
