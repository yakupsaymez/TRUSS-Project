import React, { useEffect, useMemo } from 'react';
import { Moon, Monitor, Settings, Sun } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import SettingsModal from '@/components/SettingsModal';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';
import useAppStore from '@/store/useAppStore';

const routeTitleMap = {
    '/login': 'TRUSS - Giriş',
    '/register': 'TRUSS - Kayıt',
    '/dashboard': 'TRUSS - Filo Kontrol Merkezi'
};

const breadcrumbMap = {
    '/dashboard': 'Dashboard',
    '/arac': 'Araç Detay',
};

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const { theme, setTheme } = useTheme();

    const {
        settingsForm,
        openSettings,
        handleLogout,
        syncPreferenceSummary,
        cleanupSettingsTimer
    } = useAppStore(useShallow((state) => ({
        settingsForm: state.settingsForm,
        openSettings: state.openSettings,
        handleLogout: state.handleLogout,
        syncPreferenceSummary: state.syncPreferenceSummary,
        cleanupSettingsTimer: state.cleanupSettingsTimer
    })));

    const isAuthenticated = Boolean(localStorage.getItem('token'));

    useEffect(() => {
        syncPreferenceSummary(isAuthenticated);
    }, [isAuthenticated, syncPreferenceSummary]);

    const title = useMemo(() => {
        if (location.pathname.startsWith('/arac/')) return 'TRUSS - Araç Detay';
        return routeTitleMap[location.pathname] || 'TRUSS';
    }, [location.pathname]);

    useEffect(() => () => {
        cleanupSettingsTimer();
    }, [cleanupSettingsTimer]);

    return (
        <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--app-bg)', color: 'var(--text-main)' }}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 left-[-6rem] h-72 w-72 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
                <div className="absolute top-40 right-[-4rem] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
                <div className="absolute bottom-[-5rem] left-1/3 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 flex min-h-screen flex-col">
                <nav
                    className="sticky top-0 z-40 border-b backdrop-blur-sm"
                    style={{
                        borderColor: 'var(--glass-border)',
                        backgroundColor: 'color-mix(in srgb, var(--glass-bg) 92%, transparent)'
                    }}
                >
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        <h1 className="text-lg font-semibold sm:text-xl" style={{ color: 'var(--text-strong)' }}>
                            <Link
                                to="/"
                                className="text-lg font-bold tracking-wide text-gradient-accent drop-shadow-[0_8px_20px_rgba(245,158,11,0.28)] no-underline hover:no-underline focus:no-underline active:no-underline transition-transform duration-200 active:scale-95"
                            >
                                {title}
                            </Link>
                            <span className="ml-2 hidden text-gradient-accent sm:inline">●</span>
                        </h1>

                        <div className="flex items-center gap-2">
                            {isAuthenticated && (
                                <div className="hidden animate-fade-in items-center gap-2 rounded-xl px-3 py-2 lg:flex glass-card">
                                    <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tercihler</span>
                                    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-main)' }}>
                                        <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm4.243 5.757a1 1 0 00-1.414-1.414L8.5 10.672 7.17 9.343a1 1 0 10-1.414 1.414l2.036 2.036a1 1 0 001.414 0l5.036-5.036z" clipRule="evenodd" />
                                        </svg>
                                        {settingsForm.dil}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-main)' }}>
                                        <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v1a1 1 0 102 0V7zm0 3a1 1 0 10-2 0v3a1 1 0 102 0v-3z" />
                                        </svg>
                                        {settingsForm.para_birimi}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-main)' }}>
                                        <svg className="h-3.5 w-3.5 text-rose-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M11 3a1 1 0 00-2 0v1.126A4.002 4.002 0 006 8v3.586l-.707.707A1 1 0 006 14h8a1 1 0 00.707-1.707L14 11.586V8a4.002 4.002 0 00-3-3.874V3z" clipRule="evenodd" />
                                        </svg>
                                        {settingsForm.olcu_birimi}
                                    </span>
                                </div>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full glow-accent-hover"
                                        aria-label="Tema seç"
                                    >
                                        {theme === 'dark' && <Moon size={16} />}
                                        {theme === 'light' && <Sun size={16} />}
                                        {theme === 'system' && <Monitor size={16} />}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setTheme('light')}>
                                        <Sun className="mr-2 h-4 w-4" />
                                        Açık
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme('dark')}>
                                        <Moon className="mr-2 h-4 w-4" />
                                        Koyu
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme('system')}>
                                        <Monitor className="mr-2 h-4 w-4" />
                                        Sistem
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => openSettings(isAuthenticated)}
                                className="rounded-full glow-accent-hover"
                                style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)' }}
                                title="Kullanici Ayarlari"
                                aria-label="Kullanici Ayarlari"
                            >
                                <Settings size={16} />
                            </Button>

                            {isAuthenticated && (
                                <Button type="button" onClick={() => handleLogout(navigate)} className="neo-btn bg-[#2563EB] text-white shadow-sm hover:bg-[#1D4ED8]">
                                    Cikis Yap
                                </Button>
                            )}
                        </div>
                    </div>
                </nav>

                <main key={location.pathname} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 page-enter">
                    {/* Breadcrumb */}
                    <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Link to="/" className="hover:text-foreground transition-colors">TRUSS</Link>
                        {location.pathname.startsWith('/dashboard') && (
                            <>
                                <span className="text-border select-none">•</span>
                                <span className="font-medium text-foreground">Dashboard</span>
                            </>
                        )}
                        {location.pathname.startsWith('/arac/') && (
                            <>
                                <span className="text-border select-none">•</span>
                                <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                                <span className="text-border select-none">•</span>
                                <span className="font-medium text-foreground">Araç Detay</span>
                            </>
                        )}
                    </nav>
                    {children}
                </main>

                <SettingsModal />
            </div>
        </div>
    );
};

export default Layout;

