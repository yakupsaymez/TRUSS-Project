import {
  evrakRiskliMi,
  getBakimPeriyodu,
  getGuncelSayac,
  getSayacBirimi,
  hesaplaBakimDurumu,
  hesaplaKalanGun,
  isSmhArac,
  parseLocalMidnight,
} from '@/utils/aracDurum';
import { formatTurkishPlate } from '@/utils/formatters';

export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function getInitials(name) {
  const clean = String(name || '').trim();
  if (!clean) return 'ŞF';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('tr-TR');
  }
  return clean.slice(0, 2).toLocaleUpperCase('tr-TR');
}

export function formatTrDate(isoLike) {
  const date = parseLocalMidnight(isoLike);
  if (!date) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function computeDocumentSummary(arac) {
  const bugun = new Date();

  const items = [
    { key: 'muayene', short: 'M', ad: 'Muayene', tarih: arac?.muayene_tarihi || null },
    { key: 'sigorta', short: 'S', ad: 'Sigorta', tarih: arac?.sigorta_tarihi || null },
    { key: 'kasko', short: 'K', ad: 'Kasko', tarih: arac?.kasko_tarihi || null },
  ].map((item) => {
    const gun = hesaplaKalanGun(item.tarih, bugun);
    if (gun === null) {
      return { ...item, gun: null, formatted: '—' };
    }
    return { ...item, gun, formatted: formatTrDate(item.tarih) };
  });

  const valid = items.filter((i) => i.gun !== null);
  if (valid.length === 0) {
    return { items, nearest: null, sortValue: Number.POSITIVE_INFINITY };
  }

  const nearest = valid.reduce((min, curr) => (curr.gun < min.gun ? curr : min), valid[0]);
  return { items, nearest, sortValue: nearest.gun };
}

export function extractCategories(araclar) {
  const set = new Set();
  araclar.forEach((arac) => {
    set.add(arac.kategori || 'Otomobil');
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
}

export function enrichFleetRows(araclar, driverByAracId) {
  return araclar.map((arac) => {
    const sayac = getGuncelSayac(arac);
    const smh = isSmhArac(arac);
    const birim = getSayacBirimi(arac);
    const bakim = hesaplaBakimDurumu(arac);
    const periyot = getBakimPeriyodu(arac);
    const evrakRiskli = evrakRiskliMi(arac);
    const docSummary = computeDocumentSummary(arac);
    const driverName = driverByAracId[String(arac.arac_id)] || '';
    const formattedPlaka = formatTurkishPlate(arac.plaka);
    const kategori = arac.kategori || 'Otomobil';

    return {
      arac,
      id: String(arac.arac_id),
      formattedPlaka,
      kategori,
      sayac,
      smh,
      birim,
      bakim,
      periyot,
      evrakRiskli,
      docSummary,
      driverName,
    };
  });
}

export function filterFleetRows(
  enrichedRows,
  { searchQuery, sayacFilter, kategoriFilter, durumFilter }
) {
  const q = searchQuery.trim().toLocaleLowerCase('tr-TR');

  return enrichedRows.filter((row) => {
    if (sayacFilter === 'KM' && row.smh) return false;
    if (sayacFilter === 'SMH' && !row.smh) return false;

    if (kategoriFilter !== 'all' && row.kategori !== kategoriFilter) return false;

    if (durumFilter === 'kritik_bakim' && row.bakim.durum !== 'tehlike') return false;
    if (durumFilter === 'riskli_evrak' && !row.evrakRiskli) return false;
    if (
      durumFilter === 'sorunsuz' &&
      (row.bakim.durum !== 'sorunsuz' || row.evrakRiskli)
    ) {
      return false;
    }

    if (!q) return true;

    const haystack = [
      row.arac.plaka,
      row.formattedPlaka,
      row.arac.marka,
      row.arac.model,
      row.kategori,
      row.driverName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR');

    return haystack.includes(q);
  });
}
