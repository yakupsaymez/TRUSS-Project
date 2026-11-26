import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import adminService from '@/services/adminService';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber } from '@/utils/formatters';
import { ADMIN_LOCK_MESSAGE, SELF_LOCK_MESSAGE } from '@/components/v2/CrewDataTable';

export function useEkipController() {
  const currentUser = useAuthStore((s) => s.user);
  const araclar = useVehicleStore((s) => s.araclar);
  const vehiclesLoading = useVehicleStore((s) => s.loading);
  const vehiclesHasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);
  const [assignState, setAssignState] = useState({ open: false, member: null });
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const mountedRef = useRef(true);
  const vehicleFetchAttemptedRef = useRef(false);
  const requestIdRef = useRef(0);

  const viewerRole = resolveRole(currentUser);
  const isSystemAdminViewer = viewerRole === ROLES.SYSTEM_ADMIN;
  const isFleetManagerViewer = viewerRole === ROLES.FLEET_MANAGER;

  const assignableRoles = useMemo(
    () => (isSystemAdminViewer ? [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER, ROLES.DRIVER] : [ROLES.FLEET_MANAGER, ROLES.DRIVER]),
    [isSystemAdminViewer]
  );

  const drivers = useMemo(
    () => users.filter((member) => (member?.role || ROLES.DRIVER) === ROLES.DRIVER),
    [users]
  );

  const getMemberAccess = useCallback(
    (member) => {
      const isSelf = currentUser?.user_id != null && String(member?.user_id) === String(currentUser.user_id);
      const isAdminLocked = !isSystemAdminViewer && (member?.role || ROLES.DRIVER) === ROLES.SYSTEM_ADMIN;
      const readOnly = isSelf || isAdminLocked;
      const lockMessage = isSelf ? SELF_LOCK_MESSAGE : isAdminLocked ? ADMIN_LOCK_MESSAGE : undefined;
      return { isSelf, isAdminLocked, readOnly, lockMessage };
    },
    [currentUser?.user_id, isSystemAdminViewer]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!vehiclesHasLoaded && !vehiclesLoading && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [vehiclesHasLoaded, vehiclesLoading, fetchAraclar]);

  const ekibiYukle = useCallback(async ({ silent = false } = {}) => {
    const reqId = ++requestIdRef.current;
    if (!silent) setLoading(true);
    try {
      const res = await adminService.getUsers();
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      setUsers(Array.isArray(res) ? res : res?.users || []);
    } catch (err) {
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      notifyApiError(err, 'Ekip verileri yüklenemedi.');
    } finally {
      if (mountedRef.current && reqId === requestIdRef.current) {
        if (!silent) setLoading(false);
        setHasLoaded(true);
      }
    }
  }, []);

  useEffect(() => { ekibiYukle(); }, [ekibiYukle]);

  const refreshAll = useCallback(async () => {
    await Promise.all([ekibiYukle({ silent: true }), fetchAraclar()]);
  }, [ekibiYukle, fetchAraclar]);

  const executeRoleUpdate = useCallback(
    async (member, nextRole) => {
      if (!member || !nextRole) return;
      const access = getMemberAccess(member);
      if (access.readOnly) {
        if (access.lockMessage) toast.error(access.lockMessage);
        return;
      }
      if (!isSystemAdminViewer && nextRole === ROLES.SYSTEM_ADMIN) {
        toast.error('Sistem Admini rolünü yalnızca Sistem Admini atayabilir.');
        return;
      }
      setUpdatingUserId(member.user_id);
      try {
        const res = await adminService.updateUserRole(member.user_id, nextRole);
        const kapatilan = Number(res?.kapatilan_zimmet_sayisi || 0);
        toast.success(
          kapatilan > 0
            ? `Rol güncellendi, ${formatLocaleNumber(kapatilan, 0)} aktif zimmet kapatıldı.`
            : 'Kullanıcı rolü güncellendi.'
        );
        await refreshAll();
      } catch (err) {
        notifyApiError(err, 'Rol güncellenemedi.');
        if ([404, 409].includes(getErrorStatus(err))) await ekibiYukle({ silent: true });
      } finally {
        if (mountedRef.current) {
          setUpdatingUserId(null);
          setPendingRoleChange(null);
        }
      }
    },
    [ekibiYukle, getMemberAccess, isSystemAdminViewer, refreshAll]
  );

  const handleRoleChange = useCallback(
    (member, nextRole) => {
      if (!member || !nextRole) return;
      const currentRole = member.role || ROLES.DRIVER;
      if (nextRole === currentRole) return;
      const access = getMemberAccess(member);
      if (access.readOnly) {
        if (access.lockMessage) toast.error(access.lockMessage);
        return;
      }
      if (!isSystemAdminViewer && nextRole === ROLES.SYSTEM_ADMIN) {
        toast.error('Sistem Admini rolünü yalnızca Sistem Admini atayabilir.');
        return;
      }
      const count = Array.isArray(member.zimmetli_araclar) ? member.zimmetli_araclar.length : 0;
      if (currentRole === ROLES.DRIVER && nextRole !== ROLES.DRIVER && count > 0) {
        setPendingRoleChange({ member, nextRole, count });
        return;
      }
      executeRoleUpdate(member, nextRole);
    },
    [executeRoleUpdate, getMemberAccess, isSystemAdminViewer]
  );

  const handlePermissionsClick = useCallback((member) => setPermissionsTarget(member), []);
  const handleResetPasswordClick = useCallback((member) => setResetPasswordTarget(member), []);
  const handleRowAssignClick = useCallback((member) => setAssignState({ open: true, member }), []);
  const handleQuickAssignClick = useCallback(() => setAssignState({ open: true, member: null }), []);

  const permissionsAccess = useMemo(
    () => (permissionsTarget ? getMemberAccess(permissionsTarget) : { readOnly: false, lockMessage: undefined }),
    [permissionsTarget, getMemberAccess]
  );
  const resetPasswordAccess = useMemo(
    () => (resetPasswordTarget ? getMemberAccess(resetPasswordTarget) : { readOnly: false, lockMessage: undefined }),
    [resetPasswordTarget, getMemberAccess]
  );

  const isConfirmLoading =
    pendingRoleChange !== null &&
    updatingUserId !== null &&
    String(updatingUserId) === String(pendingRoleChange.member.user_id);

  const handlePendingRoleOpenChange = useCallback(
    (open) => { if (!open && !isConfirmLoading) setPendingRoleChange(null); },
    [isConfirmLoading]
  );
  const handleConfirmRoleChange = useCallback(() => {
    if (pendingRoleChange) executeRoleUpdate(pendingRoleChange.member, pendingRoleChange.nextRole);
  }, [executeRoleUpdate, pendingRoleChange]);

  return {
    araclar, vehiclesLoading, vehiclesHasLoaded, users, loading, hasLoaded,
    updatingUserId, pendingRoleChange, permissionsTarget, setPermissionsTarget,
    resetPasswordTarget, setResetPasswordTarget, assignState, setAssignState,
    createSheetOpen, setCreateSheetOpen, isSystemAdminViewer, isFleetManagerViewer,
    assignableRoles, drivers, getMemberAccess, refreshAll, handleRoleChange,
    handlePermissionsClick, handleResetPasswordClick, handleRowAssignClick,
    handleQuickAssignClick, permissionsAccess, resetPasswordAccess,
    isConfirmLoading, handlePendingRoleOpenChange, handleConfirmRoleChange,
  };
}
