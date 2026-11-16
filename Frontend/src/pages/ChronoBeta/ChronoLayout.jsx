import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/theme-provider';
import useVehicleStore from '@/store/useVehicleStore';
import useAppStore from '@/store/useAppStore';
import useAuthStore from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { getVisibleChannels, resolveRole } from './channelAccess';
import {
  Layers,
  Activity,
  Cpu,
  BarChart3,
  Cog,
  Users,
  Sun,
  Moon,
  LogOut,
  Orbit,
} from 'lucide-react';

const CHANNEL_ICONS = {
  ledger: Layers,
  horizon: Cpu,
  analytics: BarChart3,
  components: Cog,
  crew: Users,
};

export default function ChronoLayout({
  activeChannel = 'ledger',
  onSelectChannel,
  seciliAracId = 'tum',
  onSelectArac,
  children,
}) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const araclar = useVehicleStore((s) => s.araclar);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const handleLogout = useAppStore((s) => s.handleLogout);
  const user = useAuthStore((s) => s.user);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchAraclar();
    }
  }, [fetchAraclar]);

  const role = resolveRole(user);
  const navChannels = useMemo(
    () => getVisibleChannels(user).map((ch) => ({ ...ch, icon: CHANNEL_ICONS[ch.key] })),
    [user]
  );

  return (
    <div className="min-h-screen bg-truss-bg text-truss-text">
      {/* ULTRA-KOMPAKT TOP-BAR (SIDEBAR YOK, SADECE ZAMAN EKSENİ KOMUTA KÖPRÜSÜ) */}
      <header className="sticky top-0 z-40 border-b border-truss-border bg-truss-bg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          {/* Sol: TRUSS Chrono-OS v1.0 Kimliği */}
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-truss-purple bg-truss-surface text-truss-purple">
              <Orbit className="size-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold tracking-tight text-truss-text">
                TRUSS
              </span>
              <span className="font-mono text-[11px] font-semibold tracking-wider text-truss-purple">
                CHRONO-OS v1.0
              </span>
            </div>
          </div>

          {/* Orta: Birleşik Kanal Anahtarlayıcı (Menüleri Tek Eksen Yapan Yapı) */}
          <nav className="flex items-center gap-1 rounded-xl border border-truss-border bg-truss-surface p-1">
            {navChannels.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChannel === ch.key;
              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => onSelectChannel?.(ch.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-truss-purple text-truss-text shadow-sm'
                      : 'text-truss-muted hover:text-truss-text'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sağ: Açık/Koyu Tema ve Çıkış (LogOut) */}
          <div className="flex items-center gap-1.5">
            {user && (
              <span
                title="Oturum rolü"
                className={`inline-flex h-8 items-center rounded-lg border bg-truss-surface px-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                  role === 'DRIVER'
                    ? 'border-truss-border text-truss-muted'
                    : 'border-truss-purple text-truss-purple'
                }`}
              >
                {role}
              </span>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              className="size-8 rounded-lg border border-truss-border bg-truss-surface text-truss-muted hover:border-truss-purple hover:text-truss-text"
              title={isDark ? 'Açık Moda Geç' : 'Koyu Moda Geç'}
            >
              {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </Button>

            {user && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleLogout(navigate)}
                className="size-8 rounded-lg border border-truss-border bg-truss-surface text-truss-muted hover:border-destructive hover:text-destructive"
                title="Oturumu Kapat"
              >
                <LogOut className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* İKİNCİL YATAY ARAÇ FİLTRE ŞERİDİ (FLEET LENS) */}
        <div className="border-t border-truss-border bg-truss-surface">
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-truss-muted">
              <Activity className="size-3 text-truss-purple" />
              Zaman Merceği:
            </span>

            <button
              type="button"
              onClick={() => onSelectArac?.('tum')}
              className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                seciliAracId === 'tum'
                  ? 'border-truss-purple bg-truss-bg text-truss-purple'
                  : 'border-truss-border bg-truss-bg text-truss-muted hover:text-truss-text'
              }`}
            >
              Tüm Filo ({araclar.length})
            </button>

            {araclar.map((a) => {
              const seciliMi = String(seciliAracId) === String(a.arac_id);
              return (
                <button
                  key={a.arac_id}
                  type="button"
                  onClick={() => onSelectArac?.(String(a.arac_id))}
                  className={`shrink-0 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold tabular-nums transition-colors ${
                    seciliMi
                      ? 'border-truss-purple bg-truss-bg text-truss-purple'
                      : 'border-truss-border bg-truss-bg text-truss-muted hover:border-truss-purple hover:text-truss-text'
                  }`}
                >
                  {a.plaka}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ANA CHRONO KANVASI */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
