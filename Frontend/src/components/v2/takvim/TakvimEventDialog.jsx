import React from 'react';
import { ClipboardPlus, ExternalLink, Pencil } from 'lucide-react';
import { formatTrDate, getComplianceUrgency } from '@/utils/complianceUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const URGENCY_CHIP = {
  gecikmis: 'border-destructive/40 bg-destructive/10 text-destructive',
  yaklasiyor: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
  guncel: 'border-primary/35 bg-primary/10 text-primary',
  eksik: 'border-border bg-muted text-muted-foreground',
};

export default function TakvimEventDialog({
  event,
  todayIso,
  canManage,
  onClose,
  onEditVehicle,
  onOpenWorkOrder,
  onOpenInFleet,
  onOpenInLedger,
}) {
  const isBakim = event?.type === 'bakim';
  const isArchived = Boolean(event?.isArchived);
  const canMutate = Boolean(canManage && !isArchived && !isBakim);

  const urgency = !event
    ? null
    : isBakim
      ? { badgeText: 'Tamamlandı', chipClass: 'border-border bg-muted text-foreground' }
      : (() => {
          const u = getComplianceUrgency(event.date, todayIso);
          return { badgeText: u.badgeText, chipClass: URGENCY_CHIP[u.status] || URGENCY_CHIP.eksik };
        })();

  return (
    <Dialog open={event !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 font-mono text-base tabular-nums">
            <span>{event?.plate}</span>
            {urgency && (
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 font-sans text-[11px] font-medium tabular-nums', urgency.chipClass)}>
                {urgency.badgeText}
              </span>
            )}
            {isArchived && (
              <Badge variant="outline" className="border-border bg-muted font-sans text-[11px] text-muted-foreground">
                Arşivli
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{event?.vehicleLabel || 'Takvim etkinliği'}</DialogDescription>
        </DialogHeader>

        {event && (
          <div className="space-y-3 rounded-lg border border-border bg-background/60 p-3.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Etkinlik Türü</span>
              <span className="font-medium text-foreground">
                {event.typeLabel}
                {event.subtitle ? ` · ${event.subtitle}` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Tarih</span>
              <span className="font-mono font-medium text-foreground tabular-nums">{formatTrDate(event.date)}</span>
            </div>
            {event.description ? (
              <div className="space-y-1 border-t border-border pt-2.5">
                <span className="text-xs text-muted-foreground">Açıklama</span>
                <p className="text-xs leading-relaxed text-foreground">{event.description}</p>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Kapat
          </Button>
          {isBakim && (
            <Button type="button" variant="outline" size="sm" onClick={onOpenInLedger} className="gap-1.5">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span>Hareketlere Git</span>
            </Button>
          )}
          <Button type="button" variant={canMutate ? 'outline' : 'default'} size="sm" onClick={onOpenInFleet} className="gap-1.5">
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span>Filoda Görüntüle</span>
          </Button>
          {canMutate && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => onEditVehicle(event)} className="gap-1.5">
                <Pencil className="size-3.5" aria-hidden="true" />
                <span>Aracı Düzenle</span>
              </Button>
              <Button type="button" size="sm" onClick={() => onOpenWorkOrder(event)} className="gap-1.5">
                <ClipboardPlus className="size-3.5" aria-hidden="true" />
                <span>İş Emri Aç</span>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
