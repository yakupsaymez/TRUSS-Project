import { formatTurkishPlate } from '@/utils/formatters';
import { isSmhArac } from '@/utils/aracDurum';
import { toLocalIsoDate } from '@/utils/dateUtils';

export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const ALL_VALUE = 'all';

export function formatTrDate(isoDate) {
  if (!isoDate) return '—';
  const parts = String(isoDate).slice(0, 10).split('-');
  if (parts.length !== 3) return '—';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function cozumleNotVeFatura(rawNotlar, rawFatura) {
  const ham = String(rawNotlar || '').trim();
  if (rawFatura) return { fatura_bilgisi: String(rawFatura).trim(), notlar: ham };
  const match = ham.match(/^\[Fatura:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) return { fatura_bilgisi: match[1].trim(), notlar: match[2].trim() };
  return { fatura_bilgisi: '', notlar: ham };
}

function parseRecordDate(raw) {
  if (!raw) return { tarih: '', timestamp: 0 };
  const str = String(raw).trim();
  const pureDateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDateMatch) {
    const [, y, m, d] = pureDateMatch;
    return { tarih: `${y}-${m}-${d}`, timestamp: new Date(Number(y), Number(m) - 1, Number(d)).getTime() };
  }
  const dateObj = new Date(str);
  if (Number.isNaN(dateObj.getTime())) return { tarih: '', timestamp: 0 };
  const iso = toLocalIsoDate(dateObj);
  const [y, m, d] = iso.split('-').map(Number);
  return { tarih: iso, timestamp: new Date(y, m - 1, d).getTime() };
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function buildUnifiedLedgerRows(yakitlar, bakimlar, aracMap, canViewFinance) {
  const unified = [];
  yakitlar.forEach((y) => {
    const matched = aracMap.get(String(y.arac_id)) || null;
    const { tarih, timestamp } = parseRecordDate(y.tarih);
    const litre = Number(y.litre || 0);
    const tutar = Number(y.tutar || 0);
    const { fatura_bilgisi, notlar } = cozumleNotVeFatura(y.notlar, y.fatura_no || y.fatura_bilgisi);
    const isSmh = y.sayac_tipi ? y.sayac_tipi === 'SMH' : isSmhArac(matched);
    unified.push({
      id: `yakit-${y.yakit_id}`, rawId: Number(y.yakit_id), tip: 'YAKIT', arac_id: y.arac_id,
      plaka: y.plaka || matched?.plaka || `#${y.arac_id}`, marka: y.marka || matched?.marka || '',
      model: y.model || matched?.model || '', sayac_tipi: isSmh ? 'SMH' : 'KM',
      tarih, timestamp, km: parseNullableNumber(y.km), tutar, litre,
      birimFiyat: litre > 0 ? tutar / litre : null, altTur: y.yakit_tipi || 'Dizel',
      fatura_bilgisi, notlar, belge_url: canViewFinance ? (y.belge_url || null) : null, raw: y,
    });
  });
  bakimlar.forEach((b) => {
    const matched = aracMap.get(String(b.arac_id)) || null;
    const { tarih, timestamp } = parseRecordDate(b.tarih);
    const tutar = Number(b.maliyet ?? b.tutar ?? 0);
    const { fatura_bilgisi, notlar } = cozumleNotVeFatura(b.notlar || b.aciklama, b.fatura_no || b.fatura_bilgisi);
    const isSmh = b.sayac_tipi ? b.sayac_tipi === 'SMH' : isSmhArac(matched);
    unified.push({
      id: `bakim-${b.bakim_id}`, rawId: Number(b.bakim_id), tip: 'BAKIM', arac_id: b.arac_id,
      plaka: b.plaka || matched?.plaka || `#${b.arac_id}`, marka: b.marka || matched?.marka || '',
      model: b.model || matched?.model || '', sayac_tipi: isSmh ? 'SMH' : 'KM',
      tarih, timestamp, km: parseNullableNumber(b.km), tutar, litre: null, birimFiyat: null,
      altTur: b.bakim_tipi || b.islem_turu || b.bakim_turu || 'Periyodik Bakım',
      fatura_bilgisi, notlar, belge_url: canViewFinance ? (b.belge_url || null) : null, raw: b,
    });
  });
  unified.sort((a, b) => (b.timestamp !== a.timestamp ? b.timestamp - a.timestamp : (b.rawId || 0) - (a.rawId || 0)));
  return unified;
}

export function filterBaseLedgerRows(
  rows,
  { isVehicleFiltered, seciliAracId, baslangicTarihi, bitisTarihi, searchQuery }
) {
  const q = searchQuery.trim().toLocaleLowerCase('tr-TR');

  return rows.filter((row) => {
    if (isVehicleFiltered && String(row.arac_id) !== String(seciliAracId)) {
      return false;
    }
    if (baslangicTarihi && (!row.tarih || row.tarih < baslangicTarihi)) {
      return false;
    }
    if (bitisTarihi && (!row.tarih || row.tarih > bitisTarihi)) {
      return false;
    }
    if (!q) return true;

    const haystack = [
      row.plaka,
      formatTurkishPlate(row.plaka),
      row.marka,
      row.model,
      row.altTur,
      row.fatura_bilgisi,
      row.notlar,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR');

    return haystack.includes(q);
  });
}

export function computeLedgerTabCounts(baseFilteredRows) {
  let yakit = 0;
  let bakim = 0;
  baseFilteredRows.forEach((row) => {
    if (row.tip === 'YAKIT') yakit += 1;
    else if (row.tip === 'BAKIM') bakim += 1;
  });
  return {
    all: baseFilteredRows.length,
    yakit,
    bakim,
  };
}

export function summarizeLedgerRows(filteredRows) {
  let totalCost = 0;
  let fuelCost = 0;
  let totalLitres = 0;
  let maintenanceCost = 0;

  filteredRows.forEach((row) => {
    const tutar = Number(row.tutar) || 0;
    totalCost += tutar;
    if (row.tip === 'YAKIT') {
      fuelCost += tutar;
      totalLitres += Number(row.litre) || 0;
    } else if (row.tip === 'BAKIM') {
      maintenanceCost += tutar;
    }
  });

  return {
    count: filteredRows.length,
    totalCost,
    fuelCost,
    totalLitres,
    maintenanceCost,
  };
}
