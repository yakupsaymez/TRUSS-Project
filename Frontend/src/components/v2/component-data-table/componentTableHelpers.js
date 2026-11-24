import { getGuncelSayac, isSmhArac } from '@/utils/aracDurum';
import { toLocalIsoDate } from '@/utils/dateUtils';
import { formatTurkishPlate } from '@/utils/formatters';

export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const ALL_VALUE = 'all';

export const STATUS_FILTER_OPTIONS = [
  { value: ALL_VALUE, label: 'Durum: Tümü' },
  { value: 'kritik', label: 'Değişim Gerekli' },
  { value: 'uyari', label: 'Yaklaşıyor' },
  { value: 'iyi', label: 'Optimal' },
  { value: 'tarih_bazli', label: 'Tarih Bazlı' },
];

export function hesaplaParcaOmru(parca, aracMap) {
  const arac = aracMap instanceof Map ? aracMap.get(String(parca.arac_id)) || null : null;
  const isSmh = parca.sayac_tipi ? parca.sayac_tipi === 'SMH' : isSmhArac(arac);
  const sayacTipi = isSmh ? 'SMH' : 'KM';
  const birim = sayacTipi === 'SMH' ? 'saat' : 'km';

  const guncelSayac = Number((arac ? getGuncelSayac(arac) : parca.guncel_km) ?? 0);
  const sonDegisimKm = Number(parca.son_degisim_km || 0);
  const aralik = Number(parca.degisim_araligi_km || 0);
  const kullanilan = Math.max(0, guncelSayac - sonDegisimKm);

  if (aralik <= 0) {
    return {
      sayacTipi,
      birim,
      guncelSayac,
      sonDegisimKm,
      aralik: 0,
      kullanilan,
      durum: 'tarih_bazli',
      etiket: 'Tarih Bazlı',
      kalan: null,
      kalanYuzde: null,
      oncelik: 3,
    };
  }

  const kalan = aralik - kullanilan;
  const kalanYuzde = Math.max(0, Math.min(100, Math.round((kalan / aralik) * 100)));
  const kritik = kalan <= 0;
  const uyari =
    !kritik &&
    (kalanYuzde <= 15 ||
      (sayacTipi === 'KM' && kalan <= 1500) ||
      (sayacTipi === 'SMH' && kalan <= 25));

  if (kritik) {
    return {
      sayacTipi,
      birim,
      guncelSayac,
      sonDegisimKm,
      aralik,
      kullanilan,
      durum: 'kritik',
      etiket: 'Değişim Gerekli',
      kalan,
      kalanYuzde,
      oncelik: 0,
    };
  }

  if (uyari) {
    return {
      sayacTipi,
      birim,
      guncelSayac,
      sonDegisimKm,
      aralik,
      kullanilan,
      durum: 'uyari',
      etiket: 'Değişim Yaklaşıyor',
      kalan,
      kalanYuzde,
      oncelik: 1,
    };
  }

  return {
    sayacTipi,
    birim,
    guncelSayac,
    sonDegisimKm,
    aralik,
    kullanilan,
    durum: 'iyi',
    etiket: 'Optimal Ömür',
    kalan,
    kalanYuzde,
    oncelik: 2,
  };
}

export function formatTrDate(raw) {
  if (!raw) return '—';
  const str = String(raw).trim();
  const pureDate = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDate) {
    return `${pureDate[3]}.${pureDate[2]}.${pureDate[1]}`;
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '—';
  const iso = toLocalIsoDate(d);
  const [y, m, day] = iso.split('-');
  return `${day}.${m}.${y}`;
}

export function statusBadgeClass(durum) {
  if (durum === 'kritik') {
    return 'border-destructive/30 bg-destructive/10 text-destructive';
  }
  if (durum === 'uyari') {
    return 'border-primary/30 bg-primary/10 text-primary';
  }
  if (durum === 'iyi') {
    return 'border-border bg-muted text-foreground';
  }
  return 'border-border bg-background text-muted-foreground';
}

export function buildEnrichedComponentRows(parcalar, aracMap) {
  const list = parcalar.map((parca) => {
    const arac = aracMap.get(String(parca.arac_id)) || null;
    const omur = hesaplaParcaOmru(parca, aracMap);
    const plaka = parca.plaka || arac?.plaka || `#${parca.arac_id}`;
    const marka = parca.marka || arac?.marka || '';
    const model = parca.model || arac?.model || '';
    const maliyet = Number(parca.maliyet || 0);
    const notlar = String(parca.notlar || '').trim();

    return {
      id: String(parca.parca_id),
      parca,
      plaka,
      formattedPlaka: formatTurkishPlate(plaka) || plaka,
      marka,
      model,
      maliyet,
      notlar,
      tarihFormatted: formatTrDate(parca.son_degisim_tarihi),
      omur,
    };
  });

  list.sort((a, b) => {
    if (a.omur.oncelik !== b.omur.oncelik) {
      return a.omur.oncelik - b.omur.oncelik;
    }
    const aYuzde = a.omur.kalanYuzde === null ? Number.POSITIVE_INFINITY : a.omur.kalanYuzde;
    const bYuzde = b.omur.kalanYuzde === null ? Number.POSITIVE_INFINITY : b.omur.kalanYuzde;
    if (aYuzde !== bYuzde) {
      return aYuzde - bYuzde;
    }
    return String(a.parca.parca_adi || '').localeCompare(
      String(b.parca.parca_adi || ''),
      'tr-TR'
    );
  });

  return list;
}

export function filterComponentRows(
  enrichedRows,
  { isVehicleFiltered, seciliAracId, activeStatusFilter, searchQuery }
) {
  const q = searchQuery.trim().toLocaleLowerCase('tr-TR');

  return enrichedRows.filter((row) => {
    if (isVehicleFiltered && String(row.parca.arac_id) !== String(seciliAracId)) {
      return false;
    }
    if (activeStatusFilter !== ALL_VALUE && row.omur.durum !== activeStatusFilter) {
      return false;
    }
    if (!q) return true;

    const haystack = [
      row.parca.parca_adi,
      row.plaka,
      row.formattedPlaka,
      row.marka,
      row.model,
      row.notlar,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR');

    return haystack.includes(q);
  });
}

export function summarizeComponentRows(filteredRows) {
  let kritik = 0;
  let uyari = 0;
  let totalCost = 0;

  filteredRows.forEach((row) => {
    if (row.omur.durum === 'kritik') kritik += 1;
    else if (row.omur.durum === 'uyari') uyari += 1;
    totalCost += row.maliyet;
  });

  return {
    total: filteredRows.length,
    kritik,
    uyari,
    totalCost,
  };
}
