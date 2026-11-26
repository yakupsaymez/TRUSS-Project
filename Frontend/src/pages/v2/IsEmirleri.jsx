import React from 'react';
import { Info, Plus, RefreshCw, RotateCcw } from 'lucide-react';
import { formatLocaleNumber } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsEmirleriController } from '@/components/v2/work-orders/useIsEmirleriController';
import { DURUM_OPTIONS, KATEGORI_OPTIONS, ONCELIK_OPTIONS } from '@/components/v2/work-orders/workOrderConstants';
import WorkOrderTable from '@/components/v2/work-orders/WorkOrderTable';
import WorkOrderFormSheet from '@/components/v2/work-orders/WorkOrderFormSheet';
import WorkOrderCompleteDialog from '@/components/v2/work-orders/WorkOrderCompleteDialog';
import WorkOrderCancelDialog from '@/components/v2/work-orders/WorkOrderCancelDialog';

export default function IsEmirleri() {
  const {
    araclar, vehiclesHasLoaded, seciliAracId, isMissingManagerOrg, canManage, canViewFinance, currentUserId,
    durum, oncelik, kategori, offset, setOffset,
    handleDurumChange, handleOncelikChange, handleKategoriChange, clearFilters,
    rows, toplam, ozet, loading, hasLoaded, submitting, loadWorkOrders,
    formSheet, openCreate, openEdit, closeFormSheet,
    completeTarget, setCompleteTarget, cancelTarget, setCancelTarget,
    submitCreate, submitUpdate, submitComplete, submitCancel, handleOpenDoc,
  } = useIsEmirleriController();

  const hasNoVehicles = !isMissingManagerOrg && vehiclesHasLoaded && araclar.length === 0;
  const isCreateDisabled = isMissingManagerOrg || araclar.length === 0;
  const hasActiveFilters = durum !== 'all' || oncelik !== 'all' || kategori !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">İş Emirleri</h1>
            <Badge variant="outline" className="border-border bg-secondary font-mono text-xs text-secondary-foreground tabular-nums">
              {formatLocaleNumber(toplam, 0)} kayıt
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Arıza bildirimleri, servis yönlendirmeleri ve bakım dönüşüm akışı
          </p>
        </div>

        <Button type="button" size="sm" disabled={isCreateDisabled} onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          <span>Yeni Talep</span>
        </Button>
      </div>

      {isMissingManagerOrg && (
        <div role="status" className="flex items-center gap-2.5 rounded-xl border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-xs text-foreground">
          <Info className="size-4 shrink-0 text-status-warning" aria-hidden="true" />
          <span>Yönetici hesabınıza henüz bir organizasyon atanmadığı için iş emri listesi ve talep oluşturma kapalıdır.</span>
        </div>
      )}

      {hasNoVehicles && (
        <div role="status" className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 text-foreground" aria-hidden="true" />
          <span>İş emri açabilmek için önce filoya aktif araç eklenmiş veya hesabınıza araç atanmış olmalıdır.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Açık Talepler</p>
            <p className="mt-1 font-mono text-2xl font-bold text-status-warning tabular-nums">
              {formatLocaleNumber(ozet?.acik ?? 0, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Servisteki Araçlar</p>
            <p className="mt-1 font-mono text-2xl font-bold text-primary tabular-nums">
              {formatLocaleNumber(ozet?.serviste ?? 0, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Bu Ay Tamamlanan</p>
            <p className="mt-1 font-mono text-2xl font-bold text-status-success tabular-nums">
              {formatLocaleNumber(ozet?.tamamlandi_bu_ay ?? 0, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={durum} onValueChange={handleDurumChange}>
            <SelectTrigger aria-label="Durum filtresi" className="h-9 w-36 bg-card text-xs">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              {DURUM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={oncelik} onValueChange={handleOncelikChange}>
            <SelectTrigger aria-label="Öncelik filtresi" className="h-9 w-36 bg-card text-xs">
              <SelectValue placeholder="Öncelik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Öncelikler</SelectItem>
              {ONCELIK_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={kategori} onValueChange={handleKategoriChange}>
            <SelectTrigger aria-label="Kategori filtresi" className="h-9 w-40 bg-card text-xs">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kategoriler</SelectItem>
              {KATEGORI_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="size-3.5" />
              <span>Temizle</span>
            </Button>
          )}
        </div>

        <Button type="button" variant="outline" size="sm" disabled={loading || isMissingManagerOrg} onClick={loadWorkOrders} className="h-9 gap-1.5 text-xs">
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          <span>Yenile</span>
        </Button>
      </div>

      <WorkOrderTable
        rows={rows} toplam={toplam} offset={offset} loading={loading} hasLoaded={hasLoaded}
        hasActiveFilters={hasActiveFilters} canManage={canManage} canViewFinance={canViewFinance}
        canCreate={!isCreateDisabled} currentUserId={currentUserId}
        onClearFilters={clearFilters} onCreateClick={openCreate}
        onTakeToService={(row) => openEdit(row, 'serviste')}
        onEdit={(row) => openEdit(row, null)}
        onComplete={(row) => setCompleteTarget(row)}
        onCancel={(row) => setCancelTarget(row)}
        onPageChange={setOffset}
        onOpenDoc={handleOpenDoc}
      />

      <WorkOrderFormSheet
        open={formSheet.open} onOpenChange={(next) => !next && closeFormSheet()}
        mode={formSheet.mode} record={formSheet.record} defaultDurum={formSheet.defaultDurum}
        araclar={araclar} defaultAracId={seciliAracId} canManage={canManage} currentUserId={currentUserId}
        submitting={submitting} onCreate={submitCreate} onUpdate={submitUpdate} onDocsChanged={loadWorkOrders}
      />

      {canManage && (
        <WorkOrderCompleteDialog
          record={completeTarget} araclar={araclar} submitting={submitting}
          onOpenChange={(next) => !next && setCompleteTarget(null)}
          onComplete={submitComplete}
        />
      )}

      <WorkOrderCancelDialog
        record={cancelTarget} submitting={submitting}
        onOpenChange={(next) => !next && setCancelTarget(null)}
        onConfirm={submitCancel}
      />
    </div>
  );
}
