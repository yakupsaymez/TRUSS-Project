import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronsUpDown,
  LaptopMinimal,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import useAuthStore from '@/store/useAuthStore';
import useAppStore from '@/store/useAppStore';
import useVehicleStore from '@/store/useVehicleStore';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { evrakRiskliMi, hesaplaBakimDurumu } from '@/utils/aracDurum';
import { formatTurkishPlate } from '@/utils/formatters';
import { navConfig } from '@/components/v2/navConfig';
import CommandPalette from '@/components/v2/CommandPalette';
import MovementSheet from '@/components/v2/MovementSheet';
import ComponentSheet from '@/components/v2/ComponentSheet';
import VehicleSheet from '@/components/v2/VehicleSheet';
import SidebarEdgeToggle from '@/components/shadcn-studio/blocks/sidebar-edge-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/motion-toggle-group';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const REFRESH_THROTTLE_MS = 60 * 1000;
const ALL_VEHICLES_VALUE = '__ALL__';

const ROUTE_LABELS = {
  '/app': 'Genel Bakış',
  '/app/filo': 'Filo',
  '/app/harita': 'Harita',
  '/app/hareketler': 'Hareketler',
  '/app/parcalar': 'Parçalar',
  '/app/takvim': 'Takvim',
  '/app/ekip': 'Ekip',
  '/app/ayarlar': 'Ayarlar',
};

function getInitials(name, email) {
  const source = (name || email || 'TR').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('tr-TR');
  }
  return source.slice(0, 2).toLocaleUpperCase('tr-TR');
}

