import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '#yetenekler', label: 'Yetenekler' },
  { href: '#mimari-guvenlik', label: 'Mimari & Güvenlik' },
  { href: '#iletisim', label: 'İletişim' },
];

export default function LandingNavbar({ hasSession, isDark, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="TRUSS Ana Sayfa"
        >
          <span>
            <span className="text-foreground">TRU</span>
            <span className="text-primary">SS</span>
          </span>
          <span className="hidden rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline-block">
            B2B Filo
          </span>
        </Link>

        <nav aria-label="Bölüm bağlantıları" className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
            className="size-9 shrink-0"
          >
            {isDark ? (
              <Sun className="size-4 text-foreground" aria-hidden="true" />
            ) : (
              <Moon className="size-4 text-foreground" aria-hidden="true" />
            )}
          </Button>

          <Button asChild size="sm" className="h-9 gap-1.5 px-3 text-xs sm:px-4 sm:text-sm">
            <Link to={hasSession ? '/app' : '/login'}>
              <span>{hasSession ? 'Yönetim Paneline Dön' : 'Kurumsal Giriş'}</span>
              <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
