import { formatTurkishPlate } from '@/utils/formatters';

export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const ALL_VALUE = 'all';

export function formatTrDate(isoDate) {
  if (!isoDate) return '—';
  const parts = String(isoDate).slice(0, 10).split('-');
  if (parts.length !== 3) return '—';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
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
