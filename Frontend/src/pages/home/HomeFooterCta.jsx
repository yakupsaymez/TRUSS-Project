import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NAV_LINKS } from './homeContent';

export default function HomeFooterCta({ hasSession, onSignOut }) {
  const year = new Date().getFullYear();

  return (
    <>
      <section className="border-t border-border bg-background py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-8 rounded-xl border border-border bg-card p-8 lg:flex-row lg:items-center lg:p-10">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
                  TRUSS V2 · HAZIR OPERASYON
                </span>
                <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                  UTC+3 · KM &amp; SMH
                </span>
              </div>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {hasSession
                  ? 'Operasyon paneliniz canlı verilerle hazır.'
                  : 'Filonuzu doğrulanmış verilerle yönetmeye başlayın.'}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {hasSession
                  ? 'Filo envanteri, hareket defteri, parça ömür matrisi ve canlı harita ekranlarına hemen geçebilirsiniz.'
                  : 'Organizasyon hesabınızı açın; katalog tabanlı araç kaydı, 422 sayaç kilidi ve rol bazlı yetki kontrolünü hemen devreye alın.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {hasSession ? (
                <>
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/app">
                      <span>Panele Git</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" size="lg" onClick={onSignOut}>
                    Çıkış Yap
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/register">
                      <span>Ücretsiz Başla</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/login">Giriş Yap</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <Link
            to="/"
            className="select-none font-display text-lg font-bold tracking-tight no-underline"
          >
            <span className="text-foreground">TRU</span>
            <span className="text-primary">SS</span>
          </Link>

          <nav aria-label="Alt bilgi bağlantıları" className="flex flex-wrap items-center gap-6">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <p className="text-xs text-muted-foreground tabular-nums">
            © {year} TRUSS · Kurumsal Filo &amp; Varlık Yönetim Platformu
          </p>
        </div>
      </footer>
    </>
  );
}
