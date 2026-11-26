import React from 'react';
import { Link2, UserPlus } from 'lucide-react';
import { formatLocaleNumber } from '@/utils/formatters';
import CrewDataTable from '@/components/v2/CrewDataTable';
import CrewRoleSummaryStrip from '@/components/v2/CrewRoleSummaryStrip';
import PermissionsSheet from '@/components/v2/PermissionsSheet';
import ResetPasswordSheet from '@/components/v2/ResetPasswordSheet';
import AssignVehicleSheet from '@/components/v2/AssignVehicleSheet';
import CreateMemberSheet from '@/components/v2/CreateMemberSheet';
import ConfirmDialog from '@/components/v2/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEkipController } from '@/components/v2/crew-data-table/useEkipController';

export default function Ekip() {
  const {
    araclar, vehiclesLoading, vehiclesHasLoaded, users, loading, hasLoaded,
    updatingUserId, pendingRoleChange, permissionsTarget, setPermissionsTarget,
    resetPasswordTarget, setResetPasswordTarget, assignState, setAssignState,
    createSheetOpen, setCreateSheetOpen, isSystemAdminViewer, isFleetManagerViewer,
    assignableRoles, drivers, getMemberAccess, refreshAll, handleRoleChange,
    handlePermissionsClick, handleResetPasswordClick, handleRowAssignClick,
    handleQuickAssignClick, permissionsAccess, resetPasswordAccess,
    isConfirmLoading, handlePendingRoleOpenChange, handleConfirmRoleChange,
  } = useEkipController();

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
          <Button type="button" variant="outline" size="sm" onClick={handleQuickAssignClick} className="gap-1.5">
            <Link2 className="size-4" aria-hidden="true" />
            <span>Hızlı Zimmet</span>
          </Button>
          <Button type="button" size="sm" onClick={() => setCreateSheetOpen(true)} className="gap-1.5">
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
        onOpenChange={(nextOpen) => { if (!nextOpen) setPermissionsTarget(null); }}
        member={permissionsTarget}
        readOnly={permissionsAccess.readOnly}
        lockMessage={permissionsAccess.lockMessage}
        onSuccess={refreshAll}
      />

      <ResetPasswordSheet
        open={resetPasswordTarget !== null}
        onOpenChange={(nextOpen) => { if (!nextOpen) setResetPasswordTarget(null); }}
        member={resetPasswordTarget}
        readOnly={resetPasswordAccess.readOnly}
        lockMessage={resetPasswordAccess.lockMessage}
        onSuccess={refreshAll}
      />

      <AssignVehicleSheet
        open={assignState.open}
        onOpenChange={(nextOpen) => { if (!nextOpen) setAssignState({ open: false, member: null }); }}
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
        onOpenChange={handlePendingRoleOpenChange}
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
        onConfirm={handleConfirmRoleChange}
      />
    </div>
  );
}
