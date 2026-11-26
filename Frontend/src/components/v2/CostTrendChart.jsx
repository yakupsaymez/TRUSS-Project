import React from 'react';
import CostTrendChartView from '@/components/v2/cost-trend/CostTrendChartView';
import { useCostTrendController } from '@/components/v2/cost-trend/useCostTrendController';

export default function CostTrendChart({
  aylikTrend = [],
  aracMaliyet = [],
  seciliAracId = 'tum',
  loading = false,
  className,
}) {
  const {
    effectiveTab,
    isSingleVehicle,
    activeData,
    totals,
    hasVisibleSpend,
    handleTabChange,
  } = useCostTrendController({
    aylikTrend,
    aracMaliyet,
    seciliAracId,
  });

  return (
    <CostTrendChartView
      effectiveTab={effectiveTab}
      isSingleVehicle={isSingleVehicle}
      activeData={activeData}
      totals={totals}
      hasVisibleSpend={hasVisibleSpend}
      loading={loading}
      className={className}
      onTabChange={handleTabChange}
    />
  );
}
