import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { formatTurkishPlate } from '@/utils/formatters';
import { getGuncelSayac, hesaplaBakimDurumu, STATUS_PRIORITY } from '@/utils/complianceUtils';

export const HEALTH_STATUS_META = {
  tehlike: {
    label: 'Bakım Gecikti',
    badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive',
    strokeClass: 'stroke-destructive',
  },
  uyari: {
    label: 'Yaklaşıyor',
    badgeClass: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
    strokeClass: 'stroke-status-warning',
  },
  sorunsuz: {
    label: 'Sağlıklı',
    badgeClass: 'border-status-success/40 bg-status-success/10 text-status-success',
    strokeClass: 'stroke-primary',
  },
  bilinmiyor: {
    label: 'Kayıt Yok',
    badgeClass: 'border-border bg-muted text-muted-foreground',
    strokeClass: 'stroke-muted-foreground/40',
  },
};

export function useFleetHealthController(araclar = []) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'SYSTEM_ADMIN' || user?.role === 'FLEET_MANAGER';
  const { items, counts, avgHealth, measurableCount } = useMemo(() => {
    const statusCounts = { tehlike: 0, uyari: 0, sorunsuz: 0, bilinmiyor: 0 };
    let percentSum = 0;
    let measurable = 0;

    const mapped = araclar.map((arac) => {
      const bakim = hesaplaBakimDurumu(arac);
      const guncelSayac = getGuncelSayac(arac);
      const durum = HEALTH_STATUS_META[bakim.durum] ? bakim.durum : 'bilinmiyor';
      statusCounts[durum] += 1;

      let kalanYuzde = null;
      if (bakim.kalan !== null && bakim.periyot > 0) {
        kalanYuzde = Math.max(0, Math.min(100, Math.round((bakim.kalan / bakim.periyot) * 100)));
        percentSum += kalanYuzde;
        measurable += 1;
      }

      return { arac, bakim, durum, guncelSayac, kalanYuzde };
    });

    mapped.sort((a, b) => {
      const pDiff = STATUS_PRIORITY[a.durum] - STATUS_PRIORITY[b.durum];
      if (pDiff !== 0) return pDiff;
      const aPct = a.kalanYuzde ?? 999;
      const bPct = b.kalanYuzde ?? 999;
      if (aPct !== bPct) return aPct - bPct;
      return String(a.arac?.plaka || '').localeCompare(String(b.arac?.plaka || ''), 'tr');
    });

    return {
      items: mapped,
      counts: statusCounts,
      avgHealth: measurable > 0 ? Math.round(percentSum / measurable) : null,
      measurableCount: measurable,
    };
  }, [araclar]);

  const visibleItems = items.slice(0, 6);

  const overallStrokeClass =
    avgHealth === null
      ? 'stroke-muted-foreground/40'
      : avgHealth <= 20 || (counts.tehlike > 0 && avgHealth < 40)
        ? 'stroke-destructive'
        : avgHealth < 55 || counts.tehlike > 0
          ? 'stroke-status-warning'
          : 'stroke-primary';

  const handleCreateWorkOrder = useCallback((arac, durum) => {
    if (!canManage || !arac?.arac_id || arac.arsivlendi_mi === true) return;
    const plate = formatTurkishPlate(arac.plaka || '') || arac.plaka || '';
    const oncelik = durum === 'tehlike' ? 'kritik' : durum === 'uyari' ? 'yuksek' : 'normal';
    navigate('/app/is-emirleri', {
      state: {
        prefillWorkOrder: {
          arac_id: Number(arac.arac_id),
          kategori: 'periyodik_bakim',
          oncelik,
          baslik: plate ? `${plate} — Periyodik Bakım` : 'Periyodik Bakım',
        },
      },
    });
  }, [canManage, navigate]);

  return {
    items,
    visibleItems,
    counts,
    avgHealth,
    measurableCount,
    overallStrokeClass,
    totalCount: araclar.length,
    canManage,
    handleCreateWorkOrder,
  };
}
