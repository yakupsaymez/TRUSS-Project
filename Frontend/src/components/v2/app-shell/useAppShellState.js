import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/theme-provider';
import useAuthStore from '@/store/useAuthStore';
import useAppStore from '@/store/useAppStore';
import useVehicleStore from '@/store/useVehicleStore';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { evrakRiskliMi, hesaplaBakimDurumu } from '@/utils/aracDurum';
import { DATA_SCOPES, emitDataChanged } from '@/utils/dataEvents';
import { navConfig } from '@/components/v2/navConfig';
import {
  ALL_VEHICLES_VALUE,
  REFRESH_THROTTLE_MS,
  ROUTE_LABELS,
  getInitials,
} from './appShellHelpers';

export function useAppShellState() {
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
      if (scope !== DATA_SCOPES.VEHICLE) {
        fetchAraclar();
      }
      emitDataChanged(scope);
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

  const handleOpenMovementSheet = useCallback(
    ({ initialTip, prefill } = {}) => {
      const tip = initialTip === 'BAKIM' ? 'BAKIM' : 'YAKIT';
      if (tip === 'YAKIT' && !canAddFuel) return;
      if (tip === 'BAKIM' && !canAddMaintenance) return;
      setMovementSheetState({
        open: true,
        initialTip: tip,
        prefill: prefill || null,
      });
    },
    [canAddFuel, canAddMaintenance]
  );

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

  return {
    navigate,
    theme,
    setTheme,
    isDark,
    handleLogout,
    araclar,
    seciliAracId,
    setSeciliAracId,
    seciliArac,
    selectValue,
    role,
    canManage,
    canAddFuel,
    canAddMaintenance,
    paletteOpen,
    setPaletteOpen,
    vehicleSheetOpen,
    setVehicleSheetOpen,
    movementSheetState,
    setMovementSheetState,
    componentSheetState,
    setComponentSheetState,
    visibleNavItems,
    kritikAraclar,
    normalizedPath,
    currentRouteLabel,
    userName,
    userEmail,
    userInitials,
    handleVehicleSelectChange,
    handleKritikAracClick,
    notifyDataChanged,
    handlePaletteSelectVehicle,
    handleOpenMovementSheet,
    handleOpenComponentSheet,
    handleOpenVehicleSheet,
  };
}
