import React from 'react';
import { Truck, X } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import useGenelBakisController from '@/components/v2/overview/useGenelBakisController';
import OverviewKpiStrip from '@/components/v2/OverviewKpiStrip';
import ActionCenterCard from '@/components/v2/ActionCenterCard';
import CostTrendChart from '@/components/v2/CostTrendChart';
import FleetHealthWidget from '@/components/v2/FleetHealthWidget';
import DocumentComplianceCard from '@/components/v2/DocumentComplianceCard';
import BudgetVarianceCard from '@/components/v2/BudgetVarianceCard';
import FleetEfficiencyCard from '@/components/v2/FleetEfficiencyCard';
import ExecExportMenu from '@/components/v2/ExecExportMenu';
import EmptyState from '@/components/v2/EmptyState';
import VehicleSheet from '@/components/v2/VehicleSheet';
import { Button } from '@/components/ui/button';

export default function GenelBakis() {
  const {
    user, canManage, canViewAnalytics, loading, hasLoaded, seciliAracId, setSeciliAracId,
    aylikTrend, aracMaliyet, butceAnalizi, loadingFinance, vehicleSheetOpen, setVehicleSheetOpen,
    donemGun, setDonemGun, exportingKey, isSingleVehicle, filtreliAraclar, selectedVehicle, isFleetEmpty,
    handleSelectVehicle, handleSelectComplianceStatus, handleBudgetUpdated, handleExportCsv,
  } = useGenelBakisController();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Genel Bakış</h1>
          <p className="text-xs text-muted-foreground">
            Filo operasyon sağlığı, bakım ve belge uyum özeti
            {canViewAnalytics ? ' ile gider göstergeleri' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {canViewAnalytics && !isFleetEmpty && (
            <ExecExportMenu
              user={user}
              donemGun={donemGun}
              isSingleVehicle={isSingleVehicle}
              exportingKey={exportingKey}
              onExport={handleExportCsv}
            />
          )}
        </div>
      </div>

      {isFleetEmpty ? (
        canManage ? (
          <EmptyState
            icon={Truck}
            title="İlk aracınızı ekleyin"
            description="Filonuza ilk aracınızı ekleyerek sayaç takibi, bakım ömrü, belge uyum durumu ve gider özetini tek ekranda izlemeye başlayın."
            actionLabel="Araç Ekle"
            onAction={() => setVehicleSheetOpen(true)}
          />
        ) : (
          <EmptyState
            icon={Truck}
            title="Henüz zimmetli aracınız yok"
            description="Filo yöneticiniz size bir araç zimmetlediğinde özet burada görünecektir."
          />
        )
      ) : (
        <>
          <OverviewKpiStrip
            araclar={filtreliAraclar}
            seciliAracId={seciliAracId}
            canViewAnalytics={canViewAnalytics}
            aylikTrend={aylikTrend}
            aracMaliyet={aracMaliyet}
            loadingVehicles={loading && !hasLoaded}
            loadingFinance={loadingFinance}
          />
          <ActionCenterCard seciliAracId={seciliAracId} canViewAnalytics={canViewAnalytics} />
          {canViewAnalytics ? (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <CostTrendChart
                  aylikTrend={aylikTrend}
                  aracMaliyet={aracMaliyet}
                  seciliAracId={seciliAracId}
                  loading={loadingFinance}
                  className="lg:col-span-7"
                />
                <FleetHealthWidget
                  araclar={filtreliAraclar}
                  loading={loading && !hasLoaded}
                  onSelectVehicle={handleSelectVehicle}
                  className="lg:col-span-5"
                />
              </div>
              <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
                <BudgetVarianceCard
                  butceData={butceAnalizi}
                  canManage={canManage}
                  loading={loadingFinance}
                  onBudgetUpdated={handleBudgetUpdated}
                  className="lg:col-span-6"
                />
                <DocumentComplianceCard
                  araclar={filtreliAraclar}
                  loading={loading && !hasLoaded}
                  onSelectStatus={handleSelectComplianceStatus}
                  className="lg:col-span-6"
                />
              </div>
              <FleetEfficiencyCard
                canViewAnalytics={canViewAnalytics}
                seciliAracId={seciliAracId}
                donemGun={donemGun}
                onDonemGunChange={setDonemGun}
                onSelectVehicle={handleSelectVehicle}
              />
            </>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
              <FleetHealthWidget
                araclar={filtreliAraclar}
                loading={loading && !hasLoaded}
                onSelectVehicle={handleSelectVehicle}
              />
              <DocumentComplianceCard
                araclar={filtreliAraclar}
                loading={loading && !hasLoaded}
                onSelectStatus={handleSelectComplianceStatus}
              />
            </div>
          )}
        </>
      )}

      {canManage && (
        <VehicleSheet open={vehicleSheetOpen} onOpenChange={setVehicleSheetOpen} arac={null} />
      )}
    </div>
  );
}
