import { getGuncelSayac, isSmhArac } from '@/utils/aracDurum';
import { formatTurkishPlate, parseLocaleNumber } from '@/utils/formatters';

export const PLATE_REGEX =
  /(?<![\p{L}\p{N}_])((?:0[1-9]|[1-7]\d|8[01])\s*(?!(?:l|lt|tl|km|smh|kwh|try)(?![\p{L}\p{N}_]))[A-Za-zÇĞİÖŞÜçğıöşü]{1,3}\s*\d{2,5})(?![\p{L}\p{N}_])(?!\s*(?:tl|₺|try|lira|l|lt|litre|kwh|km|kilometre|smh|saat)(?![\p{L}\p{N}_]))/iu;
export const LITRE_REGEX =
  /(?<![\p{L}\p{N}_])(\d+(?:[.,]\d+)?)\s*(?:l|lt|litre|kwh)(?![\p{L}\p{N}_])/iu;
export const TUTAR_REGEX =
  /(?<![\p{L}\p{N}_])(\d+(?:[.,]\d+)*)\s*(?:tl|₺|try|lira)(?![\p{L}\p{N}_])/iu;
export const KM_REGEX_GLOBAL =
  /(?<![\p{L}\p{N}_])(\d+(?:[.,]\d+)*)\s*(?:km|kilometre|smh|saat)(?![\p{L}\p{N}_])/giu;
export const KM_REGEX_SINGLE =
  /(?<![\p{L}\p{N}_])(\d+(?:[.,]\d+)*)\s*(?:km|kilometre|smh|saat)(?![\p{L}\p{N}_])/iu;
