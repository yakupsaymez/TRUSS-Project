import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/services/api';
import adminService from '@/services/adminService';
import { notifyApiError } from '@/utils/apiError';
import {
  DEFAULT_NOTIFICATION_MATRIX,
  PERMISSION_LABELS,
  normalizeNotificationMatrix,
} from './ayarlarConstants';

export default function useAyarlarData({ user, isManager }) {
  const [loading, setLoading] = useState(true);

  // Genel tercihler
  const [dil, setDil] = useState('TR');
  const [paraBirimi, setParaBirimi] = useState('TRY');
  const [olcuBirimi, setOlcuBirimi] = useState('KM');

  // Profil & bildirimler
  const [adSoyad, setAdSoyad] = useState(user?.ad_soyad || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telefon, setTelefon] = useState('');
  const [emailBildirimAktif, setEmailBildirimAktif] = useState(true);
  const [smsBildirimAktif, setSmsBildirimAktif] = useState(false);
  const [bildirimTercihleri, setBildirimTercihleri] = useState(() =>
    normalizeNotificationMatrix(DEFAULT_NOTIFICATION_MATRIX)
  );

  // Organizasyon (yalnız SYSTEM_ADMIN & FLEET_MANAGER)
  const [orgMeta, setOrgMeta] = useState(null);
  const [orgUnvan, setOrgUnvan] = useState('');
  const [orgVergiNo, setOrgVergiNo] = useState('');

  const pageMountedRef = useRef(true);

  useEffect(() => {
    pageMountedRef.current = true;
    return () => {
      pageMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setLoading(true);
      const promises = [
        api.get('/users/settings/preferences'),
        api.get('/users/settings/notifications'),
      ];
      if (isManager) {
        promises.push(adminService.getOrganization());
      }

      const [preferencesResult, notificationsResult, organizationResult] =
        await Promise.allSettled(promises);

      if (!active || !pageMountedRef.current) return;

      if (preferencesResult.status === 'fulfilled') {
        const prefs = preferencesResult.value?.data?.preferences || {};
        setDil(prefs.dil || 'TR');
        setParaBirimi(prefs.para_birimi || 'TRY');
        setOlcuBirimi(prefs.olcu_birimi || 'KM');
      } else {
        notifyApiError(preferencesResult.reason, 'Uygulama tercihleri yüklenemedi.');
      }

      if (notificationsResult.status === 'fulfilled') {
        const info = notificationsResult.value?.data?.user || {};
        setAdSoyad(info.ad_soyad || user?.ad_soyad || '');
        setEmail(info.email || user?.email || '');
        setTelefon(info.telefon || '');
        setEmailBildirimAktif(Boolean(info.email_bildirim_aktif));
        setSmsBildirimAktif(Boolean(info.sms_bildirim_aktif));
        setBildirimTercihleri(normalizeNotificationMatrix(info.bildirim_tercihleri));
      } else {
        notifyApiError(notificationsResult.reason, 'Bildirim ayarları yüklenemedi.');
      }

      if (isManager && organizationResult) {
        if (organizationResult.status === 'fulfilled') {
          const org = organizationResult.value || null;
          setOrgMeta(org);
          setOrgUnvan(org?.unvan || '');
          setOrgVergiNo(org?.vergi_no || '');
        } else {
          notifyApiError(organizationResult.reason, 'Organizasyon profili yüklenemedi.');
        }
      }

      setLoading(false);
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, [user?.ad_soyad, user?.email, isManager]);

  const activePermissions = useMemo(() => {
    if (isManager) return [];
    const raw = user?.yetkiler;
    if (!raw || typeof raw !== 'object') return [];
    return Object.entries(raw)
      .filter(([, allowed]) => allowed === true)
      .map(([key]) => ({
        key,
        label: PERMISSION_LABELS[key] || key,
      }));
  }, [isManager, user?.yetkiler]);

  return {
    loading,
    pageMountedRef,
    dil,
    setDil,
    paraBirimi,
    setParaBirimi,
    olcuBirimi,
    setOlcuBirimi,
    adSoyad,
    email,
    activePermissions,
    telefon,
    setTelefon,
    emailBildirimAktif,
    setEmailBildirimAktif,
    smsBildirimAktif,
    setSmsBildirimAktif,
    bildirimTercihleri,
    setBildirimTercihleri,
    orgMeta,
    setOrgMeta,
    orgUnvan,
    setOrgUnvan,
    orgVergiNo,
    setOrgVergiNo,
  };
}
