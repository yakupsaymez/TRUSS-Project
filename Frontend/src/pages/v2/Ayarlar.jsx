import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, History } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BASE_SETTINGS_TABS } from './ayarlar/ayarlarConstants';
import useAyarlarData from './ayarlar/useAyarlarData';
import GenelTab from './ayarlar/GenelTab';
import ProfilTab from './ayarlar/ProfilTab';
import GuvenlikTab from './ayarlar/GuvenlikTab';
import BildirimlerTab from './ayarlar/BildirimlerTab';
import OrganizasyonTab from './ayarlar/OrganizasyonTab';
import DenetimTab from './ayarlar/DenetimTab';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const role = resolveRole(user);
  const isManager = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const isSystemAdmin = role === ROLES.SYSTEM_ADMIN;
  const canViewAudit =
    role === ROLES.SYSTEM_ADMIN || (role === ROLES.FLEET_MANAGER && Boolean(user?.org_id));

  const settingsTabs = useMemo(() => {
    const tabs = [...BASE_SETTINGS_TABS];
    if (isManager) {
      tabs.push({ id: 'organizasyon', label: 'Organizasyon', icon: Building2 });
    }
    if (canViewAudit) {
      tabs.push({ id: 'denetim', label: 'Denetim İzi', icon: History });
    }
    return tabs;
  }, [isManager, canViewAudit]);

  const urlTab = searchParams.get('tab');
  const resolvedUrlTab =
    urlTab &&
    settingsTabs.some((t) => t.id === urlTab) &&
    (urlTab !== 'organizasyon' || isManager) &&
    (urlTab !== 'denetim' || canViewAudit)
      ? urlTab
      : null;

  const [activeTab, setActiveTab] = useState(() => resolvedUrlTab || 'genel');

  useEffect(() => {
    if (resolvedUrlTab) {
      setActiveTab((prev) => (prev === resolvedUrlTab ? prev : resolvedUrlTab));
    } else if ((!isManager && activeTab === 'organizasyon') || (!canViewAudit && activeTab === 'denetim')) {
      setActiveTab('genel');
    }
  }, [resolvedUrlTab, isManager, canViewAudit, activeTab]);

  const handleTabChange = (tabId) => {
    if (!settingsTabs.some((t) => t.id === tabId)) return;
    if (tabId === 'organizasyon' && !isManager) return;
    if (tabId === 'denetim' && !canViewAudit) return;
    setActiveTab(tabId);
    const next = new URLSearchParams(searchParams);
    if (tabId === 'genel') {
      next.delete('tab');
    } else {
      next.set('tab', tabId);
    }
    setSearchParams(next, { replace: true });
  };

  const data = useAyarlarData({ user, isManager });

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
                  onClick={() => handleTabChange(tab.id)}
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
                  onClick={() => handleTabChange(tab.id)}
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
            {data.loading ? (
              <SettingsSkeleton />
            ) : (
              <>
                {activeTab === 'genel' && (
                  <GenelTab
                    dil={data.dil}
                    setDil={data.setDil}
                    paraBirimi={data.paraBirimi}
                    setParaBirimi={data.setParaBirimi}
                    olcuBirimi={data.olcuBirimi}
                    setOlcuBirimi={data.setOlcuBirimi}
                  />
                )}

                {activeTab === 'profil' && (
                  <ProfilTab
                    adSoyad={data.adSoyad}
                    email={data.email}
                    role={role}
                    isManager={isManager}
                    activePermissions={data.activePermissions}
                  />
                )}

                {activeTab === 'guvenlik' && <GuvenlikTab isSystemAdmin={isSystemAdmin} />}

                {activeTab === 'bildirimler' && (
                  <BildirimlerTab
                    telefon={data.telefon}
                    setTelefon={data.setTelefon}
                    emailBildirimAktif={data.emailBildirimAktif}
                    setEmailBildirimAktif={data.setEmailBildirimAktif}
                    smsBildirimAktif={data.smsBildirimAktif}
                    setSmsBildirimAktif={data.setSmsBildirimAktif}
                    bildirimTercihleri={data.bildirimTercihleri}
                    setBildirimTercihleri={data.setBildirimTercihleri}
                  />
                )}

                {isManager && activeTab === 'organizasyon' && (
                  <OrganizasyonTab
                    isManager={isManager}
                    user={user}
                    orgMeta={data.orgMeta}
                    setOrgMeta={data.setOrgMeta}
                    orgUnvan={data.orgUnvan}
                    setOrgUnvan={data.setOrgUnvan}
                    orgVergiNo={data.orgVergiNo}
                    setOrgVergiNo={data.setOrgVergiNo}
                    pageMountedRef={data.pageMountedRef}
                  />
                )}

                {canViewAudit && activeTab === 'denetim' && <DenetimTab />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
