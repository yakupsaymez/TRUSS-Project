import { useEffect, useMemo, useState } from 'react';
import { formatTurkishPlate } from '@/utils/formatters';
import {
  TR_LOGISTICS_HUBS,
  TURKEY_OUTLINE_POINTS,
  hasValidCoordinates,
  projectToSvg,
  resolveVehicleHealthMeta,
} from './mapHelpers';

export function useFleetMapState({ araclar, selectedAracId, onSelectArac }) {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');

  const counts = useMemo(() => {
    let known = 0;
    let pending = 0;
    araclar.forEach((arac) => {
      if (hasValidCoordinates(arac)) known += 1;
      else pending += 1;
    });
    return {
      all: araclar.length,
      known,
      pending,
    };
  }, [araclar]);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return araclar.filter((arac) => {
      const hasCoord = hasValidCoordinates(arac);
      if (filterTab === 'known' && !hasCoord) return false;
      if (filterTab === 'pending' && hasCoord) return false;
      if (!q) return true;

      const haystack = [
        arac?.plaka,
        formatTurkishPlate(arac?.plaka || ''),
        arac?.marka,
        arac?.model,
        arac?.son_konum_adi,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return haystack.includes(q);
    });
  }, [araclar, filterTab, search]);

  const activeVehicle = useMemo(() => {
    if (selectedAracId && selectedAracId !== 'tum') {
      const matched = araclar.find((a) => String(a.arac_id) === String(selectedAracId));
      if (matched) return matched;
    }
    const firstWithCoord = filteredVehicles.find((a) => hasValidCoordinates(a));
    return firstWithCoord || filteredVehicles[0] || araclar[0] || null;
  }, [araclar, filteredVehicles, selectedAracId]);

  useEffect(() => {
    if (!selectedAracId && activeVehicle?.arac_id && onSelectArac) {
      onSelectArac(String(activeVehicle.arac_id));
    }
  }, [activeVehicle, onSelectArac, selectedAracId]);

  const positionedVehicles = useMemo(() => {
    return filteredVehicles
      .filter((arac) => hasValidCoordinates(arac))
      .map((arac, index) => {
        const lat = Number(arac.son_enlem);
        const lng = Number(arac.son_boylam);
        const base = projectToSvg(lat, lng);
        return {
          arac,
          lat,
          lng,
          x: base.x + ((index % 3) - 1) * 3,
          y: base.y + ((Math.floor(index / 3) % 3) - 1) * 3,
          health: resolveVehicleHealthMeta(arac),
        };
      });
  }, [filteredVehicles]);

  const hubMap = useMemo(() => {
    const map = new Map();
    TR_LOGISTICS_HUBS.forEach((hub) => {
      map.set(hub.id, {
        ...hub,
        ...projectToSvg(hub.lat, hub.lng),
      });
    });
    return map;
  }, []);

  const outlinePolygonPoints = useMemo(
    () =>
      TURKEY_OUTLINE_POINTS.map(([lat, lng]) => {
        const { x, y } = projectToSvg(lat, lng);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' '),
    []
  );

  return {
    search,
    setSearch,
    filterTab,
    setFilterTab,
    counts,
    filteredVehicles,
    activeVehicle,
    positionedVehicles,
    hubMap,
    outlinePolygonPoints,
  };
}
