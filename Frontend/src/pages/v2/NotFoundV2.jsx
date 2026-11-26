import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/store/useAuthStore';

export default function NotFoundV2() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token) || localStorage.getItem('token');
  const hasSession = Boolean(isAuthenticated || token);
  const targetPath = hasSession ? '/app' : '/';
  const targetLabel = hasSession ? 'Operasyon Paneline Dön' : 'Ana Sayfaya Dön';

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex items-center justify-center">
          <span className="text-xl font-bold tracking-tight select-none">
            <span className="text-foreground">TRU</span>
            <span className="text-primary">SS</span>
          </span>
        </div>

        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Compass className="size-6" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-4xl font-bold tracking-tight text-primary tabular-nums">404</p>
          <h1 className="text-lg font-semibold text-foreground">Aradığınız sayfa bulunamadı</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Bağlantı taşınmış, kaldırılmış veya hatalı yazılmış olabilir.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="gap-2">
            <Link to={targetPath}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>{targetLabel}</span>
            </Link>
          </Button>
          {!hasSession && (
            <Button asChild variant="outline">
              <Link to="/login">Giriş Yap</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
