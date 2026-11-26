import React from 'react';
import { AlertTriangle, MapPin, RefreshCw, Truck } from 'lucide-react';
import FleetLiveMap from '@/components/v2/FleetLiveMap';
import EmptyState from '@/components/v2/EmptyState';
import VehicleSheet from '@/components/v2/VehicleSheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useHaritaController } from '@/components/v2/harita/useHaritaController';
import HaritaHeader from '@/components/v2/harita/HaritaHeader';
import HaritaUnpositionedPanel from '@/components/v2/harita/HaritaUnpositionedPanel';
import HaritaCheckInDialog from '@/components/v2/harita/HaritaCheckInDialog';

export default function Harita() {
  const ctrl = useHaritaController();

  return (
    <div className="space-y-4">
      <HaritaHeader
        isFleetEmpty={ctrl.isFleetEmpty}
        knownLocationCount={ctrl.knownLocationCount}
        totalCount={ctrl.filtreliAraclar.length}
        unpositionedCount={ctrl.unpositionedVehicles.length}
        unpositionedOpen={ctrl.unpositionedOpen}
        onToggleUnpositioned={ctrl.toggleUnpositionedPanel}
        isSingleVehicle={ctrl.isSingleVehicle}
        selectedGlobalVehicle={ctrl.selectedGlobalVehicle}
        onResetVehicleFilter={() => ctrl.setSeciliAracId('tum')}
        onOpenCheckIn={ctrl.handleOpenCheckIn}
        canCheckIn={ctrl.activeCheckInVehicles.length > 0}
      />

      {ctrl.error && !ctrl.loading && ctrl.araclar.length === 0 ? (
        <Card className="border-destructive/40 bg-card p-6 shadow-none">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Harita verileri yüklenemedi</p>
              <p className="text-xs text-muted-foreground">{ctrl.error}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={ctrl.loadVehiclesSafe}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              <span>Tekrar Dene</span>
            </Button>
          </div>
        </Card>
      ) : ctrl.isFleetEmpty ? (
        ctrl.canManage ? (
          <EmptyState
            icon={Truck}
            title="İlk aracınızı ekleyin"
            description="Filonuza ilk aracınızı ekleyerek Türkiye lojistik haritasında canlı konum ve saha check-in takibine başlayın."
            actionLabel="Araç Ekle"
            onAction={() => ctrl.setVehicleSheetOpen(true)}
          />
        ) : (
          <EmptyState
            icon={MapPin}
            title="Henüz zimmetli aracınız yok"
            description="Filo yöneticiniz size bir araç zimmetlediğinde konum bildirimi ve harita görünümü burada açılacaktır."
          />
        )
      ) : (
        <>
          <HaritaUnpositionedPanel
            vehicles={ctrl.unpositionedVehicles}
            open={ctrl.unpositionedOpen}
            onClose={ctrl.toggleUnpositionedPanel}
            onOpenCheckIn={ctrl.handleOpenCheckIn}
          />
          <FleetLiveMap
            araclar={ctrl.filtreliAraclar}
            selectedAracId={ctrl.activeMapAracId}
            onSelectArac={(id) => ctrl.setActiveMapAracId(String(id))}
            onOpenCheckIn={ctrl.handleOpenCheckIn}
            onOpenInFleet={ctrl.handleOpenInFleet}
            onCreateWorkOrder={ctrl.handleCreateWorkOrder}
            canCreateWorkOrder={ctrl.canManage}
            loading={ctrl.loading && !ctrl.hasLoaded}
          />
        </>
      )}

      <HaritaCheckInDialog
        open={ctrl.checkInOpen}
        onOpenChange={ctrl.handleCheckInOpenChange}
        activeVehicles={ctrl.activeCheckInVehicles}
        checkInForm={ctrl.checkInForm}
        onFieldChange={ctrl.setCheckInField}
        onVehicleChange={ctrl.handleCheckInVehicleChange}
        onSelectHub={ctrl.handleSelectHub}
        locatingGps={ctrl.locatingGps}
        onUseDeviceGps={ctrl.handleUseDeviceGps}
        isSubmitting={ctrl.isSubmitting}
        onSubmit={ctrl.handleSubmitCheckIn}
      />

      {ctrl.canManage && (
        <VehicleSheet
          open={ctrl.vehicleSheetOpen}
          onOpenChange={ctrl.setVehicleSheetOpen}
          arac={null}
        />
      )}
    </div>
  );
}
