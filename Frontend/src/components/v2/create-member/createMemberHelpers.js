import adminService from '@/services/adminService';
import { ROLES } from '@/components/v2/channelAccess';
import { INITIAL_PERMS } from '@/components/v2/CrewDataTable';
import { getErrorStatus } from '@/utils/apiError';
import { DATA_SCOPES, emitDataChanged } from '@/utils/dataEvents';
import { getTodayIso } from '@/utils/dateUtils';

export function buildInitialForm() {
  return {
    ad_soyad: '',
    email: '',
    sifre: '',
    telefon: '',
    role: ROLES.DRIVER,
    yetkiler: { ...INITIAL_PERMS[ROLES.DRIVER] },
    arac_id: '',
    atanma_tarihi: getTodayIso(),
  };
}

export function toWhitelistedPerms(raw) {
  return {
    yakit: Boolean(raw?.yakit),
    bakim: Boolean(raw?.bakim),
    finans: Boolean(raw?.finans),
  };
}

export function validateMemberForm(form, isSystemAdminViewer) {
  const errors = {};
  const trimmedName = form.ad_soyad.trim();
  const trimmedEmail = form.email.trim();
  const trimmedPhone = form.telefon.trim();
  const today = getTodayIso();

  if (trimmedName.length < 3) {
    errors.ad_soyad = 'Ad soyad en az 3 karakter olmalıdır.';
  }
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Geçerli bir e-posta adresi girin.';
  }
  if (String(form.sifre).length < 6) {
    errors.sifre = 'Geçici şifre en az 6 karakter olmalıdır.';
  }
  if (trimmedPhone.length > 20) {
    errors.telefon = 'Telefon en fazla 20 karakter olabilir.';
  }
  if (!isSystemAdminViewer && form.role === ROLES.SYSTEM_ADMIN) {
    errors.role = 'Sistem Admini rolünü yalnızca Sistem Admini atayabilir.';
  }
  if (form.role === ROLES.DRIVER && form.arac_id && form.atanma_tarihi && form.atanma_tarihi > today) {
    errors.atanma_tarihi = 'İleri tarihli zimmet girilemez.';
  }

  return { errors, trimmedName, trimmedEmail, trimmedPhone };
}

function errorDetail(err) {
  const msg = err?.response?.data?.message;
  return getErrorStatus(err) === 403 || !msg ? '' : ` (${msg})`;
}

export async function runPostCreateSteps(newUserId, form) {
  const adimHatalari = [];
  if (!newUserId) {
    adimHatalari.push(
      'Kullanıcı oluşturuldu ancak kimliği alınamadığından zimmet, rol ve yetkiler atanamadı — satırdan tekrar deneyebilirsiniz.'
    );
    return adimHatalari;
  }

  if (form.role === ROLES.DRIVER && form.arac_id) {
    try {
      await adminService.assignVehicle({
        sofor_user_id: Number(newUserId),
        arac_id: Number(form.arac_id),
        ...(form.atanma_tarihi ? { atanma_tarihi: form.atanma_tarihi } : {}),
      });
      const eventPayload = {
        source: 'create-member',
        action: 'assign',
        userId: newUserId,
        aracId: Number(form.arac_id),
      };
      emitDataChanged(DATA_SCOPES.VEHICLE, eventPayload);
      emitDataChanged(DATA_SCOPES.HANDOVER, eventPayload);
    } catch (err) {
      adimHatalari.push(
        `Kullanıcı oluşturuldu ancak araç zimmetlenemedi${errorDetail(err)} — satırdan tekrar deneyebilirsiniz.`
      );
    }
  }

  let rolBasarili = true;
  if (form.role !== ROLES.DRIVER) {
    try {
      await adminService.updateUserRole(newUserId, form.role);
    } catch (err) {
      rolBasarili = false;
      adimHatalari.push(
        `Kullanıcı oluşturuldu ancak rol atanamadı (Şoför olarak kaldı)${errorDetail(err)}; yetkiler de atanmadı — satırdan tekrar deneyebilirsiniz.`
      );
    }
  }

  if (rolBasarili) {
    try {
      await adminService.updateUserPermissions(newUserId, toWhitelistedPerms(form.yetkiler));
    } catch (err) {
      adimHatalari.push(
        `Kullanıcı oluşturuldu ancak yetkiler atanamadı${errorDetail(err)} — satırdan tekrar deneyebilirsiniz.`
      );
    }
  }

  return adimHatalari;
}
