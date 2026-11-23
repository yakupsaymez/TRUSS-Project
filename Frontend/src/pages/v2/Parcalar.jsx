import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import parcaService from '@/services/parcaService';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import ComponentDataTable, { hesaplaParcaOmru } from '@/components/v2/ComponentDataTable';
import ComponentSheet from '@/components/v2/ComponentSheet';
import ConfirmDialog from '@/components/v2/ConfirmDialog';
import SegmentedDistributionCard from '@/components/v2/SegmentedDistributionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Parcalar() {
  const user = useAuthStore((s) => s.user);

  const araclar = useVehicleStore((s) => s.araclar);
  const vehiclesLoading = useVehicleStore((s) => s.loading);
  const vehiclesHasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [parcalar, setParcalar] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sheetState, setSheetState] = useState({
    open: false,
    mode: 'create',
    parca: null,
  });

  const vehicleFetchAttemptedRef = useRef(false);
  const mountedRef = useRef(true);

  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);

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

  const verileriYukle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await parcaService.getAllParcalar();
      if (!mountedRef.current) return;
      setParcalar(Array.isArray(res) ? res : res?.parcalar || []);
    } catch (err) {
      if (!mountedRef.current) return;
      notifyApiError(err, 'Parça listesi alınamadı.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    verileriYukle();
  }, [verileriYukle]);

  useEffect(() => {
    const handleDataChanged = (event) => {
      if (event?.detail?.scope === 'component') {
        verileriYukle();
      }
    };
    window.addEventListener('truss:data-changed', handleDataChanged);
    return () => window.removeEventListener('truss:data-changed', handleDataChanged);
  }, [verileriYukle]);

  const aracMap = useMemo(() => {
    const map = new Map();
    araclar.forEach((a) => {
      map.set(String(a.arac_id), a);
    });
    return map;
  }, [araclar]);

  const isVehicleFiltered = Boolean(seciliAracId && seciliAracId !== 'tum');
  const selectedVehicle = isVehicleFiltered
    ? aracMap.get(String(seciliAracId)) || null
    : null;

  const { scopedTotal, scopedTotalCost, distributionSegments } = useMemo(() => {
    const scoped = isVehicleFiltered
      ? parcalar.filter((p) => String(p.arac_id) === String(seciliAracId))
      : parcalar;

    const counts = {
      iyi: 0,
      uyari: 0,
      kritik: 0,
      tarih_bazli: 0,
    };
    let totalCost = 0;

    scoped.forEach((parca) => {
      const { durum } = hesaplaParcaOmru(parca, aracMap);
      if (counts[durum] !== undefined) {
        counts[durum] += 1;
      }
      totalCost += Number(parca.maliyet || 0);
    });

    return {
      scopedTotal: scoped.length,
      scopedTotalCost: totalCost,
      distributionSegments: [
        {
          key: 'iyi',
          label: 'Optimal Ömür',
          count: counts.iyi,
          barClass: 'bg-status-success',
          dotClass: 'bg-status-success',
        },
        {
          key: 'uyari',
          label: 'Değişim Yaklaşıyor',
          count: counts.uyari,
          barClass: 'bg-status-warning',
          dotClass: 'bg-status-warning',
        },
        {
          key: 'kritik',
          label: 'Değişim Gerekli',
          count: counts.kritik,
          barClass: 'bg-destructive',
          dotClass: 'bg-destructive',
        },
        {
          key: 'tarih_bazli',
          label: 'Tarih Bazlı',
          count: counts.tarih_bazli,
          barClass: 'bg-muted-foreground/40',
          dotClass: 'bg-muted-foreground/40',
        },
      ],
    };
  }, [parcalar, isVehicleFiltered, seciliAracId, aracMap]);

  const handleSegmentSelect = useCallback((nextKey) => {
    setStatusFilter(nextKey || 'all');
  }, []);

  const handleCreateClick = useCallback(() => {
    if (!canManage) return;
    setSheetState({ open: true, mode: 'create', parca: null });
  }, [canManage]);

  const handleReplaceClick = useCallback(
    (parca) => {
      if (!canManage) return;
      setSheetState({ open: true, mode: 'replace', parca });
    },
    [canManage]
  );

  const handleEditClick = useCallback(
    (parca) => {
      if (!canManage) return;
      setSheetState({ open: true, mode: 'edit', parca });
    },
    [canManage]
  );

  const handleSheetOpenChange = useCallback((nextOpen) => {
    setSheetState((prev) =>
      nextOpen ? { ...prev, open: true } : { ...prev, open: false, parca: null }
    );
  }, []);

  const handleSheetSuccess = useCallback(async () => {
    await verileriYukle();
  }, [verileriYukle]);

  const handleDeleteRequest = useCallback(
    (parca) => {
      if (!canManage) return;
      setDeleteTarget(parca);
    },
    [canManage]
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !canManage) return;
    setIsDeleting(true);
    try {
      await parcaService.parcaSil(deleteTarget.parca_id);
      toast.success('Parça takip kaydı silindi.');
      setDeleteTarget(null);
      await verileriYukle();
    } catch (err) {
      notifyApiError(err, 'Parça silinemedi.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Parça Ömür Matrisi
            </h1>
            <Badge variant="secondary" className="tabular-nums">
              {formatLocaleNumber(parcalar.length, 0)} parça
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Bileşen değişim aralıkları, kalan ömür yüzdeleri ve üste sabitlenen kritik uyarılar
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            size="sm"
            onClick={handleCreateClick}
            className="gap-1.5"
          >
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
        totalLabel={`parça · Toplam Maliyet: ${formatCurrency(scopedTotalCost, { maximumFractionDigits: 2 })}`}
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
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteTarget(null);
          }}
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
