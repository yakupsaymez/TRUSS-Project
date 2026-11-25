import React, { useEffect, useState } from 'react';
import { Archive, Loader2 } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MAX_REASON_LEN = 240;

export default function VehicleArchiveDialog({
  open,
  onOpenChange,
  arac,
  loading = false,
  onConfirm,
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [open, arac?.arac_id]);

  const handleOpenChange = (nextOpen) => {
    if (loading && !nextOpen) return;
    onOpenChange?.(nextOpen);
  };

  const preventWhileLoading = (event) => {
    if (loading) event.preventDefault();
  };

  const plate = arac?.plaka ? formatTurkishPlate(arac.plaka) : '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!loading}
        onPointerDownOutside={preventWhileLoading}
        onInteractOutside={preventWhileLoading}
        onEscapeKeyDown={preventWhileLoading}
        className="border border-border bg-card sm:max-w-md [&>[data-slot=dialog-close]>svg]:size-4"
      >
        <DialogHeader className="items-center gap-3 text-center">
          <Avatar className="size-12 border border-destructive/30 bg-destructive/10 p-2">
            <AvatarFallback className="bg-transparent">
              <Archive className="size-5 text-destructive" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1.5 text-center">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Aracı arşivle veya sil?
            </DialogTitle>
            <DialogDescription className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
              {plate ? (
                <span className="font-mono font-semibold text-foreground tabular-nums">{plate}</span>
              ) : (
                'Bu'
              )}{' '}
              plakalı araçta geçmiş yakıt, bakım veya maliyetli parça kaydı varsa tüm veriler ve
              maliyet geçmişi korunarak <strong className="text-foreground">arşivlenir</strong>{' '}
              (aktif zimmetler kapatılır). Geçmiş kaydı yoksa araç{' '}
              <strong className="text-destructive">kalıcı olarak silinir</strong>.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="arsiv-nedeni-input" className="text-xs font-medium text-foreground">
              Arşiv Nedeni (Opsiyonel)
            </Label>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {reason.length}/{MAX_REASON_LEN}
            </span>
          </div>
          <Textarea
            id="arsiv-nedeni-input"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LEN))}
            maxLength={MAX_REASON_LEN}
            rows={3}
            disabled={loading}
            placeholder="Örn: Filo yenileme nedeniyle satışa ayrıldı (kalıcı silmede yok sayılır)"
            className="text-xs"
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm?.(reason.trim() || null)}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            <span>Arşivle / Sil</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
