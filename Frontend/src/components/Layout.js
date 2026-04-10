import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const routeTitleMap = {
    '/login': 'ABTS - Giris',
    '/register': 'ABTS - Kayit',
    '/dashboard': 'ABTS - Filo Kontrol Merkezi'
};

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [theme, setTheme] = useState(() => localStorage.getItem('abts-theme') || 'dark');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [settingsForm, setSettingsForm] = useState({ telefon: '', email_bildirim_aktif: true });
    const settingsCloseTimerRef = useRef(null);

    const isAuthenticated = Boolean(localStorage.getItem('token'));

    const title = useMemo(() => {
        if (location.pathname.startsWith('/arac/')) return 'ABTS - Arac Detay';
        return routeTitleMap[location.pathname] || 'ABTS';
    }, [location.pathname]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('abts-theme', theme);
    }, [theme]);

    useEffect(() => () => {
        if (settingsCloseTimerRef.current) {
            clearTimeout(settingsCloseTimerRef.current);
        }
    }, []);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const openSettings = async () => {
        if (!isAuthenticated) {
            toast.error('Ayarlar icin once giris yapmalisiniz.');
            return;
        }

        try {
            const data = await api.get('/araclar');
            const list = Array.isArray(data.data) ? data.data : (data.data?.araclar || []);
            const ref = list[0] || {};
            setSettingsForm({
                telefon: ref.telefon || '',
                email_bildirim_aktif: ref.email_bildirim_aktif !== false
            });
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Ayarlar yuklenemedi.');
        }

        setIsSettingsOpen(true);
        setIsSettingsVisible(true);
    };

    const closeSettings = () => {
        setIsSettingsVisible(false);
        settingsCloseTimerRef.current = setTimeout(() => setIsSettingsOpen(false), 200);
    };

    const handleSettingsChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettingsForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSettingsSave = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            await api.put('/users/settings/notifications', settingsForm);
            toast.success('Kullanici ayarlari guncellendi.');
            closeSettings();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Ayarlar kaydedilemedi.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ background: 'var(--app-bg)', color: 'var(--text-main)' }}>
            <nav className="glass-card rounded-none border-x-0 border-t-0 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <h1 className="text-lg sm:text-xl font-semibold text-white dark:text-white">{title}</h1>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={toggleTheme} className="theme-switch-btn" title={theme === 'dark' ? 'Acik Moda Gec' : 'Koyu Moda Gec'}>
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        <button type="button" onClick={openSettings} className="theme-switch-btn" title="Kullanici Ayarlari">⚙️</button>
                        {isAuthenticated && (
                            <button type="button" onClick={handleLogout} className="neo-btn bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 shadow-md">
                                Cikis Yap
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <div key={location.pathname} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
                {children}
            </div>

            {isSettingsOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ${isSettingsVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
                    <div className={`w-full max-w-md glass-card p-6 ${isSettingsVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
                        <h3 className="text-xl font-semibold mb-4 text-white dark:text-white">Kullanici Ayarlari</h3>
                        <form onSubmit={handleSettingsSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-200 dark:text-slate-200">Telefon Numarasi</label>
                                <input
                                    type="text"
                                    name="telefon"
                                    value={settingsForm.telefon}
                                    onChange={handleSettingsChange}
                                    className="w-full rounded-md px-3 py-2 bg-white/95 dark:bg-slate-950/75 border border-slate-400/55 dark:border-white/25 text-slate-900 dark:text-slate-100"
                                    placeholder="05xx xxx xx xx"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    id="layout_email_bildirim_aktif"
                                    type="checkbox"
                                    name="email_bildirim_aktif"
                                    checked={settingsForm.email_bildirim_aktif}
                                    onChange={handleSettingsChange}
                                    className="h-4 w-4"
                                />
                                <label htmlFor="layout_email_bildirim_aktif" className="text-sm text-slate-200 dark:text-slate-200">
                                    E-posta bildirimi istiyorum
                                </label>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={closeSettings} className="px-4 py-2 rounded-md border border-slate-400/60 dark:border-white/30 bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/90">
                                    Kapat
                                </button>
                                <button type="submit" disabled={isSaving} className="neo-btn bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-4 py-2 disabled:opacity-60 shadow-md">
                                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;

