import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, ShieldAlert } from 'lucide-react';
import AuthFrame from '@/components/v2/AuthFrame';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordV2() {
  return (
    <AuthFrame
      title="Şifre Sıfırlama"
      description="Kurumsal hesap erişimi ve şifre yenileme prosedürü"
    >
      <div className="flex flex-col gap-5">
        <div
          role="note"
          className="flex flex-col gap-3.5 rounded-lg border border-primary/30 bg-primary/5 p-4 text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <KeyRound className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Yöneticinize Başvurun</h2>
              <p className="text-xs text-muted-foreground">Yetkili doğrulaması gereklidir</p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-foreground/90">
            Kurumsal güvenlik politikası gereği şifre sıfırlama işlemleri filo yöneticiniz veya
            sistem yöneticiniz tarafından gerçekleştirilir.
          </p>

          <ul className="space-y-2 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
            <li className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Sürücü veya ekip üyesiyseniz, şifre yenileme talebiniz için filo yöneticinizle
                iletişime geçin.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Organizasyon yöneticisiyseniz, erişim desteği için sistem yöneticisine başvurun.
              </span>
            </li>
          </ul>
        </div>

        <Button asChild className="w-full gap-2">
          <Link to="/login">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Giriş Sayfasına Dön</span>
          </Link>
        </Button>
      </div>
    </AuthFrame>
  );
}
