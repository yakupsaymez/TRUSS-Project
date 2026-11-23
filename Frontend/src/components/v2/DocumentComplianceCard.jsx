import React, { useMemo } from 'react';
import { EVRAK_UYARI_GUN, hesaplaKalanGun } from '@/utils/aracDurum';
import { formatLocaleNumber } from '@/utils/formatters';
import SegmentedDistributionCard from '@/components/v2/SegmentedDistributionCard';
import { cn } from '@/lib/utils';

const DOC_FIELDS = ['muayene_tarihi', 'sigorta_tarihi', 'kasko_tarihi'];

export default function DocumentComplianceCard({
  araclar = [],
  loading = false,
  activeStatus = null,
  onSelectStatus,
  className,
}) {
  const { totalDocs, segments } = useMemo(() => {
    const bugun = new Date();

    const counts = {
      gecerli: 0,
      yaklasiyor: 0,
      suresi_dolmus: 0,
      eksik: 0,
    };

    araclar.forEach((arac) => {
      DOC_FIELDS.forEach((field) => {
        const gun = hesaplaKalanGun(arac?.[field], bugun);
        if (gun === null) {
          counts.eksik += 1;
          return;
        }
        if (gun < 0) {
          counts.suresi_dolmus += 1;
        } else if (gun <= EVRAK_UYARI_GUN) {
          counts.yaklasiyor += 1;
        } else {
          counts.gecerli += 1;
        }
      });
    });

    const total =
      counts.gecerli + counts.yaklasiyor + counts.suresi_dolmus + counts.eksik;

    return {
      totalDocs: total,
      segments: [
        {
          key: 'gecerli',
          label: 'Geçerli',
          count: counts.gecerli,
          barClass: 'bg-status-success',
          dotClass: 'bg-status-success',
        },
        {
          key: 'yaklasiyor',
          label: `Yaklaşıyor (≤${EVRAK_UYARI_GUN}g)`,
          count: counts.yaklasiyor,
          barClass: 'bg-status-warning',
          dotClass: 'bg-status-warning',
        },
        {
          key: 'suresi_dolmus',
          label: 'Süresi Dolmuş',
          count: counts.suresi_dolmus,
          barClass: 'bg-destructive',
          dotClass: 'bg-destructive',
        },
        {
          key: 'eksik',
          label: 'Eksik',
          count: counts.eksik,
          barClass: 'bg-muted-foreground/40',
          dotClass: 'bg-muted-foreground/40',
        },
      ],
    };
  }, [araclar]);

  return (
    <SegmentedDistributionCard
      title="Belge Uyum Durumu"
      description="Muayene, trafik sigortası ve kasko poliçelerinin vade dağılımı"
      totalValue={formatLocaleNumber(totalDocs, 0)}
      totalLabel={`belge (${formatLocaleNumber(araclar.length, 0)} araç)`}
      segments={segments}
      activeKey={activeStatus}
      onSelectSegment={onSelectStatus}
      loading={loading}
      emptyText="Henüz kayıtlı araç olmadığı için belge uyum dağılımı hesaplanamadı."
      className={cn('h-full', className)}
    />
  );
}
