import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import raporService from '@/services/raporService';
import { DATA_SCOPES, subscribeDataChanged } from '@/utils/dataEvents';

export const COMPACT_LIMIT = 5;

export function useFleetEfficiency({
  canViewAnalytics = false,
  seciliAracId = 'tum',
  donemGun: controlledDonemGun,
  onDonemGunChange,
}) {
  const [internalDonemGun, setInternalDonemGun] = useState(90);
  const donemGun = controlledDonemGun ?? internalDonemGun;
  const setDonemGun = onDonemGunChange || setInternalDonemGun;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchTco = useCallback(async (gun) => {
    if (!canViewAnalytics) return;
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await raporService.getTcoAnalizi(gun);
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      setData(res || null);
    } catch {
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      setData(null);
    } finally {
      if (mountedRef.current && reqId === requestIdRef.current) setLoading(false);
    }
  }, [canViewAnalytics]);

  useEffect(() => {
    if (!canViewAnalytics) {
      requestIdRef.current += 1;
      setData(null);
      setLoading(false);
      return;
    }
    fetchTco(donemGun);
  }, [canViewAnalytics, donemGun, fetchTco]);

  useEffect(() => {
    if (!canViewAnalytics) return undefined;
    return subscribeDataChanged(
      [DATA_SCOPES.MOVEMENT, DATA_SCOPES.VEHICLE, DATA_SCOPES.COMPONENT],
      () => fetchTco(donemGun)
    );
  }, [canViewAnalytics, donemGun, fetchTco]);

  useEffect(() => {
    setExpanded(false);
  }, [seciliAracId, donemGun]);

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');

  const filteredItems = useMemo(() => {
    const raw = Array.isArray(data?.araclar) ? data.araclar : [];
    return isSingleVehicle
      ? raw.filter((item) => String(item.arac_id) === String(seciliAracId))
      : raw;
  }, [data, isSingleVehicle, seciliAracId]);

  const ozet = data?.ozet || {};
  const yenilemeSayisi = Number(ozet.yenileme_adayi_sayisi) || 0;
  const izleSayisi = Number(ozet.izle_sayisi) || 0;
  const displayedItems = expanded ? filteredItems : filteredItems.slice(0, COMPACT_LIMIT);
  const hiddenCount = Math.max(0, filteredItems.length - COMPACT_LIMIT);

  return {
    donemGun, setDonemGun, loading, expanded, setExpanded,
    filteredItems, ozet, yenilemeSayisi, izleSayisi, displayedItems, hiddenCount,
  };
}
