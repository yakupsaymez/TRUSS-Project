import React from 'react';
import { useTheme } from '@/components/theme-provider';
import useAuthStore from '@/store/useAuthStore';
import LandingNavbar from '@/components/v2/landing/LandingNavbar';
import LandingHero from '@/components/v2/landing/LandingHero';
import LandingCapabilities from '@/components/v2/landing/LandingCapabilities';
import LandingFooterContact from '@/components/v2/landing/LandingFooterContact';

export default function LandingV2() {
  const { theme, setTheme } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const hasSession =
    isAuthenticated ||
    Boolean(token || localStorage.getItem('token') || sessionStorage.getItem('token'));

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleToggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingNavbar
        hasSession={hasSession}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />
      <main>
        <LandingHero hasSession={hasSession} />
        <LandingCapabilities />
      </main>
      <LandingFooterContact hasSession={hasSession} />
    </div>
  );
}
