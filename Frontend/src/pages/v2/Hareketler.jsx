import React from 'react';
import { Fuel, Plus, Wrench } from 'lucide-react';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import useHareketlerController, { formatTrDateShort } from '@/components/v2/ledger-data-table/useHareketlerController';
import LedgerDataTable from '@/components/v2/LedgerDataTable';
import ConfirmDialog from '@/components/v2/ConfirmDialog';
import MovementSheet from '@/components/v2/MovementSheet';
import FuelAnomalyPanel from '@/components/v2/FuelAnomalyPanel';
import FuelImportSheet from '@/components/v2/FuelImportSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Hareketler() {
  const {
    araclar,
    seciliAracId,
    setSeciliAracId,
    rows,
    loading,
    hasLoaded,
    isVehicleScoped,
    scopedCount,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    importSheetOpen,
    setImportSheetOpen,
    sheetState,
    canManage,
    canImportFuel,
    canAddFuel,
    canAddMaintenance,
    canViewFinance,
    handleCreateYakit,
    handleCreateBakim,
    handleRepeatRow,
    handleEditRow,
    handleSheetOpenChange,
    handleSheetSuccess,
    handleDeleteRequest,
    handleConfirmDelete,
    handleOpenBelge,
  } = useHareketlerController();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Hareketler</h1>
            <Badge variant="secondary" className="tabular-nums">
              {isVehicleScoped
                ? `${formatLocaleNumber(scopedCount, 0)} / ${formatLocaleNumber(rows.length, 0)} kayıt`
                : `${formatLocaleNumber(rows.length, 0)} kayıt`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Yakıt ikmalleri ve servis/bakım harcamalarının birleşik defteri
          </p>
        </div>

        {(canAddFuel || canAddMaintenance) && (
          <div className="flex flex-wrap items-center gap-2">
            {canAddFuel && (
              <Button
                type="button"
                size="sm"
                onClick={handleCreateYakit}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                <Fuel className="size-3.5" />
                <span>Yeni Yakıt</span>
              </Button>
            )}
            {canAddMaintenance && (
              <Button
                type="button"
                variant={canAddFuel ? 'outline' : 'default'}
                size="sm"
                onClick={handleCreateBakim}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                <Wrench className="size-3.5" />
                <span>Yeni Bakım</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {canViewFinance && <FuelAnomalyPanel seciliAracId={seciliAracId} canManage={canManage} />}

      <LedgerDataTable
        rows={rows}
        araclar={araclar}
        seciliAracId={seciliAracId}
        onVehicleChange={setSeciliAracId}
        loading={loading}
        hasLoaded={hasLoaded}
        canManage={canManage}
        canAddFuel={canAddFuel}
        canAddMaintenance={canAddMaintenance}
        canViewFinance={canViewFinance}
        onCreateYakit={canAddFuel ? handleCreateYakit : undefined}
        onCreateBakim={canAddMaintenance ? handleCreateBakim : undefined}
        onRepeatRow={canAddFuel || canAddMaintenance ? handleRepeatRow : undefined}
        onEditRow={canManage ? handleEditRow : undefined}
        onDeleteRequest={handleDeleteRequest}
        onImportFuel={canImportFuel ? () => setImportSheetOpen(true) : undefined}
        onOpenBelge={canViewFinance ? handleOpenBelge : undefined}
      />
      {canImportFuel && <FuelImportSheet open={importSheetOpen} onOpenChange={setImportSheetOpen} onImported={handleSheetSuccess} />}

      <MovementSheet
        open={
          sheetState.open &&
          (canManage || (sheetState.mode !== 'edit' && (canAddFuel || canAddMaintenance)))
        }
        onOpenChange={handleSheetOpenChange}
        mode={!canManage && sheetState.mode === 'edit' ? 'create' : sheetState.mode}
        initialTip={sheetState.initialTip}
        record={sheetState.record}
        araclar={araclar}
        defaultAracId={seciliAracId}
        canAddFuel={canAddFuel}
        canAddMaintenance={canAddMaintenance}
        onSuccess={handleSheetSuccess}
      />

      {canManage && (
        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteTarget(null);
          }}
          title={
            deleteTarget?.tip === 'YAKIT'
              ? 'Yakıt kaydını sil?'
              : 'Bakım kaydını sil?'
          }
          description={
            deleteTarget
              ? `${formatTurkishPlate(deleteTarget.plaka)} • ${formatTrDateShort(deleteTarget.tarih)} • ${deleteTarget.altTur} (${formatCurrency(deleteTarget.tutar, { maximumFractionDigits: 2 })}) kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.`
              : ''
          }
          confirmLabel="Sil"
          cancelLabel="Vazgeç"
          variant="destructive"
          loading={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
