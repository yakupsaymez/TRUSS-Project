import { getGuncelSayac, isSmhArac } from '@/utils/aracDurum';
import { getTodayIso, toLocalIsoDate } from '@/utils/dateUtils';
import { formatLocaleNumber, formatTurkishPlate, parseLocaleNumber } from '@/utils/formatters';

export function extractIsoDate(raw, fallback) {
  if (!raw) return fallback;
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return fallback;
  return toLocalIsoDate(d);
}

export function findVehicle(araclar, aracId) {
  if (!aracId || !Array.isArray(araclar)) return null;
  return araclar.find((a) => String(a.arac_id) === String(aracId)) || null;
}

export function resolveDefaultAracId(defaultAracId, araclar) {
  if (defaultAracId && defaultAracId !== 'tum') {
    return String(defaultAracId);
  }
  if (Array.isArray(araclar) && araclar.length > 0) {
    return String(araclar[0].arac_id);
  }
  return '';
}

export function buildInitialForm({ mode, parca, defaultAracId, araclar, prefill = null }) {
  const todayIso = getTodayIso();

  if (mode === 'replace' && parca) {
    const matchedArac = findVehicle(araclar, parca.arac_id);
    const guncelSayac = Number(
      parca.guncel_km ?? (matchedArac ? getGuncelSayac(matchedArac) : 0) ?? 0
    );
    return {
      arac_id: parca.arac_id !== undefined && parca.arac_id !== null ? String(parca.arac_id) : '',
      parca_adi: parca.parca_adi || '',
      son_degisim_km: formatLocaleNumber(guncelSayac, 0),
      degisim_araligi_km:
        parca.degisim_araligi_km !== null &&
        parca.degisim_araligi_km !== undefined &&
        parca.degisim_araligi_km !== ''
          ? formatLocaleNumber(parca.degisim_araligi_km, 0)
          : '',
      son_degisim_tarihi: todayIso,
      maliyet: '',
      notlar: '',
    };
  }

  if (mode === 'edit' && parca) {
    return {
      arac_id: parca.arac_id !== undefined && parca.arac_id !== null ? String(parca.arac_id) : '',
      parca_adi: parca.parca_adi || '',
      son_degisim_km:
        parca.son_degisim_km !== null && parca.son_degisim_km !== undefined
          ? formatLocaleNumber(parca.son_degisim_km, 0)
          : '0',
      degisim_araligi_km:
        parca.degisim_araligi_km !== null &&
        parca.degisim_araligi_km !== undefined &&
        parca.degisim_araligi_km !== ''
          ? formatLocaleNumber(parca.degisim_araligi_km, 0)
          : '',
      son_degisim_tarihi: extractIsoDate(parca.son_degisim_tarihi, todayIso),
      maliyet:
        parca.maliyet !== null && parca.maliyet !== undefined && Number(parca.maliyet) > 0
          ? formatLocaleNumber(parca.maliyet, 2)
          : parca.maliyet === 0 || parca.maliyet === '0'
            ? '0'
            : '',
      notlar: parca.notlar || '',
    };
  }

  const resolvedId =
    prefill?.arac_id !== undefined && prefill?.arac_id !== null && prefill?.arac_id !== ''
      ? String(prefill.arac_id)
      : resolveDefaultAracId(defaultAracId, araclar);
  const matchedArac = findVehicle(araclar, resolvedId);
  const isSmh = matchedArac ? isSmhArac(matchedArac) : false;
  const guncelSayac = matchedArac ? getGuncelSayac(matchedArac) : 0;

  return {
    arac_id: resolvedId,
    parca_adi: prefill?.parca_adi ? String(prefill.parca_adi) : '',
    son_degisim_km:
      prefill?.son_degisim_km !== undefined &&
      prefill?.son_degisim_km !== null &&
      prefill?.son_degisim_km !== ''
        ? formatLocaleNumber(prefill.son_degisim_km, 0)
        : formatLocaleNumber(guncelSayac, 0),
    degisim_araligi_km:
      prefill?.degisim_araligi_km !== undefined &&
      prefill?.degisim_araligi_km !== null &&
      prefill?.degisim_araligi_km !== ''
        ? formatLocaleNumber(prefill.degisim_araligi_km, 0)
        : isSmh
          ? '250'
          : formatLocaleNumber(30000, 0),
    son_degisim_tarihi: todayIso,
    maliyet:
      prefill?.maliyet !== undefined &&
      prefill?.maliyet !== null &&
      prefill?.maliyet !== '' &&
      Number(prefill.maliyet) > 0
        ? formatLocaleNumber(prefill.maliyet, 2)
        : '',
    notlar: prefill?.notlar ? String(prefill.notlar) : '',
  };
}

