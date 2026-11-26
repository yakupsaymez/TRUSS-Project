import { getTodayIso } from '@/utils/dateUtils';
import { isSmhArac } from '@/utils/sayacHatasi';

export const HANDOVER_MAX_PHOTOS = 4;
export const HANDOVER_IMAGE_MIMES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
export const HANDOVER_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp';

export const CHECKLIST_ITEMS = Object.freeze([
  { key: 'lastik_durumu', label: 'Lastikler' },
  { key: 'fren_durumu', label: 'Fren Sistemi' },
  { key: 'aydinlatma_durumu', label: 'Aydınlatma' },
  { key: 'sivi_sizinti_durumu', label: 'Sıvı / Sızıntı' },
  { key: 'kaporta_cam_durumu', label: 'Kaporta / Cam' },
  { key: 'guvenlik_ekipman_durumu', label: 'Güvenlik Ekipmanları' },
  { key: 'evrak_ruhsat_durumu', label: 'Evrak / Ruhsat' },
  { key: 'kabin_temizlik_durumu', label: 'Kabin / Temizlik' },
]);

export const ITEM_STATUS_OPTIONS = Object.freeze([
  { value: 'OK', label: 'Uygun', activeClass: 'border-status-success/50 bg-status-success/15 text-status-success' },
  { value: 'KUSURLU', label: 'Kusurlu', activeClass: 'border-status-warning/50 bg-status-warning/15 text-status-warning' },
  { value: 'KRITIK', label: 'Kritik', activeClass: 'border-destructive/50 bg-destructive/15 text-destructive' },
]);

export const OVERALL_RESULT_META = Object.freeze({
  TEMIZ: { label: 'Temiz', badgeClass: 'border-status-success/40 bg-status-success/10 text-status-success' },
  KUSURLU: { label: 'Kusurlu', badgeClass: 'border-status-warning/40 bg-status-warning/10 text-status-warning' },
  KRITIK: { label: 'Kritik', badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive' },
});

export const MUAYENE_TIPI_LABELS = Object.freeze({ TESLIM_ALMA: 'Teslim Alma', TESLIM_ETME: 'Teslim Etme' });

export function buildEmptyChecklist() { return CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.key]: 'OK' }), {}); }

export function deriveOverallResult(checklist = {}) {
  let worst = 'TEMIZ';
  for (const { key } of CHECKLIST_ITEMS) {
    if (checklist[key] === 'KRITIK') return 'KRITIK';
    if (checklist[key] === 'KUSURLU') worst = 'KUSURLU';
  }
  return worst;
}

export function applyChecklistStep(prev, key, val) {
  const checklist = { ...prev.checklist, [key]: val };
  const worst = deriveOverallResult(checklist);
  const genel_sonuc = worst === 'KRITIK' ? 'KRITIK' : worst === 'KUSURLU' && prev.genel_sonuc === 'TEMIZ' ? 'KUSURLU' : prev.genel_sonuc;
  return { ...prev, checklist, genel_sonuc };
}

export function validateAndBuildInspection(form, arac, draftPhotos = []) {
  const errors = {};
  const today = getTodayIso();
  if (!form.muayene_tarihi) errors.muayene_tarihi = 'Muayene tarihi zorunludur.';
  else if (form.muayene_tarihi > today) errors.muayene_tarihi = 'İleri tarihli muayene girilemez.';
  const rawSayac = String(form.sayac_degeri ?? '').trim();
  const numSayac = Number(rawSayac);
  if (rawSayac === '' || !Number.isFinite(numSayac) || numSayac < 0) errors.sayac_degeri = 'Geçerli bir sayaç değeri girin.';
  else if (!isSmhArac(arac) && !Number.isInteger(numSayac)) errors.sayac_degeri = 'KM sayaçlı araçlarda sayaç tam sayı olmalıdır.';
  if (Object.keys(errors).length > 0) return { errors, payload: null };
  return {
    errors: null,
    payload: {
      muayene_tarihi: form.muayene_tarihi, sayac_degeri: numSayac, genel_sonuc: form.genel_sonuc,
      ...form.checklist, ...(form.notlar?.trim() ? { notlar: form.notlar.trim() } : {}),
      ...(draftPhotos.length > 0 ? { belge_anahtarlari: draftPhotos.map((d) => d.nesne_anahtari) } : {}),
    },
  };
}

export function formatIsoDateTr(isoLike) {
  const m = isoLike ? String(isoLike).trim().match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null;
}

export function mapHandoverDocsToItems(docs = [], { isDraft = false, canDelete = true } = {}) {
  return (Array.isArray(docs) ? docs : []).map((d) => ({ ...d, key: d.nesne_anahtari || d.belge_id, isDraft, canDelete, canOpen: !isDraft }));
}

export function getVehicleCounterValue(v) {
  if (!v) return '';
  const val = isSmhArac(v) ? v.guncel_calisma_saati : v.guncel_km;
  return val != null ? String(val) : '';
}
