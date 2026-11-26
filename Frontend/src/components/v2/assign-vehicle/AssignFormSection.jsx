import React from 'react';
import { AlertTriangle, Car, ClipboardCheck, User } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import { SheetField, SheetFormSection } from '@/components/v2/AppSheet';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';

export default function AssignFormSection({
  member = null,
  drivers = [],
  vehicles = [],
  activeAssigneeByVehicle,
  form,
  fieldErrors = {},
  isSubmitting = false,
  selectedVehicleOwner = null,
  isTransferringFromOtherDriver = false,
  isSameDriverAlreadyAssigned = false,
  includeInspection = false,
  onToggleInspection,
  onFieldChange,
  inspectionChildren = null,
}) {
  return (
    <SheetFormSection title="Zimmet Bilgileri">
      <SheetField label="Şoför" htmlFor="assign-driver-select" required error={fieldErrors.sofor_user_id}>
        {member ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                <User className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{member.ad_soyad}</p>
                {member.email && <p className="truncate text-xs text-muted-foreground">{member.email}</p>}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 text-[11px]">Şoför</Badge>
          </div>
        ) : drivers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/60 px-3.5 py-3 text-xs text-muted-foreground">
            Filonuzda Şoför rolünde aktif kullanıcı bulunmuyor.
          </p>
        ) : (
          <Select value={form.sofor_user_id} onValueChange={(v) => onFieldChange('sofor_user_id', v)} disabled={isSubmitting}>
            <SelectTrigger id="assign-driver-select" aria-invalid={Boolean(fieldErrors.sofor_user_id)}>
              <SelectValue placeholder="Şoför seçin..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {drivers.map((driver) => (
                  <SelectItem key={driver.user_id} value={String(driver.user_id)}>
                    {driver.ad_soyad}{driver.email ? ` (${driver.email})` : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </SheetField>

      <SheetField label="Araç" htmlFor="assign-vehicle-select" required error={fieldErrors.arac_id}>
        {vehicles.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/60 px-3.5 py-3 text-xs text-muted-foreground">
            Zimmetlenebilecek kayıtlı araç bulunmuyor.
          </p>
        ) : (
          <Select value={form.arac_id} onValueChange={(v) => onFieldChange('arac_id', v)} disabled={isSubmitting}>
            <SelectTrigger id="assign-vehicle-select" aria-invalid={Boolean(fieldErrors.arac_id)}>
              <SelectValue placeholder="Araç seçin..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {vehicles.map((v) => {
                  const plate = formatTurkishPlate(v.plaka || '') || v.plaka;
                  const desc = [v.marka, v.model].filter(Boolean).join(' ').trim();
                  const owner = activeAssigneeByVehicle?.get(String(v.arac_id));
                  return (
                    <SelectItem key={v.arac_id} value={String(v.arac_id)}>
                      <span className="font-mono tabular-nums">{plate}</span>
                      {desc ? ` · ${desc}` : ''}
                      {owner?.ad_soyad ? ` — ${owner.ad_soyad}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </SheetField>

      {isTransferringFromOtherDriver && (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-status-warning/40 bg-status-warning/10 px-3.5 py-3 text-xs text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden="true" />
          <p className="leading-relaxed">
            Bu araç şu an <span className="font-semibold">{selectedVehicleOwner.ad_soyad}</span> üzerinde zimmetli; onaylarsanız devredilecek.
          </p>
        </div>
      )}

      {isSameDriverAlreadyAssigned && (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/50 px-3.5 py-3 text-xs text-muted-foreground">
          <Car className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">
            Bu araç zaten seçili şoför üzerinde zimmetli; onaylarsanız zimmet tarihi güncellenecek.
          </p>
        </div>
      )}

      <SheetField
        label="Zimmet Tarihi"
        htmlFor="assign-date-picker"
        hint="Bugün veya geçmiş bir tarih seçilebilir."
        error={fieldErrors.atanma_tarihi}
      >
        <TrussDatePicker
          id="assign-date-picker"
          name="atanma_tarihi"
          value={form.atanma_tarihi}
          onChange={(e) => onFieldChange('atanma_tarihi', e?.target?.value ?? '')}
          disabled={isSubmitting}
        />
      </SheetField>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <ClipboardCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <Label htmlFor="assign-include-inspection" className="cursor-pointer text-xs font-medium text-foreground">
              Teslim Alma Muayenesi Ekle
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Atama sırasında başlangıç sayacı ve 8 kalem kontrol listesini kaydedin.
            </p>
          </div>
        </div>
        <Switch
          id="assign-include-inspection"
          checked={includeInspection}
          disabled={isSubmitting || !form.arac_id}
          onCheckedChange={onToggleInspection}
          aria-label="Teslim Alma Muayenesi Ekle"
        />
      </div>

      {includeInspection && inspectionChildren}
    </SheetFormSection>
  );
}
