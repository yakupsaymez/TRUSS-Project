import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import AuthFrame from '@/components/v2/AuthFrame';
import LegalDocsModal from '@/components/v2/LegalDocsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('reason') === 'expired';

  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: '' }));
    }
    if (formError) setFormError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const errors = {};

    if (!trimmedEmail) {
      errors.email = 'E-posta adresi gereklidir.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Geçerli bir e-posta adresi girin.';
    }

    if (!password) {
      errors.password = 'Şifre gereklidir.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormError('');
    setIsSubmitting(true);

    try {
      await login({ email: trimmedEmail, sifre: password });
      useVehicleStore.getState().reset();
      toast.success('Giriş başarılı! Yönlendiriliyorsunuz...');
      navigate('/app');
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Giriş başarısız. Bilgilerinizi kontrol edin.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const expiredBanner = sessionExpired ? (
    <div
      role="status"
      className="flex w-full items-start gap-2.5 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-3 text-xs leading-relaxed text-foreground"
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <span>Güvenliğiniz için oturumunuz sonlandırıldı, lütfen tekrar giriş yapın.</span>
    </div>
  ) : null;

  const footerContent = (
    <div className="space-y-2 text-center">
      <p className="text-sm text-muted-foreground">
        Hesabınız yok mu?{' '}
        <Link
          to="/register"
          className="font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          Kayıt olun
        </Link>
      </p>
      <button
        type="button"
        onClick={() => setLegalOpen(true)}
        className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        KVKK, Gizlilik ve Hizmet Koşulları
      </button>
    </div>
  );

  return (
    <>
    <AuthFrame
      title="Hesabınıza giriş yapın"
      description="Filo operasyon paneline devam etmek için bilgilerinizi girin."
      banner={expiredBanner}
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
          <Label htmlFor="v2-login-email">E-posta</Label>
          <Input
            id="v2-login-email"
            name="email"
            type="email"
            placeholder="ad@sirket.com"
            autoComplete="email"
            required
            value={email}
            onChange={handleEmailChange}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'v2-login-email-error' : undefined}
          />
          {fieldErrors.email ? (
            <p id="v2-login-email-error" role="alert" className="text-xs text-destructive">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="v2-login-password">Şifre</Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Şifremi unuttum
            </Link>
          </div>
          <InputGroup>
            <InputGroupInput
              id="v2-login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Şifrenizi girin"
              autoComplete="current-password"
              required
              value={password}
              onChange={handlePasswordChange}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'v2-login-password-error' : undefined}
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
            <p id="v2-login-password-error" role="alert" className="text-xs text-destructive">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Giriş yapılıyor...</span>
            </>
          ) : (
            <span>Giriş Yap</span>
          )}
        </Button>
      </form>
    </AuthFrame>
    <LegalDocsModal open={legalOpen} onOpenChange={setLegalOpen} />
    </>
  );
}
