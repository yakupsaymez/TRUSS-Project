import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LaptopMinimal,
  Loader2,
  LogOut,
  Moon,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import api from '@/services/api';
import adminService from '@/services/adminService';
import useAuthStore from '@/store/useAuthStore';
import useAppStore from '@/store/useAppStore';
import useVehicleStore from '@/store/useVehicleStore';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber } from '@/utils/formatters';
import { useTheme } from '@/components/theme-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const BASE_SETTINGS_TABS = [
  { id: 'genel', label: 'Genel', icon: SlidersHorizontal },
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'guvenlik', label: 'Güvenlik', icon: ShieldCheck },
  { id: 'bildirimler', label: 'Bildirimler', icon: Bell },
];

const TAX_NUMBER_RE = /^\d{10,11}$/;

function formatOrgDate(isoLike) {
  if (!isoLike) return '—';
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) {
    const str = String(isoLike).slice(0, 10);
    const [y, m, d] = str.split('-');
    return y && m && d ? `${d}.${m}.${y}` : '—';
  }
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Açık', icon: Sun },
  { value: 'dark', label: 'Koyu', icon: Moon },
  { value: 'system', label: 'Sistem', icon: LaptopMinimal },
];

const ROLE_LABELS = {
  [ROLES.SYSTEM_ADMIN]: 'Sistem Admini',
  [ROLES.FLEET_MANAGER]: 'Filo Yöneticisi',
  [ROLES.DRIVER]: 'Şoför',
};

