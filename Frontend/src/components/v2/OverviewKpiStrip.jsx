import React, { useMemo } from 'react';
import { AlertTriangle, FileWarning, Truck, Wallet } from 'lucide-react';
import { EVRAK_UYARI_GUN, isSmhArac, ozetleFilo } from '@/utils/aracDurum';
import { getTodayIso } from '@/utils/dateUtils';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function KpiSkeletonCard() {
  return (
    <Card className="gap-3 border border-border bg-card py-4 shadow-none">
      <CardHeader className="flex flex-row items-center gap-3 px-4 py-0">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <Skeleton className="h-7 w-24" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 px-4 py-0">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3.5 w-44" />
      </CardContent>
    </Card>
  );
}

function KpiCard({ icon, iconClass, value, valueClass, title, subtitle }) {
  return (
    <Card className="gap-3 border border-border bg-card py-4 shadow-none">
      <CardHeader className="flex flex-row items-center gap-3 px-4 py-0">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            iconClass || 'bg-primary/10 text-primary'
          )}
        >
          {icon}
        </div>
        <span
          className={cn(
            'truncate font-mono text-2xl font-bold tracking-tight tabular-nums text-foreground',
            valueClass
          )}
        >
          {value}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-4 py-0">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <p className="truncate text-xs tabular-nums text-muted-foreground" title={subtitle}>
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

