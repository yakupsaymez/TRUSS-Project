import { getTodayIso } from '@/utils/dateUtils';
import { formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';

export const YAKIT_TIPLERI = ['Dizel', 'Benzin', 'LPG', 'Elektrik', 'Diğer'];

export const ISLEM_TURLERI = [
  'Periyodik Bakım',
  'Yağ & Filtre Bakımı',
  'Fren Sistemi Bakımı',
  'Triger & Ağır Bakım',
  'Arıza & Mekanik Onarım',
  'Lastik & Rot Balans',
  'Kaporta & Boya',
  'Akü & Elektrik',
  'Muayene & Resmi Evrak',
  'Diğer Servis',
];

export function cozumleNotVeFatura(rawNotlar, rawFatura) {
  const ham = String(rawNotlar || '').trim();
  if (rawFatura) {
    return { fatura_bilgisi: String(rawFatura).trim(), notlar: ham };
  }
  const match = ham.match(/^\[Fatura:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return { fatura_bilgisi: match[1].trim(), notlar: match[2].trim() };
  }
  return { fatura_bilgisi: '', notlar: ham };
}

export function birlestirNotVeFatura(notlar, faturaBilgisi) {
  const temizNot = String(notlar || '').trim();
  const temizFatura = String(faturaBilgisi || '').trim();
  if (temizFatura && temizNot) {
    return `[Fatura: ${temizFatura}] ${temizNot}`;
  }
  if (temizFatura) {
    return `[Fatura: ${temizFatura}]`;
  }
  return temizNot || null;
}

export function resolveDefaultAracId(defaultAracId, araclar) {
  if (defaultAracId && defaultAracId !== 'tum') {
    return String(defaultAracId);
  }
  if (Array.isArray(araclar) && araclar.length > 0) {
    return String(araclar[0].arac_id);
  }
  return '';
}

export function buildInitialForm({
  mode,
  initialTip,
  record,
  defaultAracId,
  araclar,
  prefill = null,
}) {
  const todayIso = getTodayIso();

  if (mode === 'edit' && record) {
    const tip = record.tip === 'BAKIM' ? 'BAKIM' : 'YAKIT';
    const hasParsedMeta = record.fatura_bilgisi !== undefined;
    const { fatura_bilgisi, notlar } = hasParsedMeta
      ? {
          fatura_bilgisi: String(record.fatura_bilgisi || ''),
          notlar: String(record.notlar || ''),
        }
      : cozumleNotVeFatura(
          record.notlar || record.raw?.notlar || record.raw?.aciklama,
          record.raw?.fatura_no || record.raw?.fatura_bilgisi
        );

    return {
      tip,
      arac_id: record.arac_id !== undefined && record.arac_id !== null ? String(record.arac_id) : '',
      tarih: record.tarih ? String(record.tarih).slice(0, 10) : todayIso,
      yakit_tipi:
        tip === 'YAKIT' ? record.altTur || record.raw?.yakit_tipi || 'Dizel' : 'Dizel',
      bakim_tipi:
        tip === 'BAKIM'
          ? record.altTur || record.raw?.bakim_tipi || 'Periyodik Bakım'
          : 'Periyodik Bakım',
      km:
        record.km !== null && record.km !== undefined && record.km !== ''
          ? formatLocaleNumber(record.km, 0)
          : '',
      litre:
        tip === 'YAKIT' && record.litre !== null && record.litre !== undefined && record.litre !== ''
          ? formatLocaleNumber(record.litre, 2)
          : '',
      tutar:
        record.tutar !== null && record.tutar !== undefined && record.tutar !== ''
          ? formatLocaleNumber(record.tutar, 2)
          : '',
      fatura_bilgisi,
      notlar,
    };
  }

  if (mode === 'repeat' && record) {
    // §10.4 kesin kuralı: araç, tür, yakıt/bakım tipi, litre (yakıtsa) kopyalanır;
    // tarih bugün olur; sayaç (km), tutar, fatura ve notlar BOŞ açılır.
    const tip = record.tip === 'BAKIM' ? 'BAKIM' : 'YAKIT';
    return {
      tip,
      arac_id: record.arac_id !== undefined && record.arac_id !== null ? String(record.arac_id) : '',
      tarih: todayIso,
      yakit_tipi:
        tip === 'YAKIT' ? record.altTur || record.raw?.yakit_tipi || 'Dizel' : 'Dizel',
      bakim_tipi:
        tip === 'BAKIM'
          ? record.altTur || record.raw?.bakim_tipi || 'Periyodik Bakım'
          : 'Periyodik Bakım',
      km: '',
      litre:
        tip === 'YAKIT' && record.litre !== null && record.litre !== undefined && record.litre !== ''
          ? formatLocaleNumber(record.litre, 2)
          : '',
      tutar: '',
      fatura_bilgisi: '',
      notlar: '',
    };
  }

  const tip = initialTip === 'BAKIM' ? 'BAKIM' : 'YAKIT';
  const prefillAracId =
    prefill?.arac_id !== undefined && prefill?.arac_id !== null && prefill?.arac_id !== ''
      ? String(prefill.arac_id)
      : resolveDefaultAracId(defaultAracId, araclar);

  return {
    tip,
    arac_id: prefillAracId,
    tarih: todayIso,
    yakit_tipi: prefill?.yakit_tipi || 'Dizel',
    bakim_tipi: prefill?.bakim_tipi || 'Periyodik Bakım',
    km:
      prefill?.km !== undefined && prefill?.km !== null && prefill?.km !== ''
        ? formatLocaleNumber(prefill.km, 0)
        : '',
    litre:
      tip === 'YAKIT' &&
      prefill?.litre !== undefined &&
      prefill?.litre !== null &&
      prefill?.litre !== ''
        ? formatLocaleNumber(prefill.litre, 2)
        : '',
    tutar:
      prefill?.tutar !== undefined && prefill?.tutar !== null && prefill?.tutar !== ''
        ? formatLocaleNumber(prefill.tutar, 2)
        : '',
    fatura_bilgisi: prefill?.fatura_bilgisi ? String(prefill.fatura_bilgisi) : '',
    notlar: prefill?.notlar ? String(prefill.notlar) : '',
  };
}

export function parseNonNegativeInteger(raw, { required = false } = {}) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return required ? { valid: false, value: null } : { valid: true, value: null };
  }
  const parsed = parseLocaleNumber(trimmed);
  if (parsed === null || !Number.isInteger(parsed) || parsed < 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value: parsed };
}

