import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NAV_LINKS } from './homeContent';

const THEME_ITEMS = [
  { value: 'light', label: 'Açık', Icon: Sun },
  { value: 'dark', label: 'Koyu', Icon: Moon },
  { value: 'system', label: 'Sistem', Icon: Monitor },
];

export default function HomeNavbar({ hasSession, theme, setTheme, onSignOut }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="select-none font-display text-xl font-bold tracking-tight no-underline">
          <span className="text-foreground">TRU</span>
          <span className="text-primary">SS</span>
        </Link>

        <nav aria-label="Ana gezinme" className="hidden items-center gap-8 md:flex">
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

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Tema seç"
                className="border-border bg-card text-foreground hover:bg-accent"
              >
                <ThemeIcon className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {THEME_ITEMS.map(({ value, label, Icon }) => (
                <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
                  <Icon className="mr-2 size-4" aria-hidden="true" />
                  <span>{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden items-center gap-2 sm:flex">
            {hasSession ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={onSignOut}>
                  Çıkış Yap
                </Button>
                <Button asChild size="sm">
                  <Link to="/app">Panele Git</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Giriş Yap</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Kayıt Ol</Link>
                </Button>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={mobileOpen}
            className="border-border bg-card text-foreground hover:bg-accent md:hidden"
          >
            {mobileOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          <nav aria-label="Mobil gezinme" className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            {hasSession ? (
              <>
                <Button asChild size="sm" className="w-full">
                  <Link to="/app" onClick={() => setMobileOpen(false)}>Panele Git</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => { setMobileOpen(false); onSignOut(); }}
                >
                  Çıkış Yap
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="sm" className="w-full">
                  <Link to="/register" onClick={() => setMobileOpen(false)}>Kayıt Ol</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Giriş Yap</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
