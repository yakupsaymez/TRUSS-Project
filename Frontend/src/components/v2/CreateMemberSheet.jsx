import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import adminService from '@/services/adminService';
import { ROLES } from '@/components/v2/channelAccess';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { getTodayIso } from '@/utils/dateUtils';
import { formatTurkishPlate } from '@/utils/formatters';
import AppSheet, {
  SheetField,
  SheetFormGrid,
  SheetFormSection,
} from '@/components/v2/AppSheet';
import {
  INITIAL_PERMS,
  PERMISSION_DEFINITIONS,
  ROLE_META,
} from '@/components/v2/CrewDataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { cn } from '@/lib/utils';

const NO_VEHICLE_VALUE = '__none__';

function buildInitialForm() {
  return {
    ad_soyad: '',
    email: '',
    sifre: '',
    telefon: '',
    role: ROLES.DRIVER,
    yetkiler: { ...INITIAL_PERMS[ROLES.DRIVER] },
    arac_id: '',
    atanma_tarihi: getTodayIso(),
  };
}

function toWhitelistedPerms(raw) {
  return {
    yakit: Boolean(raw?.yakit),
    bakim: Boolean(raw?.bakim),
    finans: Boolean(raw?.finans),
  };
}

export default function CreateMemberSheet({
  open,
  onOpenChange,
  isSystemAdminViewer = false,
  vehicles = [],
  onSuccess,
}) {
  const [form, setForm] = useState(() => buildInitialForm());
  const [initialSnapshot, setInitialSnapshot] = useState(() => buildInitialForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = buildInitialForm();
    setForm(next);
    setInitialSnapshot(next);
    setFieldErrors({});
  }, [open]);

  const roleOptions = useMemo(
    () =>
      isSystemAdminViewer
        ? [ROLES.DRIVER, ROLES.FLEET_MANAGER, ROLES.SYSTEM_ADMIN]
        : [ROLES.DRIVER, ROLES.FLEET_MANAGER],
    [isSystemAdminViewer]
  );

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialSnapshot),
    [form, initialSnapshot]
  );

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const handleRoleChange = (nextRole) => {
    if (!nextRole) return;
    if (!isSystemAdminViewer && nextRole === ROLES.SYSTEM_ADMIN) return;

    setForm((prev) => ({
      ...prev,
      role: nextRole,
      yetkiler: { ...(INITIAL_PERMS[nextRole] || INITIAL_PERMS[ROLES.DRIVER]) },
      arac_id: nextRole === ROLES.DRIVER ? prev.arac_id : '',
    }));
    clearFieldError('role');
    if (nextRole !== ROLES.DRIVER) {
      clearFieldError('atanma_tarihi');
    }
  };

  const handleTogglePerm = (key, checked) => {
    setForm((prev) => ({
      ...prev,
      yetkiler: {
        ...prev.yetkiler,
        [key]: Boolean(checked),
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const errors = {};
    const trimmedName = form.ad_soyad.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.telefon.trim();
    const today = getTodayIso();

    if (trimmedName.length < 3) {
      errors.ad_soyad = 'Ad soyad en az 3 karakter olmalıdır.';
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Geçerli bir e-posta adresi girin.';
    }
    if (String(form.sifre).length < 6) {
      errors.sifre = 'Geçici şifre en az 6 karakter olmalıdır.';
    }
    if (trimmedPhone.length > 20) {
      errors.telefon = 'Telefon en fazla 20 karakter olabilir.';
    }
    if (!isSystemAdminViewer && form.role === ROLES.SYSTEM_ADMIN) {
      errors.role = 'Sistem Admini rolünü yalnızca Sistem Admini atayabilir.';
    }
    if (form.role === ROLES.DRIVER && form.arac_id && form.atanma_tarihi && form.atanma_tarihi > today) {
      errors.atanma_tarihi = 'İleri tarihli zimmet girilemez.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    // ADIM 1: Kullanıcı oluşturma (hata varsa kayıt oluşmamıştır, Sheet açık kalır)
    let newUserId = null;
    try {
      const created = await adminService.createDriver({
        ad_soyad: trimmedName,
        email: trimmedEmail,
        sifre: form.sifre,
        telefon: trimmedPhone,
      });
      newUserId = created?.user?.user_id ?? null;
    } catch (err) {
      if (getErrorStatus(err) === 409) {
        setFieldErrors((prev) => ({
          ...prev,
          email: err?.response?.data?.message || 'Bu e-posta adresi zaten kayıtlı.',
        }));
      } else {
        notifyApiError(err, 'Üye oluşturulamadı.');
      }
      setIsSubmitting(false);
      return;
    }

    // ADIM 2 & 3: Kullanıcı artık DB'de mevcut — kısmi-başarı koruması
    const adimHatalari = [];
    const detay = (err) => {
      const msg = err?.response?.data?.message;
      return getErrorStatus(err) === 403 || !msg ? '' : ` (${msg})`;
    };

    try {
      if (!newUserId) {
        adimHatalari.push(
          'Kullanıcı oluşturuldu ancak kimliği alınamadığından zimmet, rol ve yetkiler atanamadı — satırdan tekrar deneyebilirsiniz.'
        );
      } else {
        if (form.role === ROLES.DRIVER && form.arac_id) {
          try {
            await adminService.assignVehicle({
              sofor_user_id: Number(newUserId),
              arac_id: Number(form.arac_id),
              ...(form.atanma_tarihi ? { atanma_tarihi: form.atanma_tarihi } : {}),
            });
          } catch (err) {
            adimHatalari.push(
              `Kullanıcı oluşturuldu ancak araç zimmetlenemedi${detay(err)} — satırdan tekrar deneyebilirsiniz.`
            );
          }
        }

        let rolBasarili = true;
        if (form.role !== ROLES.DRIVER) {
          try {
            await adminService.updateUserRole(newUserId, form.role);
          } catch (err) {
            rolBasarili = false;
            adimHatalari.push(
              `Kullanıcı oluşturuldu ancak rol atanamadı (Şoför olarak kaldı)${detay(err)}; yetkiler de atanmadı — satırdan tekrar deneyebilirsiniz.`
            );
          }
        }

        if (rolBasarili) {
          try {
            await adminService.updateUserPermissions(newUserId, toWhitelistedPerms(form.yetkiler));
          } catch (err) {
            adimHatalari.push(
              `Kullanıcı oluşturuldu ancak yetkiler atanamadı${detay(err)} — satırdan tekrar deneyebilirsiniz.`
            );
          }
        }
      }

      if (adimHatalari.length === 0) {
        toast.success('Yeni ekip üyesi oluşturuldu ve yetkilendirildi.');
      } else {
        adimHatalari.forEach((mesaj, idx) =>
          toast.error(mesaj, { id: `crew-create-step-${idx}`, duration: 8000 })
        );
      }

      onOpenChange?.(false);
    } finally {
      await onSuccess?.();
      setIsSubmitting(false);
    }
  };

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni Ekip Üyesi"
      description="Organizasyona yeni üye ekleyin, başlangıç rolünü ve yetkilerini tanımlayın."
      onSubmit={handleSubmit}
      submitLabel="Üyeyi Oluştur"
      isSubmitting={isSubmitting}
      isDirty={isDirty}
    >
      {/* 1. Kimlik Bilgileri */}
      <SheetFormSection title="Kimlik Bilgileri">
        <SheetFormGrid>
          <SheetField
            label="Ad Soyad"
            htmlFor="create-member-name"
            required
            error={fieldErrors.ad_soyad}
          >
            <Input
              id="create-member-name"
              value={form.ad_soyad}
              onChange={(e) => handleChange('ad_soyad', e.target.value)}
              placeholder="Örn. Murat Demir"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.ad_soyad)}
            />
          </SheetField>

          <SheetField
            label="Telefon"
            htmlFor="create-member-phone"
            error={fieldErrors.telefon}
          >
            <Input
              id="create-member-phone"
              value={form.telefon}
              onChange={(e) => handleChange('telefon', e.target.value)}
              placeholder="05XX XXX XX XX"
              maxLength={20}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.telefon)}
              className="tabular-nums"
            />
          </SheetField>
        </SheetFormGrid>

        <SheetFormGrid>
          <SheetField
            label="E-Posta"
            htmlFor="create-member-email"
            required
            error={fieldErrors.email}
          >
            <Input
              id="create-member-email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="ornek@firma.com"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </SheetField>

          <SheetField
            label="Geçici Şifre"
            htmlFor="create-member-password"
            required
            hint="En az 6 karakter."
            error={fieldErrors.sifre}
          >
            <Input
              id="create-member-password"
              type="password"
              value={form.sifre}
              onChange={(e) => handleChange('sifre', e.target.value)}
              placeholder="••••••"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.sifre)}
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>

      {/* 2. Rol & Başlangıç Yetkileri */}
      <SheetFormSection
        title="Rol & Başlangıç Yetkileri"
        description="Rol seçimi başlangıç yetki şablonunu doldurur; anahtarları ayrıca düzenleyebilirsiniz."
      >
        <SheetField
          label="Rol"
          htmlFor="create-member-role"
          required
          error={fieldErrors.role}
        >
          <Select
            value={form.role}
            onValueChange={handleRoleChange}
            disabled={isSubmitting}
          >
            <SelectTrigger id="create-member-role" aria-invalid={Boolean(fieldErrors.role)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {roleOptions.map((roleKey) => {
                  const meta = ROLE_META[roleKey];
                  return (
                    <SelectItem key={roleKey} value={roleKey}>
                      {meta?.label || roleKey}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </SheetField>

        <Card className="gap-0 overflow-hidden border border-border bg-transparent py-0 shadow-none ring-0">
          <CardContent className="gap-0 divide-y divide-border p-0">
            {PERMISSION_DEFINITIONS.map((def) => {
              const switchId = `create-perm-${def.key}`;
              const isChecked = Boolean(form.yetkiler[def.key]);
              return (
                <div
                  key={def.key}
                  className={cn(
                    'flex items-center justify-between gap-4 px-3.5 py-2.5 transition-colors',
                    isChecked && 'bg-muted/25'
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <Label
                      htmlFor={switchId}
                      className="block cursor-pointer text-xs font-medium text-foreground"
                    >
                      {def.fullLabel}
                    </Label>
                    <p className="text-[11px] text-muted-foreground">{def.desc}</p>
                  </div>
                  <Switch
                    id={switchId}
                    checked={isChecked}
                    disabled={isSubmitting}
                    aria-label={def.fullLabel}
                    onCheckedChange={(checked) => handleTogglePerm(def.key, checked)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </SheetFormSection>

      {/* 3. Opsiyonel İlk Araç Zimmeti (Yalnızca DRIVER için) */}
      {form.role === ROLES.DRIVER && (
        <SheetFormSection
          title="İlk Araç Zimmeti (Opsiyonel)"
          description="Yalnızca Şoför rolündeki üyeye kayıt sırasında araç zimmetlenebilir."
        >
          <SheetFormGrid>
            <SheetField label="Zimmetlenecek Araç" htmlFor="create-member-vehicle">
              <Select
                value={form.arac_id || NO_VEHICLE_VALUE}
                onValueChange={(value) =>
                  handleChange('arac_id', value === NO_VEHICLE_VALUE ? '' : value)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="create-member-vehicle">
                  <SelectValue placeholder="Zimmetleme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={NO_VEHICLE_VALUE}>Zimmetleme</SelectItem>
                    {vehicles.map((v) => {
                      const plate = formatTurkishPlate(v.plaka || '') || v.plaka;
                      const desc = [v.marka, v.model].filter(Boolean).join(' ').trim();
                      return (
                        <SelectItem key={v.arac_id} value={String(v.arac_id)}>
                          <span className="font-mono tabular-nums">{plate}</span>
                          {desc ? ` · ${desc}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </SheetField>

            <SheetField
              label="Zimmet Tarihi"
              htmlFor="create-member-assign-date"
              error={fieldErrors.atanma_tarihi}
            >
              <TrussDatePicker
                id="create-member-assign-date"
                name="atanma_tarihi"
                value={form.atanma_tarihi}
                onChange={(e) => handleChange('atanma_tarihi', e?.target?.value ?? '')}
                disabled={isSubmitting || !form.arac_id}
              />
            </SheetField>
          </SheetFormGrid>
        </SheetFormSection>
      )}
    </AppSheet>
  );
}
