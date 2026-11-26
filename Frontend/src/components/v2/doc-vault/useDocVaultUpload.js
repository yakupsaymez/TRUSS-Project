import { useCallback, useEffect, useRef, useState } from 'react';
import belgeService from '@/services/belgeService';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';

export const DOC_VAULT_ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const DOC_VAULT_MAX_BYTES = 10_485_760;

const ALLOWED_MIME_SET = new Set(DOC_VAULT_ALLOWED_MIME);

export function validateDocVaultFile(file) {
  if (!file) return 'Dosya seçilmedi.';
  const mime = String(file.type || '').trim().toLowerCase();
  if (!ALLOWED_MIME_SET.has(mime)) {
    return 'Yalnızca PDF, JPG, PNG veya WebP dosyaları yüklenebilir.';
  }
  const size = Number(file.size);
  if (!Number.isInteger(size) || size < 1 || size > DOC_VAULT_MAX_BYTES) {
    return 'Dosya boyutu 1 bayt ile 10 MB arasında olmalıdır.';
  }
  return null;
}

export default function useDocVaultUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  const abortUpload = useCallback(() => {
    requestIdRef.current += 1;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (mountedRef.current) {
      setUploading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const clearError = useCallback(() => {
    if (mountedRef.current) setError(null);
  }, []);

  const uploadFile = useCallback(async ({ aracId, varlikTipi, varlikId = null, file, bindImmediately = false }) => {
    if (!aracId) {
      const msg = 'Belge yüklemek için önce araç seçin.';
      if (mountedRef.current) setError(msg);
      return null;
    }

    const validationErr = validateDocVaultFile(file);
    if (validationErr) {
      if (mountedRef.current) setError(validationErr);
      return null;
    }

    abortUpload();
    const reqId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    if (mountedRef.current) {
      setUploading(true);
      setError(null);
    }

    const mime = String(file.type || '').trim().toLowerCase();
    const orijinalAd = String(file.name || 'belge').trim().slice(0, 180) || 'belge';

    try {
      const presign = await belgeService.requestUploadUrl({
        arac_id: Number(aracId),
        varlik_tipi: varlikTipi,
        varlik_id: varlikId ? Number(varlikId) : null,
        orijinal_ad: orijinalAd,
        mime_tipi: mime,
        boyut_bayt: file.size,
      });

      if (!mountedRef.current || reqId !== requestIdRef.current) return null;

      await belgeService.uploadToPresignedUrl({
        url: presign.yukleme?.url,
        method: presign.yukleme?.method || 'PUT',
        headers: presign.yukleme?.headers || { 'Content-Type': mime },
        file,
        signal: controller.signal,
      });

      if (!mountedRef.current || reqId !== requestIdRef.current) return null;

      if (bindImmediately && varlikId) {
        await belgeService.bindDocument(presign.belge_id, {
          varlik_tipi: varlikTipi,
          varlik_id: Number(varlikId),
        });
        if (!mountedRef.current || reqId !== requestIdRef.current) return null;
      }

      return {
        belge_id: presign.belge_id,
        nesne_anahtari: presign.nesne_anahtari,
        orijinal_ad: orijinalAd,
        mime_tipi: mime,
        boyut_bayt: file.size,
      };
    } catch (err) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
        return null;
      }
      if (!mountedRef.current || reqId !== requestIdRef.current) return null;
      const status = getErrorStatus(err);
      const msg =
        err?.response?.data?.message ||
        (status === 403 ? 'Bu işlem için yetkiniz yok.' : err?.message) ||
        'Belge yüklenemedi.';
      setError(msg);
      return null;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (mountedRef.current && reqId === requestIdRef.current) {
        setUploading(false);
      }
    }
  }, [abortUpload]);

  const removeDraftOrDoc = useCallback(async (belgeId, { silent = false } = {}) => {
    if (!belgeId) return false;
    try {
      await belgeService.deleteDocument(belgeId);
      return true;
    } catch (err) {
      if (!silent) notifyApiError(err, 'Belge silinemedi.');
      return false;
    }
  }, []);

  const openDocument = useCallback(async ({ belgeId, anahtar, legacyUrl } = {}) => {
    const directCandidate = [legacyUrl, anahtar].find(
      (v) => typeof v === 'string' && /^https?:\/\//i.test(v.trim())
    );
    if (directCandidate) {
      return belgeService.openUrlSafely(directCandidate);
    }

    try {
      const data = belgeId
        ? await belgeService.getAccessUrlById(belgeId, 'inline')
        : anahtar
          ? await belgeService.getAccessUrlByKey(anahtar, 'inline')
          : null;
      if (!data?.erisim_url) return false;
      return belgeService.openUrlSafely(data.erisim_url);
    } catch (err) {
      notifyApiError(err, 'Belge açılamadı.');
      return false;
    }
  }, []);

  return {
    uploading,
    error,
    clearError,
    abortUpload,
    uploadFile,
    removeDraftOrDoc,
    openDocument,
  };
}
