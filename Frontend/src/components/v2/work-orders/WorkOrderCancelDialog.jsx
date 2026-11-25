import React, { useEffect, useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function WorkOrderCancelDialog({ record, submitting = false, onOpenChange, onConfirm }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (record) setReason('');
  }, [record]);

  const handleOpenChange = (nextOpen) => {
    if (submitting && !nextOpen) return;
    if (!nextOpen) onOpenChange?.(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!record || submitting) return;
    const trimmed = reason.trim();
    onConfirm(record.is_emri_id, trimmed ? { red_iptal_nedeni: trimmed } : {});
  };

  return (
    <Dialog open={Boolean(record)} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!submitting}
        onPointerDownOutside={(e) => submitting && e.preventDefault()}
        onInteractOutside={(e) => submitting && e.preventDefault()}
        onEscapeKeyDown={(e) => submitting && e.preventDefault()}
        className="border-border bg-card sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <TriangleAlert className="size-4 text-destructive" aria-hidden="true" />
            <span>İş Emrini İptal Et</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {record ? (
              <>
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {formatTurkishPlate(record.plaka || '')}
                </span>{' '}
                · {record.baslik} talebi kapatılacak. Bu işlem geri alınamaz.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wo-cancel-reason" className="text-xs font-medium text-foreground">
              İptal / Red Nedeni (Opsiyonel)
            </Label>
            <Textarea
              id="wo-cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={240}
              rows={3}
              placeholder="Örn: Sorun sahada çözüldü veya mükerrer talep"
              className="resize-none bg-background text-sm"
            />
            <p className="text-right font-mono text-[11px] text-muted-foreground tabular-nums">
              {reason.length}/240
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => handleOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              <span>İş Emrini İptal Et</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
