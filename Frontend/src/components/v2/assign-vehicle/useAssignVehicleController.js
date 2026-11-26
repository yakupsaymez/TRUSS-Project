import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import zimmetService from '@/services/zimmetService';
import useDocVaultUpload from '@/components/v2/doc-vault/useDocVaultUpload';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged } from '@/utils/dataEvents';
import { getTodayIso } from '@/utils/dateUtils';
import { parseSayacHatasi } from '@/utils/sayacHatasi';
import {
  applyChecklistStep, buildEmptyChecklist, getVehicleCounterValue, HANDOVER_IMAGE_MIMES,
  HANDOVER_MAX_PHOTOS, mapHandoverDocsToItems, validateAndBuildInspection,
} from './handoverConstants';

const SRC = { source: 'assign-vehicle-sheet' };
const buildInitialState = (member) => ({
  sofor_user_id: member?.user_id != null ? String(member.user_id) : '',
  arac_id: '', atanma_tarihi: getTodayIso(), muayene_tarihi: getTodayIso(),
  sayac_degeri: '', checklist: buildEmptyChecklist(), genel_sonuc: 'TEMIZ', notlar: '',
});

export default function useAssignVehicleController({ open, onOpenChange, member, drivers, vehicles, users, onSuccess }) {
  const [form, setForm] = useState(() => buildInitialState(member));
  const [initialJson, setInitialJson] = useState('');
  const [includeInspection, setIncludeInspection] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [sayacFieldError, setSayacFieldError] = useState(null);
  const [photoTypeError, setPhotoTypeError] = useState(null);
  const [draftPhotos, setDraftPhotos] = useState([]);
  const [driverZimmetler, setDriverZimmetler] = useState([]);
  const [loadingZimmetler, setLoadingZimmetler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unassigningVehicleId, setUnassigningVehicleId] = useState(null);

  const docUpload = useDocVaultUpload();
  const mountedRef = useRef(true);
  const listReqIdRef = useRef(0);
  const draftPhotosRef = useRef([]);
  draftPhotosRef.current = draftPhotos;

  const resetDraftPhotos = useCallback(() => {
    docUpload.abortUpload(); docUpload.clearError();
    draftPhotosRef.current.forEach((d) => { if (d?.belge_id) docUpload.removeDraftOrDoc(d.belge_id, { silent: true }); });
    setDraftPhotos([]); setPhotoTypeError(null);
  }, [docUpload]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!open) { resetDraftPhotos(); return; }
    const init = buildInitialState(member);
    setForm(init); setInitialJson(JSON.stringify(init));
    setIncludeInspection(false); setFieldErrors({}); setSayacFieldError(null);
    setPhotoTypeError(null); setDraftPhotos([]); setUnassigningVehicleId(null); docUpload.clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member]);

  const loadDriverZimmetler = useCallback(async (driverId) => {
    const reqId = ++listReqIdRef.current;
    if (!driverId) { setDriverZimmetler([]); setLoadingZimmetler(false); return; }
    setLoadingZimmetler(true);
    try {
      const res = await zimmetService.getZimmetler({ sofor_user_id: driverId, aktif: true, limit: 50 });
      if (mountedRef.current && reqId === listReqIdRef.current) setDriverZimmetler(Array.isArray(res?.zimmetler) ? res.zimmetler : []);
    } catch {
      if (mountedRef.current && reqId === listReqIdRef.current) setDriverZimmetler([]);
    } finally { if (mountedRef.current && reqId === listReqIdRef.current) setLoadingZimmetler(false); }
  }, []);

  useEffect(() => { if (open) loadDriverZimmetler(form.sofor_user_id); }, [open, form.sofor_user_id, loadDriverZimmetler]);

  const activeAssigneeByVehicle = useMemo(() => {
    const map = new Map();
    users.forEach((u) => (Array.isArray(u?.zimmetli_araclar) ? u.zimmetli_araclar : []).forEach((z) => {
      if (z?.arac_id != null) map.set(String(z.arac_id), u);
    }));
    return map;
  }, [users]);

  const selectedDriver = useMemo(() => (
    member ? users.find((u) => String(u.user_id) === String(member.user_id)) || member
      : form.sofor_user_id ? drivers.find((d) => String(d.user_id) === String(form.sofor_user_id)) || null : null
  ), [member, users, drivers, form.sofor_user_id]);

  const selectedVehicle = useMemo(() => vehicles.find((v) => String(v.arac_id) === String(form.arac_id)) || null, [vehicles, form.arac_id]);
  const selectedVehicleOwner = form.arac_id ? activeAssigneeByVehicle.get(String(form.arac_id)) || null : null;
  const isTransferringFromOtherDriver = Boolean(selectedVehicleOwner && form.sofor_user_id && String(selectedVehicleOwner.user_id) !== String(form.sofor_user_id));
  const isSameDriverAlreadyAssigned = Boolean(selectedVehicleOwner && form.sofor_user_id && String(selectedVehicleOwner.user_id) === String(form.sofor_user_id));

  const mergedAssignments = useMemo(() => {
    const fallback = Array.isArray(selectedDriver?.zimmetli_araclar) ? selectedDriver.zimmetli_araclar : [];
    if (driverZimmetler.length === 0) return fallback;
    const byVehicle = new Map(driverZimmetler.map((z) => [String(z.arac_id), z]));
    return fallback.length > 0 ? fallback.map((f) => byVehicle.get(String(f.arac_id)) || f) : driverZimmetler;
  }, [selectedDriver, driverZimmetler]);

  const handleFieldChange = (field, value) => {
    if (field === 'arac_id' && value !== form.arac_id) {
      resetDraftPhotos(); setSayacFieldError(null);
      const nextVeh = vehicles.find((v) => String(v.arac_id) === String(value));
      setForm((prev) => ({ ...prev, arac_id: value, sayac_degeri: getVehicleCounterValue(nextVeh) }));
    } else setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'sayac_degeri' || field === 'muayene_tarihi') setSayacFieldError(null);
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleChecklistChange = (key, val) => setForm((prev) => applyChecklistStep(prev, key, val));
  const handleToggleInspection = (checked) => {
    setIncludeInspection(Boolean(checked)); setSayacFieldError(null);
    if (checked && !form.sayac_degeri && selectedVehicle) setForm((prev) => ({ ...prev, sayac_degeri: getVehicleCounterValue(selectedVehicle) }));
  };

  const handleSelectPhoto = async (file) => {
    if (!form.arac_id || draftPhotos.length >= HANDOVER_MAX_PHOTOS) return;
    if (!HANDOVER_IMAGE_MIMES.includes(String(file?.type || '').trim().toLowerCase())) {
      setPhotoTypeError('Zimmet muayenesi için yalnızca JPG, PNG veya WebP görseli yüklenebilir.');
      return;
    }
    setPhotoTypeError(null);
    const uploaded = await docUpload.uploadFile({ aracId: form.arac_id, varlikTipi: 'zimmet', file, bindImmediately: false });
    if (uploaded && mountedRef.current) setDraftPhotos((prev) => [...prev, uploaded]);
  };

  const handleRemovePhoto = async (item) => {
    if (item?.belge_id) await docUpload.removeDraftOrDoc(item.belge_id, { silent: true });
    setDraftPhotos((prev) => prev.filter((d) => d.belge_id !== item.belge_id));
  };

  const handleUnassignVehicle = async (aracId) => {
    if (aracId == null || isSubmitting || unassigningVehicleId != null) return;
    setUnassigningVehicleId(String(aracId));
    try {
      await zimmetService.unassignVehicle(aracId);
      toast.success('Araç zimmeti kaldırıldı.');
      emitDataChanged(DATA_SCOPES.VEHICLE, SRC); emitDataChanged(DATA_SCOPES.HANDOVER, SRC);
      await Promise.all([onSuccess?.(), loadDriverZimmetler(form.sofor_user_id)]);
    } catch (err) {
      notifyApiError(err, 'Araç zimmeti kaldırılamadı.');
      if ([404, 409].includes(getErrorStatus(err))) await onSuccess?.();
    } finally { if (mountedRef.current) setUnassigningVehicleId(null); }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || docUpload.uploading) return;
    const errors = {};
    if (!form.sofor_user_id) errors.sofor_user_id = 'Lütfen bir şoför seçin.';
    if (!form.arac_id) errors.arac_id = 'Lütfen zimmetlenecek aracı seçin.';
    if (form.atanma_tarihi && form.atanma_tarihi > getTodayIso()) errors.atanma_tarihi = 'İleri tarihli zimmet girilemez.';
    let muayenePayload;
    if (includeInspection) {
      const { errors: inspErr, payload } = validateAndBuildInspection(form, selectedVehicle, draftPhotos);
      if (inspErr) Object.assign(errors, inspErr);
      else muayenePayload = payload;
    }
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setIsSubmitting(true); setFieldErrors({}); setSayacFieldError(null);
    try {
      const res = await zimmetService.assignVehicle({
        sofor_user_id: Number(form.sofor_user_id), arac_id: Number(form.arac_id),
        ...(form.atanma_tarihi ? { atanma_tarihi: form.atanma_tarihi } : {}),
        ...(muayenePayload ? { muayene: muayenePayload } : {}),
      });
      setDraftPhotos([]);
      toast.success(res?.is_emri ? 'Araç zimmetlendi, muayene kaydedildi ve arıza iş emri açıldı.' : 'Araç şoföre başarıyla zimmetlendi.');
      emitDataChanged(DATA_SCOPES.VEHICLE, SRC); emitDataChanged(DATA_SCOPES.HANDOVER, SRC);
      if (res?.is_emri) emitDataChanged(DATA_SCOPES.WORK_ORDER, SRC);
      await onSuccess?.(); onOpenChange?.(false);
    } catch (err) {
      const status = getErrorStatus(err);
      if (status === 422) {
        const parsed = parseSayacHatasi(err);
        if (parsed) setSayacFieldError(parsed);
        else setFieldErrors((p) => ({ ...p, sofor_user_id: err?.response?.data?.message || 'Araç yalnızca Şoför rolündeki kullanıcılara zimmetlenebilir.' }));
      } else if (status === 409) { notifyApiError(err, 'Araç eşzamanlı olarak zimmetlendi, liste yenilendi.'); await onSuccess?.(); }
      else notifyApiError(err, 'Araç zimmetlenemedi.');
    } finally { if (mountedRef.current) setIsSubmitting(false); }
  };

  return {
    form, includeInspection, fieldErrors, sayacFieldError, isSubmitting, unassigningVehicleId,
    isDirty: open && (JSON.stringify(form) !== initialJson || includeInspection || draftPhotos.length > 0),
    activeAssigneeByVehicle, selectedDriver, selectedVehicle, selectedVehicleOwner,
    isTransferringFromOtherDriver, isSameDriverAlreadyAssigned, mergedAssignments, loadingZimmetler, loadDriverZimmetler,
    photoItems: mapHandoverDocsToItems(draftPhotos, { isDraft: true, canDelete: true }),
    photoUploading: docUpload.uploading, photoError: photoTypeError || docUpload.error,
    handleFieldChange, handleChecklistChange, handleToggleInspection,
    handleSelectPhoto, handleRemovePhoto, handleUnassignVehicle, handleSubmit,
  };
}
