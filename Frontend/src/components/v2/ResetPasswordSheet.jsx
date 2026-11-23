import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import adminService from '@/services/adminService';
import { ROLES } from '@/components/v2/channelAccess';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import AppSheet, {
  SheetField,
  SheetFormSection,
} from '@/components/v2/AppSheet';
import { ROLE_META } from '@/components/v2/CrewDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

const INITIAL_FORM = {
  yeni_sifre: '',
  yeni_sifre_tekrar: '',
};

export default function ResetPasswordSheet({
  open,
  onOpenChange,
  member = null,
  readOnly = false,
  lockMessage,
  onSuccess,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(INITIAL_FORM);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFieldErrors({});
  }, [open, member]);

  const isDirty = useMemo(
    () => !readOnly && Boolean(form.yeni_sifre || form.yeni_sifre_tekrar),
    [form, readOnly]
  );

  const roleKey = member?.role || ROLES.DRIVER;
  const roleMeta = ROLE_META[roleKey] || ROLE_META[ROLES.DRIVER];

  const handleFieldChange = (field, value) => {
    if (readOnly || isSubmitting) return;
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!member?.user_id || readOnly || isSubmitting) return;

    const errors = {};
    const password = form.yeni_sifre;
    const confirmPassword = form.yeni_sifre_tekrar;

    if (!password) {
      errors.yeni_sifre = 'Yeni geçici şifre gereklidir.';
    } else if (password.length < 6) {
      errors.yeni_sifre = 'Şifre en az 6 karakter olmalıdır.';
    }

    if (!confirmPassword) {
      errors.yeni_sifre_tekrar = 'Şifre tekrarı gereklidir.';
    } else if (password !== confirmPassword) {
      errors.yeni_sifre_tekrar = 'Şifreler eşleşmiyor.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      await adminService.resetUserPassword(member.user_id, password);
      toast.success(`${member.ad_soyad || 'Kullanıcı'} kullanıcısının şifresi sıfırlandı.`);
      await onSuccess?.();
      onOpenChange?.(false);
    } catch (err) {
      notifyApiError(err, 'Kullanıcı şifresi sıfırlanamadı.');
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
      title={member?.ad_soyad ? `${member.ad_soyad} · Şifre Sıfırla` : 'Şifre Sıfırla'}
      description={
        member?.email
          ? `${member.email} hesabı için yeni geçici şifre tanımlayın.`
          : 'Seçili ekip üyesinin giriş şifresini sıfırlayın.'
      }
      badge={member?.role || undefined}
      onSubmit={handleSubmit}
      submitLabel="Şifreyi Sıfırla"
      isSubmitting={isSubmitting}
      submitDisabled={readOnly}
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
            {lockMessage || 'Bu kullanıcının şifresi bu ekrandan sıfırlanamaz.'}
          </p>
        </div>
      )}

      {member && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <KeyRound className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{member.ad_soyad}</p>
              {member.email && (
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-[11px]', roleMeta.badgeClass)}>
            {roleMeta.label}
          </Badge>
        </div>
      )}

      <SheetFormSection
        title="Yeni Şifre Tanımı"
        description="Belirlediğiniz geçici şifreyi ekip üyesine güvenli bir kanaldan iletin."
      >
        <SheetField
          label="Yeni Geçici Şifre"
          htmlFor="reset-member-new-password"
          required
          hint="En az 6 karakter"
          error={fieldErrors.yeni_sifre}
        >
          <InputGroup>
            <InputGroupInput
              id="reset-member-new-password"
              name="yeni_sifre"
              type={showPassword ? 'text' : 'password'}
              placeholder="En az 6 karakter"
              autoComplete="new-password"
              value={form.yeni_sifre}
              onChange={(e) => handleFieldChange('yeni_sifre', e.target.value)}
              disabled={readOnly || isSubmitting}
              aria-invalid={Boolean(fieldErrors.yeni_sifre)}
            />
            <InputGroupAddon align="inline-end" className="pr-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={readOnly || isSubmitting}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                aria-pressed={showPassword}
                className="text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </SheetField>

        <SheetField
          label="Yeni Şifre Tekrar"
          htmlFor="reset-member-confirm-password"
          required
          error={fieldErrors.yeni_sifre_tekrar}
        >
          <InputGroup>
            <InputGroupInput
              id="reset-member-confirm-password"
              name="yeni_sifre_tekrar"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Şifreyi tekrarlayın"
              autoComplete="new-password"
              value={form.yeni_sifre_tekrar}
              onChange={(e) => handleFieldChange('yeni_sifre_tekrar', e.target.value)}
              disabled={readOnly || isSubmitting}
              aria-invalid={Boolean(fieldErrors.yeni_sifre_tekrar)}
            />
            <InputGroupAddon align="inline-end" className="pr-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                disabled={readOnly || isSubmitting}
                aria-label={
                  showConfirmPassword ? 'Şifre tekrarını gizle' : 'Şifre tekrarını göster'
                }
                aria-pressed={showConfirmPassword}
                className="text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </SheetField>
      </SheetFormSection>
    </AppSheet>
  );
}
