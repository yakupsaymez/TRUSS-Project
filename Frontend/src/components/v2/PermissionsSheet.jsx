import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';
import adminService from '@/services/adminService';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber } from '@/utils/formatters';
import AppSheet from '@/components/v2/AppSheet';
import {
  PERMISSION_DEFINITIONS,
  resolveMemberPerms,
} from '@/components/v2/CrewDataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const PERMISSION_KEYS = ['yakit', 'bakim', 'finans'];

const PERMISSION_GROUPS = [
  {
    id: 'operasyon',
    title: 'Operasyon',
    keys: ['yakit', 'bakim'],
  },
  {
    id: 'finans',
    title: 'Finans & Analitik',
    keys: ['finans'],
  },
];

const ROLE_TEMPLATES = [
  {
    id: 'readonly',
    label: 'Salt Okunur',
    perms: { yakit: false, bakim: false, finans: false },
  },
  {
    id: 'fuel_maintenance',
    label: 'Yakıt & Bakım',
    perms: { yakit: true, bakim: true, finans: false },
  },
  {
    id: 'all',
    label: 'Tüm Yetkiler',
    perms: { yakit: true, bakim: true, finans: true },
  },
];

const PERM_DEF_MAP = PERMISSION_DEFINITIONS.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

function toWhitelistedPerms(raw) {
  return {
    yakit: Boolean(raw?.yakit),
    bakim: Boolean(raw?.bakim),
    finans: Boolean(raw?.finans),
  };
}

function arePermsEqual(a, b) {
  return PERMISSION_KEYS.every((key) => Boolean(a?.[key]) === Boolean(b?.[key]));
}

export default function PermissionsSheet({
  open,
  onOpenChange,
  member = null,
  readOnly = false,
  lockMessage,
  onSuccess,
}) {
  const [perms, setPerms] = useState(() => toWhitelistedPerms(resolveMemberPerms(member)));
  const [initialPerms, setInitialPerms] = useState(() =>
    toWhitelistedPerms(resolveMemberPerms(member))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const resolved = toWhitelistedPerms(resolveMemberPerms(member));
    setPerms(resolved);
    setInitialPerms(resolved);
  }, [open, member]);

  const isDirty = useMemo(
    () => !readOnly && !arePermsEqual(perms, initialPerms),
    [perms, initialPerms, readOnly]
  );

  const activeCount = useMemo(
    () => PERMISSION_KEYS.filter((key) => Boolean(perms[key])).length,
    [perms]
  );

  const handleToggle = (key, checked) => {
    if (readOnly || isSubmitting) return;
    setPerms((prev) => ({ ...prev, [key]: Boolean(checked) }));
  };

  const handleApplyTemplate = (templatePerms) => {
    if (readOnly || isSubmitting) return;
    setPerms(toWhitelistedPerms(templatePerms));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!member?.user_id || readOnly || !isDirty || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = toWhitelistedPerms(perms);
      await adminService.updateUserPermissions(member.user_id, payload);
      toast.success(`${member.ad_soyad || 'Üye'} yetkileri güncellendi.`);
      await onSuccess?.();
      onOpenChange?.(false);
    } catch (err) {
      notifyApiError(err, 'Yetkiler güncellenemedi.');
      if ([404, 409].includes(getErrorStatus(err))) {
        await onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={member?.ad_soyad ? `${member.ad_soyad} · Yetkiler` : 'Yetki Yönetimi'}
      description={
        member?.email
          ? `${member.email} · Aktif yetki: ${formatLocaleNumber(activeCount, 0)}/${formatLocaleNumber(PERMISSION_KEYS.length, 0)}`
          : 'Kullanıcının operasyonel ve yönetimsel yetki anahtarları'
      }
      badge={member?.role || undefined}
      onSubmit={handleSubmit}
      submitLabel="Yetkileri Kaydet"
      isSubmitting={isSubmitting}
      submitDisabled={!isDirty || readOnly}
      isDirty={isDirty}
      footer={
        readOnly ? (
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
            Kapat
          </Button>
        ) : undefined
      }
    >
      {readOnly && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-xs text-destructive"
        >
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">
            {lockMessage || 'Bu kullanıcının yetkileri salt okunurdur.'}
          </p>
        </div>
      )}

      {/* Rol Şablonu Çipleri (dashboard-dialog-36) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">Rol Şablonu Uygula</p>
          <span className="text-[11px] text-muted-foreground">
            Yalnızca formu doldurur, kaydetmeden uygulanmaz
          </span>
        </div>
        <div role="group" aria-label="Rol şablonları" className="flex flex-wrap gap-1.5">
          {ROLE_TEMPLATES.map((tpl) => {
            const isMatched = arePermsEqual(perms, tpl.perms);
            return (
              <button
                key={tpl.id}
                type="button"
                disabled={readOnly || isSubmitting}
                aria-pressed={isMatched}
                onClick={() => handleApplyTemplate(tpl.perms)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                  isMatched
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {tpl.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gruplanmış Yetki Kartları (dashboard-dialog-36) */}
      <div className="space-y-5">
        {PERMISSION_GROUPS.map((group) => {
          const groupActiveCount = group.keys.filter((k) => Boolean(perms[k])).length;

          return (
            <section key={group.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  {group.title}
                </h3>
                <span className="inline-flex h-5 min-w-8 items-center justify-center rounded-md bg-muted px-1.5 font-mono text-[11px] font-medium tabular-nums text-muted-foreground">
                  {formatLocaleNumber(groupActiveCount, 0)}/{formatLocaleNumber(group.keys.length, 0)}
                </span>
              </div>

              <Card className="gap-0 overflow-hidden border border-border bg-transparent py-0 shadow-none ring-0">
                <CardContent className="gap-0 divide-y divide-border p-0">
                  {group.keys.map((key) => {
                    const def = PERM_DEF_MAP[key];
                    if (!def) return null;
                    const switchId = `perm-switch-${key}`;
                    const isChecked = Boolean(perms[key]);

                    return (
                      <div
                        key={key}
                        className={cn(
                          'flex items-center justify-between gap-4 px-3.5 py-3 transition-colors',
                          isChecked && 'bg-muted/25'
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <Label
                            htmlFor={switchId}
                            className={cn(
                              'block text-sm font-medium text-foreground',
                              !readOnly && 'cursor-pointer'
                            )}
                          >
                            {def.fullLabel}
                          </Label>
                          <p className="text-xs text-muted-foreground">{def.desc}</p>
                        </div>
                        <Switch
                          id={switchId}
                          checked={isChecked}
                          disabled={readOnly || isSubmitting}
                          aria-label={def.fullLabel}
                          onCheckedChange={(checked) => handleToggle(key, checked)}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          );
        })}
      </div>
    </AppSheet>
  );
}
