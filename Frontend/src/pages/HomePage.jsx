import React, { useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import { useTheme } from '@/components/theme-provider';
import HomeNavbar from '@/components/v2/home/HomeNavbar';
import HomeHero from '@/components/v2/home/HomeHero';
import HomeModulesSection from '@/components/v2/home/HomeModulesSection';
import HomeArchitectureSection from '@/components/v2/home/HomeArchitectureSection';
import HomeFooterCta from '@/components/v2/home/HomeFooterCta';

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const [, setSessionTick] = useState(0);

  const hasSession =
    isAuthenticated ||
    Boolean(
      token ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token')
    );

  const handleSignOut = () => {
    useAuthStore.getState().logout();
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    useVehicleStore.getState().reset();
    setSessionTick((n) => n + 1);
    toast.success('Çıkış yapıldı.');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomeNavbar
        hasSession={hasSession}
        theme={theme}
        setTheme={setTheme}
        onSignOut={handleSignOut}
      />

      <main>
        <HomeHero hasSession={hasSession} />
        <HomeModulesSection />
        <HomeArchitectureSection />
      </main>

      <HomeFooterCta hasSession={hasSession} onSignOut={handleSignOut} />
    </div>
  );
}