export function parsePositiveDecimal(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { valid: false, value: null };
  const parsed = parseLocaleNumber(trimmed);
  if (parsed === null || !Number.isFinite(parsed) || parsed <= 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value: parsed };
}

export function validateAndBuildMovementPayload({ form, isYakit }) {
  const errors = {};
  const todayIso = getTodayIso();

  if (!form.arac_id) {
    errors.arac_id = 'Araç seçimi zorunludur.';
  }

  if (!form.tarih) {
    errors.tarih = 'Tarih zorunludur.';
  } else if (form.tarih > todayIso) {
    errors.tarih = 'İleri tarihli kayıt girilemez.';
  }

  const kmRes = parseNonNegativeInteger(form.km, { required: !isYakit });
  if (!kmRes.valid) {
    errors.km = isYakit
      ? 'Geçerli bir tam sayı (≥ 0) girin veya boş bırakın.'
      : 'Geçerli bir tam sayı (≥ 0) girin.';
  }

  let litreRes = { valid: true, value: null };
  if (isYakit) {
    litreRes = parsePositiveDecimal(form.litre);
    if (!litreRes.valid) {
      errors.litre = "Litre 0'dan büyük olmalıdır.";
    }
  }

  const tutarRes = parsePositiveDecimal(form.tutar);
  if (!tutarRes.valid) {
    errors.tutar = isYakit
      ? "Tutar 0'dan büyük olmalıdır."
      : "Maliyet 0'dan büyük olmalıdır.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, payload: null };
  }

  const combinedNotes = birlestirNotVeFatura(form.notlar, form.fatura_bilgisi);
  const aracIdNum = Number(form.arac_id);

  if (isYakit) {
    return {
      errors: null,
      payload: {
        arac_id: aracIdNum,
        yakit_tipi: form.yakit_tipi || 'Dizel',
        tarih: form.tarih,
        litre: litreRes.value,
        tutar: tutarRes.value,
        km: kmRes.value,
        notlar: combinedNotes,
      },
    };
  }

  return {
    errors: null,
    payload: {
      arac_id: aracIdNum,
      bakim_tipi: form.bakim_tipi || 'Periyodik Bakım',
      tarih: form.tarih,
      km: kmRes.value,
      maliyet: tutarRes.value,
      notlar: combinedNotes,
    },
  };
}

export function getMovementSheetMeta({ isEditMode, isRepeatMode, isYakit }) {
  const title = isEditMode
    ? isYakit
      ? 'Yakıt Kaydını Düzenle'
      : 'Bakım Kaydını Düzenle'
    : isRepeatMode
      ? isYakit
        ? 'Yakıt Kaydını Tekrarla'
        : 'Bakım Kaydını Tekrarla'
      : isYakit
        ? 'Yeni Yakıt Kaydı'
        : 'Yeni Bakım Kaydı';

  const description = isEditMode
    ? 'Kayıt tarihini, sayaç değerini, maliyet ve fatura/not bilgilerini güncelleyin.'
    : isRepeatMode
      ? 'Araç ve tür bilgileri önceki kayıttan alındı. Güncel sayaç ve tutar bilgilerini girerek yeni kayıt oluşturun.'
      : 'Filo aracına yeni yakıt ikmali veya servis/bakım harcaması ekleyin.';

  const badge = isEditMode || isRepeatMode ? (isYakit ? 'Yakıt' : 'Bakım') : null;
  const submitLabel = isEditMode ? 'Değişiklikleri Kaydet' : 'Kaydı Ekle';

  return { title, description, badge, submitLabel };
}
