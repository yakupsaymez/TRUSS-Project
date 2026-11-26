import { useCallback, useMemo, useState } from 'react';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';

const TR_MONTHS = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

export const COST_CHART_CONFIG = {
  toplam_yakit: {
    label: 'Yakıt',
    color: 'var(--chart-1)',
  },
  toplam_bakim: {
    label: 'Bakım',
    color: 'var(--chart-3)',
  },
};

export function formatMonthShort(ayStr) {
  const match = String(ayStr || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return String(ayStr || '—');
  const monthIdx = Number(match[2]) - 1;
  return TR_MONTHS[monthIdx] || String(ayStr);
}

export function formatMonthFull(ayStr) {
  const match = String(ayStr || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return String(ayStr || '—');
  const monthIdx = Number(match[2]) - 1;
  const label = TR_MONTHS[monthIdx];
  return label ? `${label} ${match[1]}` : String(ayStr);
}

export function formatAxisCurrency(value) {
  const num = Number(value) || 0;
  if (num === 0) return '0';
  if (Math.abs(num) >= 1_000_000) {
    return `${formatLocaleNumber(num / 1_000_000, 1)} Mn`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${formatLocaleNumber(num / 1_000, 1)} B`;
  }
  return formatLocaleNumber(num, 0);
}

export function safeAmount(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function computeShare(value, rowTotal) {
  const numValue = safeAmount(value);
  const total = safeAmount(rowTotal);
  return total > 0 ? Math.round((numValue / total) * 100) : 0;
}

export function useCostTrendController({
  aylikTrend = [],
  aracMaliyet = [],
  seciliAracId = 'tum',
}) {
  const [activeTab, setActiveTab] = useState('aylik');
  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');
  const effectiveTab = isSingleVehicle ? 'aylik' : activeTab;

  const handleTabChange = useCallback(
    (nextTab) => {
      if (isSingleVehicle) return;
      setActiveTab(nextTab);
    },
    [isSingleVehicle]
  );

  const monthlyData = useMemo(() => {
    const list = Array.isArray(aylikTrend) ? aylikTrend : [];
    return list.map((row) => {
      const yakit = safeAmount(row?.toplam_yakit);
      const bakim = safeAmount(row?.toplam_bakim);
      const toplam = safeAmount(row?.toplam_harcama) || yakit + bakim;
      return {
        label: formatMonthShort(row?.ay),
        tooltipTitle: formatMonthFull(row?.ay),
        toplam_yakit: yakit,
        toplam_bakim: bakim,
        toplam,
      };
    });
  }, [aylikTrend]);

  const vehicleData = useMemo(() => {
    const list = Array.isArray(aracMaliyet) ? aracMaliyet : [];
    const scoped = isSingleVehicle
      ? list.filter((row) => String(row?.arac_id) === String(seciliAracId))
      : [...list]
          .sort((a, b) => safeAmount(b?.toplam_maliyet) - safeAmount(a?.toplam_maliyet))
          .slice(0, 8);

    return scoped.map((row) => {
      const plate = formatTurkishPlate(row?.plaka || '') || String(row?.plaka || '—');
      const modelDesc = [row?.marka, row?.model].filter(Boolean).join(' ').trim();
      const yakit = safeAmount(row?.toplam_yakit);
      const bakim = safeAmount(row?.toplam_bakim);
      const toplam = safeAmount(row?.toplam_maliyet) || yakit + bakim;
      return {
        label: plate,
        tooltipTitle: modelDesc ? `${plate} · ${modelDesc}` : plate,
        toplam_yakit: yakit,
        toplam_bakim: bakim,
        toplam,
      };
    });
  }, [aracMaliyet, isSingleVehicle, seciliAracId]);

  const activeData = effectiveTab === 'aylik' ? monthlyData : vehicleData;

  const totals = useMemo(
    () =>
      activeData.reduce(
        (acc, item) => {
          acc.yakit += item.toplam_yakit;
          acc.bakim += item.toplam_bakim;
          acc.toplam += item.toplam;
          return acc;
        },
        { yakit: 0, bakim: 0, toplam: 0 }
      ),
    [activeData]
  );

  const hasVisibleSpend = activeData.length > 0 && totals.toplam > 0;

  return {
    effectiveTab,
    isSingleVehicle,
    activeData,
    totals,
    hasVisibleSpend,
    handleTabChange,
  };
}
