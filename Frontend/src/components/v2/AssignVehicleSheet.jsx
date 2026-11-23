import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Car, Loader2, Unlink, User } from 'lucide-react';
import adminService from '@/services/adminService';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { getTodayIso } from '@/utils/dateUtils';
import { formatTurkishPlate } from '@/utils/formatters';
import AppSheet, {
  SheetField,
  SheetFormSection,
} from '@/components/v2/AppSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';

function buildInitialForm(member) {
  return {
    sofor_user_id: member?.user_id != null ? String(member.user_id) : '',
    arac_id: '',
    atanma_tarihi: getTodayIso(),
  };
}

function formatTrDate(isoLike) {
  if (!isoLike) return null;
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function AssignVehicleSheet({
  open,
  onOpenChange,
  member = null,
  drivers = [],
  vehicles = [],
  users = [],
  onSuccess,
}) {
  const [form, setForm] = useState(() => buildInitialForm(member));
  const [initialSnapshot, setInitialSnapshot] = useState(() => buildInitialForm(member));
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unassigningVehicleId, setUnassigningVehicleId] = useState(null);

  useEffect(() => {
    if (!open) return;
    const next = buildInitialForm(member);
    setForm(next);
    setInitialSnapshot(next);
    setFieldErrors({});
    setUnassigningVehicleId(null);
  }, [open, member]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialSnapshot),
    [form, initialSnapshot]
  );

  // Mevcut aktif zimmet haritası: arac_id -> kullanıcı (devir uyarısı için)
  const activeAssigneeByVehicle = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const list = Array.isArray(u?.zimmetli_araclar) ? u.zimmetli_araclar : [];
      list.forEach((z) => {
        if (z?.arac_id != null) {
          map.set(String(z.arac_id), u);
        }
      });
    });
    return map;
  }, [users]);

  const selectedDriver = useMemo(() => {
    if (member) {
      const fresh = users.find((u) => String(u.user_id) === String(member.user_id));
      return fresh || member;
    }
    if (!form.sofor_user_id) return null;
    return drivers.find((d) => String(d.user_id) === String(form.sofor_user_id)) || null;
  }, [member, users, drivers, form.sofor_user_id]);

  const selectedVehicleOwner = useMemo(() => {
    if (!form.arac_id) return null;
    return activeAssigneeByVehicle.get(String(form.arac_id)) || null;
  }, [form.arac_id, activeAssigneeByVehicle]);

  const isTransferringFromOtherDriver = Boolean(
    selectedVehicleOwner &&
      form.sofor_user_id &&
      String(selectedVehicleOwner.user_id) !== String(form.sofor_user_id)
  );

  const isSameDriverAlreadyAssigned = Boolean(
    selectedVehicleOwner &&
      form.sofor_user_id &&
      String(selectedVehicleOwner.user_id) === String(form.sofor_user_id)
  );

  const selectedDriverVehicles = Array.isArray(selectedDriver?.zimmetli_araclar)
    ? selectedDriver.zimmetli_araclar
    : [];

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleUnassignVehicle = async (aracId) => {
    if (aracId == null || isSubmitting || unassigningVehicleId != null) return;
    setUnassigningVehicleId(String(aracId));
    try {
      await adminService.unassignVehicle(aracId);
      toast.success('Araç zimmeti kaldırıldı.');
      await onSuccess?.();
    } catch (err) {
      notifyApiError(err, 'Araç zimmeti kaldırılamadı.');
      if ([404, 409].includes(getErrorStatus(err))) {
        await onSuccess?.();
      }
    } finally {
      setUnassigningVehicleId(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const errors = {};
    const today = getTodayIso();

    if (!form.sofor_user_id) {
      errors.sofor_user_id = 'Lütfen bir şoför seçin.';
    }
    if (!form.arac_id) {
      errors.arac_id = 'Lütfen zimmetlenecek aracı seçin.';
    }
    if (form.atanma_tarihi && form.atanma_tarihi > today) {
      errors.atanma_tarihi = 'İleri tarihli zimmet girilemez.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const payload = {
        sofor_user_id: Number(form.sofor_user_id),
        arac_id: Number(form.arac_id),
        ...(form.atanma_tarihi ? { atanma_tarihi: form.atanma_tarihi } : {}),
      };

      await adminService.assignVehicle(payload);
      toast.success('Araç şoföre başarıyla zimmetlendi.');
      await onSuccess?.();
      onOpenChange?.(false);
    } catch (err) {
      const status = getErrorStatus(err);
      if (status === 422) {
        setFieldErrors((prev) => ({
          ...prev,
          sofor_user_id:
            err?.response?.data?.message ||
            'Araç yalnızca Şoför rolündeki kullanıcılara zimmetlenebilir.',
        }));
      } else if (status === 409) {
        notifyApiError(err, 'Araç eşzamanlı olarak zimmetlendi, liste yenilendi.');
        await onSuccess?.();
      } else {
        notifyApiError(err, 'Araç zimmetlenemedi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Araç Zimmetle"
      description="Şoför rolündeki ekip üyesine aktif araç zimmeti oluşturun veya mevcut zimmeti devredin."
      onSubmit={handleSubmit}
      submitLabel="Aracı Zimmetle"
      isSubmitting={isSubmitting}
      isDirty={isDirty}
    >
      <SheetFormSection title="Zimmet Bilgileri">
        <SheetField
          label="Şoför"
          htmlFor="assign-driver-select"
          required
          error={fieldErrors.sofor_user_id}
        >
          {member ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                  <User className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {member.ad_soyad}
                  </p>
                  {member.email && (
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-[11px]">
                Şoför
              </Badge>
            </div>
          ) : drivers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/60 px-3.5 py-3 text-xs text-muted-foreground">
              Filonuzda Şoför rolünde aktif kullanıcı bulunmuyor.
            </p>
          ) : (
            <Select
              value={form.sofor_user_id}
              onValueChange={(value) => handleFieldChange('sofor_user_id', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="assign-driver-select"
                aria-invalid={Boolean(fieldErrors.sofor_user_id)}
              >
                <SelectValue placeholder="Şoför seçin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.user_id} value={String(driver.user_id)}>
                      {driver.ad_soyad}
                      {driver.email ? ` (${driver.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </SheetField>

        <SheetField
          label="Araç"
          htmlFor="assign-vehicle-select"
          required
          error={fieldErrors.arac_id}
        >
          {vehicles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/60 px-3.5 py-3 text-xs text-muted-foreground">
              Zimmetlenebilecek kayıtlı araç bulunmuyor.
            </p>
          ) : (
            <Select
              value={form.arac_id}
              onValueChange={(value) => handleFieldChange('arac_id', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="assign-vehicle-select"
                aria-invalid={Boolean(fieldErrors.arac_id)}
              >
                <SelectValue placeholder="Araç seçin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {vehicles.map((v) => {
                    const plate = formatTurkishPlate(v.plaka || '') || v.plaka;
                    const desc = [v.marka, v.model].filter(Boolean).join(' ').trim();
                    const owner = activeAssigneeByVehicle.get(String(v.arac_id));
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
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-status-warning/40 bg-status-warning/10 px-3.5 py-3 text-xs text-foreground"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-status-warning"
              aria-hidden="true"
            />
            <p className="leading-relaxed">
              Bu araç şu an <span className="font-semibold">{selectedVehicleOwner.ad_soyad}</span>{' '}
              üzerinde zimmetli; onaylarsanız devredilecek.
            </p>
          </div>
        )}

        {isSameDriverAlreadyAssigned && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/50 px-3.5 py-3 text-xs text-muted-foreground"
          >
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
            onChange={(e) => handleFieldChange('atanma_tarihi', e?.target?.value ?? '')}
            disabled={isSubmitting}
          />
        </SheetField>
      </SheetFormSection>

      {/* Seçili Şoförün Mevcut Aktif Zimmetleri */}
      {selectedDriver && (
        <SheetFormSection
          title="Mevcut Aktif Zimmetler"
          description={`${selectedDriver.ad_soyad} üzerindeki aktif araç kayıtları`}
        >
          {selectedDriverVehicles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/60 px-3.5 py-3 text-xs text-muted-foreground">
              Bu şoför üzerinde aktif zimmetli araç bulunmuyor.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDriverVehicles.map((z, idx) => {
                const plate = formatTurkishPlate(z?.plaka || '') || z?.plaka || '—';
                const modelDesc = [z?.marka, z?.model].filter(Boolean).join(' ').trim();
                const assignedDate = formatTrDate(z?.atanma_tarihi);
                const isUnassigning =
                  z?.arac_id != null && String(unassigningVehicleId) === String(z.arac_id);

                return (
                  <div
                    key={z?.atama_id || z?.arac_id || `${plate}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/60 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 font-mono text-[11px] tabular-nums"
                      >
                        <Car className="size-3 text-muted-foreground" aria-hidden="true" />
                        <span>{plate}</span>
                      </Badge>
                      {modelDesc && (
                        <span className="truncate text-xs text-muted-foreground">{modelDesc}</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {assignedDate && (
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {assignedDate}
                        </span>
                      )}
                      {z?.arac_id != null && (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={isSubmitting || unassigningVehicleId != null}
                          onClick={() => handleUnassignVehicle(z.arac_id)}
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
                );
              })}
            </div>
          )}
        </SheetFormSection>
      )}
    </AppSheet>
  );
}
