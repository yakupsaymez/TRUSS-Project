import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  LAT_MAX,
  LAT_MIN,
  LNG_MAX,
  LNG_MIN,
  TR_LOGISTICS_HUBS,
  hasValidCoordinates,
  resolveVehicleHealthMeta,
} from './fleet-live-map/mapHelpers';
import { useFleetMapState } from './fleet-live-map/useFleetMapState';
import FleetMapDetailBar from './fleet-live-map/FleetMapDetailBar';
import FleetMapSidebar from './fleet-live-map/FleetMapSidebar';
import FleetMapCanvas from './fleet-live-map/FleetMapCanvas';

export {
  LAT_MAX,
  LAT_MIN,
  LNG_MAX,
  LNG_MIN,
  TR_LOGISTICS_HUBS,
  hasValidCoordinates,
  resolveVehicleHealthMeta,
};

export default function FleetLiveMap({
  araclar = [],
  selectedAracId = null,
  onSelectArac,
  onOpenCheckIn,
  onOpenInFleet,
  loading = false,
  className,
}) {
  const {
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
  } = useFleetMapState({ araclar, selectedAracId, onSelectArac });

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="h-[520px] rounded-xl lg:col-span-4" />
          <Skeleton className="h-[520px] rounded-xl lg:col-span-8" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <FleetMapDetailBar
        activeVehicle={activeVehicle}
        onOpenCheckIn={onOpenCheckIn}
        onOpenInFleet={onOpenInFleet}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <FleetMapSidebar
          counts={counts}
          search={search}
          onSearchChange={setSearch}
          filterTab={filterTab}
          onFilterTabChange={setFilterTab}
          filteredVehicles={filteredVehicles}
          activeVehicle={activeVehicle}
          onSelectArac={onSelectArac}
          onOpenCheckIn={onOpenCheckIn}
        />

        <FleetMapCanvas
          positionedVehicles={positionedVehicles}
          hubMap={hubMap}
          outlinePolygonPoints={outlinePolygonPoints}
          activeVehicle={activeVehicle}
          counts={counts}
          onSelectArac={onSelectArac}
          onOpenCheckIn={onOpenCheckIn}
        />
      </div>
    </div>
  );
}
