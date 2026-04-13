import React, { useEffect, useMemo } from 'react';
import { Moon, Settings, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import SettingsModal from '@/components/SettingsModal';
import { Button } from '@/components/ui/button';
import useAppStore from '@/store/useAppStore';

const routeTitleMap = {
    '/login': 'ABTS - Giris',
    '/register': 'ABTS - Kayit',
    '/dashboard': 'ABTS - Filo Kontrol Merkezi'
};

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        theme,
        settingsForm,
        toggleTheme,
        openSettings,
        handleLogout,
        syncTheme,
        syncPreferenceSummary,
        cleanupSettingsTimer
    } = useAppStore(useShallow((state) => ({
        theme: state.theme,
        settingsForm: state.settingsForm,
        toggleTheme: state.toggleTheme,
        openSettings: state.openSettings,
        handleLogout: state.handleLogout,
        syncTheme: state.syncTheme,
        syncPreferenceSummary: state.syncPreferenceSummary,
        cleanupSettingsTimer: state.cleanupSettingsTimer
    })));

    const isAuthenticated = Boolean(localStorage.getItem('token'));

    useEffect(() => {
        syncPreferenceSummary(isAuthenticated);
    }, [isAuthenticated, syncPreferenceSummary]);

    const title = useMemo(() => {
        if (location.pathname.startsWith('/arac/')) return 'ABTS - Arac Detay';
        return routeTitleMap[location.pathname] || 'ABTS';
    }, [location.pathname]);

    useEffect(() => {
        syncTheme();
    }, [syncTheme, theme]);

    useEffect(() => () => {
        cleanupSettingsTimer();
    }, [cleanupSettingsTimer]);

    return (
        <div className="min-h-screen" style={{ background: 'var(--app-bg)', color: 'var(--text-main)' }}>
            <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <h1 className="text-lg sm:text-xl font-semibold text-slate-900">{title}</h1>
                    <div className="flex items-center gap-2">
                        {isAuthenticated && (
                            <div className="hidden lg:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 animate-fade-in">
                                <span className="text-xs uppercase tracking-wide text-slate-500">Tercihler</span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                    <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm4.243 5.757a1 1 0 00-1.414-1.414L8.5 10.672 7.17 9.343a1 1 0 10-1.414 1.414l2.036 2.036a1 1 0 001.414 0l5.036-5.036z" clipRule="evenodd" />
                                    </svg>
                                    {settingsForm.dil}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                    <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v1a1 1 0 102 0V7zm0 3a1 1 0 10-2 0v3a1 1 0 102 0v-3z" />
                                    </svg>
                                    {settingsForm.para_birimi}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                    <svg className="h-3.5 w-3.5 text-rose-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M11 3a1 1 0 00-2 0v1.126A4.002 4.002 0 006 8v3.586l-.707.707A1 1 0 006 14h8a1 1 0 00.707-1.707L14 11.586V8a4.002 4.002 0 00-3-3.874V3z" clipRule="evenodd" />
                                    </svg>
                                    {settingsForm.olcu_birimi}
                                </span>
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={toggleTheme}
                            className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            title={theme === 'dark' ? 'Acik Moda Gec' : 'Koyu Moda Gec'}
                            aria-label={theme === 'dark' ? 'Acik Moda Gec' : 'Koyu Moda Gec'}
                        >
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => openSettings(isAuthenticated)}
                            className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
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

            <div key={location.pathname} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
                {children}
            </div>

            <SettingsModal />
        </div>
    );
};

export default Layout;

