import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import isEmriService from '@/services/isEmriService';
import belgeService from '@/services/belgeService';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged, subscribeDataChanged } from '@/utils/dataEvents';
import { parseSayacHatasi } from '@/utils/sayacHatasi';
import { WORK_ORDER_PAGE_SIZE } from './workOrderConstants';

const EMPTY_OZET = { acik: 0, serviste: 0, tamamlandi_bu_ay: 0 };
const SRC = { source: 'work-orders-page' };

export function useIsEmirleriController() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const araclar = useVehicleStore((s) => s.araclar);
  const vehiclesLoading = useVehicleStore((s) => s.loading);
  const vehiclesHasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);

  const role = resolveRole(user);
  const isMissingManagerOrg = role === ROLES.FLEET_MANAGER && !user?.org_id;
  const canManage = role === ROLES.SYSTEM_ADMIN || (role === ROLES.FLEET_MANAGER && Boolean(user?.org_id));
  const canViewFinance = canAccessChannel(user, 'analytics');
  const currentUserId = user?.user_id ?? user?.id ?? null;

  const [durum, setDurum] = useState('all');
  const [oncelik, setOncelik] = useState('all');
  const [kategori, setKategori] = useState('all');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [ozet, setOzet] = useState(EMPTY_OZET);
  const [loading, setLoading] = useState(!isMissingManagerOrg);
  const [hasLoaded, setHasLoaded] = useState(isMissingManagerOrg);
  const [submitting, setSubmitting] = useState(false);

  const [formSheet, setFormSheet] = useState({ open: false, mode: 'create', record: null, defaultDurum: null, prefill: null });
  const [completeTarget, setCompleteTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const vehicleAttemptRef = useRef(false);
  const prevAracRef = useRef(seciliAracId);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isMissingManagerOrg && !vehiclesHasLoaded && !vehiclesLoading && !vehicleAttemptRef.current) {
      vehicleAttemptRef.current = true;
      fetchAraclar();
    }
  }, [isMissingManagerOrg, vehiclesHasLoaded, vehiclesLoading, fetchAraclar]);

  const loadWorkOrders = useCallback(async () => {
    if (isMissingManagerOrg) {
      requestIdRef.current += 1;
      setRows([]);
      setToplam(0);
      setOzet(EMPTY_OZET);
      setLoading(false);
      setHasLoaded(true);
      return;
    }

    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await isEmriService.getIsEmirleri({
        durum, oncelik, kategori,
        arac_id: seciliAracId && seciliAracId !== 'tum' ? seciliAracId : undefined,
        limit: WORK_ORDER_PAGE_SIZE, offset,
      });
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      setRows(Array.isArray(res?.is_emirleri) ? res.is_emirleri : []);
      setToplam(Number(res?.toplam || 0));
      setOzet(res?.ozet || EMPTY_OZET);
    } catch (err) {
      if (mountedRef.current && reqId === requestIdRef.current) notifyApiError(err, 'İş emirleri yüklenemedi.');
    } finally {
      if (mountedRef.current && reqId === requestIdRef.current) { setLoading(false); setHasLoaded(true); }
    }
  }, [isMissingManagerOrg, durum, oncelik, kategori, seciliAracId, offset]);

  useEffect(() => {
    if (prevAracRef.current !== seciliAracId) {
      prevAracRef.current = seciliAracId;
      if (offset !== 0) { setOffset(0); return; }
    }
    loadWorkOrders();
  }, [seciliAracId, offset, loadWorkOrders]);

  useEffect(() => subscribeDataChanged([DATA_SCOPES.WORK_ORDER, DATA_SCOPES.VEHICLE], loadWorkOrders, { ignoreSource: 'work-orders-page' }), [loadWorkOrders]);

  const handleDurumChange = (val) => { setDurum(val); setOffset(0); };
  const handleOncelikChange = (val) => { setOncelik(val); setOffset(0); };
  const handleKategoriChange = (val) => { setKategori(val); setOffset(0); };
  const clearFilters = () => { setDurum('all'); setOncelik('all'); setKategori('all'); setOffset(0); };

  const openCreate = () => setFormSheet({ open: true, mode: 'create', record: null, defaultDurum: null, prefill: null });
  const openEdit = (record, defaultDurum = null) => setFormSheet({ open: true, mode: 'edit', record, defaultDurum, prefill: null });
  const closeFormSheet = () => setFormSheet({ open: false, mode: 'create', record: null, defaultDurum: null, prefill: null });

  useEffect(() => {
    const prefill = location.state?.prefillWorkOrder;
    if (!prefill) return;
    const normalizedPrefill = {
      arac_id: prefill.arac_id != null && Number.isFinite(Number(prefill.arac_id)) ? Number(prefill.arac_id) : undefined,
      kategori: typeof prefill.kategori === 'string' ? prefill.kategori : undefined,
      oncelik: typeof prefill.oncelik === 'string' ? prefill.oncelik : undefined,
      baslik: typeof prefill.baslik === 'string' ? prefill.baslik.trim() : undefined,
      ...(typeof prefill.aciklama === 'string' ? { aciklama: prefill.aciklama.trim() } : {}),
    };
    if (!isMissingManagerOrg) setFormSheet({ open: true, mode: 'create', record: null, defaultDurum: null, prefill: normalizedPrefill });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, isMissingManagerOrg]);

  const runSimpleMutation = async (fn, okMsg, errMsg, onOk) => {
    setSubmitting(true);
    try {
      await fn();
      toast.success(okMsg);
      onOk();
      emitDataChanged(DATA_SCOPES.WORK_ORDER, SRC);
      await loadWorkOrders();
      return true;
    } catch (err) {
      notifyApiError(err, errMsg);
      return false;
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const submitCreate = (payload) => runSimpleMutation(() => isEmriService.createIsEmri(payload), 'İş emri oluşturuldu.', 'İş emri oluşturulamadı.', closeFormSheet);
  const submitUpdate = (id, payload) => runSimpleMutation(() => isEmriService.updateIsEmri(id, payload), 'İş emri güncellendi.', 'İş emri güncellenemedi.', closeFormSheet);
  const submitCancel = (id, payload) => runSimpleMutation(() => isEmriService.cancelIsEmri(id, payload), 'İş emri iptal edildi.', 'İş emri iptal edilemedi.', () => setCancelTarget(null));

  const submitComplete = async (id, payload) => {
    setSubmitting(true);
    try {
      await isEmriService.completeIsEmri(id, payload);
      toast.success('İş emri tamamlandı ve bakım kaydı oluşturuldu.');
      setCompleteTarget(null);
      await fetchAraclar();
      emitDataChanged(DATA_SCOPES.WORK_ORDER, SRC);
      emitDataChanged(DATA_SCOPES.MOVEMENT, SRC);
      emitDataChanged(DATA_SCOPES.VEHICLE, SRC);
      if (payload.sifirla_parcalar === true) emitDataChanged(DATA_SCOPES.COMPONENT, SRC);
      await loadWorkOrders();
      return { ok: true };
    } catch (err) {
      if (err?.response?.status === 422) {
        const sayacHatasi = parseSayacHatasi(err) || { alanHatasi: err?.response?.data?.message || 'Girilen sayaç değeri geçersiz.', ipucu: null };
        return { ok: false, sayacHatasi };
      }
      notifyApiError(err, 'İş emri tamamlanamadı.');
      return { ok: false, sayacHatasi: null };
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const handleOpenDoc = useCallback(async ({ belgeId, anahtar } = {}) => {
    if (anahtar && /^https?:\/\//i.test(String(anahtar).trim())) {
      belgeService.openUrlSafely(anahtar);
      return;
    }
    try {
      const data = belgeId
        ? await belgeService.getAccessUrlById(belgeId, 'inline')
        : anahtar
          ? await belgeService.getAccessUrlByKey(anahtar, 'inline')
          : null;
      if (data?.erisim_url) belgeService.openUrlSafely(data.erisim_url);
    } catch (err) {
      notifyApiError(err, 'Belge açılamadı.');
    }
  }, []);

  return {
    araclar, vehiclesHasLoaded, seciliAracId, isMissingManagerOrg, canManage, canViewFinance, currentUserId,
    durum, oncelik, kategori, offset, setOffset,
    handleDurumChange, handleOncelikChange, handleKategoriChange, clearFilters,
    rows, toplam, ozet, loading, hasLoaded, submitting, loadWorkOrders,
    formSheet, openCreate, openEdit, closeFormSheet,
    completeTarget, setCompleteTarget, cancelTarget, setCancelTarget,
    submitCreate, submitUpdate, submitComplete, submitCancel, handleOpenDoc,
  };
}
