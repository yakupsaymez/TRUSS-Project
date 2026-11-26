import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import bakimService from '@/services/bakimService';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { formatTrDate, getComplianceUrgency, normalizeIsoDate } from '@/utils/complianceUtils';
import { DATA_SCOPES, subscribeDataChanged } from '@/utils/dataEvents';
import { getTodayIso } from '@/utils/dateUtils';
import { formatTurkishPlate } from '@/utils/formatters';

const DOC_SPECS = [
  { key: 'muayene', label: 'Muayene', field: 'muayene_tarihi' },
  { key: 'sigorta', label: 'Sigorta', field: 'sigorta_tarihi' },
  { key: 'kasko', label: 'Kasko', field: 'kasko_tarihi' },
];

export function useTakvimController() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canViewLedger = canAccessChannel(user, 'ledger');

  const araclar = useVehicleStore((s) => s.araclar);
  const loadingVehicles = useVehicleStore((s) => s.loading);
  const hasLoadedVehicles = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [bakimlar, setBakimlar] = useState([]);
  const [loadingBakim, setLoadingBakim] = useState(false);
  const [bakimError, setBakimError] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);

  const vehicleFetchAttemptedRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!hasLoadedVehicles && !loadingVehicles && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [hasLoadedVehicles, loadingVehicles, fetchAraclar]);

  const fetchBakimList = useCallback(() => {
    if (!canViewLedger) {
      abortRef.current?.abort();
      requestIdRef.current += 1;
      setBakimlar([]);
      setLoadingBakim(false);
      setBakimError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const reqId = ++requestIdRef.current;

    setLoadingBakim(true);
    setBakimError(null);

    bakimService
      .getAllBakimlar()
      .then((res) => {
        if (controller.signal.aborted || requestIdRef.current !== reqId) return;
        setBakimlar(Array.isArray(res) ? res : res?.bakimlar || []);
      })
      .catch((err) => {
        if (controller.signal.aborted || requestIdRef.current !== reqId) return;
        setBakimError(err?.response?.data?.message || 'Bakım takvim kayıtları yüklenemedi.');
        notifyApiError(err, 'Bakım takvim kayıtları yüklenemedi.');
      })
      .finally(() => {
        if (controller.signal.aborted || requestIdRef.current !== reqId) return;
        setLoadingBakim(false);
      });
  }, [canViewLedger]);

  useEffect(() => {
    fetchBakimList();
    return () => abortRef.current?.abort();
  }, [fetchBakimList]);

  useEffect(() => {
    return subscribeDataChanged([DATA_SCOPES.MOVEMENT, DATA_SCOPES.VEHICLE, DATA_SCOPES.WORK_ORDER], () => {
      if (canViewLedger) fetchBakimList();
    });
  }, [canViewLedger, fetchBakimList]);

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');
  const filtreliAraclar = useMemo(
    () => (!isSingleVehicle ? araclar : araclar.filter((a) => String(a.arac_id) === String(seciliAracId))),
    [araclar, isSingleVehicle, seciliAracId]
  );
  const selectedVehicle = isSingleVehicle ? filtreliAraclar[0] || null : null;

  const aracById = useMemo(() => {
    const map = new Map();
    araclar.forEach((a) => map.set(String(a.arac_id), a));
    return map;
  }, [araclar]);

  const events = useMemo(() => {
    const list = [];
    const scopedIds = new Set();

    filtreliAraclar.forEach((arac) => {
      const idStr = String(arac.arac_id);
      scopedIds.add(idStr);
      const plate = formatTurkishPlate(arac.plaka);
      const vehicleLabel = [arac.marka, arac.model, arac.yil].filter(Boolean).join(' ');
      const isArchived = Boolean(arac.arsivlendi_mi);
      DOC_SPECS.forEach(({ key, label, field }) => {
        const iso = normalizeIsoDate(arac[field]);
        if (!iso) return;
        list.push({ id: `${key}-${idStr}-${iso}`, type: key, typeLabel: label, date: iso, aracId: idStr, plate, vehicleLabel, isArchived, shortLabel: `${label} · ${plate}`, title: `${label} · ${plate}`, subtitle: '', description: '' });
      });
    });

    if (canViewLedger && bakimlar.length > 0) {
      bakimlar.forEach((bakim) => {
        const idStr = String(bakim.arac_id);
        const iso = scopedIds.has(idStr) ? normalizeIsoDate(bakim.bakim_tarihi || bakim.tarih) : null;
        if (!iso) return;
        const arac = aracById.get(idStr);
        const plate = formatTurkishPlate(arac?.plaka || bakim.plaka || '');
        const vehicleLabel = [arac?.marka, arac?.model, arac?.yil].filter(Boolean).join(' ');
        const bakimTipi = bakim.bakim_tipi || '';
        list.push({ id: `bakim-${bakim.bakim_id ?? `${idStr}-${iso}`}`, type: 'bakim', typeLabel: 'Bakım', date: iso, aracId: idStr, plate, vehicleLabel, isArchived: Boolean(arac?.arsivlendi_mi), shortLabel: `Bakım · ${plate}`, title: `Bakım · ${plate}${bakimTipi ? ` · ${bakimTipi}` : ''}`, subtitle: bakimTipi, description: bakim.notlar || bakim.aciklama || '' });
      });
    }

    return list;
  }, [filtreliAraclar, canViewLedger, bakimlar, aracById]);

  const todayIso = useMemo(() => getTodayIso(), []);
  const handleEventSelect = useCallback((event) => { if (event) setDetailEvent(event); }, []);

  const handleCreateVehicle = () => {
    if (!canManage) return;
    setEditingVehicle(null);
    setSheetOpen(true);
  };

  const handleEditVehicle = (event) => {
    if (!canManage || !event || event.isArchived) return;
    const matched = aracById.get(String(event.aracId)) || null;
    if (!matched || matched.arsivlendi_mi) return;
    setDetailEvent(null);
    setEditingVehicle(matched);
    setSheetOpen(true);
  };

  const handleOpenWorkOrder = (event) => {
    if (!canManage || !event || event.isArchived || event.type === 'bakim') return;
    const urgency = getComplianceUrgency(event.date, todayIso);
    const oncelik = urgency.status === 'gecikmis' ? 'kritik' : urgency.status === 'yaklasiyor' ? 'yuksek' : 'normal';
    setDetailEvent(null);
    navigate('/app/is-emirleri', {
      state: {
        prefillWorkOrder: {
          arac_id: String(event.aracId), kategori: 'diger', oncelik,
          baslik: `${event.typeLabel} Yenileme · ${event.plate}`,
          aciklama: `${formatTrDate(event.date)} vadeli ${event.typeLabel.toLowerCase()} işlemi`,
        },
      },
    });
  };

  const navigateWithVehicle = (path) => {
    if (!detailEvent?.aracId) return;
    setSeciliAracId(String(detailEvent.aracId));
    setDetailEvent(null);
    navigate(path);
  };

  return {
    canManage, canViewLedger, events, todayIso, bakimError, fetchBakimList,
    isSingleVehicle, selectedVehicle, setSeciliAracId,
    isFleetEmpty: hasLoadedVehicles && !loadingVehicles && araclar.length === 0,
    isCalendarLoading: (loadingVehicles && !hasLoadedVehicles) || loadingBakim,
    sheetOpen, setSheetOpen, editingVehicle, setEditingVehicle, detailEvent, setDetailEvent,
    handleEventSelect, handleCreateVehicle, handleEditVehicle, handleOpenWorkOrder,
    handleOpenInFleet: () => navigateWithVehicle('/app/filo'),
    handleOpenInLedger: () => navigateWithVehicle('/app/hareketler'),
  };
}