export const FATURA_REGEX =
  /(?<![\p{L}\p{N}_])(?:fatura|fiş|fis|belge)(?:\s+no)?[:\s#-]+([A-Za-z0-9_-]+)(?![\p{L}\p{N}_])/iu;
export const BAKIM_KEYWORD_REGEX =
  /(?<![\p{L}\p{N}_])(bakim|bakım|servis|tamir|onarım|onarim|arıza|ariza|fren|balata|yag|yağ|triger|lastik|kaporta|boya|akü|aku|rot|balans|muayene)(?![\p{L}\p{N}_])/iu;

export function resolveVehicleFromText(text, araclar, seciliAracId) {
  const plateMatch = text.match(PLATE_REGEX);
  const rawPlate = plateMatch ? plateMatch[1].toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim() : null;
  const compactPlate = rawPlate ? rawPlate.replace(/\s+/g, '') : '';

  const fallbackVehicle =
    (seciliAracId && seciliAracId !== 'tum'
      ? araclar.find((a) => String(a.arac_id) === String(seciliAracId))
      : null) ||
    araclar[0] ||
    null;

  const matchedByPlate = compactPlate
    ? araclar.find(
        (a) =>
          String(a.plaka || '')
            .toLocaleUpperCase('tr-TR')
            .replace(/\s+/g, '') === compactPlate
      ) || null
    : null;

  return {
    plateMatch,
    rawPlate,
    arac: matchedByPlate || fallbackVehicle,
    hasExplicitPlate: Boolean(plateMatch),
  };
}

export function parseLedgerNaturalInput(rawText, araclar = [], seciliAracId = 'tum') {
  const text = String(rawText || '').trim();
  if (text.length < 4) return null;

  const { plateMatch, rawPlate, arac } = resolveVehicleFromText(text, araclar, seciliAracId);

  let yakitTipi = 'Dizel';
  if (/(?<![\p{L}\p{N}_])(benzin|kurşunsuz|kursunsuz)(?![\p{L}\p{N}_])/iu.test(text)) {
    yakitTipi = 'Benzin';
  } else if (/(?<![\p{L}\p{N}_])(lpg|otogaz)(?![\p{L}\p{N}_])/iu.test(text)) {
    yakitTipi = 'LPG';
  } else if (/(?<![\p{L}\p{N}_])(elektrik|kwh|şarj|sarj)(?![\p{L}\p{N}_])/iu.test(text)) {
    yakitTipi = 'Elektrik';
  } else if (/(?<![\p{L}\p{N}_])(dizel|mazot|motorin)(?![\p{L}\p{N}_])/iu.test(text)) {
    yakitTipi = 'Dizel';
  }

  let bakimTipi = 'Periyodik Bakım';
  if (/(?<![\p{L}\p{N}_])(arıza|ariza|onarım|onarim|tamir|mekanik)(?![\p{L}\p{N}_])/iu.test(text)) {
    bakimTipi = 'Arıza & Mekanik Onarım';
  } else if (/(?<![\p{L}\p{N}_])(lastik|rot|balans|jant)(?![\p{L}\p{N}_])/iu.test(text)) {
    bakimTipi = 'Lastik & Rot Balans';
  } else if (/(?<![\p{L}\p{N}_])(kaporta|boya|göçük|gocuk|cam)(?![\p{L}\p{N}_])/iu.test(text)) {
    bakimTipi = 'Kaporta & Boya';
  } else if (/(?<![\p{L}\p{N}_])(fren|balata|disk)(?![\p{L}\p{N}_])/iu.test(text)) {
    bakimTipi = 'Fren Sistemi Bakımı';
  } else if (/(?<![\p{L}\p{N}_])(triger|ağır bakım|agir bakim|baskı balata|debriyaj)(?![\p{L}\p{N}_])/iu.test(text)) {
    bakimTipi = 'Triger & Ağır Bakım';
  } else if (/(?<![\p{L}\p{N}_])(yağ|yag|filtre)(?![\p{L}\p{N}_])/iu.test(text)) {
    bakimTipi = 'Yağ & Filtre Bakımı';
  } else if (/(?<![\p{L}\p{N}_])(akü|aku|alternatör|marş|mars)(?![\p{L}\p{N}_])/iu.test(text)) {
    bakimTipi = 'Akü & Elektrik';
  } else if (/(?<![\p{L}\p{N}_])(muayene|tüvtürk|tuvturk|egzoz)(?![\p{L}\p{N}_])/iu.test(text)) {
    bakimTipi = 'Muayene & Resmi Evrak';
  }

  const litreMatch = text.match(LITRE_REGEX);
  const litre = litreMatch ? parseLocaleNumber(litreMatch[1]) : null;
  const tutarMatch = text.match(TUTAR_REGEX);
  const tutar = tutarMatch ? parseLocaleNumber(tutarMatch[1]) : null;
  const kmMatch = text.match(KM_REGEX_SINGLE);
  const km = kmMatch ? parseLocaleNumber(kmMatch[1]) : null;
  const faturaMatch = text.match(FATURA_REGEX);
  const faturaBilgisi = faturaMatch ? faturaMatch[1].trim() : '';

  const isBakimKeyword = BAKIM_KEYWORD_REGEX.test(text);
  const initialTip = isBakimKeyword && !(litre > 0) ? 'BAKIM' : 'YAKIT';

  const isReady =
    initialTip === 'YAKIT'
      ? Boolean(litre && litre > 0 && tutar && tutar > 0)
      : Boolean(tutar && tutar > 0);

  if (!isReady) return null;

  let notlar = text;
  if (plateMatch) notlar = notlar.replace(plateMatch[0], '');
  if (litreMatch) notlar = notlar.replace(litreMatch[0], '');
  if (tutarMatch) notlar = notlar.replace(tutarMatch[0], '');
  if (kmMatch) notlar = notlar.replace(kmMatch[0], '');
  if (faturaMatch) notlar = notlar.replace(faturaMatch[0], '');
  notlar = notlar
    .replace(
      /(?<![\p{L}\p{N}_])(yakit|yakıt|dizel|mazot|motorin|benzin|kurşunsuz|kursunsuz|lpg|otogaz|elektrik|şarj|sarj|bakım|bakim|servis)(?![\p{L}\p{N}_])/giu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  const plateLabel = formatTurkishPlate(arac?.plaka || rawPlate || '') || 'Araç seçin';

  return {
    initialTip,
    plateLabel,
    litre,
    tutar,
    km,
    yakitTipi,
    bakimTipi,
    prefill: {
      arac_id: arac?.arac_id != null ? String(arac.arac_id) : '',
      yakit_tipi: yakitTipi,
      bakim_tipi: bakimTipi,
      litre: initialTip === 'YAKIT' ? litre : null,
      tutar,
      km,
      fatura_bilgisi: faturaBilgisi,
      notlar,
    },
  };
}

export function parsePartNaturalInput(rawText, araclar = [], seciliAracId = 'tum') {
  const text = String(rawText || '').trim();
  if (text.length < 4) return null;

  if (LITRE_REGEX.test(text)) return null;

  const { plateMatch, rawPlate, arac, hasExplicitPlate } = resolveVehicleFromText(
    text,
    araclar,
    seciliAracId
  );

  const kmTokens = [...text.matchAll(KM_REGEX_GLOBAL)];
  const moneyMatch = text.match(TUTAR_REGEX);

  if (!hasExplicitPlate && kmTokens.length === 0 && !moneyMatch) return null;

  const degisimKm = kmTokens[0] ? parseLocaleNumber(kmTokens[0][1]) : null;
  const omurKm = kmTokens[1] ? parseLocaleNumber(kmTokens[1][1]) : null;
  const maliyet = moneyMatch ? parseLocaleNumber(moneyMatch[1]) : null;

  let parcaAdi = text;
  if (plateMatch) parcaAdi = parcaAdi.replace(plateMatch[0], '');
  kmTokens.forEach((m) => {
    parcaAdi = parcaAdi.replace(m[0], '');
  });
  if (moneyMatch) parcaAdi = parcaAdi.replace(moneyMatch[0], '');
  parcaAdi = parcaAdi
    .replace(
      /(?<![\p{L}\p{N}_])(son|ömür|omur|aralık|aralik|değişim|degisim|maliyet|tutar|parça|parca)(?![\p{L}\p{N}_])[:\s]*/giu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  if (parcaAdi.length < 2) return null;

  const plateLabel = formatTurkishPlate(arac?.plaka || rawPlate || '') || 'Araç seçin';
  const birim = arac && isSmhArac(arac) ? 'saat' : 'km';
  const resolvedSayac =
    degisimKm !== null && Number.isFinite(degisimKm)
      ? degisimKm
      : arac
        ? getGuncelSayac(arac)
        : null;

  return {
    plateLabel,
    parcaAdi,
    birim,
    degisimKm: resolvedSayac,
    omurKm,
    maliyet,
    prefill: {
      arac_id: arac?.arac_id != null ? String(arac.arac_id) : '',
      parca_adi: parcaAdi,
      son_degisim_km: resolvedSayac,
      degisim_araligi_km: omurKm,
      maliyet: maliyet && maliyet > 0 ? maliyet : null,
      notlar: '',
    },
  };
}
