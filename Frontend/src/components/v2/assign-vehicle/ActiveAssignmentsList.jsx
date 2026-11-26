import React from 'react';
import { Car, ClipboardCheck, Loader2, RotateCcw, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTurkishPlate } from '@/utils/formatters';
import { SheetFormSection } from '@/components/v2/AppSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatIsoDateTr, OVERALL_RESULT_META } from './handoverConstants';

export default function ActiveAssignmentsList({
  selectedDriver = null,
  assignments = [],
  loading = false,
  isSubmitting = false,
  unassigningVehicleId = null,
  onStartInspection,
  onUnassign,
}) {
  if (!selectedDriver) return null;

  return (
    <SheetFormSection
      title="Mevcut Aktif Zimmetler"
      description={`${selectedDriver.ad_soyad} üzerindeki aktif araç kayıtları ve teslim muayeneleri`}
    >
      {loading && assignments.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : assignments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-background/60 px-3.5 py-3 text-xs text-muted-foreground">
          Bu şoför üzerinde aktif zimmetli araç bulunmuyor.
        </p>
      ) : (
        <div className="space-y-2">
          {assignments.map((z, idx) => {
            const plate = formatTurkishPlate(z?.plaka || '') || z?.plaka || '—';
            const modelDesc = [z?.marka, z?.model].filter(Boolean).join(' ').trim();
            const assignedDate = formatIsoDateTr(z?.atanma_tarihi);
            const isUnassigning =
              z?.arac_id != null && String(unassigningVehicleId) === String(z.arac_id);
            const teslimAlmaMeta = z?.teslim_alma
              ? OVERALL_RESULT_META[z.teslim_alma.genel_sonuc] || OVERALL_RESULT_META.TEMIZ
              : null;
            const teslimEtmeMeta = z?.teslim_etme
              ? OVERALL_RESULT_META[z.teslim_etme.genel_sonuc] || OVERALL_RESULT_META.TEMIZ
              : null;

            return (
              <div
                key={z?.atama_id || z?.arac_id || `${plate}-${idx}`}
                className="space-y-2 rounded-xl border border-border bg-background/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline" className="shrink-0 gap-1 font-mono text-[11px] tabular-nums">
                      <Car className="size-3 text-muted-foreground" aria-hidden="true" />
                      <span>{plate}</span>
                    </Badge>
                    {modelDesc && <span className="truncate text-xs text-muted-foreground">{modelDesc}</span>}
                  </div>
                  {assignedDate && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">{assignedDate}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {teslimAlmaMeta ? (
                      <Badge variant="outline" className={cn('text-[10px]', teslimAlmaMeta.badgeClass)}>
                        Teslim Alma: {teslimAlmaMeta.label}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                        Teslim Alma Bekliyor
                      </Badge>
                    )}
                    {teslimEtmeMeta && (
                      <Badge variant="outline" className={cn('text-[10px]', teslimEtmeMeta.badgeClass)}>
                        Teslim Etme: {teslimEtmeMeta.label}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {z?.atama_id && !z?.teslim_alma && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isSubmitting || unassigningVehicleId != null}
                        onClick={() => onStartInspection?.(z, 'TESLIM_ALMA')}
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        <ClipboardCheck className="size-3" aria-hidden="true" />
                        <span>Teslim Al</span>
                      </Button>
                    )}

                    {z?.atama_id && !z?.teslim_etme && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isSubmitting || unassigningVehicleId != null}
                        onClick={() => onStartInspection?.(z, 'TESLIM_ETME')}
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        <RotateCcw className="size-3" aria-hidden="true" />
                        <span>İade Muayenesi</span>
                      </Button>
                    )}

                    {z?.arac_id != null && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isSubmitting || unassigningVehicleId != null}
                        onClick={() => onUnassign?.(z.arac_id)}
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        {isUnassigning ? (
                          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <Unlink className="size-3" aria-hidden="true" />
                        )}
                        <span>Zimmeti Kaldır</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SheetFormSection>
  );
}
