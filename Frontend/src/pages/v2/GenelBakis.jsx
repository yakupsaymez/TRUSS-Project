import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import raporService from '@/services/raporService';
import { canAccessChannel } from '@/pages/ChronoBeta/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { formatTurkishPlate } from '@/utils/formatters';
import OverviewKpiStrip from '@/components/v2/OverviewKpiStrip';
import CostTrendChart from '@/components/v2/CostTrendChart';
import DocumentComplianceCard from '@/components/v2/DocumentComplianceCard';
import { Button } from '@/components/ui/button';

export default function GenelBakis() {
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const canViewAnalytics = canAccessChannel(user, 'analytics');

  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const hasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [aylikTrend, setAylikTrend] = useState([]);
  const [aracMaliyet, setAracMaliyet] = useState([]);
  const [loadingFinance, setLoadingFinance] = useState(false);

  const vehicleFetchAttemptedRef = useRef(false);

  useEffect(() => {
    if (!hasLoaded && !loading && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [hasLoaded, loading, fetchAraclar]);

  // P0 RBAC: Finansal rapor istekleri YALNIZCA analytics yetkisi olan kullanıcılarda atılır
  useEffect(() => {
    if (!canViewAnalytics) {
      setAylikTrend([]);
      setAracMaliyet([]);
      setLoadingFinance(false);
      return;
    }

    let cancelled = false;
    setLoadingFinance(true);

    Promise.all([
      raporService.getAylikHarcamaTrendi(),
      raporService.getAracMaliyetDagilimi(),
    ])
      .then(([trendRes, maliyetRes]) => {
        if (cancelled) return;
        setAylikTrend(Array.isArray(trendRes) ? trendRes : []);
        setAracMaliyet(Array.isArray(maliyetRes) ? maliyetRes : []);
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

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');

  const filtreliAraclar = useMemo(
    () =>
      !isSingleVehicle
        ? araclar
        : araclar.filter((arac) => String(arac.arac_id) === String(seciliAracId)),
    [araclar, isSingleVehicle, seciliAracId]
  );

  const selectedVehicle = isSingleVehicle ? filtreliAraclar[0] || null : null;

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

        {isSingleVehicle && (
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

      <OverviewKpiStrip
        araclar={filtreliAraclar}
        seciliAracId={seciliAracId}
        canViewAnalytics={canViewAnalytics}
        aylikTrend={aylikTrend}
        aracMaliyet={aracMaliyet}
        loadingVehicles={loading && !hasLoaded}
        loadingFinance={loadingFinance}
      />

      {canViewAnalytics && (
        <CostTrendChart
          aylikTrend={aylikTrend}
          aracMaliyet={aracMaliyet}
          seciliAracId={seciliAracId}
          loading={loadingFinance}
        />
      )}

      <DocumentComplianceCard
        araclar={filtreliAraclar}
        loading={loading && !hasLoaded}
        onSelectStatus={() => navigate('/app/filo')}
      />
    </div>
  );
}
