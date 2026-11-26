import React from 'react';
import { useFleetHealthController } from '@/components/v2/fleet-health/useFleetHealthController';
import FleetHealthView from '@/components/v2/fleet-health/FleetHealthView';

export default function FleetHealthWidget({
  araclar = [],
  loading = false,
  onSelectVehicle,
  className,
}) {
  const controller = useFleetHealthController(araclar);

  return (
    <FleetHealthView
      {...controller}
      loading={loading}
      onSelectVehicle={onSelectVehicle}
      className={className}
    />
  );
}
