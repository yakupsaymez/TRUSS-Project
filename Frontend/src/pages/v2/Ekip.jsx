import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link2, UserPlus } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import adminService from '@/services/adminService';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber } from '@/utils/formatters';
import CrewDataTable, {
  ADMIN_LOCK_MESSAGE,
  SELF_LOCK_MESSAGE,
} from '@/components/v2/CrewDataTable';
import CrewRoleSummaryStrip from '@/components/v2/CrewRoleSummaryStrip';
import PermissionsSheet from '@/components/v2/PermissionsSheet';
import ResetPasswordSheet from '@/components/v2/ResetPasswordSheet';
import AssignVehicleSheet from '@/components/v2/AssignVehicleSheet';
import CreateMemberSheet from '@/components/v2/CreateMemberSheet';
import ConfirmDialog from '@/components/v2/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Ekip() {
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

  const viewerRole = resolveRole(currentUser);
  const isSystemAdminViewer = viewerRole === ROLES.SYSTEM_ADMIN;
  const isFleetManagerViewer = viewerRole === ROLES.FLEET_MANAGER;

  const assignableRoles = useMemo(
    () =>
      isSystemAdminViewer
        ? [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER, ROLES.DRIVER]
        : [ROLES.FLEET_MANAGER, ROLES.DRIVER],
    [isSystemAdminViewer]
  );

  const drivers = useMemo(
    () => users.filter((member) => (member?.role || ROLES.DRIVER) === ROLES.DRIVER),
    [users]
  );

  const getMemberAccess = useCallback(
    (member) => {
      const isSelf =
        currentUser?.user_id != null &&
        String(member?.user_id) === String(currentUser.user_id);
      const isAdminLocked =
        !isSystemAdminViewer && (member?.role || ROLES.DRIVER) === ROLES.SYSTEM_ADMIN;
      const readOnly = isSelf || isAdminLocked;
      const lockMessage = isSelf
        ? SELF_LOCK_MESSAGE
        : isAdminLocked
          ? ADMIN_LOCK_MESSAGE
          : undefined;
      return { isSelf, isAdminLocked, readOnly, lockMessage };
    },
    [currentUser?.user_id, isSystemAdminViewer]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!vehiclesHasLoaded && !vehiclesLoading && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [vehiclesHasLoaded, vehiclesLoading, fetchAraclar]);

  const ekibiYukle = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await adminService.getUsers();
      if (!mountedRef.current) return;
      setUsers(Array.isArray(res) ? res : res?.users || []);
    } catch (err) {
      if (!mountedRef.current) return;
      notifyApiError(err, 'Ekip verileri yüklenemedi.');
    } finally {
      if (mountedRef.current) {
        if (!silent) setLoading(false);
        setHasLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    ekibiYukle();
  }, [ekibiYukle]);

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
        if (kapatilan > 0) {
          toast.success(
            `Rol güncellendi, ${formatLocaleNumber(kapatilan, 0)} aktif zimmet kapatıldı.`
          );
        } else {
          toast.success('Kullanıcı rolü güncellendi.');
        }
        await refreshAll();
      } catch (err) {
        notifyApiError(err, 'Rol güncellenemedi.');
        if ([404, 409].includes(getErrorStatus(err))) {
          await ekibiYukle({ silent: true });
        }
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

      const activeAssignmentsCount = Array.isArray(member.zimmetli_araclar)
        ? member.zimmetli_araclar.length
        : 0;

      if (
        currentRole === ROLES.DRIVER &&
        nextRole !== ROLES.DRIVER &&
        activeAssignmentsCount > 0
      ) {
        setPendingRoleChange({
          member,
          nextRole,
          count: activeAssignmentsCount,
        });
        return;
      }

      executeRoleUpdate(member, nextRole);
    },
    [executeRoleUpdate, getMemberAccess, isSystemAdminViewer]
  );

  const handlePermissionsClick = useCallback((member) => {
    setPermissionsTarget(member);
  }, []);

  const handleResetPasswordClick = useCallback((member) => {
    setResetPasswordTarget(member);
  }, []);

  const handleRowAssignClick = useCallback((member) => {
    setAssignState({ open: true, member });
  }, []);

  const handleQuickAssignClick = useCallback(() => {
    setAssignState({ open: true, member: null });
  }, []);

  const permissionsAccess = useMemo(
    () =>
      permissionsTarget
        ? getMemberAccess(permissionsTarget)
        : { readOnly: false, lockMessage: undefined },
    [permissionsTarget, getMemberAccess]
  );

  const resetPasswordAccess = useMemo(
    () =>
      resetPasswordTarget
        ? getMemberAccess(resetPasswordTarget)
        : { readOnly: false, lockMessage: undefined },
    [resetPasswordTarget, getMemberAccess]
  );

  const isConfirmLoading =
    pendingRoleChange !== null &&
    updatingUserId !== null &&
    String(updatingUserId) === String(pendingRoleChange.member.user_id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Ekip & Yetki
            </h1>
            <Badge variant="secondary" className="tabular-nums">
              {formatLocaleNumber(users.length, 0)} üye
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Organizasyon rolleri, hücre içi rol yönetimi, zimmetli araçlar ve yetki özetleri
            {isFleetManagerViewer ? ' · Sistem Admini kayıtları salt okunurdur' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleQuickAssignClick}
            className="gap-1.5"
          >
            <Link2 className="size-4" aria-hidden="true" />
            <span>Hızlı Zimmet</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateSheetOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            <span>Yeni Üye</span>
          </Button>
        </div>
      </div>

      {(users.length > 0 || loading || (vehiclesLoading && !vehiclesHasLoaded)) && (
        <CrewRoleSummaryStrip
          users={users}
          vehicles={araclar}
          loading={(loading && !hasLoaded) || (vehiclesLoading && !vehiclesHasLoaded)}
        />
      )}

      <CrewDataTable
        users={users}
        loading={loading}
        hasLoaded={hasLoaded}
        assignableRoles={assignableRoles}
        getMemberAccess={getMemberAccess}
        updatingUserId={updatingUserId}
        onRoleChange={handleRoleChange}
        onPermissionsClick={handlePermissionsClick}
        onResetPasswordClick={handleResetPasswordClick}
        onAssignClick={handleRowAssignClick}
        onCreateClick={() => setCreateSheetOpen(true)}
      />

      <PermissionsSheet
        open={permissionsTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPermissionsTarget(null);
        }}
        member={permissionsTarget}
        readOnly={permissionsAccess.readOnly}
        lockMessage={permissionsAccess.lockMessage}
        onSuccess={refreshAll}
      />

      <ResetPasswordSheet
        open={resetPasswordTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setResetPasswordTarget(null);
        }}
        member={resetPasswordTarget}
        readOnly={resetPasswordAccess.readOnly}
        lockMessage={resetPasswordAccess.lockMessage}
        onSuccess={refreshAll}
      />

      <AssignVehicleSheet
        open={assignState.open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setAssignState({ open: false, member: null });
        }}
        member={assignState.member}
        drivers={drivers}
        vehicles={araclar}
        users={users}
        onSuccess={refreshAll}
      />

      <CreateMemberSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        isSystemAdminViewer={isSystemAdminViewer}
        vehicles={araclar}
        onSuccess={refreshAll}
      />

      <ConfirmDialog
        open={pendingRoleChange !== null}
        onOpenChange={(open) => {
          if (!open && !isConfirmLoading) {
            setPendingRoleChange(null);
          }
        }}
        title="Aktif zimmetler kapatılacak"
        description={
          pendingRoleChange
            ? `${pendingRoleChange.member.ad_soyad} şoförünün ${formatLocaleNumber(pendingRoleChange.count, 0)} aktif araç zimmeti rol değişikliğiyle pasife alınacak. Devam edilsin mi?`
            : ''
        }
        confirmLabel="Devam Et"
        cancelLabel="Vazgeç"
        variant="destructive"
        loading={isConfirmLoading}
        onConfirm={() => {
          if (pendingRoleChange) {
            executeRoleUpdate(pendingRoleChange.member, pendingRoleChange.nextRole);
          }
        }}
      />
    </div>
  );
}
