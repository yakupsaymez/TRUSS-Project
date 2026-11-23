import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CORNERS = [
  'top-0 left-0 rounded-tl-md border-t-2 border-l-2',
  'top-0 right-0 rounded-tr-md border-t-2 border-r-2',
  'bottom-0 left-0 rounded-bl-md border-b-2 border-l-2',
  'right-0 bottom-0 rounded-br-md border-r-2 border-b-2',
];

export default function AuthFrame({ title, description, banner, footer, children }) {
  const { theme, setTheme } = useTheme();

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* login-page-12 ince kare ızgara arka planı */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_55%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_55%,transparent)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_25%,var(--background)_85%)]"
      />

      {/* Üst çubuk: sol ana sayfa dönüş, sağ tema değiştirici */}
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>TRUSS Ana Sayfa</span>
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
          title={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
          className="size-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>

      {/* Merkez köşe çerçeveli kart alanı */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-2 sm:px-6">
        <div className="flex w-full max-w-md flex-col items-center gap-5">
          {/* İkonsuz TRUSS yazı logosu */}
          <Link
            to="/"
            aria-label="TRUSS Ana Sayfa"
            className="inline-flex items-center text-2xl font-bold tracking-tight select-none"
          >
            <span className="text-foreground">TRU</span>
            <span className="text-primary">SS</span>
          </Link>

          {banner ? <div className="w-full">{banner}</div> : null}

          <div className="relative w-full p-3.5 sm:p-4">
            {CORNERS.map((position) => (
              <span
                key={position}
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute size-6 border-foreground',
                  position
                )}
              />
            ))}

            <Card className="gap-6 rounded-none border-border bg-card py-6 shadow-none">
              <CardHeader className="space-y-1.5 px-6 text-center">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {title}
                </CardTitle>
                {description ? (
                  <CardDescription className="text-sm text-muted-foreground">
                    {description}
                  </CardDescription>
                ) : null}
              </CardHeader>

              <CardContent className="px-6">{children}</CardContent>

              {footer ? (
                <CardFooter className="justify-center border-t border-border/60 px-6 pt-5">
                  {footer}
                </CardFooter>
              ) : null}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
