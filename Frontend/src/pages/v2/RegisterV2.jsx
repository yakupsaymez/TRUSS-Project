import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import authService from '@/services/authService';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import AuthFrame from '@/components/v2/AuthFrame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterV2() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (key) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: '' }));
    }
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const errors = {};

    if (!trimmedName) {
      errors.fullName = 'Ad soyad gereklidir.';
    } else if (trimmedName.length < 3) {
      errors.fullName = 'Ad soyad en az 3 karakter olmalıdır.';
    }

    if (!trimmedEmail) {
      errors.email = 'E-posta adresi gereklidir.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Geçerli bir e-posta adresi girin.';
    }

    if (!password) {
      errors.password = 'Şifre gereklidir.';
    } else if (password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalıdır.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Şifre tekrarı gereklidir.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Şifreler eşleşmiyor.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormError('');
    setIsSubmitting(true);

    try {
      await authService.register({
        ad_soyad: trimmedName,
        email: trimmedEmail,
        sifre: password,
      });
      toast.success('Hesap oluşturuldu! Giriş yapılıyor...');
      await useAuthStore.getState().login({
        email: trimmedEmail,
        sifre: password,
      });
      useVehicleStore.getState().reset();
      navigate('/app');
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Kayıt başarısız. Lütfen tekrar deneyin.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footerContent = (
    <p className="text-center text-sm text-muted-foreground">
      Zaten hesabınız var mı?{' '}
      <Link
        to="/login"
        className="font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-primary"
      >
        Giriş yapın
      </Link>
    </p>
  );

  return (
    <AuthFrame
      title="Hesabınızı oluşturun"
      description="Yeni bir filo çalışma alanı başlatmak için bilgilerinizi girin."
      footer={footerContent}
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-4">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs leading-relaxed text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="v2-register-fullname">Ad Soyad</Label>
          <Input
            id="v2-register-fullname"
            name="fullName"
            type="text"
            placeholder="Ahmet Yılmaz"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              clearError('fullName');
            }}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? 'v2-register-fullname-error' : undefined}
          />
          {fieldErrors.fullName ? (
            <p id="v2-register-fullname-error" role="alert" className="text-xs text-destructive">
              {fieldErrors.fullName}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="v2-register-email">E-posta</Label>
          <Input
            id="v2-register-email"
            name="email"
            type="email"
            placeholder="ad@sirket.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError('email');
            }}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'v2-register-email-error' : undefined}
          />
          {fieldErrors.email ? (
            <p id="v2-register-email-error" role="alert" className="text-xs text-destructive">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="v2-register-password">Şifre</Label>
            <InputGroup>
              <InputGroupInput
                id="v2-register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="En az 6 karakter"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError('password');
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'v2-register-password-error' : undefined}
              />
              <InputGroupAddon align="inline-end" className="pr-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isSubmitting}
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
            {fieldErrors.password ? (
              <p id="v2-register-password-error" role="alert" className="text-xs text-destructive">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="v2-register-confirm-password">Şifre Tekrar</Label>
            <InputGroup>
              <InputGroupInput
                id="v2-register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Şifreyi tekrarlayın"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError('confirmPassword');
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword ? 'v2-register-confirm-password-error' : undefined
                }
              />
              <InputGroupAddon align="inline-end" className="pr-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={isSubmitting}
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
            {fieldErrors.confirmPassword ? (
              <p
                id="v2-register-confirm-password-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Building2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Yeni kayıt otomatik olarak adınıza yeni bir filo organizasyonu (
            <span className="font-mono font-semibold text-foreground">FLEET_MANAGER</span>)
            oluşturur.
          </span>
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Hesap oluşturuluyor...</span>
            </>
          ) : (
            <span>Hesap Oluştur</span>
          )}
        </Button>
      </form>
    </AuthFrame>
  );
}
