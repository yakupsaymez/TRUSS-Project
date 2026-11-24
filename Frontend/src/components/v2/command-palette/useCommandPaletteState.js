import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCommandGroups } from './commandPaletteGroups';

export function useCommandPaletteState({
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
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(timer);
    }
    setQuery('');
    setActiveIndex(0);
    return undefined;
  }, [open]);

  const trimmedQuery = query.trim();
  const qLower = trimmedQuery.toLocaleLowerCase('tr-TR');
  const qCompact = qLower.replace(/\s+/g, '');
  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');

  const groups = useMemo(
    () =>
      buildCommandGroups({
        trimmedQuery,
        qLower,
        qCompact,
        araclar,
        seciliAracId,
        isSingleVehicle,
        canManage,
        canAddFuel,
        canAddMaintenance,
        visibleNavItems,
        onOpenChange,
        onNavigate,
        onSelectVehicle,
        onOpenMovementSheet,
        onOpenComponentSheet,
        onOpenVehicleSheet,
      }),
    [
      trimmedQuery,
      qLower,
      qCompact,
      araclar,
      seciliAracId,
      isSingleVehicle,
      canManage,
      canAddFuel,
      canAddMaintenance,
      visibleNavItems,
      onOpenChange,
      onNavigate,
      onSelectVehicle,
      onOpenMovementSheet,
      onOpenComponentSheet,
      onOpenVehicleSheet,
    ]
  );

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery, flatItems.length]);

  useEffect(() => {
    const activeEl = itemRefs.current[activeIndex];
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flatItems.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flatItems.length === 0) return;
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === 'Enter') {
      if (flatItems.length === 0) return;
      event.preventDefault();
      const current = flatItems[activeIndex] || flatItems[0];
      current?.onSelect?.();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange?.(false);
    }
  };

  return {
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    inputRef,
    itemRefs,
    groups,
    handleKeyDown,
  };
}
