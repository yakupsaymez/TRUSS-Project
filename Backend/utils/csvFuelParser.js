const { tarihStr, ileriTarihMi } = require('./dateUtils');

const MAX_ROWS = 1000;
const MAX_LITRE = 99999999.99;
const MAX_TUTAR = 9999999999.99;
const MAX_KM = 2147483647;
const TR_CHAR_MAP = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', I: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };

const HEADER_GROUPS = [
  ['plaka', ['plaka', 'arac_plakasi', 'arac_plaka', 'plate', 'plaka_no', 'arac']],
  ['tarih', ['tarih', 'islem_tarihi', 'fis_tarihi', 'alim_tarihi', 'dolum_tarihi', 'date', 'tarih_saat', 'islem_zamani', 'islem_tarihi_saati']],
  ['litre', ['litre', 'miktar', 'yakit_miktari', 'yakit_litre', 'lt', 'liter', 'liters', 'alinan_litre', 'dolum_miktari', 'yakit_miktar', 'miktar_lt']],
  ['tutar', ['tutar', 'toplam_tutar', 'odenen_tutar', 'toplam', 'net_tutar', 'kdv_dahil_tutar', 'fiyat', 'ucret', 'amount', 'total', 'tutar_tl']],
  ['km', ['km', 'sayac', 'kilometre', 'odometer', 'arac_km', 'guncel_km', 'son_km', 'sayac_degeri', 'calisma_saati', 'smh']],
  ['yakit_tipi', ['yakit_tipi', 'urun', 'urun_adi', 'yakit_cinsi', 'yakit_turu', 'yakit', 'fuel_type', 'cins']],
  ['istasyon', ['istasyon', 'istasyon_adi', 'bayi', 'bayi_adi', 'sube', 'akaryakit_istasyonu', 'station']],
  ['fatura_no', ['fis_no', 'fatura_no', 'belge_no', 'fatura', 'fis', 'referans_no', 'receipt_no', 'invoice_no']],
];
const HEADER_ALIASES = Object.fromEntries(HEADER_GROUPS.flatMap(([k, list]) => list.map((a) => [a, k])));
const REQUIRED_HEADERS = ['plaka', 'tarih', 'litre', 'tutar'];

const createCsvError = (status, code, message, extra = {}) =>
  Object.assign(new Error(message), { status, code, ...extra });

const normalizePlate = (raw) => String(raw || '').toLocaleUpperCase('tr-TR').replace(/[\s\-_./]+/g, '');

const normalizeHeaderKey = (raw) =>
  String(raw || '')
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/[çÇğĞıİIöÖşŞüÜ]/g, (c) => TR_CHAR_MAP[c] || c)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const detectDelimiter = (firstLine) => {
  const counts = { ';': 0, '\t': 0, ',': 0 };
  let inQuotes = false;
  for (let i = 0; i < firstLine.length; i += 1) {
    const ch = firstLine[i];
    if (ch === '"') {
      if (inQuotes && firstLine[i + 1] === '"') i += 1;
      else inQuotes = !inQuotes;
    } else if (!inQuotes && Object.prototype.hasOwnProperty.call(counts, ch)) {
      counts[ch] += 1;
    }
  }
  if (Math.max(counts[';'], counts['\t'], counts[',']) === 0) {
    throw createCsvError(400, 'CSV_INVALID_FORMAT', 'CSV ayırıcısı (; , veya TAB) tespit edilemedi.');
  }
  if (counts[';'] >= counts['\t'] && counts[';'] >= counts[',']) return ';';
  return counts['\t'] >= counts[','] ? '\t' : ',';
};

const parseRfc4180Records = (text, delimiter) => {
  const records = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let lineNo = 1;
  let rowStartLine = 1;
  const pushRow = () => {
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) records.push({ satir_no: rowStartLine, cells: row });
    row = [];
    cell = '';
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else inQuotes = false;
      } else {
        if (ch === '\n') lineNo += 1;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell.length === 0) inQuotes = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n') { pushRow(); lineNo += 1; rowStartLine = lineNo; }
    else cell += ch;
  }
  pushRow();
  return records;
};

const parseCsvDate = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return { error: 'GECERSIZ_TARIH', value: null };
  const tr = s.match(/^(\d{2})[./](\d{2})[./](\d{4})(?:[\sT].*)?$/);
  const isoM = !tr ? s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[\sT].*)?$/) : null;
  const iso = tr ? `${tr[3]}-${tr[2]}-${tr[1]}` : isoM ? `${isoM[1]}-${isoM[2]}-${isoM[3]}` : null;
  const gun = iso ? tarihStr(iso) : null;
  if (!gun) return { error: 'GECERSIZ_TARIH', value: null };
  if (ileriTarihMi(gun)) return { error: 'GELECEK_TARIH', value: null };
  return { error: null, value: gun };
};

