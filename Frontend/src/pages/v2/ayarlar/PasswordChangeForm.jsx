import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, Eye, EyeOff, KeyRound, Loader2, Save } from 'lucide-react';
import api from '@/services/api';
import { notifyApiError } from '@/utils/apiError';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';

function PasswordField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  value,
  onChange,
  visible,
  onToggleVisible,
  toggleShowLabel,
  toggleHideLabel,
  disabled,
  error,
}) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={128}
          required
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <InputGroupAddon align="inline-end" className="pr-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onToggleVisible}
            disabled={disabled}
            aria-label={visible ? toggleHideLabel : toggleShowLabel}
            aria-pressed={visible}
            className="text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordFormError, setPasswordFormError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearPasswordError = (key) => {
    if (passwordErrors[key]) {
      setPasswordErrors((prev) => ({ ...prev, [key]: '' }));
    }
    if (passwordFormError) setPasswordFormError('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (savingPassword) return;

    const errors = {};
    if (!currentPassword) {
      errors.currentPassword = 'Mevcut şifre gereklidir.';
    } else if (currentPassword.length > 128) {
      errors.currentPassword = 'Mevcut şifre en fazla 128 karakter olabilir.';
    }

    if (!newPassword) {
      errors.newPassword = 'Yeni şifre gereklidir.';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Yeni şifre en az 6 karakter olmalıdır.';
    } else if (newPassword.length > 128) {
      errors.newPassword = 'Yeni şifre en fazla 128 karakter olabilir.';
    } else if (currentPassword && newPassword === currentPassword) {
      errors.newPassword = 'Yeni şifre mevcut şifrenizden farklı olmalıdır.';
    }

    if (!confirmNewPassword) {
      errors.confirmNewPassword = 'Yeni şifre tekrarı gereklidir.';
    } else if (confirmNewPassword.length > 128) {
      errors.confirmNewPassword = 'Yeni şifre tekrarı en fazla 128 karakter olabilir.';
    } else if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = 'Yeni şifreler eşleşmiyor.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    setPasswordFormError('');
    setSavingPassword(true);
    try {
      await api.put('/users/settings/password', {
        mevcut_sifre: currentPassword,
        yeni_sifre: newPassword,
      });
      if (!mountedRef.current) return;
      toast.success('Şifreniz başarıyla güncellendi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    } catch (err) {
      if (!mountedRef.current) return;
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || 'Şifre güncellenemedi.';
      if (code === 'CURRENT_PASSWORD_INVALID' || err?.response?.status === 401) {
        setPasswordErrors((prev) => ({ ...prev, currentPassword: msg }));
      } else {
        setPasswordFormError(msg);
      }
      notifyApiError(err, 'Şifre güncellenemedi.');
    } finally {
      if (mountedRef.current) setSavingPassword(false);
    }
  };

  return (
    <form
      onSubmit={handleChangePassword}
      noValidate
      className="space-y-4 rounded-xl border border-border bg-background/60 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <KeyRound className="size-4" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Şifre Değiştir</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Mevcut şifrenizi doğrulayarak hesabınız için yeni bir giriş şifresi belirleyin.
          </p>
        </div>
      </div>

      {passwordFormError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs leading-relaxed text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{passwordFormError}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PasswordField
          id="settings-current-password"
          name="currentPassword"
          label="Mevcut Şifre"
          placeholder="Mevcut şifreniz"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            clearPasswordError('currentPassword');
          }}
          visible={showCurrentPassword}
          onToggleVisible={() => setShowCurrentPassword((prev) => !prev)}
          toggleShowLabel="Mevcut şifreyi göster"
          toggleHideLabel="Mevcut şifreyi gizle"
          disabled={savingPassword}
          error={passwordErrors.currentPassword}
        />

        <PasswordField
          id="settings-new-password"
          name="newPassword"
          label="Yeni Şifre"
          placeholder="En az 6 karakter"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            clearPasswordError('newPassword');
          }}
          visible={showNewPassword}
          onToggleVisible={() => setShowNewPassword((prev) => !prev)}
          toggleShowLabel="Yeni şifreyi göster"
          toggleHideLabel="Yeni şifreyi gizle"
          disabled={savingPassword}
          error={passwordErrors.newPassword}
        />

        <PasswordField
          id="settings-confirm-new-password"
          name="confirmNewPassword"
          label="Yeni Şifre Tekrar"
          placeholder="Yeni şifreyi tekrarlayın"
          autoComplete="new-password"
          value={confirmNewPassword}
          onChange={(e) => {
            setConfirmNewPassword(e.target.value);
            clearPasswordError('confirmNewPassword');
          }}
          visible={showConfirmNewPassword}
          onToggleVisible={() => setShowConfirmNewPassword((prev) => !prev)}
          toggleShowLabel="Yeni şifre tekrarını göster"
          toggleHideLabel="Yeni şifre tekrarını gizle"
          disabled={savingPassword}
          error={passwordErrors.confirmNewPassword}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-3">
        <Button type="submit" size="sm" disabled={savingPassword} className="gap-2">
          {savingPassword ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          <span>Şifreyi Güncelle</span>
        </Button>
      </div>
    </form>
  );
}
