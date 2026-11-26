import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import raporService from '@/services/raporService';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged, subscribeDataChanged } from '@/utils/dataEvents';

const COMPLIANCE_ROUTES = {
  yaklasiyor: '/app/filo?durum=riskli_evrak',
  suresi_dolmus: '/app/filo?durum=riskli_evrak',
  gecerli: '/app/filo?durum=sorunsuz',
  eksik: '/app/filo?durum=eksik_evrak',
};

export default function useGenelBakisController() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canViewAnalytics = canAccessChannel(user, 'analytics');

  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const hasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [aylikTrend, setAylikTrend] = useState([]);
  const [aracMaliyet, setAracMaliyet] = useState([]);
  const [butceAnalizi, setButceAnalizi] = useState(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);
  const [donemGun, setDonemGun] = useState(90);
  const [exportingKey, setExportingKey] = useState(null);

  const vehicleFetchAttemptedRef = useRef(false);
  const mountedRef = useRef(true);
  const financeRequestIdRef = useRef(0);
  const exportLockRef = useRef(false);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!hasLoaded && !loading && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [hasLoaded, loading, fetchAraclar]);

  const fetchFinanceData = useCallback(async () => {
    if (!canViewAnalytics) {
      financeRequestIdRef.current += 1;
      setAylikTrend([]);
      setAracMaliyet([]);
      setButceAnalizi(null);
      setLoadingFinance(false);
      return;
    }
    const reqId = ++financeRequestIdRef.current;
    setLoadingFinance(true);
    try {
      const [trendRes, maliyetRes, butceRes] = await Promise.all([
        raporService.getAylikHarcamaTrendi(),
        raporService.getAracMaliyetDagilimi(),
        raporService.getButceAnalizi(),
      ]);
      if (!mountedRef.current || reqId !== financeRequestIdRef.current) return;
      setAylikTrend(Array.isArray(trendRes) ? trendRes : []);
      setAracMaliyet(Array.isArray(maliyetRes) ? maliyetRes : []);
      setButceAnalizi(butceRes || null);
    } catch (err) {
      if (mountedRef.current && reqId === financeRequestIdRef.current) {
        notifyApiError(err, 'Finansal özet yüklenemedi.');
      }
    } finally {
      if (mountedRef.current && reqId === financeRequestIdRef.current) setLoadingFinance(false);
    }
  }, [canViewAnalytics]);

  useEffect(() => { fetchFinanceData(); }, [fetchFinanceData]);

  useEffect(() => subscribeDataChanged([DATA_SCOPES.MOVEMENT], () => {
    if (canViewAnalytics) fetchFinanceData();
  }), [canViewAnalytics, fetchFinanceData]);

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');
  const filtreliAraclar = useMemo(
    () => (!isSingleVehicle ? araclar : araclar.filter((a) => String(a.arac_id) === String(seciliAracId))),
    [araclar, isSingleVehicle, seciliAracId]
  );
  const selectedVehicle = isSingleVehicle ? filtreliAraclar[0] || null : null;
  const isFleetEmpty = hasLoaded && !loading && araclar.length === 0;

  const handleSelectVehicle = useCallback((arac) => {
    if (!arac?.arac_id) return;
    setSeciliAracId(String(arac.arac_id));
    navigate('/app/filo');
  }, [setSeciliAracId, navigate]);

  const handleSelectComplianceStatus = useCallback((segmentKey) => {
    navigate(COMPLIANCE_ROUTES[segmentKey] || '/app/filo');
  }, [navigate]);

  const handleBudgetUpdated = useCallback(() => {
    fetchFinanceData();
    emitDataChanged(DATA_SCOPES.BUDGET);
  }, [fetchFinanceData]);

  const handleExportCsv = useCallback(async (exportKey) => {
    if (!canViewAnalytics || exportLockRef.current) return;
    exportLockRef.current = true;
    setExportingKey(exportKey);
    const vehicleParam = isSingleVehicle && Number(seciliAracId) > 0 ? { arac_id: Number(seciliAracId) } : {};
    try {
      let res;
      if (exportKey === 'filo-maliyet') res = await raporService.exportFiloMaliyetCsv({ donem_gun: donemGun });
      else if (exportKey === 'hareketler') res = await raporService.exportHareketlerCsv({ tip: 'TUMU', ...vehicleParam });
      else if (exportKey === 'is-emirleri') res = await raporService.exportIsEmirleriCsv({ durum: 'TUMU', ...vehicleParam });
      else return;
      if (!mountedRef.current) return;
      if (res?.truncated) {
        toast('Kayıt sayısı sınırı aşıldığı için ilk 10.000 kayıt dışa aktarıldı.', { icon: '⚠️', duration: 6000 });
      } else {
        toast.success('CSV dosyası indirildi.');
      }
    } catch (err) {
      if (mountedRef.current) notifyApiError(err, 'CSV dışa aktarılamadı.');
    } finally {
      exportLockRef.current = false;
      if (mountedRef.current) setExportingKey(null);
    }
  }, [canViewAnalytics, donemGun, isSingleVehicle, seciliAracId]);

  return {
    user, canManage, canViewAnalytics, loading, hasLoaded, seciliAracId, setSeciliAracId,
    aylikTrend, aracMaliyet, butceAnalizi, loadingFinance, vehicleSheetOpen, setVehicleSheetOpen,
    donemGun, setDonemGun, exportingKey, isSingleVehicle, filtreliAraclar, selectedVehicle, isFleetEmpty,
    handleSelectVehicle, handleSelectComplianceStatus, handleBudgetUpdated, handleExportCsv,
  };
}
