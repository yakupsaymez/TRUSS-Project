import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import aracService from '@/services/aracService';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged, subscribeDataChanged } from '@/utils/dataEvents';
import {
  TR_LOGISTICS_HUBS,
  buildCheckInFormState,
  buildWorkOrderPrefillFromVehicle,
  filterActiveMapVehicles,
  hasValidCoordinates,
  splitUnpositionedVehicles,
  validateCheckInCoordinates,
} from './haritaUtils';

const EMPTY_FORM = { aracId: '', hubId: '', enlem: '', boylam: '', konumAdi: '' };

export function useHaritaController() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(resolveRole(user));

  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const hasLoaded = useVehicleStore((s) => s.hasLoaded);
  const error = useVehicleStore((s) => s.error);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [activeMapAracId, setActiveMapAracId] = useState(null);
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);
  const [unpositionedOpen, setUnpositionedOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInForm, setCheckInForm] = useState(EMPTY_FORM);
  const [locatingGps, setLocatingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const submitLockRef = useRef(false);
  const fetchAttemptRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; requestIdRef.current += 1; };
  }, []);

  const loadVehiclesSafe = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    await fetchAraclar();
    if (!isMountedRef.current || reqId !== requestIdRef.current) return;
  }, [fetchAraclar]);

  useEffect(() => {
    if (!hasLoaded && !loading && !fetchAttemptRef.current) {
      fetchAttemptRef.current = true;
      loadVehiclesSafe();
    }
  }, [hasLoaded, loading, loadVehiclesSafe]);

  useEffect(
    () => subscribeDataChanged([DATA_SCOPES.VEHICLE, DATA_SCOPES.HANDOVER], loadVehiclesSafe, { ignoreSource: 'harita-checkin' }),
    [loadVehiclesSafe]
  );

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');
  const filtreliAraclar = useMemo(
    () => (!isSingleVehicle ? araclar : araclar.filter((a) => String(a.arac_id) === String(seciliAracId))),
    [araclar, isSingleVehicle, seciliAracId]
  );
  const activeCheckInVehicles = useMemo(() => filterActiveMapVehicles(araclar), [araclar]);
  const unpositionedVehicles = useMemo(() => splitUnpositionedVehicles(filtreliAraclar), [filtreliAraclar]);
  const selectedGlobalVehicle = isSingleVehicle ? filtreliAraclar[0] || null : null;
  const knownLocationCount = useMemo(() => filtreliAraclar.filter((a) => hasValidCoordinates(a)).length, [filtreliAraclar]);

  useEffect(() => {
    if (isSingleVehicle && seciliAracId) { setActiveMapAracId(String(seciliAracId)); return; }
    if (activeMapAracId && filtreliAraclar.some((a) => String(a.arac_id) === String(activeMapAracId))) return;
    const fallback = filtreliAraclar.find((a) => hasValidCoordinates(a)) || filtreliAraclar[0] || null;
    setActiveMapAracId(fallback ? String(fallback.arac_id) : null);
  }, [activeMapAracId, filtreliAraclar, isSingleVehicle, seciliAracId]);

  const setCheckInField = useCallback((key, val) => setCheckInForm((prev) => ({ ...prev, [key]: val })), []);

  const handleOpenCheckIn = useCallback((targetArac = null) => {
    if (submitLockRef.current) return;
    const candidate =
      (targetArac && targetArac.arsivlendi_mi !== true ? targetArac : null) ||
      filtreliAraclar.find((a) => String(a.arac_id) === String(activeMapAracId) && a.arsivlendi_mi !== true) ||
      activeCheckInVehicles[0] || null;
    if (!candidate) { toast.error('Konum bildirilebilecek aktif araç bulunamadı.'); return; }
    setCheckInForm(buildCheckInFormState(candidate));
    setCheckInOpen(true);
  }, [activeCheckInVehicles, activeMapAracId, filtreliAraclar]);

  const handleCheckInOpenChange = useCallback((nextOpen) => {
    if (!nextOpen && submitLockRef.current) return;
    setCheckInOpen(nextOpen);
  }, []);

  const handleCheckInVehicleChange = useCallback((nextId) => {
    const matched = activeCheckInVehicles.find((a) => String(a.arac_id) === String(nextId));
    setCheckInForm(matched ? buildCheckInFormState(matched) : { ...EMPTY_FORM, aracId: nextId });
  }, [activeCheckInVehicles]);

  const handleSelectHub = useCallback((hubId) => {
    const hub = TR_LOGISTICS_HUBS.find((h) => h.id === hubId);
    if (!hub) { setCheckInField('hubId', hubId); return; }
    setCheckInForm((prev) => ({ ...prev, hubId, enlem: String(hub.lat), boylam: String(hub.lng), konumAdi: hub.name }));
  }, [setCheckInField]);

  const handleUseDeviceGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Tarayıcınız GPS konum servisini desteklemiyor.');
      return;
    }
    const gpsReqId = ++requestIdRef.current;
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isMountedRef.current || gpsReqId !== requestIdRef.current) return;
        setLocatingGps(false);
        setCheckInForm((prev) => ({
          ...prev,
          hubId: '',
          enlem: String(Number(pos.coords.latitude).toFixed(5)),
          boylam: String(Number(pos.coords.longitude).toFixed(5)),
          konumAdi: prev.konumAdi.trim() ? prev.konumAdi : 'Saha GPS Check-In',
        }));
        toast.success('Cihaz GPS koordinatları alındı.');
      },
      (geoErr) => {
        if (!isMountedRef.current || gpsReqId !== requestIdRef.current) return;
        setLocatingGps(false);
        toast.error(geoErr?.code === 1 ? 'Konum izni reddedildi. Lütfen hızlı lojistik merkez seçin veya koordinat girin.' : 'Cihaz GPS konumu alınamadı. Lütfen listeden bir merkez seçin.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const handleSubmitCheckIn = useCallback(async (event) => {
    event.preventDefault();
    if (!checkInForm.aracId || submitLockRef.current) return;
    const check = validateCheckInCoordinates(checkInForm.enlem, checkInForm.boylam);
    if (!check.ok) { toast.error(check.error); return; }
    submitLockRef.current = true;
    setIsSubmitting(true);
    const reqId = ++requestIdRef.current;
    try {
      const trimmed = checkInForm.konumAdi.trim();
      await aracService.aracKonumGuncelle(checkInForm.aracId, {
        enlem: check.enlem,
        boylam: check.boylam,
        konum_adi: trimmed ? trimmed.slice(0, 160) : null,
      });
      emitDataChanged(DATA_SCOPES.VEHICLE, { source: 'harita-checkin', arac_id: Number(checkInForm.aracId) });
      await fetchAraclar();
      if (!isMountedRef.current || reqId !== requestIdRef.current) return;
      setActiveMapAracId(String(checkInForm.aracId));
      setCheckInOpen(false);
      toast.success('Araç konumu güncellendi.');
    } catch (err) {
      if (isMountedRef.current && reqId === requestIdRef.current) notifyApiError(err, 'Araç konumu güncellenemedi.');
    } finally {
      submitLockRef.current = false;
      if (isMountedRef.current) setIsSubmitting(false);
    }
  }, [checkInForm, fetchAraclar]);

  const handleOpenInFleet = useCallback((arac) => {
    if (!arac?.arac_id) return;
    setSeciliAracId(String(arac.arac_id));
    navigate('/app/filo');
  }, [navigate, setSeciliAracId]);

  const handleCreateWorkOrder = useCallback((arac) => {
    if (!canManage || !arac?.arac_id || arac.arsivlendi_mi === true) return;
    const prefillWorkOrder = buildWorkOrderPrefillFromVehicle(arac);
    if (prefillWorkOrder) navigate('/app/is-emirleri', { state: { prefillWorkOrder } });
  }, [canManage, navigate]);

  return {
    canManage, araclar, loading, hasLoaded, error, loadVehiclesSafe,
    seciliAracId, setSeciliAracId, isSingleVehicle, selectedGlobalVehicle,
    filtreliAraclar, activeCheckInVehicles, unpositionedVehicles,
    knownLocationCount, isFleetEmpty: hasLoaded && !loading && !error && araclar.length === 0,
    activeMapAracId, setActiveMapAracId, vehicleSheetOpen, setVehicleSheetOpen,
    unpositionedOpen, toggleUnpositionedPanel: () => setUnpositionedOpen((p) => !p),
    checkInOpen, handleCheckInOpenChange, checkInForm, setCheckInField,
    locatingGps, isSubmitting, handleOpenCheckIn, handleCheckInVehicleChange,
    handleSelectHub, handleUseDeviceGps, handleSubmitCheckIn, handleOpenInFleet, handleCreateWorkOrder,
  };
}
