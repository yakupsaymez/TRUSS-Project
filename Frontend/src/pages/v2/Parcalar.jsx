import React from 'react';
import { Plus } from 'lucide-react';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import ComponentDataTable from '@/components/v2/ComponentDataTable';
import ComponentSheet from '@/components/v2/ComponentSheet';
import ConfirmDialog from '@/components/v2/ConfirmDialog';
import SegmentedDistributionCard from '@/components/v2/SegmentedDistributionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useParcalarController } from '@/components/v2/component-data-table/useParcalarController';

export default function Parcalar() {
  const {
    araclar,
    seciliAracId,
    setSeciliAracId,
    parcalar,
    statusFilter,
    setStatusFilter,
    loading,
    hasLoaded,
    deleteTarget,
    isDeleting,
    sheetState,
    canManage,
    canViewFinance,
    selectedVehicle,
    scopedTotal,
    scopedTotalCost,
    distributionSegments,
    handleSegmentSelect,
    handleCreateClick,
    handleReplaceClick,
    handleEditClick,
    handleSheetOpenChange,
    handleSheetSuccess,
    handleDeleteRequest,
    handleDeleteDialogOpenChange,
    handleConfirmDelete,
  } = useParcalarController();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Parça Ömür Matrisi
            </h1>
            <Badge
              variant="outline"
              className="border-border bg-secondary text-secondary-foreground font-medium tabular-nums"
            >
              {formatLocaleNumber(parcalar.length, 0)} parça
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Bileşen değişim aralıkları, kalan ömür yüzdeleri ve kritik öncelikli uyarılar
          </p>
        </div>

        {canManage && (
          <Button type="button" size="sm" onClick={handleCreateClick} className="gap-1.5">
            <Plus className="size-4" />
            <span>Yeni Parça</span>
          </Button>
        )}
      </div>

      <SegmentedDistributionCard
        title="Parça Ömür Dağılımı"
        description={
          selectedVehicle
            ? `${formatTurkishPlate(selectedVehicle.plaka)} aracına ait takipli bileşen dağılımı — tabloyu filtrelemek için segmente tıklayın`
            : 'Filo genelinde takipli bileşenlerin ömür dağılımı — tabloyu filtrelemek için segmente tıklayın'
        }
        totalValue={formatLocaleNumber(scopedTotal, 0)}
        totalLabel={
          canViewFinance
            ? `parça · Toplam Maliyet: ${formatCurrency(scopedTotalCost, { maximumFractionDigits: 2 })}`
            : 'parça'
        }
        segments={distributionSegments}
        activeKey={statusFilter === 'all' ? null : statusFilter}
        onSelectSegment={handleSegmentSelect}
        loading={loading && !hasLoaded}
        emptyText="Takipli parça eklendiğinde ömür dağılımı burada görünecektir."
      />

      <ComponentDataTable
        parcalar={parcalar}
        araclar={araclar}
        seciliAracId={seciliAracId}
        onVehicleChange={setSeciliAracId}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        showSummary={false}
        loading={loading}
        hasLoaded={hasLoaded}
        canManage={canManage}
        canViewFinance={canViewFinance}
        onCreateClick={canManage ? handleCreateClick : undefined}
        onReplaceClick={canManage ? handleReplaceClick : undefined}
        onEditClick={canManage ? handleEditClick : undefined}
        onDeleteRequest={canManage ? handleDeleteRequest : undefined}
      />

      {canManage && (
        <ComponentSheet
          open={sheetState.open}
          onOpenChange={handleSheetOpenChange}
          mode={sheetState.mode}
          parca={sheetState.parca}
          araclar={araclar}
          defaultAracId={seciliAracId}
          onSuccess={handleSheetSuccess}
        />
      )}

      {canManage && (
        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={handleDeleteDialogOpenChange}
          title="Parçayı takipten kaldır?"
          description={
            deleteTarget
              ? `${formatTurkishPlate(deleteTarget.plaka || '')} • ${deleteTarget.parca_adi} takip kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.`
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
