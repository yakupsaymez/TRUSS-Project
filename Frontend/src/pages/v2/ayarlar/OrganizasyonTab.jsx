import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, Building2, CalendarDays, Loader2, Save, Users } from 'lucide-react';
import adminService from '@/services/adminService';
import { notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TAX_NUMBER_RE, formatOrgDate } from './ayarlarConstants';

export default function OrganizasyonTab({
  isManager,
  user,
  orgMeta,
  setOrgMeta,
  orgUnvan,
  setOrgUnvan,
  orgVergiNo,
  setOrgVergiNo,
  pageMountedRef,
}) {
  const [orgErrors, setOrgErrors] = useState({});
  const [orgFormError, setOrgFormError] = useState('');
  const [savingOrganization, setSavingOrganization] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // P0 RBAC KİLİDİ: YALNIZCA SYSTEM_ADMIN & FLEET_MANAGER
  if (!isManager) return null;

  const clearOrgError = (key) => {
    if (orgErrors[key]) {
      setOrgErrors((prev) => ({ ...prev, [key]: '' }));
    }
    if (orgFormError) setOrgFormError('');
  };

  const handleSaveOrganization = async (e) => {
    e.preventDefault();
    if (!isManager || savingOrganization) return;

    const trimmedUnvan = orgUnvan.trim();
    const trimmedVergiNo = orgVergiNo.trim();
    const errors = {};

    if (!trimmedUnvan) {
      errors.unvan = 'Organizasyon ünvanı gereklidir.';
    } else if (trimmedUnvan.length < 2) {
      errors.unvan = 'Organizasyon ünvanı en az 2 karakter olmalıdır.';
    } else if (trimmedUnvan.length > 200) {
      errors.unvan = 'Organizasyon ünvanı en fazla 200 karakter olabilir.';
    }

    if (trimmedVergiNo && !TAX_NUMBER_RE.test(trimmedVergiNo)) {
      errors.vergi_no = 'Vergi numarası yalnızca 10 veya 11 haneli rakam olmalıdır.';
    }

    if (Object.keys(errors).length > 0) {
      setOrgErrors(errors);
      return;
    }

    setOrgErrors({});
    setOrgFormError('');
    setSavingOrganization(true);
    try {
      const res = await adminService.updateOrganization({
        unvan: trimmedUnvan,
        vergi_no: trimmedVergiNo || null,
      });
      if (pageMountedRef?.current !== false) {
        const updatedOrg = res?.organization || null;
        if (updatedOrg) {
          setOrgMeta((prev) => ({
            ...(prev || {}),
            ...updatedOrg,
          }));
          setOrgUnvan(updatedOrg.unvan || trimmedUnvan);
          setOrgVergiNo(updatedOrg.vergi_no || '');
        }
      }
      if (!mountedRef.current) return;
      toast.success('Organizasyon profili güncellendi.');
    } catch (err) {
      if (!mountedRef.current) return;
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || 'Organizasyon profili güncellenemedi.';
      if (status === 409 || code === 'TAX_NUMBER_EXISTS') {
        setOrgErrors((prev) => ({ ...prev, vergi_no: msg }));
        return;
      }
      setOrgFormError(msg);
      notifyApiError(err, 'Organizasyon profili güncellenemedi.');
    } finally {
      if (mountedRef.current) setSavingOrganization(false);
    }
  };

  return (
    <form onSubmit={handleSaveOrganization} noValidate className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Organizasyon Profili</h2>
        <p className="text-xs text-muted-foreground">
          Kurumsal filo organizasyon ünvanı, vergi numarası ve çalışma alanı özeti.
        </p>
      </div>

      <Separator />

      {/* 3'lü Salt-Okunur Kurumsal Özet Şeridi */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-start justify-between gap-2.5 rounded-xl border border-border bg-background/60 p-4">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Plan & Durum</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="border-primary/40 bg-primary/10 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary"
              >
                {orgMeta?.plan_tipi || 'ENTERPRISE'}
              </Badge>
              <Badge
                variant={orgMeta?.aktif !== false ? 'secondary' : 'outline'}
                className="text-[11px]"
              >
                {orgMeta?.aktif !== false ? 'Aktif' : 'Pasif'}
              </Badge>
            </div>
          </div>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-4" aria-hidden="true" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-2.5 rounded-xl border border-border bg-background/60 p-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Kayıtlı Ekip & Filo</p>
            <p className="truncate font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatLocaleNumber(Number(orgMeta?.uye_sayisi || 0), 0)} üye ·{' '}
              {formatLocaleNumber(Number(orgMeta?.arac_sayisi || 0), 0)} araç
            </p>
          </div>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-4" aria-hidden="true" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-2.5 rounded-xl border border-border bg-background/60 p-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Oluşturulma Tarihi</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatOrgDate(orgMeta?.olusturulma_tarihi)}
              </span>
              <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                Org ID: #{orgMeta?.org_id ?? user?.org_id ?? '—'}
              </span>
            </div>
          </div>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="size-4" aria-hidden="true" />
          </div>
        </div>
      </div>

      <Separator />

      {/* account-settings-03 tabanlı Kurumsal Bilgiler Formu */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Kurumsal Kimlik Bilgileri</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Raporlarda ve çalışma alanında görünecek resmi organizasyon ünvanı ile vergi numarasını
            güncelleyin.
          </p>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {orgFormError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs leading-relaxed text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{orgFormError}</span>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="settings-org-unvan">
              Organizasyon / Filo Ünvanı{' '}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="settings-org-unvan"
              name="unvan"
              type="text"
              maxLength={200}
              placeholder="Örn: TRUSS Lojistik A.Ş."
              required
              value={orgUnvan}
              onChange={(e) => {
                setOrgUnvan(e.target.value);
                clearOrgError('unvan');
              }}
              disabled={savingOrganization}
              aria-invalid={Boolean(orgErrors.unvan)}
              aria-describedby={orgErrors.unvan ? 'settings-org-unvan-error' : undefined}
            />
            {orgErrors.unvan ? (
              <p id="settings-org-unvan-error" role="alert" className="text-xs text-destructive">
                {orgErrors.unvan}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                2 ile 200 karakter arasında kurumsal ünvan.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="settings-org-vergi-no">Vergi Numarası (VKN / TCKN)</Label>
            <Input
              id="settings-org-vergi-no"
              name="vergi_no"
              type="text"
              inputMode="numeric"
              maxLength={11}
              placeholder="10 haneli VKN veya 11 haneli TCKN (opsiyonel)"
              value={orgVergiNo}
              onChange={(e) => {
                setOrgVergiNo(e.target.value);
                clearOrgError('vergi_no');
              }}
              disabled={savingOrganization}
              aria-invalid={Boolean(orgErrors.vergi_no)}
              aria-describedby={orgErrors.vergi_no ? 'settings-org-vergi-no-error' : undefined}
              className="font-mono tabular-nums"
            />
            {orgErrors.vergi_no ? (
              <p id="settings-org-vergi-no-error" role="alert" className="text-xs text-destructive">
                {orgErrors.vergi_no}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Opsiyonel. Doldurulursa yalnızca 10 veya 11 haneli rakam olmalıdır.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" size="sm" disabled={savingOrganization} className="gap-2">
          {savingOrganization ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          <span>Organizasyon Profilini Kaydet</span>
        </Button>
      </div>
    </form>
  );
}
