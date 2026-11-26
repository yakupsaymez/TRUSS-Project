import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import parcaService from '@/services/parcaService';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged, subscribeDataChanged } from '@/utils/dataEvents';
import { hesaplaParcaOmru } from '@/components/v2/ComponentDataTable';

const SEGMENT_DEFS = [
  { key: 'iyi', label: 'Optimal Ömür', barClass: 'bg-status-success', dotClass: 'bg-status-success' },
  { key: 'uyari', label: 'Değişim Yaklaşıyor', barClass: 'bg-status-warning', dotClass: 'bg-status-warning' },
  { key: 'kritik', label: 'Değişim Gerekli', barClass: 'bg-destructive', dotClass: 'bg-destructive' },
  { key: 'tarih_bazli', label: 'Tarih Bazlı', barClass: 'bg-muted-foreground/40', dotClass: 'bg-muted-foreground/40' },
];

export function useParcalarController() {
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
  const [sheetState, setSheetState] = useState({ open: false, mode: 'create', parca: null });

  const vehicleFetchAttemptedRef = useRef(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canViewFinance = canAccessChannel(user, 'analytics');

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

  const verileriYukle = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await parcaService.getAllParcalar();
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      setParcalar(Array.isArray(res) ? res : res?.parcalar || []);
    } catch (err) {
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      notifyApiError(err, 'Parça listesi alınamadı.');
    } finally {
      if (mountedRef.current && reqId === requestIdRef.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    verileriYukle();
  }, [verileriYukle]);

  useEffect(() => {
    return subscribeDataChanged(
      [DATA_SCOPES.COMPONENT, DATA_SCOPES.MOVEMENT, DATA_SCOPES.VEHICLE],
      verileriYukle,
      { ignoreSource: 'parcalar-page' }
    );
  }, [verileriYukle]);

  const aracMap = useMemo(() => {
    const map = new Map();
    araclar.forEach((a) => map.set(String(a.arac_id), a));
    return map;
  }, [araclar]);

  const isVehicleFiltered = Boolean(seciliAracId && seciliAracId !== 'tum');
  const selectedVehicle = isVehicleFiltered ? aracMap.get(String(seciliAracId)) || null : null;

  const { scopedTotal, scopedTotalCost, distributionSegments } = useMemo(() => {
    const scoped = isVehicleFiltered
      ? parcalar.filter((p) => String(p.arac_id) === String(seciliAracId))
      : parcalar;

    const counts = { iyi: 0, uyari: 0, kritik: 0, tarih_bazli: 0 };
    let totalCost = 0;

    scoped.forEach((parca) => {
      const { durum } = hesaplaParcaOmru(parca, aracMap);
      if (counts[durum] !== undefined) counts[durum] += 1;
      totalCost += Number(parca.maliyet || 0);
    });

    return {
      scopedTotal: scoped.length,
      scopedTotalCost: totalCost,
      distributionSegments: SEGMENT_DEFS.map((seg) => ({ ...seg, count: counts[seg.key] })),
    };
  }, [parcalar, isVehicleFiltered, seciliAracId, aracMap]);

  const handleSegmentSelect = useCallback((nextKey) => setStatusFilter(nextKey || 'all'), []);

  const handleCreateClick = useCallback(() => {
    if (canManage) setSheetState({ open: true, mode: 'create', parca: null });
  }, [canManage]);

  const handleReplaceClick = useCallback((parca) => {
    if (canManage) setSheetState({ open: true, mode: 'replace', parca });
  }, [canManage]);

  const handleEditClick = useCallback((parca) => {
    if (canManage) setSheetState({ open: true, mode: 'edit', parca });
  }, [canManage]);

  const handleSheetOpenChange = useCallback((nextOpen) => {
    setSheetState((prev) => (nextOpen ? { ...prev, open: true } : { ...prev, open: false, parca: null }));
  }, []);

  const handleSheetSuccess = useCallback(async () => {
    await verileriYukle();
    emitDataChanged(DATA_SCOPES.COMPONENT, { source: 'parcalar-page' });
  }, [verileriYukle]);

  const handleDeleteRequest = useCallback((parca) => {
    if (canManage) setDeleteTarget(parca);
  }, [canManage]);

  const handleDeleteDialogOpenChange = useCallback((open) => {
    if (!open && !isDeleting) setDeleteTarget(null);
  }, [isDeleting]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || !canManage) return;
    setIsDeleting(true);
    try {
      await parcaService.parcaSil(deleteTarget.parca_id);
      toast.success('Parça takip kaydı silindi.');
      setDeleteTarget(null);
      await verileriYukle();
      emitDataChanged(DATA_SCOPES.COMPONENT, { source: 'parcalar-page' });
    } catch (err) {
      notifyApiError(err, 'Parça silinemedi.');
    } finally {
      if (mountedRef.current) setIsDeleting(false);
    }
  }, [canManage, deleteTarget, verileriYukle]);

  return {
    araclar, seciliAracId, setSeciliAracId, parcalar, statusFilter, setStatusFilter,
    loading, hasLoaded, deleteTarget, isDeleting, sheetState, canManage, canViewFinance,
    selectedVehicle, scopedTotal, scopedTotalCost, distributionSegments,
    handleSegmentSelect, handleCreateClick, handleReplaceClick, handleEditClick,
    handleSheetOpenChange, handleSheetSuccess, handleDeleteRequest,
    handleDeleteDialogOpenChange, handleConfirmDelete,
  };
}