const PERMISSION_LABELS = {
  // Backend & CrewDataTable yetki anahtarları
  yakit: 'Yakıt Kayıtları',
  bakim: 'Bakım Kayıtları',
  finans: 'Finans & Analitik',
  zimmet: 'Araç Zimmeti',
  envanter: 'Parça & Envanter',
  ekip: 'Ekip Yönetimi',
  // Blueprint alias anahtarları
  arac_goruntuleme: 'Araç Görüntüleme',
  yakit_bakim: 'Yakıt & Bakım',
  parca_takibi: 'Parça Takibi',
  filo_yonetimi: 'Filo Yönetimi',
  ekip_yonetimi: 'Ekip Yönetimi',
};

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function Ayarlar() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const user = useAuthStore((s) => s.user);
  const handleLogout = useAppStore((s) => s.handleLogout);

  const role = resolveRole(user);
  const isManager = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const isSystemAdmin = role === ROLES.SYSTEM_ADMIN;

  const settingsTabs = useMemo(
    () =>
      isManager
        ? [...BASE_SETTINGS_TABS, { id: 'organizasyon', label: 'Organizasyon', icon: Building2 }]
        : BASE_SETTINGS_TABS,
    [isManager]
  );

  const [activeTab, setActiveTab] = useState('genel');
  const [loading, setLoading] = useState(true);

  // Genel tercihler
  const [dil, setDil] = useState('TR');
  const [paraBirimi, setParaBirimi] = useState('TRY');
  const [olcuBirimi, setOlcuBirimi] = useState('KM');
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Profil & bildirimler
  const [adSoyad, setAdSoyad] = useState(user?.ad_soyad || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telefon, setTelefon] = useState('');
  const [emailBildirimAktif, setEmailBildirimAktif] = useState(true);
  const [smsBildirimAktif, setSmsBildirimAktif] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Organizasyon (yalnız SYSTEM_ADMIN & FLEET_MANAGER)
  const [orgMeta, setOrgMeta] = useState(null);
  const [orgUnvan, setOrgUnvan] = useState('');
  const [orgVergiNo, setOrgVergiNo] = useState('');
  const [orgErrors, setOrgErrors] = useState({});
  const [orgFormError, setOrgFormError] = useState('');
  const [savingOrganization, setSavingOrganization] = useState(false);

  // Güvenlik — Şifre değiştirme
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordFormError, setPasswordFormError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Güvenlik — Hesap silme (yalnız SYSTEM_ADMIN)
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isManager && activeTab === 'organizasyon') {
      setActiveTab('genel');
    }
  }, [isManager, activeTab]);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setLoading(true);
      const promises = [
        api.get('/users/settings/preferences'),
        api.get('/users/settings/notifications'),
      ];
      if (isManager) {
        promises.push(adminService.getOrganization());
      }

      const [preferencesResult, notificationsResult, organizationResult] =
        await Promise.allSettled(promises);

      if (!active || !mountedRef.current) return;

      if (preferencesResult.status === 'fulfilled') {
        const prefs = preferencesResult.value?.data?.preferences || {};
        setDil(prefs.dil || 'TR');
        setParaBirimi(prefs.para_birimi || 'TRY');
        setOlcuBirimi(prefs.olcu_birimi || 'KM');
      } else {
        notifyApiError(preferencesResult.reason, 'Uygulama tercihleri yüklenemedi.');
      }

      if (notificationsResult.status === 'fulfilled') {
        const info = notificationsResult.value?.data?.user || {};
        setAdSoyad(info.ad_soyad || user?.ad_soyad || '');
        setEmail(info.email || user?.email || '');
        setTelefon(info.telefon || '');
        setEmailBildirimAktif(Boolean(info.email_bildirim_aktif));
        setSmsBildirimAktif(Boolean(info.sms_bildirim_aktif));
      } else {
        notifyApiError(notificationsResult.reason, 'Bildirim ayarları yüklenemedi.');
      }

      if (isManager && organizationResult) {
        if (organizationResult.status === 'fulfilled') {
          const org = organizationResult.value || null;
          setOrgMeta(org);
          setOrgUnvan(org?.unvan || '');
          setOrgVergiNo(org?.vergi_no || '');
        } else {
          notifyApiError(organizationResult.reason, 'Organizasyon profili yüklenemedi.');
        }
      }

      setLoading(false);
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, [user?.ad_soyad, user?.email, isManager]);

  const activePermissions = useMemo(() => {
    if (isManager) return [];
    const raw = user?.yetkiler;
    if (!raw || typeof raw !== 'object') return [];
    return Object.entries(raw)
      .filter(([, allowed]) => allowed === true)
      .map(([key]) => ({
        key,
        label: PERMISSION_LABELS[key] || key,
      }));
  }, [isManager, user?.yetkiler]);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPreferences(true);
    try {
      await api.put('/users/settings/preferences', {
        dil,
        para_birimi: paraBirimi,
        olcu_birimi: olcuBirimi,
      });
      await useAppStore.getState().syncPreferenceSummary(true);
      toast.success('Tercihler güncellendi.');
    } catch (err) {
      notifyApiError(err, 'Tercihler güncellenemedi.');
    } finally {
      if (mountedRef.current) setSavingPreferences(false);
    }
  };

  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    setSavingNotifications(true);
    try {
      await api.put('/users/settings/notifications', {
        telefon: telefon.trim(),
        email_bildirim_aktif: emailBildirimAktif,
        sms_bildirim_aktif: smsBildirimAktif,
      });
      toast.success('Bildirim ayarları güncellendi.');
    } catch (err) {
      notifyApiError(err, 'Bildirim ayarları güncellenemedi.');
    } finally {
      if (mountedRef.current) setSavingNotifications(false);
    }
  };

  const clearPasswordError = (key) => {
    if (passwordErrors[key]) {
      setPasswordErrors((prev) => ({ ...prev, [key]: '' }));
    }
    if (passwordFormError) setPasswordFormError('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (savingPassword) return;

    const errors = {};
    if (!currentPassword) {
      errors.currentPassword = 'Mevcut şifre gereklidir.';
    }
    if (!newPassword) {
      errors.newPassword = 'Yeni şifre gereklidir.';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Yeni şifre en az 6 karakter olmalıdır.';
    } else if (currentPassword && newPassword === currentPassword) {
      errors.newPassword = 'Yeni şifre mevcut şifrenizden farklı olmalıdır.';
    }

    if (!confirmNewPassword) {
      errors.confirmNewPassword = 'Yeni şifre tekrarı gereklidir.';
    } else if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = 'Yeni şifreler eşleşmiyor.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    setPasswordFormError('');
    setSavingPassword(true);
    try {
      await api.put('/users/settings/password', {
        mevcut_sifre: currentPassword,
        yeni_sifre: newPassword,
      });
      if (!mountedRef.current) return;
      toast.success('Şifreniz başarıyla güncellendi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    } catch (err) {
      if (!mountedRef.current) return;
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || 'Şifre güncellenemedi.';
      if (code === 'CURRENT_PASSWORD_INVALID' || err?.response?.status === 401) {
        setPasswordErrors((prev) => ({ ...prev, currentPassword: msg }));
      } else {
        setPasswordFormError(msg);
      }
      notifyApiError(err, 'Şifre güncellenemedi.');
    } finally {
      if (mountedRef.current) setSavingPassword(false);
    }
  };

  const clearOrgError = (key) => {
    if (orgErrors[key]) {
      setOrgErrors((prev) => ({ ...prev, [key]: '' }));
    }
    if (orgFormError) setOrgFormError('');
  };

  const handleSaveOrganization = async (e) => {
    e.preventDefault();
    if (!isManager || savingOrganization) return;

    const trimmedUnvan = orgUnvan.trim();
    const trimmedVergiNo = orgVergiNo.trim();
    const errors = {};

    if (!trimmedUnvan) {
      errors.unvan = 'Organizasyon ünvanı gereklidir.';
    } else if (trimmedUnvan.length < 2) {
      errors.unvan = 'Organizasyon ünvanı en az 2 karakter olmalıdır.';
    } else if (trimmedUnvan.length > 200) {
      errors.unvan = 'Organizasyon ünvanı en fazla 200 karakter olabilir.';
    }

    if (trimmedVergiNo && !TAX_NUMBER_RE.test(trimmedVergiNo)) {
      errors.vergi_no = 'Vergi numarası yalnızca 10 veya 11 haneli rakam olmalıdır.';
    }

    if (Object.keys(errors).length > 0) {
      setOrgErrors(errors);
      return;
    }

    setOrgErrors({});
    setOrgFormError('');
    setSavingOrganization(true);
    try {
      const res = await adminService.updateOrganization({
        unvan: trimmedUnvan,
        vergi_no: trimmedVergiNo || null,
      });
      if (!mountedRef.current) return;
      const updatedOrg = res?.organization || null;
      if (updatedOrg) {
        setOrgMeta((prev) => ({
          ...(prev || {}),
          ...updatedOrg,
        }));
        setOrgUnvan(updatedOrg.unvan || trimmedUnvan);
        setOrgVergiNo(updatedOrg.vergi_no || '');
      }
      toast.success('Organizasyon profili güncellendi.');
    } catch (err) {
      if (!mountedRef.current) return;
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || 'Organizasyon profili güncellenemedi.';
      if (status === 409 || code === 'TAX_NUMBER_EXISTS') {
        setOrgErrors((prev) => ({ ...prev, vergi_no: msg }));
      } else if (status === 400) {
        setOrgFormError(msg);
      } else {
        setOrgFormError(msg);
      }
      notifyApiError(err, 'Organizasyon profili güncellenemedi.');
    } finally {
      if (mountedRef.current) setSavingOrganization(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!isSystemAdmin) return;
    if (confirmText.trim().toUpperCase() !== 'ONAYLIYORUM') return;

    setIsDeleting(true);
    try {
      await api.delete('/users/settings/account');
      toast.success('Hesabınız silindi.');
      useAuthStore.getState().logout();
      useVehicleStore.getState().reset();
      navigate('/login');
    } catch (err) {
      notifyApiError(err, 'Hesap silinemedi.');
    } finally {
      if (mountedRef.current) setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Ayarlar</h1>
        <p className="text-xs text-muted-foreground">
          Genel uygulama tercihleri, profil bilgileri, oturum güvenliği ve bildirim kanalları
        </p>
      </div>

      {/* account-settings-09 tabanlı 2 sütunlu ayar kabuğu */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col lg:flex-row">
          {/* Mobil yatay kaydırılabilir sekme şeridi */}
          <nav
            aria-label="Ayar kategorileri"
            role="tablist"
            className="flex gap-1 overflow-x-auto border-b border-border p-2.5 lg:hidden"
          >
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Masaüstü sol 220px dikey navigasyon */}
          <nav
            aria-label="Ayar kategorileri"
            role="tablist"
            className="hidden w-[220px] shrink-0 flex-col gap-1 border-r border-border p-3 lg:flex"
          >
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sağ içerik paneli */}
          <div className="min-w-0 flex-1 p-5 sm:p-6">
            {loading ? (
              <SettingsSkeleton />
            ) : (
              <>
                {/* 1. GENEL */}
                {activeTab === 'genel' && (
                  <form onSubmit={handleSavePreferences} className="space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-foreground">Genel Tercihler</h2>
                      <p className="text-xs text-muted-foreground">
                        Dil, para birimi, ölçü birimi ve arayüz temasını yapılandırın.
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="grid gap-2">
                        <Label htmlFor="settings-dil">Dil</Label>
                        <Select value={dil} onValueChange={setDil} disabled={savingPreferences}>
                          <SelectTrigger id="settings-dil" className="w-full">
                            <SelectValue placeholder="Dil seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TR">Türkçe (TR)</SelectItem>
                            <SelectItem value="EN">İngilizce (EN)</SelectItem>
                            <SelectItem value="RU">Rusça (RU)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="settings-para-birimi">Para Birimi</Label>
                        <Select
                          value={paraBirimi}
                          onValueChange={setParaBirimi}
                          disabled={savingPreferences}
                        >
                          <SelectTrigger id="settings-para-birimi" className="w-full">
                            <SelectValue placeholder="Para birimi seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                            <SelectItem value="USD">ABD Doları ($)</SelectItem>
                            <SelectItem value="EUR">Euro (€)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="settings-olcu-birimi">Ölçü Birimi</Label>
                        <Select
                          value={olcuBirimi}
                          onValueChange={setOlcuBirimi}
                          disabled={savingPreferences}
                        >
                          <SelectTrigger id="settings-olcu-birimi" className="w-full">
                            <SelectValue placeholder="Ölçü birimi seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KM">Kilometre (KM)</SelectItem>
                            <SelectItem value="MI">Mil (MI)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2.5">
                      <div className="space-y-0.5">
                        <Label>Arayüz Teması</Label>
                        <p className="text-xs text-muted-foreground">
                          Tema seçimi tarayıcınızda anında uygulanır.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 sm:max-w-md">
                        {THEME_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const isSelected = theme === option.value;
                          return (
                            <Button
                              key={option.value}
                              type="button"
                              variant="outline"
                              onClick={() => setTheme(option.value)}
                              aria-pressed={isSelected}
                              className={cn(
                                'h-10 gap-2 text-xs font-medium',
                                isSelected
                                  ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <Icon className="size-4 shrink-0" aria-hidden="true" />
                              <span>{option.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-border pt-4">
                      <Button type="submit" size="sm" disabled={savingPreferences} className="gap-2">
                        {savingPreferences ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Save className="size-4" aria-hidden="true" />
                        )}
                        <span>Tercihleri Kaydet</span>
                      </Button>
                    </div>
                  </form>
                )}

                {/* 2. PROFİL */}
                {activeTab === 'profil' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-foreground">Profil Bilgileri</h2>
                      <p className="text-xs text-muted-foreground">
                        Oturum kimliğiniz, organizasyon rolünüz ve aktif modül yetkileriniz.
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="settings-ad-soyad">Ad Soyad</Label>
                        <Input
                          id="settings-ad-soyad"
                          type="text"
                          value={adSoyad || '—'}
                          readOnly
                          disabled
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="settings-email">E-posta</Label>
                        <Input
                          id="settings-email"
                          type="email"
                          value={email || '—'}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Oturum Rolü</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex h-7 items-center rounded-md border bg-card px-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider',
                              isManager
                                ? 'border-primary text-primary'
                                : 'border-border text-muted-foreground'
                            )}
                          >
                            {role}
                          </span>
                          <span className="text-xs font-medium text-foreground">
                            {ROLE_LABELS[role] || role}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Aktif Yetkiler</p>
                        <div className="flex flex-wrap gap-1.5">
                          {isManager ? (
                            <Badge
                              variant="outline"
                              className="border-primary/40 bg-primary/10 text-primary"
                            >
                              Tam erişim
                            </Badge>
                          ) : activePermissions.length > 0 ? (
                            activePermissions.map((perm) => (
                              <Badge key={perm.key} variant="secondary">
                                {perm.label}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Standart sürücü erişimi
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        Ad soyad ve e-posta değişiklikleri için sistem veya filo yöneticinizle
                        iletişime geçin.
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. GÜVENLİK */}
                {activeTab === 'guvenlik' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-foreground">
                        Güvenlik ve Oturum
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Şifre yenileme politikası ve aktif cihaz oturum yönetimi.
                      </p>
                    </div>

                    <Separator />

                    {/* Canlı Şifre Değiştirme Formu */}
                    <form
                      onSubmit={handleChangePassword}
                      noValidate
                      className="space-y-4 rounded-xl border border-border bg-background/60 p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                          <KeyRound className="size-4" aria-hidden="true" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-foreground">Şifre Değiştir</h3>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Mevcut şifrenizi doğrulayarak hesabınız için yeni bir giriş şifresi
                            belirleyin.
                          </p>
                        </div>
                      </div>

                      {passwordFormError ? (
                        <div
                          role="alert"
                          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs leading-relaxed text-destructive"
                        >
                          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <span>{passwordFormError}</span>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                          <Label htmlFor="settings-current-password">Mevcut Şifre</Label>
                          <InputGroup>
                            <InputGroupInput
                              id="settings-current-password"
                              name="currentPassword"
                              type={showCurrentPassword ? 'text' : 'password'}
                              placeholder="Mevcut şifreniz"
                              autoComplete="current-password"
                              required
                              value={currentPassword}
                              onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                clearPasswordError('currentPassword');
                              }}
                              disabled={savingPassword}
                              aria-invalid={Boolean(passwordErrors.currentPassword)}
                              aria-describedby={
                                passwordErrors.currentPassword
                                  ? 'settings-current-password-error'
                                  : undefined
                              }
                            />
                            <InputGroupAddon align="inline-end" className="pr-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setShowCurrentPassword((prev) => !prev)}
                                disabled={savingPassword}
                                aria-label={
                                  showCurrentPassword
                                    ? 'Mevcut şifreyi gizle'
                                    : 'Mevcut şifreyi göster'
                                }
                                aria-pressed={showCurrentPassword}
                                className="text-muted-foreground hover:bg-transparent hover:text-foreground"
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="size-4" aria-hidden="true" />
                                ) : (
                                  <Eye className="size-4" aria-hidden="true" />
                                )}
                              </Button>
                            </InputGroupAddon>
                          </InputGroup>
                          {passwordErrors.currentPassword ? (
                            <p
                              id="settings-current-password-error"
                              role="alert"
                              className="text-xs text-destructive"
                            >
                              {passwordErrors.currentPassword}
                            </p>
                          ) : null}
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="settings-new-password">Yeni Şifre</Label>
                          <InputGroup>
                            <InputGroupInput
                              id="settings-new-password"
                              name="newPassword"
                              type={showNewPassword ? 'text' : 'password'}
                              placeholder="En az 6 karakter"
                              autoComplete="new-password"
                              required
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                clearPasswordError('newPassword');
                              }}
                              disabled={savingPassword}
                              aria-invalid={Boolean(passwordErrors.newPassword)}
                              aria-describedby={
                                passwordErrors.newPassword
                                  ? 'settings-new-password-error'
                                  : undefined
                              }
                            />
                            <InputGroupAddon align="inline-end" className="pr-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setShowNewPassword((prev) => !prev)}
                                disabled={savingPassword}
                                aria-label={
                                  showNewPassword ? 'Yeni şifreyi gizle' : 'Yeni şifreyi göster'
                                }
                                aria-pressed={showNewPassword}
                                className="text-muted-foreground hover:bg-transparent hover:text-foreground"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="size-4" aria-hidden="true" />
                                ) : (
                                  <Eye className="size-4" aria-hidden="true" />
                                )}
                              </Button>
                            </InputGroupAddon>
                          </InputGroup>
                          {passwordErrors.newPassword ? (
                            <p
                              id="settings-new-password-error"
                              role="alert"
                              className="text-xs text-destructive"
                            >
                              {passwordErrors.newPassword}
                            </p>
                          ) : null}
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="settings-confirm-new-password">Yeni Şifre Tekrar</Label>
                          <InputGroup>
                            <InputGroupInput
                              id="settings-confirm-new-password"
                              name="confirmNewPassword"
                              type={showConfirmNewPassword ? 'text' : 'password'}
                              placeholder="Yeni şifreyi tekrarlayın"
                              autoComplete="new-password"
                              required
                              value={confirmNewPassword}
                              onChange={(e) => {
                                setConfirmNewPassword(e.target.value);
                                clearPasswordError('confirmNewPassword');
                              }}
                              disabled={savingPassword}
                              aria-invalid={Boolean(passwordErrors.confirmNewPassword)}
                              aria-describedby={
                                passwordErrors.confirmNewPassword
                                  ? 'settings-confirm-new-password-error'
                                  : undefined
                              }
                            />
                            <InputGroupAddon align="inline-end" className="pr-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                                disabled={savingPassword}
                                aria-label={
                                  showConfirmNewPassword
                                    ? 'Yeni şifre tekrarını gizle'
                                    : 'Yeni şifre tekrarını göster'
                                }
                                aria-pressed={showConfirmNewPassword}
                                className="text-muted-foreground hover:bg-transparent hover:text-foreground"
                              >
                                {showConfirmNewPassword ? (
                                  <EyeOff className="size-4" aria-hidden="true" />
                                ) : (
                                  <Eye className="size-4" aria-hidden="true" />
                                )}
                              </Button>
                            </InputGroupAddon>
                          </InputGroup>
                          {passwordErrors.confirmNewPassword ? (
                            <p
                              id="settings-confirm-new-password-error"
                              role="alert"
                              className="text-xs text-destructive"
                            >
                              {passwordErrors.confirmNewPassword}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex justify-end border-t border-border pt-3">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={savingPassword}
                          className="gap-2"
                        >
                          {savingPassword ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Save className="size-4" aria-hidden="true" />
                          )}
                          <span>Şifreyi Güncelle</span>
                        </Button>
                      </div>
                    </form>

                    <div className="space-y-4 rounded-xl border border-border bg-background/60 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                          <KeyRound className="size-4" aria-hidden="true" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-foreground">
                            Şifre ve Erişim Yönetimi
                          </h3>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Şifre değişikliği veya erişim yenileme talepleri için sistem/filo
                            yöneticinize başvurun.
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">Aktif Oturum</p>
                          <p className="text-xs text-muted-foreground">
                            Bu cihazdaki oturumunuzu güvenli şekilde sonlandırabilirsiniz.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleLogout(navigate)}
                          className="gap-2"
                        >
                          <LogOut className="size-4" aria-hidden="true" />
                          <span>Bu Cihazdan Çıkış Yap</span>
                        </Button>
                      </div>
                    </div>

                    {/* P0 RBAC KİLİDİ: Tehlikeli Bölge YALNIZCA SYSTEM_ADMIN için render edilir */}
                    {isSystemAdmin && (
                      <div className="space-y-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
                            <AlertTriangle className="size-4" aria-hidden="true" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-destructive">
                              Tehlikeli Bölge — Hesabı Sil
                            </h3>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Hesap silme işlemi geri alınamaz. Devam etmek için{' '}
                              <span className="font-mono font-semibold text-foreground">
                                ONAYLIYORUM
                              </span>{' '}
                              yazın.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="ONAYLIYORUM"
                            aria-label="Hesap silme onay metni"
                            disabled={isDeleting}
                            className="bg-background sm:max-w-xs"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={
                              confirmText.trim().toUpperCase() !== 'ONAYLIYORUM' || isDeleting
                            }
                            onClick={handleDeleteAccount}
                            className="gap-2"
                          >
                            {isDeleting ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="size-4" aria-hidden="true" />
                            )}
                            <span>Hesabı Kalıcı Olarak Sil</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. BİLDİRİMLER */}
                {activeTab === 'bildirimler' && (
                  <form onSubmit={handleSaveNotifications} className="space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-foreground">
                        Bildirim Kanalları
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Bakım, belge vadesi ve kritik filo uyarılarının iletileceği kanalları seçin.
                      </p>
                    </div>

                    <Separator />

                    <div className="grid max-w-md gap-2">
                      <Label htmlFor="settings-telefon">Telefon Numarası</Label>
                      <Input
                        id="settings-telefon"
                        type="tel"
                        maxLength={20}
                        autoComplete="tel"
                        placeholder="05xx xxx xx xx"
                        value={telefon}
                        onChange={(e) => setTelefon(e.target.value)}
                        disabled={savingNotifications}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/60 p-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="settings-email-bildirim" className="text-sm font-medium">
                            E-posta Bildirimleri
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Yaklaşan bakım ve evrak bitiş uyarılarını kayıtlı e-posta adresinize
                            alın.
                          </p>
                        </div>
                        <Switch
                          id="settings-email-bildirim"
                          checked={emailBildirimAktif}
                          onCheckedChange={setEmailBildirimAktif}
                          disabled={savingNotifications}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/60 p-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="settings-sms-bildirim" className="text-sm font-medium">
                            SMS Bildirimleri
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Kritik bakım eşikleri için telefon numaranıza anlık SMS bildirimi
                            gönderilir.
                          </p>
                        </div>
                        <Switch
                          id="settings-sms-bildirim"
                          checked={smsBildirimAktif}
                          onCheckedChange={setSmsBildirimAktif}
                          disabled={savingNotifications}
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>Kaydettiğinizde aktif kanallara test bildirimi gönderilir.</span>
                    </div>

                    <div className="flex justify-end border-t border-border pt-4">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingNotifications}
                        className="gap-2"
                      >
                        {savingNotifications ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Save className="size-4" aria-hidden="true" />
                        )}
                        <span>Bildirim Ayarlarını Kaydet</span>
                      </Button>
                    </div>
                  </form>
                )}

                {/* 5. ORGANİZASYON (P0 RBAC: YALNIZCA SYSTEM_ADMIN & FLEET_MANAGER) */}
                {isManager && activeTab === 'organizasyon' && (
                  <form onSubmit={handleSaveOrganization} noValidate className="space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-foreground">
                        Organizasyon Profili
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Kurumsal filo organizasyon ünvanı, vergi numarası ve çalışma alanı özeti.
                      </p>
                    </div>

                    <Separator />

                    {/* 3'lü Salt-Okunur Kurumsal Özet Şeridi */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="flex items-start justify-between gap-2.5 rounded-xl border border-border bg-background/60 p-4">
                        <div className="min-w-0 space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Plan & Durum</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="border-primary/40 bg-primary/10 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary"
                            >
                              {orgMeta?.plan_tipi || 'ENTERPRISE'}
                            </Badge>
                            <Badge
                              variant={orgMeta?.aktif !== false ? 'secondary' : 'outline'}
                              className="text-[11px]"
                            >
                              {orgMeta?.aktif !== false ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="size-4" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2.5 rounded-xl border border-border bg-background/60 p-4">
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Kayıtlı Ekip & Filo
                          </p>
                          <p className="truncate font-mono text-sm font-semibold tabular-nums text-foreground">
                            {formatLocaleNumber(Number(orgMeta?.uye_sayisi || 0), 0)} üye ·{' '}
                            {formatLocaleNumber(Number(orgMeta?.arac_sayisi || 0), 0)} araç
                          </p>
                        </div>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Users className="size-4" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2.5 rounded-xl border border-border bg-background/60 p-4">
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Oluşturulma Tarihi
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                              {formatOrgDate(orgMeta?.olusturulma_tarihi)}
                            </span>
                            <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                              Org ID: #{orgMeta?.org_id ?? user?.org_id ?? '—'}
                            </span>
                          </div>
                        </div>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <CalendarDays className="size-4" aria-hidden="true" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* account-settings-03 tabanlı Kurumsal Bilgiler Formu */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">
                          Kurumsal Kimlik Bilgileri
                        </h3>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Raporlarda ve çalışma alanında görünecek resmi organizasyon ünvanı ile
                          vergi numarasını güncelleyin.
                        </p>
                      </div>

                      <div className="space-y-4 lg:col-span-2">
                        {orgFormError ? (
                          <div
                            role="alert"
                            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs leading-relaxed text-destructive"
                          >
                            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <span>{orgFormError}</span>
                          </div>
                        ) : null}

                        <div className="grid gap-2">
                          <Label htmlFor="settings-org-unvan">
                            Organizasyon / Filo Ünvanı{' '}
                            <span className="text-destructive" aria-hidden="true">
                              *
                            </span>
                          </Label>
                          <Input
                            id="settings-org-unvan"
                            name="unvan"
                            type="text"
                            maxLength={200}
                            placeholder="Örn: TRUSS Lojistik A.Ş."
                            required
                            value={orgUnvan}
                            onChange={(e) => {
                              setOrgUnvan(e.target.value);
                              clearOrgError('unvan');
                            }}
                            disabled={savingOrganization}
                            aria-invalid={Boolean(orgErrors.unvan)}
                            aria-describedby={
                              orgErrors.unvan ? 'settings-org-unvan-error' : undefined
                            }
                          />
                          {orgErrors.unvan ? (
                            <p
                              id="settings-org-unvan-error"
                              role="alert"
                              className="text-xs text-destructive"
                            >
                              {orgErrors.unvan}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              2 ile 200 karakter arasında kurumsal ünvan.
                            </p>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="settings-org-vergi-no">
                            Vergi Numarası (VKN / TCKN)
                          </Label>
                          <Input
                            id="settings-org-vergi-no"
                            name="vergi_no"
                            type="text"
                            inputMode="numeric"
                            maxLength={11}
                            placeholder="10 haneli VKN veya 11 haneli TCKN (opsiyonel)"
                            value={orgVergiNo}
                            onChange={(e) => {
                              setOrgVergiNo(e.target.value);
                              clearOrgError('vergi_no');
                            }}
                            disabled={savingOrganization}
                            aria-invalid={Boolean(orgErrors.vergi_no)}
                            aria-describedby={
                              orgErrors.vergi_no ? 'settings-org-vergi-no-error' : undefined
                            }
                            className="font-mono tabular-nums"
                          />
                          {orgErrors.vergi_no ? (
                            <p
                              id="settings-org-vergi-no-error"
                              role="alert"
                              className="text-xs text-destructive"
                            >
                              {orgErrors.vergi_no}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Opsiyonel. Doldurulursa yalnızca 10 veya 11 haneli rakam olmalıdır.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-border pt-4">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingOrganization}
                        className="gap-2"
                      >
                        {savingOrganization ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Save className="size-4" aria-hidden="true" />
                        )}
                        <span>Organizasyon Profilini Kaydet</span>
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
