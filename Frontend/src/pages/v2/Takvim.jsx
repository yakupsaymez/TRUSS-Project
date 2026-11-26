import React from 'react';
import { AlertCircle, CalendarDays, RefreshCw, Truck, X } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import FleetCalendar from '@/components/v2/FleetCalendar';
import EmptyState from '@/components/v2/EmptyState';
import VehicleSheet from '@/components/v2/VehicleSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTakvimController } from '@/components/v2/takvim/useTakvimController';
import TakvimEventDialog from '@/components/v2/takvim/TakvimEventDialog';

export default function Takvim() {
  const {
    canManage,
    canViewLedger,
    events,
    todayIso,
    bakimError,
    fetchBakimList,
    isSingleVehicle,
    selectedVehicle,
    setSeciliAracId,
    isFleetEmpty,
    isCalendarLoading,
    sheetOpen,
    setSheetOpen,
    editingVehicle,
    setEditingVehicle,
    detailEvent,
    setDetailEvent,
    handleEventSelect,
    handleCreateVehicle,
    handleEditVehicle,
    handleOpenWorkOrder,
    handleOpenInFleet,
    handleOpenInLedger,
  } = useTakvimController();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Takvim</h1>
            {!isFleetEmpty && (
              <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                {events.length} kayıt
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Muayene, sigorta, kasko vadeleri{canViewLedger ? ' ve bakım geçmişi' : ''}
            {canManage ? '' : ' (salt-okunur)'}
          </p>
        </div>

        {isSingleVehicle && !isFleetEmpty && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
            <span className="tabular-nums">
              Tek araç görünümü
              {selectedVehicle?.plaka ? ` · ${formatTurkishPlate(selectedVehicle.plaka)}` : ''}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSeciliAracId('tum')}
              className="h-6 gap-1 rounded-full px-2 text-xs text-primary hover:bg-primary/15 hover:text-primary"
            >
              <span>Tümünü Göster</span>
              <X className="size-3" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {bakimError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{bakimError}</span>
          </div>
          <Button type="button" variant="outline" size="xs" onClick={fetchBakimList} className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/15">
            <RefreshCw className="size-3" aria-hidden="true" />
            <span>Yeniden Dene</span>
          </Button>
        </div>
      )}

      {isFleetEmpty ? (
        canManage ? (
          <EmptyState
            icon={Truck}
            title="İlk aracınızı ekleyin"
            description="Filonuza araç eklediğinizde muayene, sigorta, kasko vadeleri ve bakım kayıtları takvimde otomatik görünür."
            actionLabel="Araç Ekle"
            onAction={handleCreateVehicle}
          />
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Henüz zimmetli aracınız yok"
            description="Filo yöneticiniz size bir araç zimmetlediğinde belge ve bakım takvimi burada görünecektir."
          />
        )
      ) : (
        <FleetCalendar
          events={events}
          loading={isCalendarLoading}
          showMaintenance={canViewLedger}
          onEventSelect={handleEventSelect}
        />
      )}

      {canManage && (
        <VehicleSheet
          open={sheetOpen}
          onOpenChange={(nextOpen) => {
            setSheetOpen(nextOpen);
            if (!nextOpen) setEditingVehicle(null);
          }}
          arac={editingVehicle}
        />
      )}

      <TakvimEventDialog
        event={detailEvent}
        todayIso={todayIso}
        canManage={canManage}
        onClose={() => setDetailEvent(null)}
        onEditVehicle={handleEditVehicle}
        onOpenWorkOrder={handleOpenWorkOrder}
        onOpenInFleet={handleOpenInFleet}
        onOpenInLedger={handleOpenInLedger}
      />
    </div>
  );
}
