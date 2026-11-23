import React, { useMemo } from 'react';
import { EVRAK_UYARI_GUN } from '@/utils/aracDurum';
import { formatLocaleNumber } from '@/utils/formatters';
import SegmentedDistributionCard from '@/components/v2/SegmentedDistributionCard';

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const DOC_FIELDS = ['muayene_tarihi', 'sigorta_tarihi', 'kasko_tarihi'];

function parseLocalMidnight(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  const pureDate = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDate) {
    return new Date(Number(pureDate[1]), Number(pureDate[2]) - 1, Number(pureDate[3]));
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function DocumentComplianceCard({
  araclar = [],
  loading = false,
  activeStatus = null,
  onSelectStatus,
  className,
}) {
  const { totalDocs, segments } = useMemo(() => {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    const counts = {
      gecerli: 0,
      yaklasiyor: 0,
      suresi_dolmus: 0,
      eksik: 0,
    };

    araclar.forEach((arac) => {
      DOC_FIELDS.forEach((field) => {
        const hedef = parseLocalMidnight(arac?.[field]);
        if (!hedef) {
          counts.eksik += 1;
          return;
        }
        const gun = Math.ceil((hedef - bugun) / MILLISECONDS_IN_DAY);
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
      className={className}
    />
  );
}
