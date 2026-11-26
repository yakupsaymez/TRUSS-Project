import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getLastRequestId } from '@/services/api';
import {
  DATA_SCOPES,
  emitDataChanged,
  subscribeDataChanged,
} from '@/utils/dataEvents';

export function useSupportFeedback({ open, role, onOpenChange }) {
  const location = useLocation();
  const isAdmin = role === 'SYSTEM_ADMIN';

  const [activeTab, setActiveTab] = useState('yeni');
  const [kategori, setKategori] = useState('DESTEK');
  const [baslik, setBaslik] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');
  const [filterDurum, setFilterDurum] = useState('ALL');
  const [filterKategori, setFilterKategori] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const params = {};
      if (filterDurum !== 'ALL') params.durum = filterDurum;
      if (filterKategori !== 'ALL') params.kategori = filterKategori;
      const res = await api.get('/geri-bildirim', { params, silent403: true });
      setItems(Array.isArray(res.data?.geri_bildirimler) ? res.data.geri_bildirimler : []);
    } catch (err) {
      setListError(err?.response?.data?.message || 'Bildirimler yüklenemedi.');
    } finally {
      setLoadingList(false);
    }
  }, [filterDurum, filterKategori]);

  useEffect(() => {
    if (!open) return;
    fetchList();
  }, [open, fetchList]);

  useEffect(() => {
    return subscribeDataChanged(DATA_SCOPES.SUPPORT, () => {
      if (open) fetchList();
    });
  }, [open, fetchList]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanTitle = baslik.trim();
    const cleanMsg = mesaj.trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 140) {
      setFormError('Başlık 3 ile 140 karakter arasında olmalıdır.');
      return;
    }
    if (cleanMsg.length < 10 || cleanMsg.length > 2000) {
      setFormError('Mesaj 10 ile 2000 karakter arasında olmalıdır.');
      return;
    }

    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/geri-bildirim', {
        kategori,
        baslik: cleanTitle,
        mesaj: cleanMsg,
        sayfa_yolu: location.pathname,
        son_istek_id: getLastRequestId(),
      });
      toast.success('Geri bildiriminiz alındı.');
      setBaslik('');
      setMesaj('');
      setKategori('DESTEK');
      emitDataChanged(DATA_SCOPES.SUPPORT, { source: 'support-sheet' });
      fetchList();
      setActiveTab('liste');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Geri bildirim gönderilemedi.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, durum, yoneticiNotu) => {
    if (!isAdmin) return;
    setUpdatingId(id);
    try {
      await api.patch(`/geri-bildirim/${id}/durum`, {
        durum,
        yonetici_notu: yoneticiNotu,
      });
      toast.success('Bildirim durumu güncellendi.');
      emitDataChanged(DATA_SCOPES.SUPPORT, { source: 'support-sheet' });
      fetchList();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Durum güncellenemedi.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) setFormError('');
    onOpenChange?.(nextOpen);
  };

  return {
    isAdmin,
    activeTab,
    setActiveTab,
    kategori,
    setKategori,
    baslik,
    setBaslik,
    mesaj,
    setMesaj,
    formError,
    submitting,
    items,
    loadingList,
    listError,
    filterDurum,
    setFilterDurum,
    filterKategori,
    setFilterKategori,
    updatingId,
    fetchList,
    handleSubmit,
    handleUpdateStatus,
    handleOpenChange,
  };
}
