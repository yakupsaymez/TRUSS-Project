import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import yakitService from '@/services/yakitService';
import bakimService from '@/services/bakimService';
import belgeService from '@/services/belgeService';
import raporService from '@/services/raporService';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged, subscribeDataChanged } from '@/utils/dataEvents';
import { ALL_VALUE, buildUnifiedLedgerRows } from './ledgerTableHelpers';

export { formatTrDate as formatTrDateShort } from './ledgerTableHelpers';

export default function useHareketlerController() {
  const user = useAuthStore((s) => s.user);
  const araclar = useVehicleStore((s) => s.araclar);
  const vehiclesLoading = useVehicleStore((s) => s.loading);
  const vehiclesHasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [yakitlar, setYakitlar] = useState([]);
  const [bakimlar, setBakimlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [sheetState, setSheetState] = useState({ open: false, mode: 'create', initialTip: 'YAKIT', record: null });
  const [exportFilters, setExportFilters] = useState({ activeTab: ALL_VALUE, baslangicTarihi: '', bitisTarihi: '' });

  const vehicleFetchAttemptedRef = useRef(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const exportLockRef = useRef(false);

  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canImportFuel = canManage && user?.yetkiler?.yakit !== false;
  const canAddFuel = canManage || user?.yetkiler?.yakit === true;
  const canAddMaintenance = canManage || user?.yetkiler?.bakim === true;
  const canViewFinance = canAccessChannel(user, 'analytics');

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

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
      const [yRes, bRes] = await Promise.all([yakitService.getAllYakitlar(), bakimService.getAllBakimlar()]);
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      setYakitlar(Array.isArray(yRes) ? yRes : yRes?.yakitlar || []);
      setBakimlar(Array.isArray(bRes) ? bRes : bRes?.bakimlar || []);
    } catch (err) {
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      notifyApiError(err, 'Hareket kayıtları yüklenemedi.');
    } finally {
      if (mountedRef.current && reqId === requestIdRef.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, []);

  useEffect(() => { verileriYukle(); }, [verileriYukle]);

  useEffect(() => {
    return subscribeDataChanged([DATA_SCOPES.MOVEMENT], verileriYukle, { ignoreSource: 'hareketler-page' });
  }, [verileriYukle]);

  const aracMap = useMemo(() => {
    const map = new Map();
    araclar.forEach((a) => map.set(String(a.arac_id), a));
    return map;
  }, [araclar]);

  const rows = useMemo(
    () => buildUnifiedLedgerRows(yakitlar, bakimlar, aracMap, canViewFinance),
    [yakitlar, bakimlar, aracMap, canViewFinance]
  );

  const isVehicleScoped = Boolean(seciliAracId && seciliAracId !== 'tum');
  const scopedCount = useMemo(
    () => (isVehicleScoped ? rows.filter((r) => String(r.arac_id) === String(seciliAracId)).length : rows.length),
    [rows, isVehicleScoped, seciliAracId]
  );

  const handleCreateYakit = useCallback(() => {
    if (canAddFuel) setSheetState({ open: true, mode: 'create', initialTip: 'YAKIT', record: null });
  }, [canAddFuel]);

  const handleCreateBakim = useCallback(() => {
    if (canAddMaintenance) setSheetState({ open: true, mode: 'create', initialTip: 'BAKIM', record: null });
  }, [canAddMaintenance]);

  const handleRepeatRow = useCallback((row) => {
    const tip = row?.tip === 'BAKIM' ? 'BAKIM' : 'YAKIT';
    if ((tip === 'YAKIT' && !canAddFuel) || (tip === 'BAKIM' && !canAddMaintenance)) return;
    setSheetState({ open: true, mode: 'repeat', initialTip: tip, record: row });
  }, [canAddFuel, canAddMaintenance]);

  const handleEditRow = useCallback((row) => {
    if (canManage) setSheetState({ open: true, mode: 'edit', initialTip: row?.tip === 'BAKIM' ? 'BAKIM' : 'YAKIT', record: row });
  }, [canManage]);

  const handleSheetOpenChange = useCallback((nextOpen) => {
    setSheetState((prev) => (nextOpen ? { ...prev, open: true } : { ...prev, open: false, record: null }));
  }, []);

  const handleSheetSuccess = useCallback(async () => {
    await Promise.all([verileriYukle(), fetchAraclar()]);
    emitDataChanged(DATA_SCOPES.FUEL_ANOMALY, { source: 'hareketler-page' });
  }, [verileriYukle, fetchAraclar]);

  const handleDeleteRequest = useCallback((row) => {
    if (canManage) setDeleteTarget(row);
  }, [canManage]);

  const handleOpenBelge = useCallback(async (row) => {
    if (!canViewFinance || !row?.belge_url) return;
    const raw = String(row.belge_url).trim();
    if (/^https?:\/\//i.test(raw)) {
      belgeService.openUrlSafely(raw);
      return;
    }
    try {
      const data = await belgeService.getAccessUrlByKey(raw, 'inline');
      if (data?.erisim_url) belgeService.openUrlSafely(data.erisim_url);
    } catch (err) {
      notifyApiError(err, 'Belge açılamadı.');
    }
  }, [canViewFinance]);

  const handleExportCsv = useCallback(async () => {
    if (!canViewFinance || exportLockRef.current) return;
    exportLockRef.current = true;
    setExportingCsv(true);
    try {
      const tip = exportFilters.activeTab === 'YAKIT' || exportFilters.activeTab === 'BAKIM'
        ? exportFilters.activeTab
        : 'TUMU';
      const params = { tip };
      if (isVehicleScoped && Number(seciliAracId) > 0) params.arac_id = Number(seciliAracId);
      if (exportFilters.baslangicTarihi) params.baslangic = exportFilters.baslangicTarihi;
      if (exportFilters.bitisTarihi) params.bitis = exportFilters.bitisTarihi;
      const res = await raporService.exportHareketlerCsv(params);
      if (!mountedRef.current) return;
      if (res?.truncated) {
        toast('Kayıt sayısı sınırı aşıldığı için ilk 10.000 kayıt dışa aktarıldı.', { icon: '⚠️', duration: 6000 });
      } else {
        toast.success('Hareket defteri CSV dosyası indirildi.');
      }
    } catch (err) {
      if (mountedRef.current) notifyApiError(err, 'Hareketler CSV dışa aktarılamadı.');
    } finally {
      exportLockRef.current = false;
      if (mountedRef.current) setExportingCsv(false);
    }
  }, [canViewFinance, exportFilters, isVehicleScoped, seciliAracId]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !canManage) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.tip === 'YAKIT') await yakitService.yakitSil(deleteTarget.rawId);
      else await bakimService.bakimSil(deleteTarget.rawId);
      toast.success(deleteTarget.tip === 'YAKIT' ? 'Yakıt kaydı silindi.' : 'Bakım kaydı silindi.');
      setDeleteTarget(null);
      await Promise.all([verileriYukle(), fetchAraclar()]);
      emitDataChanged(DATA_SCOPES.FUEL_ANOMALY, { source: 'hareketler-page' });
    } catch (err) {
      notifyApiError(err, 'Kayıt silinemedi.');
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    araclar, seciliAracId, setSeciliAracId, rows, loading, hasLoaded,
    isVehicleScoped, scopedCount, deleteTarget, setDeleteTarget, isDeleting, exportingCsv,
    importSheetOpen, setImportSheetOpen, sheetState, setExportFilters,
    canManage, canImportFuel, canAddFuel, canAddMaintenance, canViewFinance,
    handleCreateYakit, handleCreateBakim, handleRepeatRow, handleEditRow,
    handleSheetOpenChange, handleSheetSuccess, handleDeleteRequest, handleConfirmDelete,
    handleOpenBelge, handleExportCsv,
  };
}
