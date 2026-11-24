import { evrakRiskliMi, hesaplaBakimDurumu } from '@/utils/aracDurum';

export const LAT_MIN = 35.8;
export const LAT_MAX = 42.2;
export const LNG_MIN = 25.8;
export const LNG_MAX = 44.9;

export const SVG_WIDTH = 1000;
export const SVG_HEIGHT = 480;
export const SVG_PAD_X = 48;
export const SVG_PAD_Y = 36;

export const TR_LOGISTICS_HUBS = [
  { id: 'istanbul', name: 'İstanbul (Marmara Lojistik Üssü)', shortName: 'İstanbul', lat: 41.0082, lng: 28.9784 },
  { id: 'ankara', name: 'Ankara (İç Anadolu Merkez)', shortName: 'Ankara', lat: 39.9334, lng: 32.8597 },
  { id: 'izmir', name: 'İzmir (Alsancak Liman & Ege)', shortName: 'İzmir', lat: 38.4237, lng: 27.1428 },
  { id: 'bursa', name: 'Bursa (Nilüfer OSB)', shortName: 'Bursa', lat: 40.1885, lng: 29.061 },
  { id: 'kocaeli', name: 'Kocaeli (Gebze / Dilovası Liman)', shortName: 'Kocaeli', lat: 40.7654, lng: 29.9408 },
  { id: 'adana', name: 'Adana (Çukurova Aktarma)', shortName: 'Adana', lat: 37.0, lng: 35.3213 },
  { id: 'mersin', name: 'Mersin (Uluslararası Liman)', shortName: 'Mersin', lat: 36.8121, lng: 34.6415 },
  { id: 'gaziantep', name: 'Gaziantep (Başpınar OSB)', shortName: 'Gaziantep', lat: 37.0662, lng: 37.3833 },
  { id: 'konya', name: 'Konya (Organize Sanayi)', shortName: 'Konya', lat: 37.8746, lng: 32.4932 },
  { id: 'antalya', name: 'Antalya (Akdeniz Dağıtım)', shortName: 'Antalya', lat: 36.8969, lng: 30.7133 },
  { id: 'kayseri', name: 'Kayseri (Serbest Bölge)', shortName: 'Kayseri', lat: 38.7312, lng: 35.4787 },
  { id: 'samsun', name: 'Samsun (Karadeniz Liman)', shortName: 'Samsun', lat: 41.2867, lng: 36.33 },
  { id: 'trabzon', name: 'Trabzon (Doğu Karadeniz Liman)', shortName: 'Trabzon', lat: 41.0027, lng: 39.7168 },
  { id: 'erzurum', name: 'Erzurum (Doğu Anadolu Geçiş)', shortName: 'Erzurum', lat: 39.9055, lng: 41.2658 },
  { id: 'diyarbakir', name: 'Diyarbakır (Güneydoğu Dağıtım)', shortName: 'Diyarbakır', lat: 37.9144, lng: 40.2306 },
  { id: 'eskisehir', name: 'Eskişehir (Demiryolu & OSB)', shortName: 'Eskişehir', lat: 39.7667, lng: 30.5256 },
];

export const CORRIDOR_PAIRS = [
  ['istanbul', 'kocaeli'],
  ['kocaeli', 'bursa'],
  ['bursa', 'izmir'],
  ['kocaeli', 'eskisehir'],
  ['eskisehir', 'ankara'],
  ['ankara', 'konya'],
  ['konya', 'antalya'],
  ['ankara', 'kayseri'],
  ['kayseri', 'adana'],
  ['adana', 'mersin'],
  ['adana', 'gaziantep'],
  ['gaziantep', 'diyarbakir'],
  ['ankara', 'samsun'],
  ['samsun', 'trabzon'],
  ['trabzon', 'erzurum'],
  ['kayseri', 'erzurum'],
];

export const TURKEY_OUTLINE_POINTS = [
  [41.8, 26.2],
  [41.3, 28.9],
  [41.6, 32.2],
  [42.0, 35.1],
  [41.3, 36.5],
  [41.1, 39.8],
  [41.5, 41.6],
  [41.1, 43.4],
  [39.7, 44.7],
  [37.3, 44.6],
  [37.1, 42.3],
  [36.8, 38.9],
  [36.7, 36.6],
  [35.9, 36.0],
  [36.1, 33.0],
  [36.9, 30.7],
  [36.3, 29.4],
  [36.7, 27.4],
  [38.4, 26.3],
  [39.9, 26.1],
  [40.7, 26.0],
];

export function hasValidCoordinates(arac) {
  const lat = Number(arac?.son_enlem);
  const lng = Number(arac?.son_boylam);
  return (
    arac?.son_enlem !== null &&
    arac?.son_enlem !== undefined &&
    arac?.son_enlem !== '' &&
    arac?.son_boylam !== null &&
    arac?.son_boylam !== undefined &&
    arac?.son_boylam !== '' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function projectToSvg(lat, lng) {
  const clampedLat = Math.min(LAT_MAX, Math.max(LAT_MIN, Number(lat) || LAT_MIN));
  const clampedLng = Math.min(LNG_MAX, Math.max(LNG_MIN, Number(lng) || LNG_MIN));
  const innerW = SVG_WIDTH - SVG_PAD_X * 2;
  const innerH = SVG_HEIGHT - SVG_PAD_Y * 2;
  const x = SVG_PAD_X + ((clampedLng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * innerW;
  const y = SVG_PAD_Y + ((LAT_MAX - clampedLat) / (LAT_MAX - LAT_MIN)) * innerH;
  return { x, y };
}

export function resolveVehicleHealthMeta(arac) {
  const bakim = hesaplaBakimDurumu(arac);
  const docRisk = evrakRiskliMi(arac);

  if (bakim.durum === 'tehlike') {
    return {
      tone: 'critical',
      label: 'Bakım Gecikti',
      dotClass: 'bg-destructive',
      ringClass: 'ring-destructive/35',
      badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive',
      bakim,
      docRisk,
    };
  }

  if (bakim.durum === 'uyari' || docRisk) {
    return {
      tone: 'warning',
      label: bakim.durum === 'uyari' ? 'Bakım Yaklaşıyor' : 'Evrak Uyarısı',
      dotClass: 'bg-status-warning',
      ringClass: 'ring-status-warning/35',
      badgeClass: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
      bakim,
      docRisk,
    };
  }

  return {
    tone: 'healthy',
    label: 'Operasyonda',
    dotClass: 'bg-primary',
    ringClass: 'ring-primary/35',
    badgeClass: 'border-primary/40 bg-primary/10 text-primary',
    bakim,
    docRisk,
  };
}

export function formatDateTimeTr(raw) {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCoord(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toFixed(4);
}
