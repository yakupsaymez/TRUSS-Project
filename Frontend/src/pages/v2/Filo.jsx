import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Plus, X } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import raporService from '@/services/raporService';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { DATA_SCOPES, emitDataChanged, subscribeDataChanged } from '@/utils/dataEvents';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import FleetDataTable from '@/components/v2/FleetDataTable';
import VehicleArchiveDialog from '@/components/v2/fleet-data-table/VehicleArchiveDialog';
import useFleetArchive from '@/components/v2/fleet-data-table/useFleetArchive';
import VehicleSheet from '@/components/v2/VehicleSheet';
import HandoverInspectionSheet from '@/components/v2/assign-vehicle/HandoverInspectionSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const VALID_DURUM_FILTERS = new Set(['kritik_bakim', 'riskli_evrak', 'eksik_evrak', 'sorunsuz']);

const VIEW_MODES = [
  { id: 'aktif', label: 'Aktif' },
  { id: 'arsiv', label: 'Arşivlenenler' },
];

export default function Filo() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const hasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);
  const deleteVehicle = useVehicleStore((s) => s.deleteVehicle);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [handoverVehicle, setHandoverVehicle] = useState(null);
  const [tcoByAracId, setTcoByAracId] = useState(null);
  const [loadingTco, setLoadingTco] = useState(false);
  const fetchAttemptedRef = useRef(false);
  const tcoRequestIdRef = useRef(0);

  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canViewAnalytics = canAccessChannel(user, 'analytics');

  const {
    viewMode, setViewMode, archivedAraclar, loadingArchived,
    hasLoadedArchived, restoringId, fetchArchivedAraclar, handleRestoreArac,
  } = useFleetArchive({ fetchAraclar, canManage });
  const isArchivedView = viewMode === 'arsiv';

  useEffect(() => {
    if (!hasLoaded && !loading && !fetchAttemptedRef.current) {
      fetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [hasLoaded, loading, fetchAraclar]);

  useEffect(() => {
    if (!canViewAnalytics) {
      tcoRequestIdRef.current += 1;
      setTcoByAracId(null);
      setLoadingTco(false);
      return undefined;
    }

    let cancelled = false;
    const loadTco = async () => {
      const reqId = ++tcoRequestIdRef.current;
      setLoadingTco(true);
      try {
        const res = await raporService.getTcoAnalizi(90);
        if (cancelled || reqId !== tcoRequestIdRef.current) return;
        const list = Array.isArray(res?.araclar) ? res.araclar : Array.isArray(res?.ogeler) ? res.ogeler : [];
        const map = {};
        for (const item of list) {
          if (item?.arac_id != null) map[String(item.arac_id)] = item;
        }
        setTcoByAracId(map);
      } catch {
        if (!cancelled && reqId === tcoRequestIdRef.current) setTcoByAracId({});
      } finally {
        if (!cancelled && reqId === tcoRequestIdRef.current) setLoadingTco(false);
      }
    };

    loadTco();
    const unsubscribe = subscribeDataChanged(
      [DATA_SCOPES.MOVEMENT, DATA_SCOPES.VEHICLE, DATA_SCOPES.COMPONENT],
      loadTco
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [canViewAnalytics]);

  const globalVehicleActive = !isArchivedView && Boolean(seciliAracId && seciliAracId !== 'tum');
  const activeAraclar = isArchivedView ? archivedAraclar : araclar;

  const visibleAraclar = useMemo(() => {
    if (!globalVehicleActive) return activeAraclar;
    return activeAraclar.filter((a) => String(a.arac_id) === String(seciliAracId));
  }, [activeAraclar, globalVehicleActive, seciliAracId]);

  const selectedVehicle = useMemo(() => {
    if (!globalVehicleActive) return null;
    return araclar.find((a) => String(a.arac_id) === String(seciliAracId)) || null;
  }, [araclar, globalVehicleActive, seciliAracId]);

  const urlDurumParam = searchParams.get('durum');
  const initialDurumFilter = VALID_DURUM_FILTERS.has(urlDurumParam) ? urlDurumParam : 'all';

  const handleDurumFilterChange = useCallback(
    (nextDurum) => {
      if (!searchParams.has('durum') && (!nextDurum || nextDurum === 'all')) return;
      const next = new URLSearchParams(searchParams);
      if (!nextDurum || nextDurum === 'all') {
        next.delete('durum');
      } else if (VALID_DURUM_FILTERS.has(nextDurum)) {
        next.set('durum', nextDurum);
      } else {
        next.delete('durum');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleClearGlobalVehicle = useCallback(() => setSeciliAracId(null), [setSeciliAracId]);

  const handleDetail = useCallback(
    (arac) => {
      setSeciliAracId(String(arac.arac_id));
      navigate('/app/hareketler');
    },
    [setSeciliAracId, navigate]
  );

  const handleCreateClick = useCallback(() => {
    if (!canManage) return;
    setEditingVehicle(null);
    setSheetOpen(true);
  }, [canManage]);

  const handleEditClick = useCallback((arac) => {
    if (!canManage) return;
    setEditingVehicle(arac);
    setSheetOpen(true);
  }, [canManage]);

  const handleSheetOpenChange = useCallback((nextOpen) => {
    setSheetOpen(nextOpen);
    if (!nextOpen) setEditingVehicle(null);
  }, []);

  const handleDeleteRequest = useCallback((arac) => {
    if (canManage) setDeleteTarget(arac);
  }, [canManage]);

  const handleConfirmDelete = async (arsiv_nedeni) => {
    if (!deleteTarget || !canManage) return;
    const target = deleteTarget;
    setIsDeleting(true);
    try {
      const res = await deleteVehicle(target.arac_id, { arsiv_nedeni });
      if (res) {
        setDeleteTarget(null);
        if (String(seciliAracId) === String(target.arac_id)) {
          setSeciliAracId(null);
        }
        emitDataChanged(DATA_SCOPES.VEHICLE);
        if (res?.islem === 'arsivlendi' && hasLoadedArchived) {
          fetchArchivedAraclar();
        }
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Filo</h1>
            <Badge variant="secondary" className="tabular-nums">
              {formatLocaleNumber(activeAraclar.length, 0)} araç
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Araç envanteri, KM/SMH sayaçları, zimmetli şoförler, belge vadeleri ve bakım ömrü
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Filo görünümü">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  viewMode === mode.id ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {canManage && (
            <Button type="button" size="sm" onClick={handleCreateClick} className="gap-1.5">
              <Plus className="size-4" />
              <span>Yeni Araç</span>
            </Button>
          )}
        </div>
      </div>

      {globalVehicleActive && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <Filter className="size-3.5 text-primary" />
            {selectedVehicle ? (
              <span className="font-mono font-semibold tabular-nums">
                {formatTurkishPlate(selectedVehicle.plaka)}
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleClearGlobalVehicle}
            className="gap-1 text-primary hover:text-primary"
          >
            <span>Tek araç filtresi aktif — Tümünü Göster</span>
            <X className="size-3" />
          </Button>
        </div>
      )}

      <FleetDataTable
        araclar={visibleAraclar}
        loading={isArchivedView ? loadingArchived : loading}
        hasLoaded={isArchivedView ? hasLoadedArchived : hasLoaded}
        canManage={canManage}
        canViewAnalytics={canViewAnalytics}
        tcoByAracId={tcoByAracId}
        loadingTco={loadingTco}
        isArchivedView={isArchivedView}
        restoringId={restoringId}
        globalVehicleActive={globalVehicleActive}
        initialDurumFilter={initialDurumFilter}
        onDurumFilterChange={handleDurumFilterChange}
        onClearGlobalVehicle={handleClearGlobalVehicle}
        onDetail={handleDetail}
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onDeleteRequest={handleDeleteRequest}
        onRestoreClick={handleRestoreArac}
        onHandoverClick={setHandoverVehicle}
      />

      <HandoverInspectionSheet
        open={handoverVehicle !== null}
        onOpenChange={(next) => { if (!next) setHandoverVehicle(null); }}
        arac={handoverVehicle}
        onSuccess={() => fetchAraclar()}
      />

      {canManage && (
        <VehicleSheet open={sheetOpen} onOpenChange={handleSheetOpenChange} arac={editingVehicle} />
      )}

      {canManage && (
        <VehicleArchiveDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}
          arac={deleteTarget}
          loading={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
