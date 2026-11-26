import React from 'react';
import { Car, CheckCircle2, Info, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTurkishPlate } from '@/utils/formatters';
import AppSheet, { SheetFormSection } from '@/components/v2/AppSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import HandoverChecklistFields from './HandoverChecklistFields';
import { formatIsoDateTr, MUAYENE_TIPI_LABELS } from './handoverConstants';
import useHandoverController from './useHandoverController';

export default function HandoverInspectionSheet({
  open,
  onOpenChange,
  assignment = null,
  arac = null,
  defaultTip = null,
  defaultCloseAssignment = false,
  onSuccess,
}) {
  const c = useHandoverController({
    open, onOpenChange, assignment, arac, defaultTip, defaultCloseAssignment, onSuccess,
  });

  const plate = formatTurkishPlate(c.detail?.plaka || arac?.plaka || '') || c.detail?.plaka || arac?.plaka;
  const activeInsp = c.existingInspection;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Zimmet Muayenesi"
      description="Araç teslim alma ve iade muayene kontrol listesini kaydedin."
      badge={plate || undefined}
      onSubmit={c.handleSubmit}
      submitLabel={c.kapatZimmet ? 'Muayeneyi Kaydet & Zimmeti Kapat' : 'Muayeneyi Kaydet'}
      isSubmitting={c.submitting}
      submitDisabled={c.loading || c.noActiveAssignment || c.isReadOnly || c.photoUploading}
      isDirty={c.isDirty}
      footer={c.isReadOnly || c.noActiveAssignment ? (
        <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>Kapat</Button>
      ) : undefined}
    >
      {c.loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : c.noActiveAssignment ? (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-4 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
          <span>Bu araç için aktif zimmet kaydı bulunamadı. Önce Ekip sayfasından araca şoför zimmetleyin.</span>
        </div>
      ) : c.detail ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <Car className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-mono font-semibold tabular-nums text-foreground">{plate}</span>
              <span className="truncate text-muted-foreground">{[c.detail.marka, c.detail.model].filter(Boolean).join(' ')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="font-medium text-foreground">{c.detail.sofor_ad_soyad}</span>
              <Badge variant={c.detail.aktif ? 'secondary' : 'outline'} className="text-[10px]">
                {c.detail.aktif ? 'Aktif' : 'Kapalı'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-muted/30 p-1" role="tablist" aria-label="Muayene tipi">
            {(['TESLIM_ALMA', 'TESLIM_ETME']).map((tip) => {
              const active = c.muayeneTipi === tip;
              const done = Boolean(tip === 'TESLIM_ALMA' ? c.detail.teslim_alma : c.detail.teslim_etme);
              return (
                <button
                  key={tip}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => c.handleTipChange(tip)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    active ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {done && <CheckCircle2 className="size-3.5 text-status-success" aria-hidden="true" />}
                  <span>{MUAYENE_TIPI_LABELS[tip]}</span>
                </button>
              );
            })}
          </div>

          {c.isReadOnly && activeInsp && (
            <div role="status" className="flex items-center justify-between gap-2 rounded-xl border border-status-success/30 bg-status-success/10 px-3.5 py-2.5 text-xs text-foreground">
              <span>Bu muayene {formatIsoDateTr(activeInsp.muayene_tarihi)} tarihinde kaydedilmiş (salt okunur).</span>
              {activeInsp.yapan_ad_soyad && <span className="text-muted-foreground">{activeInsp.yapan_ad_soyad}</span>}
            </div>
          )}

          <SheetFormSection title={`${MUAYENE_TIPI_LABELS[c.muayeneTipi]} Detayları`}>
            <HandoverChecklistFields
              idPrefix="sheet-handover"
              arac={c.detail}
              muayeneTarihi={c.isReadOnly ? String(activeInsp?.muayene_tarihi || '').slice(0, 10) : c.form.muayene_tarihi}
              onDateChange={(v) => c.setField('muayene_tarihi', v)}
              dateError={c.errors.muayene_tarihi}
              sayacDegeri={c.isReadOnly ? String(activeInsp?.sayac_degeri ?? '') : c.form.sayac_degeri}
              onSayacChange={(v) => c.setField('sayac_degeri', v)}
              sayacFieldError={c.sayacFieldError}
              sayacLocalError={c.errors.sayac_degeri}
              checklist={c.isReadOnly ? activeInsp : c.form.checklist}
              onChecklistChange={c.handleChecklistChange}
              genelSonuc={c.isReadOnly ? activeInsp?.genel_sonuc : c.form.genel_sonuc}
              onGenelSonucChange={(v) => c.setField('genel_sonuc', v)}
              notlar={c.isReadOnly ? (activeInsp?.notlar || '') : c.form.notlar}
              onNotlarChange={(v) => c.setField('notlar', v)}
              photoItems={c.photoItems}
              photoUploading={c.photoUploading}
              photoError={c.photoError}
              readOnly={c.isReadOnly}
              disabled={c.submitting}
              onSelectPhoto={c.handleSelectPhoto}
              onRemovePhoto={c.handleRemovePhoto}
              onOpenPhoto={c.handleOpenPhoto}
            />
          </SheetFormSection>

          {c.canCloseAssignment && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs">
              <Checkbox
                checked={c.kapatZimmet}
                disabled={c.submitting}
                onCheckedChange={(checked) => c.setKapatZimmet(Boolean(checked))}
              />
              <span className="font-medium text-foreground">
                Muayene ile birlikte aktif zimmeti kapat (iade tamamlandı)
              </span>
            </label>
          )}
        </>
      ) : null}
    </AppSheet>
  );
}