const parseLocaleNumber = (raw) => {
  const cleaned = String(raw ?? '').trim().replace(/₺|\bTRY\b|\bTL\b|\bLT\b|\bL\b/gi, '').replace(/\s+/g, '');
  if (!cleaned || !/^-?[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;
  if (lastComma !== -1 && lastDot !== -1) {
    normalized = lastComma > lastDot ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  } else if (lastComma !== -1) {
    normalized = cleaned.indexOf(',') === lastComma ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  } else if (lastDot !== -1 && cleaned.indexOf('.') !== lastDot) {
    normalized = cleaned.replace(/\./g, '');
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : null;
};

const parseKmValue = (raw) => {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { error: null, value: null };
  let s = trimmed.replace(/\s+/g, '').replace(/([.,]0{1,2})$/, '');
  if (/^\d+(?:[.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  if (!/^\d+$/.test(s)) return { error: 'GECERSIZ_KM', value: null };
  const n = Number(s);
  return Number.isSafeInteger(n) && n >= 0 && n <= MAX_KM ? { error: null, value: n } : { error: 'GECERSIZ_KM', value: null };
};

const parseRowFields = (satir_no, cells, colMap) => {
  const get = (field) => (colMap[field] !== undefined ? String(cells[colMap[field]] ?? '').trim() : '');
  const plakaHam = get('plaka');
  const plaka = normalizePlate(plakaHam);
  const tarihRes = parseCsvDate(get('tarih'));
  const litreNum = parseLocaleNumber(get('litre'));
  const tutarNum = parseLocaleNumber(get('tutar'));
  const kmRes = parseKmValue(get('km'));
  const litreOk = litreNum !== null && litreNum > 0 && litreNum <= MAX_LITRE;
  const tutarOk = tutarNum !== null && tutarNum > 0 && tutarNum <= MAX_TUTAR;

  let neden_kodu = null;
  let neden_mesaj = null;
  if (!plaka) { neden_kodu = 'GECERSIZ_PLAKA'; neden_mesaj = 'Plaka alanı boş veya geçersiz.'; }
  else if (tarihRes.error) {
    neden_kodu = tarihRes.error;
    neden_mesaj = tarihRes.error === 'GELECEK_TARIH' ? 'Gelecek tarihli yakıt kaydı girilemez.' : 'Geçersiz tarih formatı.';
  } else if (!litreOk) { neden_kodu = 'GECERSIZ_LITRE'; neden_mesaj = 'Litre değeri 0 ile 99.999.999,99 arasında olmalıdır.'; }
  else if (!tutarOk) { neden_kodu = 'GECERSIZ_TUTAR'; neden_mesaj = 'Tutar değeri 0 ile 9.999.999.999,99 arasında olmalıdır.'; }
  else if (kmRes.error) { neden_kodu = kmRes.error; neden_mesaj = 'Sayaç (KM) değeri geçerli bir pozitif tam sayı olmalıdır.'; }

  return {
    satir_no,
    plaka_ham: plakaHam,
    plaka,
    tarih: tarihRes.value,
    litre: litreOk ? litreNum : null,
    tutar: tutarOk ? tutarNum : null,
    km: kmRes.value,
    yakit_tipi: get('yakit_tipi').slice(0, 50) || null,
    istasyon: get('istasyon').slice(0, 160) || null,
    fatura_no: get('fatura_no').slice(0, 80) || null,
    neden_kodu,
    neden_mesaj,
  };
};

const parseFuelCsv = (csvText) => {
  const cleanText = String(csvText ?? '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const firstMeaningful = cleanText.split('\n').find((l) => l.trim() !== '');
  if (!firstMeaningful) throw createCsvError(400, 'CSV_EMPTY', 'CSV içeriği boş.');

  const delimiter = detectDelimiter(firstMeaningful);
  const records = parseRfc4180Records(cleanText, delimiter);
  if (records.length === 0) throw createCsvError(400, 'CSV_EMPTY', 'CSV içeriği boş.');
  if (records[0].cells.length < 2) {
    throw createCsvError(400, 'CSV_INVALID_FORMAT', 'CSV geçerli çok sütunlu formatta değil.');
  }

  const colMap = {};
  records[0].cells.forEach((h, idx) => {
    const canonical = HEADER_ALIASES[normalizeHeaderKey(h)];
    if (canonical && colMap[canonical] === undefined) colMap[canonical] = idx;
  });

  const eksik = REQUIRED_HEADERS.filter((k) => colMap[k] === undefined);
  if (eksik.length > 0) {
    throw createCsvError(400, 'CSV_MISSING_HEADERS', `Eksik zorunlu başlıklar: ${eksik.join(', ')}`, { eksik_basliklar: eksik });
  }

  const dataRecords = records.slice(1);
  if (dataRecords.length > MAX_ROWS) {
    throw createCsvError(413, 'CSV_ROW_LIMIT_EXCEEDED', `Tek seferde en fazla ${MAX_ROWS} satır yüklenebilir.`);
  }
  return dataRecords.map(({ satir_no, cells }) => parseRowFields(satir_no, cells, colMap));
};

module.exports = { parseFuelCsv, normalizePlate, createCsvError };
