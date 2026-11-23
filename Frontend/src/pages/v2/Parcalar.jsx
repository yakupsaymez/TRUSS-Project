import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import parcaService from '@/services/parcaService';
import { resolveRole, ROLES } from '@/pages/ChronoBeta/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import ComponentDataTable from '@/components/v2/ComponentDataTable';
import ComponentSheet from '@/components/v2/ComponentSheet';
import ConfirmDialog from '@/components/v2/ConfirmDialog';
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

      <ComponentDataTable
        parcalar={parcalar}
        araclar={araclar}
        seciliAracId={seciliAracId}
        onVehicleChange={setSeciliAracId}
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