export function parseNonNegativeInteger(raw, { required = false } = {}) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return required ? { valid: false, value: null } : { valid: true, value: null };
  }
  const parsed = parseLocaleNumber(trimmed);
  if (parsed === null || !Number.isInteger(parsed) || parsed < 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value: parsed };
}

export function parseNonNegativeDecimal(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { valid: true, value: 0 };
  const parsed = parseLocaleNumber(trimmed);
  if (parsed === null || !Number.isFinite(parsed) || parsed < 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value: parsed };
}

export function validateAndBuildComponentPayload({ form, isCreateMode, parca }) {
  const errors = {};
  const todayIso = getTodayIso();

  // ADR-09: Edit/replace modunda arac_id değiştirilemez; orijinal parca.arac_id korunur
  const effectiveAracId = !isCreateMode && parca?.arac_id ? parca.arac_id : form.arac_id;
  if (!effectiveAracId) {
    errors.arac_id = 'Araç seçimi zorunludur.';
  }

  const trimmedAdi = form.parca_adi.trim();
  if (trimmedAdi.length < 2 || trimmedAdi.length > 120) {
    errors.parca_adi = 'Parça adı 2 ile 120 karakter arasında olmalıdır.';
  }

  const sonKmRes = parseNonNegativeInteger(form.son_degisim_km, { required: true });
  if (!sonKmRes.valid) {
    errors.son_degisim_km = 'Geçerli bir tam sayı (≥ 0) girin.';
  }

  const aralikRes = parseNonNegativeInteger(form.degisim_araligi_km, { required: false });
  if (!aralikRes.valid) {
    errors.degisim_araligi_km = 'Geçerli bir tam sayı (≥ 0) girin veya boş bırakın.';
  }

  if (!form.son_degisim_tarihi) {
    errors.son_degisim_tarihi = 'Değişim tarihi zorunludur.';
  } else if (form.son_degisim_tarihi > todayIso) {
    errors.son_degisim_tarihi = 'İleri tarihli kayıt girilemez.';
  }

  const maliyetRes = parseNonNegativeDecimal(form.maliyet);
  if (!maliyetRes.valid) {
    errors.maliyet = 'Geçerli bir tutar (≥ 0) girin.';
  }

  const trimmedNotlar = form.notlar.trim();
  if (trimmedNotlar.length > 1000) {
    errors.notlar = 'Notlar en fazla 1000 karakter olabilir.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, payload: null };
  }

  return {
    errors: null,
    payload: {
      arac_id: Number(effectiveAracId),
      parca_adi: trimmedAdi,
      son_degisim_km: sonKmRes.value,
      degisim_araligi_km: aralikRes.value,
      son_degisim_tarihi: form.son_degisim_tarihi,
      maliyet: maliyetRes.value,
      notlar: trimmedNotlar || null,
    },
  };
}

export function getComponentSheetMeta({ isEditMode, isReplaceMode, parca }) {
  const title = isReplaceMode
    ? 'Değişim Kaydet'
    : isEditMode
      ? 'Parçayı Düzenle'
      : 'Yeni Parça Ekle';

  const description = isReplaceMode
    ? 'Parça yenilendiğinde güncel sayaç, değişim tarihi ve servis maliyetini kaydedin.'
    : isEditMode
      ? 'Parça adı, değişim sayacı, ömür aralığı, maliyet ve not bilgilerini güncelleyin.'
      : 'Araç bileşenini ömür takibine alın; kalan kullanım eşiği otomatik izlenir.';

  const badge =
    (isEditMode || isReplaceMode) && parca?.plaka ? formatTurkishPlate(parca.plaka) : null;

  const submitLabel = isReplaceMode
    ? 'Değişimi Kaydet'
    : isEditMode
      ? 'Değişiklikleri Kaydet'
      : 'Parçayı Ekle';

  return { title, description, badge, submitLabel };
}
