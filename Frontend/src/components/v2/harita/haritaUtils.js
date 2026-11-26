import { formatTurkishPlate } from '@/utils/formatters';
import {
  TR_LOGISTICS_HUBS,
  hasValidCoordinates,
} from '@/components/v2/fleet-live-map/mapHelpers';

export const DEFAULT_MAP_CENTER = Object.freeze({
  lat: 39.0,
  lng: 35.0,
  label: 'Türkiye Merkez',
});

export { TR_LOGISTICS_HUBS, hasValidCoordinates };

export function isActiveMapVehicle(arac) {
  return Boolean(arac) && arac.arsivlendi_mi !== true;
}

export function filterActiveMapVehicles(araclar = []) {
  return Array.isArray(araclar) ? araclar.filter(isActiveMapVehicle) : [];
}

export function splitUnpositionedVehicles(araclar = []) {
  return filterActiveMapVehicles(araclar).filter((arac) => !hasValidCoordinates(arac));
}

export function validateCheckInCoordinates(enlemInput, boylamInput) {
  const rawEnlem = String(enlemInput ?? '').trim();
  const rawBoylam = String(boylamInput ?? '').trim();

  if (rawEnlem === '' || rawBoylam === '') {
    return { ok: false, error: 'Enlem ve boylam alanları boş bırakılamaz.' };
  }

  const enlem = Number(rawEnlem);
  const boylam = Number(rawBoylam);

  if (!Number.isFinite(enlem) || enlem < -90 || enlem > 90) {
    return {
      ok: false,
      error: 'Enlem -90 ile 90 derece arasında geçerli bir sayı olmalıdır.',
    };
  }

  if (!Number.isFinite(boylam) || boylam < -180 || boylam > 180) {
    return {
      ok: false,
      error: 'Boylam -180 ile 180 derece arasında geçerli bir sayı olmalıdır.',
    };
  }

  if (enlem === 0 && boylam === 0) {
    return {
      ok: false,
      error: 'Geçersiz (0, 0) koordinatı bildirilemez. Lütfen gerçek bir konum girin.',
    };
  }

  return { ok: true, enlem, boylam };
}

export function buildWorkOrderPrefillFromVehicle(arac) {
  if (!arac?.arac_id) return null;
  const plateLabel = arac.plaka ? formatTurkishPlate(arac.plaka) : '';
  return {
    arac_id: Number(arac.arac_id),
    kategori: 'ariza',
    oncelik: 'normal',
    baslik: plateLabel ? `${plateLabel} — Saha İş Emri` : 'Saha İş Emri',
  };
}

export function buildCheckInFormState(arac) {
  if (!arac) return { aracId: '', hubId: '', enlem: '', boylam: '', konumAdi: '' };
  const hasCoords = hasValidCoordinates(arac);
  return {
    aracId: String(arac.arac_id),
    hubId: '',
    enlem: hasCoords ? String(Number(arac.son_enlem)) : '',
    boylam: hasCoords ? String(Number(arac.son_boylam)) : '',
    konumAdi: hasCoords ? arac.son_konum_adi || '' : '',
  };
}
