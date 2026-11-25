import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import aracService from '@/services/aracService';
import { notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged, subscribeDataChanged } from '@/utils/dataEvents';

export default function useFleetArchive({ fetchAraclar, canManage }) {
  const [viewMode, setViewMode] = useState('aktif');
  const [archivedAraclar, setArchivedAraclar] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [hasLoadedArchived, setHasLoadedArchived] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const archiveReqIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchArchivedAraclar = useCallback(async () => {
    const reqId = ++archiveReqIdRef.current;
    setLoadingArchived(true);
    try {
      const data = await aracService.getAraclar({ arsiv: 'sadece' });
      if (!mountedRef.current || reqId !== archiveReqIdRef.current) return;
      const list = Array.isArray(data) ? data : data?.araclar || [];
      setArchivedAraclar(list);
      setHasLoadedArchived(true);
    } catch (err) {
      if (!mountedRef.current || reqId !== archiveReqIdRef.current) return;
      notifyApiError(err, 'Arşivlenen araçlar yüklenemedi.');
    } finally {
      if (mountedRef.current && reqId === archiveReqIdRef.current) {
        setLoadingArchived(false);
      }
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'arsiv') {
      fetchArchivedAraclar();
    }
  }, [viewMode, fetchArchivedAraclar]);

  useEffect(() => {
    return subscribeDataChanged([DATA_SCOPES.VEHICLE], () => {
      if (viewMode === 'arsiv') {
        fetchArchivedAraclar();
      }
    });
  }, [viewMode, fetchArchivedAraclar]);

  const handleRestoreArac = useCallback(
    async (arac) => {
      if (!canManage || !arac?.arac_id || restoringId !== null) return;
      setRestoringId(arac.arac_id);
      try {
        const res = await aracService.restoreArac(arac.arac_id);
        toast.success(res?.message || 'Araç geri yüklendi.');
        if (mountedRef.current) {
          setArchivedAraclar((prev) =>
            prev.filter((item) => String(item.arac_id) !== String(arac.arac_id))
          );
        }
        await fetchAraclar?.();
        emitDataChanged(DATA_SCOPES.VEHICLE);
      } catch (err) {
        notifyApiError(err, 'Araç geri yüklenemedi.');
      } finally {
        if (mountedRef.current) {
          setRestoringId(null);
        }
      }
    },
    [canManage, restoringId, fetchAraclar]
  );

  return {
    viewMode,
    setViewMode,
    archivedAraclar,
    loadingArchived,
    hasLoadedArchived,
    restoringId,
    fetchArchivedAraclar,
    handleRestoreArac,
  };
}
