import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const routeTitleMap = {
    '/login': 'ABTS - Giris',
    '/register': 'ABTS - Kayit',
    '/dashboard': 'ABTS - Filo Kontrol Merkezi'
};

const defaultSettingsForm = {
    ad_soyad: '',
    email: '',
    telefon: '',
    email_bildirim_aktif: true,
    sms_bildirim_aktif: true,
    dil: 'TR',
    para_birimi: 'TRY',
    olcu_birimi: 'KM'
};

const settingsTabs = [
    { key: 'hesap', label: 'Hesap' },
    { key: 'tercihler', label: 'Tercihler' },
    { key: 'bildirimler', label: 'Bildirimler' },
    { key: 'gelismis', label: 'Gelişmiş' }
];

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [theme, setTheme] = useState(() => localStorage.getItem('abts-theme') || 'dark');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [settingsForm, setSettingsForm] = useState(defaultSettingsForm);
    const [activeSettingsTab, setActiveSettingsTab] = useState('hesap');
    const [isDirty, setIsDirty] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const settingsCloseTimerRef = useRef(null);

    const isAuthenticated = Boolean(localStorage.getItem('token'));

    useEffect(() => {
        const syncPreferenceSummary = async () => {
            if (!isAuthenticated) {
                setSettingsForm(defaultSettingsForm);
                return;
            }

            try {
                const preferencesRes = await api.get('/users/settings/preferences');
                const preferences = preferencesRes.data?.preferences || {};
                setSettingsForm((prev) => ({
                    ...prev,
                    dil: preferences.dil || defaultSettingsForm.dil,
                    para_birimi: preferences.para_birimi || defaultSettingsForm.para_birimi,
                    olcu_birimi: preferences.olcu_birimi || defaultSettingsForm.olcu_birimi
                }));
            } catch (err) {
                // Keep defaults when summary fetch fails; settings modal still has full error handling.
            }
        };

        syncPreferenceSummary();
    }, [isAuthenticated]);

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
            const [preferencesResult, notificationsResult] = await Promise.allSettled([
                api.get('/users/settings/preferences'),
                api.get('/users/settings/notifications')
            ]);

            const preferences = preferencesResult.status === 'fulfilled'
                ? preferencesResult.value.data?.preferences || {}
                : {};
            const userInfo = notificationsResult.status === 'fulfilled'
                ? notificationsResult.value.data?.user || {}
                : {};

            setSettingsForm({
                ad_soyad: userInfo.ad_soyad || '',
                email: userInfo.email || '',
                telefon: userInfo.telefon || '',
                email_bildirim_aktif: userInfo.email_bildirim_aktif !== false,
                sms_bildirim_aktif: userInfo.sms_bildirim_aktif !== false,
                dil: preferences.dil || defaultSettingsForm.dil,
                para_birimi: preferences.para_birimi || defaultSettingsForm.para_birimi,
                olcu_birimi: preferences.olcu_birimi || defaultSettingsForm.olcu_birimi
            });
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Ayarlar yuklenemedi.');
            setSettingsForm(defaultSettingsForm);
        }

        setActiveSettingsTab('hesap');
        setDeleteConfirmText('');
        setIsDirty(false);
        setIsSettingsOpen(true);
        setIsSettingsVisible(true);
    };

    const closeSettings = () => {
        setIsSettingsVisible(false);
        settingsCloseTimerRef.current = setTimeout(() => {
            setIsSettingsOpen(false);
            setIsDirty(false);
            setDeleteConfirmText('');
            setActiveSettingsTab('hesap');
        }, 200);
    };

    const handleAttemptCloseSettings = () => {
        if (isDirty) {
            const onay = window.confirm('Kaydedilmemis degisiklikleriniz var, cikmak istediginize emin misiniz?');
            if (!onay) return;
        }
        closeSettings();
    };

    const handleSettingsChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettingsForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setIsDirty(true);
    };

    const handlePreferenceChange = (e) => {
        const { name, value } = e.target;
        setSettingsForm((prev) => ({
            ...prev,
            [name]: value
        }));
        setIsDirty(true);
    };

    const handleSettingsSave = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            await Promise.all([
                api.put('/users/settings/preferences', {
                    dil: settingsForm.dil,
                    para_birimi: settingsForm.para_birimi,
                    olcu_birimi: settingsForm.olcu_birimi
                }),
                api.put('/users/settings/notifications', {
                    telefon: settingsForm.telefon,
                    email_bildirim_aktif: settingsForm.email_bildirim_aktif,
                    sms_bildirim_aktif: settingsForm.sms_bildirim_aktif
                })
            ]);

            setIsDirty(false);
            toast.success('Ayarlar Kaydedildi');
            closeSettings();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Ayarlar kaydedilemedi.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccountIntent = async () => {
        if (deleteConfirmText.trim().toUpperCase() !== 'ONAYLIYORUM') {
            toast.error('Devam etmek icin ONAYLIYORUM yazmalisiniz.');
            return;
        }

        try {
            setIsSaving(true);
            await api.delete('/users/settings/account');
            toast.success('Hesabiniz silindi.');
            localStorage.removeItem('token');
            navigate('/login');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Hesap silinemedi.');
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
                        {isAuthenticated && (
                            <div className="hidden lg:flex items-center gap-2 rounded-xl border border-white/5 bg-slate-800/50 px-3 py-2 animate-fade-in">
                                <span className="text-xs uppercase tracking-wide text-slate-400">Tercihler</span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-slate-900/70 px-2 py-1 text-xs text-slate-200">
                                    <svg className="h-3.5 w-3.5 text-emerald-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm4.243 5.757a1 1 0 00-1.414-1.414L8.5 10.672 7.17 9.343a1 1 0 10-1.414 1.414l2.036 2.036a1 1 0 001.414 0l5.036-5.036z" clipRule="evenodd" />
                                    </svg>
                                    {settingsForm.dil}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-slate-900/70 px-2 py-1 text-xs text-slate-200">
                                    <svg className="h-3.5 w-3.5 text-amber-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v1a1 1 0 102 0V7zm0 3a1 1 0 10-2 0v3a1 1 0 102 0v-3z" />
                                    </svg>
                                    {settingsForm.para_birimi}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-slate-900/70 px-2 py-1 text-xs text-slate-200">
                                    <svg className="h-3.5 w-3.5 text-rose-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M11 3a1 1 0 00-2 0v1.126A4.002 4.002 0 006 8v3.586l-.707.707A1 1 0 006 14h8a1 1 0 00.707-1.707L14 11.586V8a4.002 4.002 0 00-3-3.874V3z" clipRule="evenodd" />
                                    </svg>
                                    {settingsForm.olcu_birimi}
                                </span>
                            </div>
                        )}
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
                <div
                    onClick={handleAttemptCloseSettings}
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ${isSettingsVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}
                >
                    <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-4xl glass-card p-6 ${isSettingsVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">Komuta Merkezi Ayarlari</h3>
                            <button
                                type="button"
                                onClick={handleAttemptCloseSettings}
                                className="h-8 w-8 rounded-md border border-white/20 text-slate-200 hover:bg-white/10"
                                aria-label="Ayarlar penceresini kapat"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSettingsSave} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                            <aside className="rounded-xl border border-white/10 bg-black/20 p-2">
                                {settingsTabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveSettingsTab(tab.key)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-300 mb-1 ${activeSettingsTab === tab.key
                                            ? 'bg-emerald-400 text-slate-950 font-semibold'
                                            : 'text-slate-200 hover:bg-white/10'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </aside>

                            <section className="rounded-xl border border-white/10 bg-black/20 p-4 animate-fade-in min-h-[320px]">
                                {activeSettingsTab === 'hesap' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-200">Ad Soyad</label>
                                            <input
                                                type="text"
                                                value={settingsForm.ad_soyad}
                                                disabled
                                                className="w-full rounded-md px-3 py-2 bg-slate-900/70 border border-white/15 text-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-200">E-posta</label>
                                            <input
                                                type="text"
                                                value={settingsForm.email}
                                                disabled
                                                className="w-full rounded-md px-3 py-2 bg-slate-900/70 border border-white/15 text-slate-200"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeSettingsTab === 'tercihler' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-200">Dil</label>
                                            <select name="dil" value={settingsForm.dil} onChange={handlePreferenceChange} className="w-full rounded-md px-3 py-2 bg-slate-950/75 border border-white/20 text-slate-100">
                                                <option value="TR">Türkçe (TR)</option>
                                                <option value="EN">İngilizce (EN)</option>
                                                <option value="RU">Rusça (RU)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-200">Para Birimi</label>
                                            <select name="para_birimi" value={settingsForm.para_birimi} onChange={handlePreferenceChange} className="w-full rounded-md px-3 py-2 bg-slate-950/75 border border-white/20 text-slate-100">
                                                <option value="TRY">TRY (₺)</option>
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-200">Birim</label>
                                            <select name="olcu_birimi" value={settingsForm.olcu_birimi} onChange={handlePreferenceChange} className="w-full rounded-md px-3 py-2 bg-slate-950/75 border border-white/20 text-slate-100">
                                                <option value="KM">Kilometre (KM)</option>
                                                <option value="MI">Mil (MI)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {activeSettingsTab === 'bildirimler' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-200">Telefon Numarasi</label>
                                            <input
                                                type="text"
                                                name="telefon"
                                                value={settingsForm.telefon}
                                                onChange={handleSettingsChange}
                                                className="w-full rounded-md px-3 py-2 bg-slate-950/75 border border-white/20 text-slate-100"
                                                placeholder="05xx xxx xx xx"
                                            />
                                        </div>

                                        <label htmlFor="layout_email_bildirim_aktif" className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
                                            <span className="text-sm text-slate-200">E-posta bildirimi istiyorum</span>
                                            <span className="relative inline-flex h-6 w-11 items-center">
                                                <input
                                                    id="layout_email_bildirim_aktif"
                                                    type="checkbox"
                                                    name="email_bildirim_aktif"
                                                    checked={settingsForm.email_bildirim_aktif}
                                                    onChange={handleSettingsChange}
                                                    className="peer sr-only"
                                                />
                                                <span className="absolute inset-0 rounded-full bg-slate-700 transition-colors peer-checked:bg-emerald-400" />
                                                <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                                            </span>
                                        </label>

                                        <label htmlFor="layout_sms_bildirim_aktif" className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
                                            <span className="text-sm text-slate-200">SMS bildirimi istiyorum</span>
                                            <span className="relative inline-flex h-6 w-11 items-center">
                                                <input
                                                    id="layout_sms_bildirim_aktif"
                                                    type="checkbox"
                                                    name="sms_bildirim_aktif"
                                                    checked={settingsForm.sms_bildirim_aktif}
                                                    onChange={handleSettingsChange}
                                                    className="peer sr-only"
                                                />
                                                <span className="absolute inset-0 rounded-full bg-slate-700 transition-colors peer-checked:bg-emerald-400" />
                                                <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                                            </span>
                                        </label>
                                    </div>
                                )}

                                {activeSettingsTab === 'gelismis' && (
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-rose-400/40 bg-rose-950/20 p-4">
                                            <h4 className="text-sm font-semibold text-rose-300 mb-2">Danger Zone</h4>
                                            <p className="text-sm text-rose-200 mb-3">
                                                Hesap silme islemi geri alinamaz. Devam etmek icin ONAYLIYORUM yazin.
                                            </p>
                                            <input
                                                type="text"
                                                value={deleteConfirmText}
                                                onChange={(e) => {
                                                    setDeleteConfirmText(e.target.value);
                                                    setIsDirty(true);
                                                }}
                                                className="w-full rounded-md px-3 py-2 bg-slate-950/80 border border-rose-300/40 text-slate-100"
                                                placeholder="ONAYLIYORUM"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleDeleteAccountIntent}
                                                className="mt-3 px-4 py-2 rounded-md bg-rose-500 hover:bg-rose-400 text-white font-semibold disabled:opacity-50"
                                                disabled={deleteConfirmText.trim().toUpperCase() !== 'ONAYLIYORUM' || isSaving}
                                            >
                                                {isSaving ? 'Siliniyor...' : 'Hesabimi Sil'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                <button type="button" onClick={handleAttemptCloseSettings} className="px-4 py-2 rounded-md border border-slate-400/60 dark:border-white/30 bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/90">
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