function RoleBadge({ role, className }) {
  const isDriver = role === ROLES.DRIVER;
  return (
    <span
      title="Oturum rolü"
      className={cn(
        'inline-flex h-7 items-center rounded-md border bg-card px-2 font-mono text-[10px] font-semibold uppercase tracking-wider',
        isDriver
          ? 'border-border text-muted-foreground'
          : 'border-primary text-primary',
        className
      )}
    >
      {role}
    </span>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const handleLogout = useAppStore((s) => s.handleLogout);

  const araclar = useVehicleStore((s) => s.araclar);
  const hasLoaded = useVehicleStore((s) => s.hasLoaded);
  const loading = useVehicleStore((s) => s.loading);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const lastRefreshRef = useRef(0);
  const vehicleFetchAttemptedRef = useRef(false);
  const lastUserIdRef = useRef(user?.user_id ?? null);

  // Yetki senkronu: mount + visibilitychange (60 sn throttle, cleanup'lı)
  useEffect(() => {
    const syncUser = () => {
      lastRefreshRef.current = Date.now();
      refreshUser();
    };
    syncUser();

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefreshRef.current < REFRESH_THROTTLE_MS) return;
      syncUser();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshUser]);

  // Oturum kullanıcısı değiştiğinde araç store'unu sıfırla ve yeniden yükle
  useEffect(() => {
    const currentUserId = user?.user_id ?? null;
    if (lastUserIdRef.current !== currentUserId) {
      lastUserIdRef.current = currentUserId;
      vehicleFetchAttemptedRef.current = false;
      useVehicleStore.getState().reset();
      const token = localStorage.getItem('token');
      if (token && currentUserId) {
        vehicleFetchAttemptedRef.current = true;
        fetchAraclar();
      }
    }
  }, [user?.user_id, fetchAraclar]);

  // Araç listesi yüklü değilse bir kez yükle (hata sonrası sonsuz döngü önlenir)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !hasLoaded && !loading && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [hasLoaded, loading, fetchAraclar]);

  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canAddFuel = canManage || user?.yetkiler?.yakit === true;
  const canAddMaintenance = canManage || user?.yetkiler?.bakim === true;

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);
  const [movementSheetState, setMovementSheetState] = useState({
    open: false,
    initialTip: 'YAKIT',
    prefill: null,
  });
  const [componentSheetState, setComponentSheetState] = useState({
    open: false,
    prefill: null,
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const visibleNavItems = useMemo(
    () => navConfig.filter((i) => canAccessChannel(user, i.channel)),
    [user]
  );

  // Kritik Araçlar: evrakRiskliMi(arac) || hesaplaBakimDurumu(arac).durum === 'tehlike' (en fazla 5)
  const kritikAraclar = useMemo(() => {
    return araclar
      .filter((arac) => evrakRiskliMi(arac) || hesaplaBakimDurumu(arac).durum === 'tehlike')
      .slice(0, 5);
  }, [araclar]);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/app';
  const currentRouteLabel = ROUTE_LABELS[normalizedPath] || 'Genel Bakış';

  const isAllVehicles = !seciliAracId || seciliAracId === 'tum';
  const seciliArac = useMemo(() => {
    if (isAllVehicles) return null;
    return araclar.find((a) => String(a.arac_id) === String(seciliAracId)) || null;
  }, [araclar, isAllVehicles, seciliAracId]);

  const selectValue = isAllVehicles ? ALL_VEHICLES_VALUE : String(seciliAracId);

  const handleVehicleSelectChange = (val) => {
    if (val === ALL_VEHICLES_VALUE) {
      setSeciliAracId(null);
    } else {
      setSeciliAracId(val);
    }
  };

  const handleKritikAracClick = (aracId) => {
    setSeciliAracId(String(aracId));
    navigate('/app/filo');
  };

  const notifyDataChanged = useCallback(
    (scope) => {
      fetchAraclar();
      window.dispatchEvent(new CustomEvent('truss:data-changed', { detail: { scope } }));
    },
    [fetchAraclar]
  );

  const handlePaletteSelectVehicle = useCallback(
    (val) => {
      if (val === 'tum') {
        setSeciliAracId(null);
        return;
      }
      const nextId = String(val);
      setSeciliAracId(nextId);
      if (normalizedPath === '/app/ekip' || normalizedPath === '/app/ayarlar') {
        navigate('/app/filo');
      }
    },
    [navigate, normalizedPath, setSeciliAracId]
  );

  const handleOpenMovementSheet = useCallback(({ initialTip, prefill } = {}) => {
    setMovementSheetState({
      open: true,
      initialTip: initialTip || 'YAKIT',
      prefill: prefill || null,
    });
  }, []);

  const handleOpenComponentSheet = useCallback(
    ({ prefill } = {}) => {
      if (!canManage) return;
      setComponentSheetState({
        open: true,
        prefill: prefill || null,
      });
    },
    [canManage]
  );

  const handleOpenVehicleSheet = useCallback(() => {
    if (!canManage) return;
    setVehicleSheetOpen(true);
  }, [canManage]);

  const userName = user?.ad_soyad || user?.name || 'TRUSS Kullanıcı';
  const userEmail = user?.email || '';
  const userInitials = getInitials(user?.ad_soyad, user?.email);

  return (
    <TooltipProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <SidebarProvider>
          <Sidebar
            collapsible="icon"
            className="border-r border-border bg-background"
          >
            <SidebarHeader className="gap-3 border-b border-border bg-background px-3 py-3">
              <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
                <Link
                  to="/"
                  title="TRUSS Ana Sayfa"
                  className="inline-flex items-center text-lg font-bold tracking-tight select-none"
                  aria-label="TRUSS Ana Sayfa"
                >
                  <span className="group-data-[collapsible=icon]:hidden">
                    <span className="text-foreground">TRU</span>
                    <span className="text-primary">SS</span>
                  </span>
                  <span className="hidden text-base group-data-[collapsible=icon]:inline-flex">
                    <span className="text-foreground">T</span>
                    <span className="text-primary">S</span>
                  </span>
                </Link>
              </div>
            </SidebarHeader>

            <SidebarContent className="bg-background">
              <SidebarGroup>
                <SidebarGroupLabel>Platform</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.path === '/app'
                          ? normalizedPath === '/app'
                          : normalizedPath.startsWith(item.path);

                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.label}
                            className="data-active:bg-card data-active:text-foreground data-active:shadow-xs"
                          >
                            <Link to={item.path}>
                              <Icon className="size-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {kritikAraclar.length > 0 && (
                <Collapsible defaultOpen className="group/kritik-araclar">
                  <SidebarGroup>
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel className="flex w-full cursor-pointer items-center justify-between">
                        <span>Kritik Araçlar</span>
                        <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=closed]/kritik-araclar:-rotate-90" />
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {kritikAraclar.map((arac) => {
                            const bakimTehlike = hesaplaBakimDurumu(arac).durum === 'tehlike';
                            const formattedPlaka = formatTurkishPlate(arac.plaka);
                            const label = `${formattedPlaka}${arac.marka ? ` · ${arac.marka}` : ''}`;

                            return (
                              <SidebarMenuItem key={arac.arac_id}>
                                <SidebarMenuButton
                                  type="button"
                                  tooltip={label}
                                  onClick={() => handleKritikAracClick(arac.arac_id)}
                                >
                                  <span
                                    className={cn(
                                      'size-2.5 shrink-0 rounded-full border-2',
                                      bakimTehlike ? 'border-destructive' : 'border-primary'
                                    )}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate font-mono text-xs font-semibold tabular-nums">
                                    {formattedPlaka}
                                  </span>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              )}
            </SidebarContent>

            <SidebarFooter className="border-t border-border bg-background p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-card data-[state=open]:text-foreground"
                  >
                    <Avatar className="size-8 rounded-lg border border-border">
                      <AvatarFallback className="rounded-lg bg-card text-xs font-semibold text-primary">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium text-foreground">{userName}</span>
                      <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-64">
                  <DropdownMenuLabel className="p-2 font-normal">
                    <div className="flex items-center justify-between gap-2">
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold text-foreground">{userName}</span>
                        <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                      </div>
                      <RoleBadge role={role} />
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => navigate('/app/ayarlar')}>
                      <Settings className="size-4" />
                      <span>Ayarlar</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 select-none">
                    <span className="text-sm text-foreground">Tema</span>
                    <ToggleGroup
                      type="single"
                      value={theme}
                      onValueChange={(val) => val && setTheme(val)}
                      className="overflow-hidden rounded-full bg-primary/10 p-0.5"
                    >
                      <ToggleGroupItem
                        value="light"
                        aria-label="Açık tema"
                        className="h-6 min-w-6 px-1!"
                        buttonProps={{
                          className:
                            'aria-[checked=true]:[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground [&_[data-slot=active-toggle-group-item]]:!rounded-full',
                        }}
                        onClick={() => setTheme('light')}
                      >
                        <Sun className="size-3.5 text-primary" />
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="dark"
                        aria-label="Koyu tema"
                        className="h-6 min-w-6 px-1!"
                        buttonProps={{
                          className:
                            'aria-[checked=true]:[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground [&_[data-slot=active-toggle-group-item]]:!rounded-full',
                        }}
                        onClick={() => setTheme('dark')}
                      >
                        <Moon className="size-3.5 text-primary" />
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="system"
                        aria-label="Sistem teması"
                        className="h-6 min-w-6 px-1!"
                        buttonProps={{
                          className:
                            'aria-[checked=true]:[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground [&_[data-slot=active-toggle-group-item]]:!rounded-full',
                        }}
                        onClick={() => setTheme('system')}
                      >
                        <LaptopMinimal className="size-3.5 text-primary" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => handleLogout(navigate)}
                    >
                      <LogOut className="size-4" />
                      <span>Çıkış</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
            <SidebarEdgeToggle />
          </Sidebar>

          <SidebarInset className="flex min-w-0 flex-1 flex-col bg-background">
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <SidebarTrigger className="[&_svg]:size-4!" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      {seciliArac ? (
                        <BreadcrumbLink asChild>
                          <Link to={normalizedPath} onClick={() => setSeciliAracId(null)}>
                            {currentRouteLabel}
                          </Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{currentRouteLabel}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {seciliArac && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage className="font-mono font-semibold tabular-nums">
                            {formatTurkishPlate(seciliArac.plaka)}
                          </BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    )}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="flex items-center gap-2">
                {/* Global Araç Select */}
                <Select value={selectValue} onValueChange={handleVehicleSelectChange}>
                  <SelectTrigger
                    aria-label="Global araç filtresi"
                    className="h-8 w-32 rounded-lg border-border bg-card text-xs font-medium tabular-nums sm:w-52"
                  >
                    <SelectValue placeholder="Tüm araçlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VEHICLES_VALUE} className="text-xs tabular-nums">
                      Tüm araçlar ({araclar.length})
                    </SelectItem>
                    {araclar.map((arac) => (
                      <SelectItem
                        key={arac.arac_id}
                        value={String(arac.arac_id)}
                        className="font-mono text-xs tabular-nums"
                      >
                        {formatTurkishPlate(arac.plaka)}
                        {arac.marka ? ` · ${arac.marka}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Komut Paleti (⌘K) */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Komut paletini aç"
                  title="Komut paletini aç (⌘K)"
                  className="size-8 rounded-lg border-border bg-card text-muted-foreground hover:text-foreground sm:hidden"
                >
                  <Search className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Komut paletini aç"
                  className="hidden h-8 items-center gap-2 rounded-lg border-border bg-card px-2.5 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
                >
                  <Search className="size-3.5" />
                  <span>Ara...</span>
                  <Kbd>⌘K</Kbd>
                </Button>

                {/* Tema Toggle */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
                  title={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
                  className="size-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                >
                  {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                </Button>

                {/* Rol Rozeti */}
                <RoleBadge role={role} className="hidden md:inline-flex" />
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <main className="flex-1 p-4 sm:p-6">
                <Outlet />
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        canManage={canManage}
        canAddFuel={canAddFuel}
        canAddMaintenance={canAddMaintenance}
        visibleNavItems={visibleNavItems}
        araclar={araclar}
        seciliAracId={seciliAracId}
        onNavigate={(path) => navigate(path)}
        onSelectVehicle={handlePaletteSelectVehicle}
        onOpenMovementSheet={handleOpenMovementSheet}
        onOpenComponentSheet={handleOpenComponentSheet}
        onOpenVehicleSheet={handleOpenVehicleSheet}
      />

      <MovementSheet
        open={movementSheetState.open}
        onOpenChange={(nextOpen) =>
          setMovementSheetState((prev) =>
            nextOpen ? { ...prev, open: true } : { open: false, initialTip: 'YAKIT', prefill: null }
          )
        }
        mode="create"
        initialTip={movementSheetState.initialTip}
        record={null}
        prefill={movementSheetState.prefill}
        araclar={araclar}
        defaultAracId={seciliAracId}
        canAddFuel={canAddFuel}
        canAddMaintenance={canAddMaintenance}
        onSuccess={() => notifyDataChanged('movement')}
      />

      {canManage && (
        <VehicleSheet
          open={vehicleSheetOpen}
          onOpenChange={setVehicleSheetOpen}
          arac={null}
          onSuccess={() => notifyDataChanged('vehicle')}
        />
      )}

      {canManage && (
        <ComponentSheet
          open={componentSheetState.open}
          onOpenChange={(nextOpen) =>
            setComponentSheetState((prev) =>
              nextOpen ? { ...prev, open: true } : { open: false, prefill: null }
            )
          }
          mode="create"
          parca={null}
          prefill={componentSheetState.prefill}
          araclar={araclar}
          defaultAracId={seciliAracId}
          onSuccess={() => notifyDataChanged('component')}
        />
      )}
    </TooltipProvider>
  );
}
