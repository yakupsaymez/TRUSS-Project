import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus, X } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import adminService from '@/services/adminService';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import FleetDataTable from '@/components/v2/FleetDataTable';
import ConfirmDialog from '@/components/v2/ConfirmDialog';
import VehicleSheet from '@/components/v2/VehicleSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Filo() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const hasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);
  const deleteVehicle = useVehicleStore((s) => s.deleteVehicle);

  const [driverByAracId, setDriverByAracId] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const fetchAttemptedRef = useRef(false);

  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);

  useEffect(() => {
    if (!hasLoaded && !loading && !fetchAttemptedRef.current) {
      fetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [hasLoaded, loading, fetchAraclar]);

  // Zimmetli şoför eşlemesi: yalnızca yönetici rollerinde (canManage) çağrılır; DRIVER + yetkiler.ekip için 403 üretmez.
  useEffect(() => {
    if (!canManage) {
      setDriverByAracId({});
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const users = await adminService.getUsers();
        if (cancelled || !Array.isArray(users)) return;

        const map = {};
        const rolePriority = {};

        users.forEach((u) => {
          const zimmetler = Array.isArray(u.zimmetli_araclar) ? u.zimmetli_araclar : [];
          const displayName = u.ad_soyad || u.email || '';
          if (!displayName) return;
          const isDriver = (u.role || ROLES.DRIVER) === ROLES.DRIVER;

          zimmetler.forEach((z) => {
            const aid = z?.arac_id ?? z?.id;
            if (aid === undefined || aid === null) return;
            const key = String(aid);
            if (!map[key] || (isDriver && !rolePriority[key])) {
              map[key] = displayName;
              rolePriority[key] = isDriver;
            }
          });
        });

        setDriverByAracId(map);
      } catch {
        // 403/ağ hatası: sessizce geç (403 toast'u api.js yönetir)
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canManage]);

  const globalVehicleActive = Boolean(seciliAracId && seciliAracId !== 'tum');

  const visibleAraclar = useMemo(() => {
    if (!globalVehicleActive) return araclar;
    return araclar.filter((a) => String(a.arac_id) === String(seciliAracId));
  }, [araclar, globalVehicleActive, seciliAracId]);

  const selectedVehicle = useMemo(() => {
    if (!globalVehicleActive) return null;
    return araclar.find((a) => String(a.arac_id) === String(seciliAracId)) || null;
  }, [araclar, globalVehicleActive, seciliAracId]);

  const handleClearGlobalVehicle = useCallback(() => {
    setSeciliAracId(null);
  }, [setSeciliAracId]);

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

  const handleEditClick = useCallback(
    (arac) => {
      if (!canManage) return;
      setEditingVehicle(arac);
      setSheetOpen(true);
    },
    [canManage]
  );

  const handleSheetOpenChange = useCallback((nextOpen) => {
    setSheetOpen(nextOpen);
    if (!nextOpen) {
      setEditingVehicle(null);
    }
  }, []);

  const handleDeleteRequest = useCallback(
    (arac) => {
      if (!canManage) return;
      setDeleteTarget(arac);
    },
    [canManage]
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !canManage) return;
    setIsDeleting(true);
    try {
      const ok = await deleteVehicle(deleteTarget.arac_id);
      if (ok) {
        setDeleteTarget(null);
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
              {formatLocaleNumber(araclar.length, 0)} araç
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Araç envanteri, KM/SMH sayaçları, zimmetli şoförler, belge vadeleri ve bakım ömrü
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
            <span>Yeni Araç</span>
          </Button>
        )}
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
        driverByAracId={driverByAracId}
        loading={loading}
        hasLoaded={hasLoaded}
        canManage={canManage}
        globalVehicleActive={globalVehicleActive}
        onClearGlobalVehicle={handleClearGlobalVehicle}
        onDetail={handleDetail}
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onDeleteRequest={handleDeleteRequest}
      />

      {canManage && (
        <VehicleSheet
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
          arac={editingVehicle}
        />
      )}

      {canManage && (
        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteTarget(null);
          }}
          title="Aracı filodan kaldır?"
          description={
            deleteTarget
              ? `${formatTurkishPlate(deleteTarget.plaka)} plakalı araç ve ilişkili tüm kayıtlar kalıcı olarak silinecek. Bu işlem geri alınamaz.`
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
