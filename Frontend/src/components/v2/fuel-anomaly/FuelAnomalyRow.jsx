import React, { useState } from 'react';
import { Check, EyeOff } from 'lucide-react';
import { isSmhArac } from '@/utils/aracDurum';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TIP_LABELS = {
  depo_asimi: 'Depo Aşımı',
  ardisik_dolum: 'Ardışık Dolum',
  birim_fiyat_sapma: 'Birim Fiyat Sapması',
  yuksek_tuketim: 'Yüksek Tüketim',
};

const SEVIYE_STYLE = {
  kritik: {
    label: 'Kritik',
    badge: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  uyari: {
    label: 'Uyarı',
    badge: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
  },
};

export function resolveAnomalyUnit(item) {
  switch (item?.tip) {
    case 'depo_asimi':
      return 'L';
    case 'ardisik_dolum':
      return isSmhArac(item) ? 'saat' : 'km';
    case 'birim_fiyat_sapma':
      return '₺/L';
    case 'yuksek_tuketim':
      return isSmhArac(item) ? 'L/saat' : 'L/100km';
    default:
      return '';
  }
}

function formatAnomalyDate(raw) {
  if (!raw) return '—';
  const str = String(raw).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export default function FuelAnomalyRow({
  item,
  canManage = false,
  submitting = false,
  onResolve,
}) {
  const [note, setNote] = useState('');

  const seviye = SEVIYE_STYLE[item?.seviye] || SEVIYE_STYLE.uyari;
  const tipLabel = TIP_LABELS[item?.tip] || item?.tip || 'Anomali';
  const birim = resolveAnomalyUnit(item);
  const tarihText = formatAnomalyDate(item?.yakit_tarih || item?.olusturma_tarihi);

  const olculenNum = item?.olculen_deger !== null && item?.olculen_deger !== undefined
    ? formatLocaleNumber(item.olculen_deger, 2)
    : null;
  const esikNum = item?.beklenen_esik !== null && item?.beklenen_esik !== undefined
    ? formatLocaleNumber(item.beklenen_esik, 2)
    : null;

  const isOpen = item?.durum === 'acik';

  return (
    <div className="space-y-2 bg-card px-3.5 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn('h-5 px-1.5 text-[10px] font-medium', seviye.badge)}
            >
              {seviye.label}
            </Badge>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
              {tipLabel}
            </Badge>
            {item?.plaka && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground tabular-nums">
                {formatTurkishPlate(item.plaka)}
              </span>
            )}
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {tarihText}
            </span>
          </div>

          {item?.aciklama && (
            <p className="text-xs leading-relaxed text-foreground">{item.aciklama}</p>
          )}

          {(olculenNum || esikNum) && (
            <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {olculenNum ? `Ölçülen: ${olculenNum}${birim ? ` ${birim}` : ''}` : ''}
              {olculenNum && esikNum ? ' / ' : ''}
              {esikNum ? `Eşik: ${esikNum}${birim ? ` ${birim}` : ''}` : ''}
            </p>
          )}

          {!isOpen && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {item?.inceleyen_ad && (
                <span>
                  İnceleyen: <span className="font-medium text-foreground">{item.inceleyen_ad}</span>
                </span>
              )}
              {item?.inceleme_notu && (
                <span>• Not: {item.inceleme_notu}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {canManage && isOpen && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            disabled={submitting}
            placeholder="İnceleme notu (opsiyonel)..."
            aria-label="İnceleme notu"
            className="h-7 min-w-44 flex-1 text-xs"
          />
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => onResolve?.(item.anomali_id, 'incelendi', note)}
              className="h-7 gap-1 border-status-success/30 px-2.5 text-xs text-status-success hover:bg-status-success/10 hover:text-status-success"
            >
              <Check className="size-3.5" aria-hidden="true" />
              <span>İncelendi</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => onResolve?.(item.anomali_id, 'yoksayildi', note)}
              className="h-7 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <EyeOff className="size-3.5" aria-hidden="true" />
              <span>Yoksay</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
