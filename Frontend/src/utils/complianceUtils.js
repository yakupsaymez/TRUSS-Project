import { EVRAK_UYARI_GUN, getGuncelSayac, hesaplaBakimDurumu } from '@/utils/aracDurum';
import { getTodayIso, toLocalIsoDate } from '@/utils/dateUtils';

export { getGuncelSayac, hesaplaBakimDurumu };

export const STATUS_PRIORITY = Object.freeze({
  tehlike: 0,
  uyari: 1,
  sorunsuz: 2,
  bilinmiyor: 3,
});

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const PURE_ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}/;

export function normalizeIsoDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (PURE_ISO_DATE_RE.test(str)) return str;
  if (str.includes('T')) {
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) return toLocalIsoDate(parsed);
  }
  if (!ISO_DATE_PREFIX_RE.test(str)) return null;
  return str.slice(0, 10);
}

export function formatTrDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return '—';
  return `${d}.${m}.${y}`;
}

function parseIsoLocalParts(iso) {
  const normalized = normalizeIsoDate(iso);
  if (!normalized) return null;
  const [y, m, d] = normalized.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function diffCalendarDays(targetIso, todayIso = getTodayIso()) {
  const target = parseIsoLocalParts(targetIso);
  const today = parseIsoLocalParts(todayIso);
  if (!target || !today) return null;
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

export function getComplianceUrgency(isoDate, todayIso = getTodayIso(), warningDays = EVRAK_UYARI_GUN) {
  const diffDays = diffCalendarDays(isoDate, todayIso);
  if (diffDays === null) {
    return { status: 'eksik', label: 'Tanımsız', badgeText: 'Tanımsız', diffDays: null };
  }
  if (diffDays < 0) {
    return {
      status: 'gecikmis',
      label: 'Gecikti',
      badgeText: `${Math.abs(diffDays)} gün gecikti`,
      diffDays,
    };
  }
  if (diffDays <= warningDays) {
    return {
      status: 'yaklasiyor',
      label: diffDays === 0 ? 'Bugün' : 'Yaklaşıyor',
      badgeText: diffDays === 0 ? 'Bugün' : `${diffDays} gün kaldı`,
      diffDays,
    };
  }
  return {
    status: 'guncel',
    label: 'Güncel',
    badgeText: `${diffDays} gün kaldı`,
    diffDays,
  };
}
