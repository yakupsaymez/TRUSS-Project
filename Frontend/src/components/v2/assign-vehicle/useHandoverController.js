import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import zimmetService from '@/services/zimmetService';
import useDocVaultUpload from '@/components/v2/doc-vault/useDocVaultUpload';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged } from '@/utils/dataEvents';
import { getTodayIso } from '@/utils/dateUtils';
import { parseSayacHatasi } from '@/utils/sayacHatasi';
import {
  applyChecklistStep, buildEmptyChecklist, HANDOVER_IMAGE_MIMES, HANDOVER_MAX_PHOTOS,
  mapHandoverDocsToItems, validateAndBuildInspection,
} from './handoverConstants';

const SRC = { source: 'handover-inspection-sheet' };

const buildFormFromDetail = (detail) => ({
  muayene_tarihi: getTodayIso(),
  sayac_degeri: detail?.guncel_sayac != null ? String(detail.guncel_sayac) : '',
  checklist: buildEmptyChecklist(), genel_sonuc: 'TEMIZ', notlar: '',
});

export default function useHandoverController({
  open, onOpenChange, assignment = null, arac = null, defaultTip = null, defaultCloseAssignment = false, onSuccess,
}) {
  const user = useAuthStore((s) => s.user);
  const role = resolveRole(user);
  const isManager = role === ROLES.SYSTEM_ADMIN || role === ROLES.FLEET_MANAGER;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [noActiveAssignment, setNoActiveAssignment] = useState(false);
  const [muayeneTipi, setMuayeneTipi] = useState(defaultTip || 'TESLIM_ALMA');
  const [kapatZimmet, setKapatZimmet] = useState(false);
  const [form, setForm] = useState(() => buildFormFromDetail(null));
  const [initialJson, setInitialJson] = useState('');
  const [errors, setErrors] = useState({});
  const [sayacFieldError, setSayacFieldError] = useState(null);
  const [photoTypeError, setPhotoTypeError] = useState(null);
  const [draftPhotos, setDraftPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const docUpload = useDocVaultUpload();
  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);
  const draftPhotosRef = useRef([]);
  draftPhotosRef.current = draftPhotos;

  const cleanupDrafts = useCallback((items) => {
    (items || []).forEach((d) => { if (d?.belge_id) docUpload.removeDraftOrDoc(d.belge_id, { silent: true }); });
  }, [docUpload]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!open) {
      docUpload.abortUpload(); docUpload.clearError(); cleanupDrafts(draftPhotosRef.current);
      setDraftPhotos([]); setPhotoTypeError(null);
      return;
    }
    const reqId = ++reqIdRef.current;
    setLoading(true); setNoActiveAssignment(false); setDetail(null);
    setErrors({}); setSayacFieldError(null); setPhotoTypeError(null); setDraftPhotos([]); docUpload.clearError();

    (async () => {
      try {
        let targetId = assignment?.atama_id ?? null;
        if (!targetId && arac?.arac_id) {
          const listRes = await zimmetService.getZimmetler({ arac_id: arac.arac_id, aktif: true, limit: 1 });
          if (!mountedRef.current || reqId !== reqIdRef.current) return;
          targetId = listRes?.zimmetler?.[0]?.atama_id ?? null;
        }
        if (!targetId) { if (mountedRef.current && reqId === reqIdRef.current) { setNoActiveAssignment(true); setLoading(false); } return; }
        const res = await zimmetService.getZimmetDetail(targetId);
        if (!mountedRef.current || reqId !== reqIdRef.current) return;
        const z = res?.zimmet || null;
        const resolvedTip = defaultTip || (!z?.teslim_alma ? 'TESLIM_ALMA' : 'TESLIM_ETME');
        const initForm = buildFormFromDetail(z);
        setDetail(z); setMuayeneTipi(resolvedTip);
        setKapatZimmet(Boolean(isManager && z?.aktif && (defaultCloseAssignment || resolvedTip === 'TESLIM_ETME')));
        setForm(initForm); setInitialJson(JSON.stringify(initForm));
      } catch (err) {
        if (mountedRef.current && reqId === reqIdRef.current) {
          notifyApiError(err, 'Zimmet bilgisi yüklenemedi.');
          if (getErrorStatus(err) === 404) setNoActiveAssignment(true);
        }
      } finally { if (mountedRef.current && reqId === reqIdRef.current) setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assignment?.atama_id, arac?.arac_id, defaultTip, defaultCloseAssignment, isManager]);

  const existingInspection = useMemo(() => (
    !detail ? null : muayeneTipi === 'TESLIM_ALMA' ? detail.teslim_alma : detail.teslim_etme
  ), [detail, muayeneTipi]);
  const isReadOnly = Boolean(existingInspection);
  const canCloseAssignment = Boolean(isManager && detail?.aktif && !isReadOnly);

  const handleTipChange = (nextTip) => {
    if (nextTip === muayeneTipi) return;
    docUpload.abortUpload(); docUpload.clearError(); cleanupDrafts(draftPhotosRef.current);
    setDraftPhotos([]); setPhotoTypeError(null); setSayacFieldError(null); setErrors({});
    setMuayeneTipi(nextTip); setKapatZimmet(Boolean(isManager && detail?.aktif && nextTip === 'TESLIM_ETME'));
  };

  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (key === 'sayac_degeri' || key === 'muayene_tarihi') setSayacFieldError(null);
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleChecklistChange = (key, val) => setForm((prev) => applyChecklistStep(prev, key, val));

  const handleSelectPhoto = async (file) => {
    if (isReadOnly || !detail?.arac_id || draftPhotos.length >= HANDOVER_MAX_PHOTOS) return;
    if (!HANDOVER_IMAGE_MIMES.includes(String(file?.type || '').trim().toLowerCase())) {
      setPhotoTypeError('Zimmet muayenesi için yalnızca JPG, PNG veya WebP görseli yüklenebilir.');
      return;
    }
    setPhotoTypeError(null);
    const uploaded = await docUpload.uploadFile({ aracId: detail.arac_id, varlikTipi: 'zimmet', file, bindImmediately: false });
    if (uploaded && mountedRef.current) setDraftPhotos((prev) => [...prev, uploaded]);
  };

  const handleRemovePhoto = async (item) => {
    if (item?.belge_id) await docUpload.removeDraftOrDoc(item.belge_id, { silent: true });
    setDraftPhotos((prev) => prev.filter((d) => d.belge_id !== item.belge_id));
  };

  const handleOpenPhoto = (item) => docUpload.openDocument({ belgeId: item?.belge_id, anahtar: item?.nesne_anahtari });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || docUpload.uploading || isReadOnly || !detail?.atama_id) return;
    const { errors: nextErr, payload } = validateAndBuildInspection(form, detail, draftPhotos);
    if (nextErr) { setErrors(nextErr); return; }

    setSubmitting(true); setErrors({}); setSayacFieldError(null);
    try {
      const res = await zimmetService.createMuayene(detail.atama_id, {
        ...payload, muayene_tipi: muayeneTipi, ...(isManager && kapatZimmet ? { kapat_zimmet: true } : {}),
      });
      setDraftPhotos([]);
      toast.success(res?.is_emri ? 'Muayene kaydedildi ve arıza iş emri oluşturuldu.' : 'Zimmet muayenesi kaydedildi.');
      emitDataChanged(DATA_SCOPES.HANDOVER, SRC); emitDataChanged(DATA_SCOPES.VEHICLE, SRC);
      if (res?.is_emri) emitDataChanged(DATA_SCOPES.WORK_ORDER, SRC);
      await onSuccess?.(res); onOpenChange?.(false);
    } catch (err) {
      if (getErrorStatus(err) === 422) {
        const parsed = parseSayacHatasi(err);
        if (parsed) setSayacFieldError(parsed);
        else notifyApiError(err, 'Muayene kaydedilemedi.');
      } else notifyApiError(err, 'Muayene kaydedilemedi.');
    } finally { if (mountedRef.current) setSubmitting(false); }
  };

  const photoItems = useMemo(() => (
    isReadOnly ? mapHandoverDocsToItems(existingInspection?.belgeler, { isDraft: false, canDelete: false })
      : mapHandoverDocsToItems(draftPhotos, { isDraft: true, canDelete: true })
  ), [isReadOnly, existingInspection, draftPhotos]);

  return {
    detail, loading, noActiveAssignment, muayeneTipi, kapatZimmet, setKapatZimmet,
    existingInspection, isReadOnly, canCloseAssignment, form, errors, sayacFieldError, submitting,
    isDirty: open && !isReadOnly && (JSON.stringify(form) !== initialJson || draftPhotos.length > 0),
    photoItems, photoUploading: docUpload.uploading, photoError: photoTypeError || docUpload.error,
    handleTipChange, setField, handleChecklistChange, handleSelectPhoto, handleRemovePhoto, handleOpenPhoto, handleSubmit,
  };
}
