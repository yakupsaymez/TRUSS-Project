import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import raporService from '@/services/raporService';
import { notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber } from '@/utils/formatters';

export const TR_MONTHS = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

export const BUDGET_CHART_CONFIG = {
  yakit_gerceklesen: { label: 'Yakıt Gerçekleşen', color: 'var(--chart-1)' },
  bakim_gerceklesen: { label: 'Bakım Gerçekleşen', color: 'var(--chart-3)' },
};

export function formatMonthShort(ayStr) {
  const match = String(ayStr || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return String(ayStr || '—');
  return TR_MONTHS[Number(match[2]) - 1] || String(ayStr);
}

export function formatMonthFull(ayStr) {
  const match = String(ayStr || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return String(ayStr || '—');
  const label = TR_MONTHS[Number(match[2]) - 1];
  return label ? `${label} ${match[1]}` : String(ayStr);
}

export function formatAxisCurrency(value) {
  const num = Number(value) || 0;
  if (num === 0) return '0';
  if (Math.abs(num) >= 1_000_000) return `${formatLocaleNumber(num / 1_000_000, 1)} Mn`;
  if (Math.abs(num) >= 1_000) return `${formatLocaleNumber(num / 1_000, 1)} B`;
  return formatLocaleNumber(num, 0);
}

export function safeAmount(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function calcUsagePct(actual, target) {
  const a = safeAmount(actual);
  const t = safeAmount(target);
  if (t <= 0) return a > 0 ? 100 : 0;
  return Math.round((a / t) * 100);
}

export function resolveStatusTone(pct, isExceeded = false) {
  const n = Number(pct) || 0;
  if (isExceeded || n > 100) {
    return { badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive', barClass: 'bg-destructive', textClass: 'text-destructive' };
  }
  if (n >= 86) {
    return { badgeClass: 'border-status-warning/40 bg-status-warning/10 text-status-warning', barClass: 'bg-status-warning', textClass: 'text-status-warning' };
  }
  return { badgeClass: 'border-status-success/40 bg-status-success/10 text-status-success', barClass: 'bg-status-success', textClass: 'text-status-success' };
}

export default function useBudgetVariance({ butceData, canManage, onBudgetUpdated }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [yakitTargetInput, setYakitTargetInput] = useState('50000');
  const [bakimTargetInput, setBakimTargetInput] = useState('25000');
  const [saving, setSaving] = useState(false);

  const butce = butceData?.butce || {};
  const mevcutAy = butceData?.mevcut_ay || {};

  const aylikYakitButcesi = safeAmount(butce.aylik_yakit_butcesi ?? mevcutAy.yakit_butce ?? 50000);
  const aylikBakimButcesi = safeAmount(butce.aylik_bakim_butcesi ?? mevcutAy.bakim_butce ?? 25000);
  const toplamButce = safeAmount(butce.toplam_butce ?? mevcutAy.toplam_butce ?? aylikYakitButcesi + aylikBakimButcesi);

  const yakitGerceklesen = safeAmount(mevcutAy.yakit_gerceklesen);
  const bakimGerceklesen = safeAmount(mevcutAy.bakim_gerceklesen);
  const toplamGerceklesen = safeAmount(mevcutAy.toplam_gerceklesen) || yakitGerceklesen + bakimGerceklesen;

  const kullanimYuzdesi =
    mevcutAy.kullanim_yuzdesi !== undefined && mevcutAy.kullanim_yuzdesi !== null
      ? Number(mevcutAy.kullanim_yuzdesi) || 0
      : calcUsagePct(toplamGerceklesen, toplamButce);

  const yakitPct = calcUsagePct(yakitGerceklesen, aylikYakitButcesi);
  const bakimPct = calcUsagePct(bakimGerceklesen, aylikBakimButcesi);

  const isOverallExceeded =
    (toplamButce <= 0 && toplamGerceklesen > 0) ||
    mevcutAy.durum === 'ASIM' ||
    mevcutAy.asim === true ||
    butceData?.durum === 'ASIM' ||
    butceData?.asim === true ||
    kullanimYuzdesi > 100;
  const isYakitExceeded = (aylikYakitButcesi <= 0 && yakitGerceklesen > 0) || yakitPct > 100;
  const isBakimExceeded = (aylikBakimButcesi <= 0 && bakimGerceklesen > 0) || bakimPct > 100;

  const overallTone = resolveStatusTone(kullanimYuzdesi, isOverallExceeded);
  const yakitTone = resolveStatusTone(yakitPct, isYakitExceeded);
  const bakimTone = resolveStatusTone(bakimPct, isBakimExceeded);

  useEffect(() => {
    setYakitTargetInput(String(Math.round(aylikYakitButcesi)));
    setBakimTargetInput(String(Math.round(aylikBakimButcesi)));
  }, [aylikYakitButcesi, aylikBakimButcesi]);

  const handlePopoverOpenChange = (nextOpen) => {
    if (nextOpen) {
      setYakitTargetInput(String(Math.round(aylikYakitButcesi)));
      setBakimTargetInput(String(Math.round(aylikBakimButcesi)));
    }
    setPopoverOpen(nextOpen);
  };

  const seriesData = useMemo(() => {
    const rawList = Array.isArray(butceData?.aylik_serisi) ? butceData.aylik_serisi : [];
    return rawList.map((row) => {
      const yakit = safeAmount(row?.yakit_gerceklesen);
      const bakim = safeAmount(row?.bakim_gerceklesen);
      const toplam = safeAmount(row?.toplam_gerceklesen) || yakit + bakim;
      const butceRow = safeAmount(row?.toplam_butce) || toplamButce;
      const yuzde =
        row?.kullanim_yuzdesi !== undefined && row?.kullanim_yuzdesi !== null
          ? Number(row.kullanim_yuzdesi) || 0
          : calcUsagePct(toplam, butceRow);
      return {
        label: formatMonthShort(row?.ay),
        tooltipTitle: formatMonthFull(row?.ay),
        yakit_gerceklesen: yakit,
        bakim_gerceklesen: bakim,
        toplam_gerceklesen: toplam,
        toplam_butce: butceRow,
        kullanim_yuzdesi: yuzde,
      };
    });
  }, [butceData?.aylik_serisi, toplamButce]);

  const hasChartData = useMemo(
    () => seriesData.length > 0 && (toplamButce > 0 || seriesData.some((item) => item.toplam_gerceklesen > 0)),
    [seriesData, toplamButce]
  );

  const handleSaveTargets = async (event) => {
    event.preventDefault();
    if (!canManage || saving) return;

    const yakitNum = Number(yakitTargetInput);
    const bakimNum = Number(bakimTargetInput);
    if (
      !Number.isFinite(yakitNum) || yakitNum < 0 || yakitNum > 100_000_000 ||
      !Number.isFinite(bakimNum) || bakimNum < 0 || bakimNum > 100_000_000
    ) {
      toast.error('Bütçe hedefleri 0 ile 100.000.000 ₺ arasında olmalıdır.');
      return;
    }

    setSaving(true);
    try {
      await raporService.updateButceHedefi({
        aylik_yakit_butcesi: yakitNum,
        aylik_bakim_butcesi: bakimNum,
      });
      toast.success('Bütçe hedefleri güncellendi.');
      setPopoverOpen(false);
      onBudgetUpdated?.();
    } catch (err) {
      notifyApiError(err, 'Bütçe hedefleri güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return {
    aylikYakitButcesi, aylikBakimButcesi, toplamButce,
    yakitGerceklesen, bakimGerceklesen, toplamGerceklesen,
    kullanimYuzdesi, yakitPct, bakimPct,
    isYakitExceeded, isBakimExceeded,
    overallTone, yakitTone, bakimTone,
    seriesData, hasChartData,
    popoverOpen, setPopoverOpen, handlePopoverOpenChange,
    yakitTargetInput, setYakitTargetInput,
    bakimTargetInput, setBakimTargetInput,
    saving, handleSaveTargets,
  };
}
