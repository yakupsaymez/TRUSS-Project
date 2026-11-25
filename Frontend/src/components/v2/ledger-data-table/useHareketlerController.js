import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import yakitService from '@/services/yakitService';
import bakimService from '@/services/bakimService';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { isSmhArac } from '@/utils/aracDurum';
import { notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged, subscribeDataChanged } from '@/utils/dataEvents';
import { toLocalIsoDate } from '@/utils/dateUtils';

function cozumleNotVeFatura(rawNotlar, rawFatura) {
  const ham = String(rawNotlar || '').trim();
  if (rawFatura) return { fatura_bilgisi: String(rawFatura).trim(), notlar: ham };
  const match = ham.match(/^\[Fatura:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) return { fatura_bilgisi: match[1].trim(), notlar: match[2].trim() };
  return { fatura_bilgisi: '', notlar: ham };
}

function parseRecordDate(raw) {
  if (!raw) return { tarih: '', timestamp: 0 };
  const str = String(raw).trim();
  const pureDateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDateMatch) {
    const [, y, m, d] = pureDateMatch;
    return { tarih: `${y}-${m}-${d}`, timestamp: new Date(Number(y), Number(m) - 1, Number(d)).getTime() };
  }
  const dateObj = new Date(str);
  if (Number.isNaN(dateObj.getTime())) return { tarih: '', timestamp: 0 };
  const iso = toLocalIsoDate(dateObj);
  const [y, m, d] = iso.split('-').map(Number);
  return { tarih: iso, timestamp: new Date(y, m - 1, d).getTime() };
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function formatTrDateShort(isoDate) {
  if (!isoDate) return '—';
  const parts = String(isoDate).slice(0, 10).split('-');
  if (parts.length !== 3) return '—';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

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
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [sheetState, setSheetState] = useState({ open: false, mode: 'create', initialTip: 'YAKIT', record: null });

  const vehicleFetchAttemptedRef = useRef(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canImportFuel = canManage && user?.yetkiler?.yakit !== false;
  const canAddFuel = canManage || user?.yetkiler?.yakit === true;
  const canAddMaintenance = canManage || user?.yetkiler?.bakim === true;
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

  const rows = useMemo(() => {
    const unified = [];
    yakitlar.forEach((y) => {
      const matched = aracMap.get(String(y.arac_id)) || null;
      const { tarih, timestamp } = parseRecordDate(y.tarih);
      const litre = Number(y.litre || 0);
      const tutar = Number(y.tutar || 0);
      const { fatura_bilgisi, notlar } = cozumleNotVeFatura(y.notlar, y.fatura_no || y.fatura_bilgisi);
      const isSmh = y.sayac_tipi ? y.sayac_tipi === 'SMH' : isSmhArac(matched);
      unified.push({
        id: `yakit-${y.yakit_id}`, rawId: Number(y.yakit_id), tip: 'YAKIT', arac_id: y.arac_id,
        plaka: y.plaka || matched?.plaka || `#${y.arac_id}`, marka: y.marka || matched?.marka || '',
        model: y.model || matched?.model || '', sayac_tipi: isSmh ? 'SMH' : 'KM',
        tarih, timestamp, km: parseNullableNumber(y.km), tutar, litre,
        birimFiyat: litre > 0 ? tutar / litre : null, altTur: y.yakit_tipi || 'Dizel',
        fatura_bilgisi, notlar, raw: y,
      });
    });
    bakimlar.forEach((b) => {
      const matched = aracMap.get(String(b.arac_id)) || null;
      const { tarih, timestamp } = parseRecordDate(b.tarih);
      const tutar = Number(b.maliyet ?? b.tutar ?? 0);
      const { fatura_bilgisi, notlar } = cozumleNotVeFatura(b.notlar || b.aciklama, b.fatura_no || b.fatura_bilgisi);
      const isSmh = b.sayac_tipi ? b.sayac_tipi === 'SMH' : isSmhArac(matched);
      unified.push({
        id: `bakim-${b.bakim_id}`, rawId: Number(b.bakim_id), tip: 'BAKIM', arac_id: b.arac_id,
        plaka: b.plaka || matched?.plaka || `#${b.arac_id}`, marka: b.marka || matched?.marka || '',
        model: b.model || matched?.model || '', sayac_tipi: isSmh ? 'SMH' : 'KM',
        tarih, timestamp, km: parseNullableNumber(b.km), tutar, litre: null, birimFiyat: null,
        altTur: b.bakim_tipi || b.islem_turu || b.bakim_turu || 'Periyodik Bakım',
        fatura_bilgisi, notlar, raw: b,
      });
    });
    unified.sort((a, b) => (b.timestamp !== a.timestamp ? b.timestamp - a.timestamp : (b.rawId || 0) - (a.rawId || 0)));
    return unified;
  }, [yakitlar, bakimlar, aracMap]);

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
    isVehicleScoped, scopedCount, deleteTarget, setDeleteTarget, isDeleting,
    importSheetOpen, setImportSheetOpen, sheetState,
    canManage, canImportFuel, canAddFuel, canAddMaintenance, canViewFinance,
    handleCreateYakit, handleCreateBakim, handleRepeatRow, handleEditRow,
    handleSheetOpenChange, handleSheetSuccess, handleDeleteRequest, handleConfirmDelete,
  };
}