export default function OverviewKpiStrip({
  araclar = [],
  seciliAracId = 'tum',
  canViewAnalytics = false,
  aylikTrend = [],
  aracMaliyet = [],
  loadingVehicles = false,
  loadingFinance = false,
  className,
}) {
  const { ozet, kmSayisi, smhSayisi } = useMemo(() => {
    const summary = ozetleFilo(araclar);
    let smh = 0;
    araclar.forEach((arac) => {
      if (isSmhArac(arac)) smh += 1;
    });
    return {
      ozet: summary,
      kmSayisi: araclar.length - smh,
      smhSayisi: smh,
    };
  }, [araclar]);

  const isAllVehicles = !seciliAracId || seciliAracId === 'tum';

  const financeCardData = useMemo(() => {
    if (!canViewAnalytics) return null;

    if (isAllVehicles) {
      const trendList = Array.isArray(aylikTrend) ? aylikTrend : [];
      const currentMonthKey = getTodayIso().slice(0, 7);
      const currentMonthRow =
        trendList.find((item) => String(item?.ay || '').startsWith(currentMonthKey)) ||
        (trendList.length > 0 ? trendList[trendList.length - 1] : null);

      const toplamHarcama = Number(currentMonthRow?.toplam_harcama || 0);
      const toplamYakit = Number(currentMonthRow?.toplam_yakit || 0);
      const toplamBakim = Number(currentMonthRow?.toplam_bakim || 0);

      return {
        title: 'Bu Ay Toplam Gider',
        value: formatCurrency(toplamHarcama, { maximumFractionDigits: 0 }),
        subtitle: `Yakıt ${formatCurrency(toplamYakit, { maximumFractionDigits: 0 })} · Bakım ${formatCurrency(toplamBakim, { maximumFractionDigits: 0 })}`,
      };
    }

    const costList = Array.isArray(aracMaliyet) ? aracMaliyet : [];
    const vehicleRow =
      costList.find((row) => String(row?.arac_id) === String(seciliAracId)) || null;

    const toplamMaliyet = Number(vehicleRow?.toplam_maliyet || 0);
    const toplamYakit = Number(vehicleRow?.toplam_yakit || 0);
    const toplamBakim = Number(vehicleRow?.toplam_bakim || 0);

    return {
      title: 'Seçili Araç Toplam Gideri',
      value: formatCurrency(toplamMaliyet, { maximumFractionDigits: 0 }),
      subtitle: `Yakıt ${formatCurrency(toplamYakit, { maximumFractionDigits: 0 })} · Bakım ${formatCurrency(toplamBakim, { maximumFractionDigits: 0 })}`,
    };
  }, [canViewAnalytics, isAllVehicles, aylikTrend, aracMaliyet, seciliAracId]);

  const maintenanceSubtitle = useMemo(() => {
    if (araclar.length === 0) {
      return 'Bakım durumu araç eklendiğinde hesaplanır';
    }
    if (ozet.uyari === 0 && ozet.bilinmiyor === 0) {
      return `${formatLocaleNumber(ozet.sorunsuz, 0)} araç sorunsuz`;
    }
    const parts = [];
    if (ozet.uyari > 0) {
      parts.push(`${formatLocaleNumber(ozet.uyari, 0)} yaklaşıyor`);
    }
    parts.push(`${formatLocaleNumber(ozet.sorunsuz, 0)} sorunsuz`);
    if (ozet.bilinmiyor > 0) {
      parts.push(`${formatLocaleNumber(ozet.bilinmiyor, 0)} kayıt yok`);
    }
    return parts.join(' · ');
  }, [araclar.length, ozet.uyari, ozet.sorunsuz, ozet.bilinmiyor]);

  const gridClass = cn(
    'grid gap-4',
    canViewAnalytics
      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-3',
    className
  );

  if (loadingVehicles) {
    const skeletonCount = canViewAnalytics ? 4 : 3;
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <KpiSkeletonCard key={`kpi-skeleton-${idx}`} />
        ))}
      </div>
    );
  }

  const activeVehicleSubtitle =
    araclar.length === 0
      ? 'Kayıtlı araç bulunmuyor'
      : `${formatLocaleNumber(kmSayisi, 0)} KM · ${formatLocaleNumber(smhSayisi, 0)} SMH`;

  let documentSubtitle = `Tüm belgeler ${formatLocaleNumber(EVRAK_UYARI_GUN, 0)} gün eşiğinin üzerinde`;
  let documentIconClass = 'bg-status-success/10 text-status-success';

  if (araclar.length === 0) {
    documentSubtitle = 'Muayene, sigorta ve kasko takibi';
  } else if (ozet.evrakSorunu > 0) {
    documentSubtitle = `≤ ${formatLocaleNumber(EVRAK_UYARI_GUN, 0)} gün veya süresi dolmuş evrak`;
    documentIconClass = 'bg-status-warning/15 text-status-warning';
  } else if (ozet.tanimliBelgeSayisi === 0) {
    documentSubtitle = `Hiç belge tarihi girilmedi (${formatLocaleNumber(ozet.eksikBelgeSayisi, 0)} eksik)`;
    documentIconClass = 'bg-muted text-muted-foreground';
  } else if (ozet.eksikBelgeSayisi > 0) {
    documentSubtitle = `Yaklaşan risk yok · ${formatLocaleNumber(ozet.eksikBelgeSayisi, 0)} belge tarihi eksik`;
    documentIconClass = 'bg-status-warning/15 text-status-warning';
  }

  return (
    <div className={gridClass}>
      <KpiCard
        icon={<Truck className="size-4.5" aria-hidden="true" />}
        iconClass="bg-primary/10 text-primary"
        value={formatLocaleNumber(araclar.length, 0)}
        title={isAllVehicles ? 'Aktif Araç' : 'Seçili Araç'}
        subtitle={activeVehicleSubtitle}
      />

      <KpiCard
        icon={<AlertTriangle className="size-4.5" aria-hidden="true" />}
        iconClass={
          ozet.tehlike > 0
            ? 'bg-destructive/10 text-destructive'
            : 'bg-status-success/10 text-status-success'
        }
        value={formatLocaleNumber(ozet.tehlike, 0)}
        valueClass={ozet.tehlike > 0 ? 'text-destructive' : undefined}
        title="Kritik Bakım"
        subtitle={maintenanceSubtitle}
      />

      <KpiCard
        icon={<FileWarning className="size-4.5" aria-hidden="true" />}
        iconClass={documentIconClass}
        value={formatLocaleNumber(ozet.evrakSorunu, 0)}
        valueClass={ozet.evrakSorunu > 0 ? 'text-status-warning' : undefined}
        title="Yaklaşan Belge"
        subtitle={documentSubtitle}
      />

      {canViewAnalytics &&
        (loadingFinance ? (
          <KpiSkeletonCard />
        ) : (
          <KpiCard
            icon={<Wallet className="size-4.5" aria-hidden="true" />}
            iconClass="bg-primary/10 text-primary"
            value={financeCardData?.value || formatCurrency(0)}
            title={financeCardData?.title || 'Bu Ay Toplam Gider'}
            subtitle={financeCardData?.subtitle || 'Yakıt 0 TL · Bakım 0 TL'}
          />
        ))}
    </div>
  );
}
