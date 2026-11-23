import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, X } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import raporService from '@/services/raporService';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { formatTurkishPlate } from '@/utils/formatters';
import OverviewKpiStrip from '@/components/v2/OverviewKpiStrip';
import CostTrendChart from '@/components/v2/CostTrendChart';
import FleetHealthWidget from '@/components/v2/FleetHealthWidget';
import DocumentComplianceCard from '@/components/v2/DocumentComplianceCard';
import BudgetVarianceCard from '@/components/v2/BudgetVarianceCard';
import EmptyState from '@/components/v2/EmptyState';
import VehicleSheet from '@/components/v2/VehicleSheet';
import { Button } from '@/components/ui/button';

export default function GenelBakis() {
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canViewAnalytics = canAccessChannel(user, 'analytics');

  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const hasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [aylikTrend, setAylikTrend] = useState([]);
  const [aracMaliyet, setAracMaliyet] = useState([]);
  const [butceAnalizi, setButceAnalizi] = useState(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);

  const vehicleFetchAttemptedRef = useRef(false);

  useEffect(() => {
    if (!hasLoaded && !loading && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [hasLoaded, loading, fetchAraclar]);

  const fetchFinanceData = useCallback(async () => {
    if (!canViewAnalytics) return;
    setLoadingFinance(true);
    try {
      const [trendRes, maliyetRes, butceRes] = await Promise.all([
        raporService.getAylikHarcamaTrendi(),
        raporService.getAracMaliyetDagilimi(),
        raporService.getButceAnalizi(),
      ]);
      setAylikTrend(Array.isArray(trendRes) ? trendRes : []);
      setAracMaliyet(Array.isArray(maliyetRes) ? maliyetRes : []);
      setButceAnalizi(butceRes || null);
    } catch (err) {
      notifyApiError(err, 'Finansal özet yüklenemedi.');
    } finally {
      setLoadingFinance(false);
    }
  }, [canViewAnalytics]);

  // P0 RBAC: Finansal rapor istekleri YALNIZCA analytics yetkisi olan kullanıcılarda atılır
  useEffect(() => {
    if (!canViewAnalytics) {
      setAylikTrend([]);
      setAracMaliyet([]);
      setButceAnalizi(null);
      setLoadingFinance(false);
      return;
    }

    let cancelled = false;
    setLoadingFinance(true);

    Promise.all([
      raporService.getAylikHarcamaTrendi(),
      raporService.getAracMaliyetDagilimi(),
      raporService.getButceAnalizi(),
    ])
      .then(([trendRes, maliyetRes, butceRes]) => {
        if (cancelled) return;
        setAylikTrend(Array.isArray(trendRes) ? trendRes : []);
        setAracMaliyet(Array.isArray(maliyetRes) ? maliyetRes : []);
        setButceAnalizi(butceRes || null);
      })
      .catch((err) => {
        if (cancelled) return;
        notifyApiError(err, 'Finansal özet yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoadingFinance(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewAnalytics]);

  useEffect(() => {
    const handleDataChanged = (event) => {
      if (!canViewAnalytics) return;
      const scope = event?.detail?.scope;
      if (!scope || scope === 'movement') {
        fetchFinanceData();
      }
    };
    window.addEventListener('truss:data-changed', handleDataChanged);
    return () => window.removeEventListener('truss:data-changed', handleDataChanged);
  }, [canViewAnalytics, fetchFinanceData]);

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');

  const filtreliAraclar = useMemo(
    () =>
      !isSingleVehicle
        ? araclar
        : araclar.filter((arac) => String(arac.arac_id) === String(seciliAracId)),
    [araclar, isSingleVehicle, seciliAracId]
  );

  const selectedVehicle = isSingleVehicle ? filtreliAraclar[0] || null : null;

  const handleSelectVehicle = useCallback(
    (arac) => {
      if (!arac?.arac_id) return;
      setSeciliAracId(String(arac.arac_id));
      navigate('/app/filo');
    },
    [setSeciliAracId, navigate]
  );

  const isFleetEmpty = hasLoaded && !loading && araclar.length === 0;

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

        {isSingleVehicle && !isFleetEmpty && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
            <span className="tabular-nums">
              Tek araç görünümü
              {selectedVehicle?.plaka
                ? ` · ${formatTurkishPlate(selectedVehicle.plaka)}`
                : ''}
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
                  onBudgetUpdated={fetchFinanceData}
                  className="lg:col-span-6"
                />
                <DocumentComplianceCard
                  araclar={filtreliAraclar}
                  loading={loading && !hasLoaded}
                  onSelectStatus={() => navigate('/app/filo')}
                  className="lg:col-span-6"
                />
              </div>
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
                onSelectStatus={() => navigate('/app/filo')}
              />
            </div>
          )}
        </>
      )}

      {canManage && (
        <VehicleSheet
          open={vehicleSheetOpen}
          onOpenChange={setVehicleSheetOpen}
          arac={null}
        />
      )}
    </div>
  );
}
