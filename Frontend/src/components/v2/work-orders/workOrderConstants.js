import { getTodayIso } from '@/utils/dateUtils';

export const WORK_ORDER_PAGE_SIZE = 25;
export const WORKORDER_MAX_DOCS = 5;

export const KATEGORI_OPTIONS = [
  { value: 'ariza', label: 'Arıza' },
  { value: 'periyodik_bakim', label: 'Periyodik Bakım' },
  { value: 'lastik', label: 'Lastik' },
  { value: 'hasar', label: 'Hasar' },
  { value: 'diger', label: 'Diğer' },
];

export const KATEGORI_LABELS = {
  ariza: 'Arıza',
  periyodik_bakim: 'Periyodik Bakım',
  lastik: 'Lastik',
  hasar: 'Hasar',
  diger: 'Diğer',
};

export const ONCELIK_OPTIONS = [
  { value: 'dusuk', label: 'Düşük' },
  { value: 'normal', label: 'Normal' },
  { value: 'yuksek', label: 'Yüksek' },
  { value: 'kritik', label: 'Kritik' },
];

export const ONCELIK_META = {
  dusuk: { label: 'Düşük', className: 'border-border bg-muted text-muted-foreground' },
  normal: { label: 'Normal', className: 'border-status-info/30 bg-status-info/10 text-status-info' },
  yuksek: { label: 'Yüksek', className: 'border-status-warning/30 bg-status-warning/10 text-status-warning' },
  kritik: { label: 'Kritik', className: 'border-destructive/30 bg-destructive/10 text-destructive' },
};

export const DURUM_OPTIONS = [
  { value: 'acik', label: 'Açık' },
  { value: 'serviste', label: 'Serviste' },
  { value: 'tamamlandi', label: 'Tamamlandı' },
  { value: 'iptal', label: 'İptal' },
];

export const DURUM_META = {
  acik: { label: 'Açık', className: 'border-status-warning/30 bg-status-warning/10 text-status-warning' },
  serviste: { label: 'Serviste', className: 'border-primary/30 bg-primary/10 text-primary' },
  tamamlandi: { label: 'Tamamlandı', className: 'border-status-success/30 bg-status-success/10 text-status-success' },
  iptal: { label: 'İptal', className: 'border-border bg-muted text-muted-foreground' },
};

export function isHourOdometer(sayacTipi) {
  return sayacTipi === 'SMH' || sayacTipi === 'SAAT';
}

export function formatWoDate(iso) {
  if (!iso) return '—';
  const raw = String(iso).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function buildInitialWorkOrderForm({ mode, record, defaultDurum, araclar, defaultAracId }) {
  if (mode === 'edit' && record) {
    const isHour = isHourOdometer(record.sayac_tipi);
    const hasSayac = record.bildirilen_sayac !== null && record.bildirilen_sayac !== undefined && record.bildirilen_sayac !== '';
    const hasCost = record.tahmini_maliyet !== null && record.tahmini_maliyet !== undefined && record.tahmini_maliyet !== '';
    return {
      arac_id: String(record.arac_id),
      baslik: record.baslik || '',
      kategori: record.kategori || 'ariza',
      oncelik: record.oncelik || 'normal',
      durum: defaultDurum || record.durum || 'acik',
      bildirilen_sayac: hasSayac ? String(isHour ? Number(record.bildirilen_sayac) : Math.round(Number(record.bildirilen_sayac))) : '',
      aciklama: record.aciklama || '',
      servis_adi: record.servis_adi || '',
      tahmini_maliyet: hasCost ? String(Number(record.tahmini_maliyet)) : '',
      planlanan_tarih: record.planlanan_tarih ? String(record.planlanan_tarih).slice(0, 10) : '',
    };
  }
  const initialAracId = defaultAracId && defaultAracId !== 'tum'
    ? String(defaultAracId)
    : (araclar[0]?.arac_id ? String(araclar[0].arac_id) : '');
  return {
    arac_id: initialAracId, baslik: '', kategori: 'ariza', oncelik: 'normal', durum: 'acik',
    bildirilen_sayac: '', aciklama: '', servis_adi: '', tahmini_maliyet: '', planlanan_tarih: '',
  };
}

export function validateAndBuildWorkOrderPayload({ form, isEdit, canManage, record, draftKeys = [] }) {
  const nextErr = {};
  if (!isEdit && !form.arac_id) nextErr.arac_id = 'Araç seçimi zorunludur.';
  if (form.baslik.trim().length < 2) nextErr.baslik = 'Başlık en az 2 karakter olmalıdır.';
  const sayacRaw = String(form.bildirilen_sayac ?? '').trim();
  if (sayacRaw !== '') {
    const sNum = Number(sayacRaw);
    if (!Number.isFinite(sNum) || sNum < 0) nextErr.bildirilen_sayac = 'Geçerli bir sayaç değeri girin.';
  }
  const costRaw = String(form.tahmini_maliyet ?? '').trim();
  if (canManage && costRaw !== '') {
    const cNum = Number(costRaw);
    if (!Number.isFinite(cNum) || cNum < 0) nextErr.tahmini_maliyet = 'Geçerli bir maliyet tutarı girin.';
  }
  if (Object.keys(nextErr).length > 0) return { errors: nextErr, payload: null };

  const trimmedAciklama = form.aciklama.trim();
  const trimmedServis = form.servis_adi.trim();
  if (!isEdit) {
    const payload = {
      arac_id: Number(form.arac_id),
      baslik: form.baslik.trim(),
      kategori: form.kategori,
      oncelik: form.oncelik,
      aciklama: trimmedAciklama || undefined,
      bildirilen_sayac: sayacRaw !== '' ? Number(sayacRaw) : undefined,
      ...(draftKeys.length > 0 ? { belge_anahtarlari: draftKeys } : {}),
    };
    if (canManage) {
      payload.servis_adi = trimmedServis || undefined;
      payload.tahmini_maliyet = costRaw !== '' ? Number(costRaw) : undefined;
      payload.planlanan_tarih = form.planlanan_tarih || undefined;
    }
    return { errors: null, payload };
  }

  const patchPayload = {
    baslik: form.baslik.trim(),
    kategori: form.kategori,
    oncelik: form.oncelik,
    aciklama: trimmedAciklama || null,
    bildirilen_sayac: sayacRaw !== '' ? Number(sayacRaw) : null,
    servis_adi: trimmedServis || null,
    tahmini_maliyet: costRaw !== '' ? Number(costRaw) : null,
    planlanan_tarih: form.planlanan_tarih || null,
  };
  if (record?.durum === 'acik' && form.durum === 'serviste') patchPayload.durum = 'serviste';
  return { errors: null, payload: patchPayload };
}

export function buildWorkOrderDocItems({ isEdit, draftDocs, boundDocs, isClosedWo, canManage, currentUserId, recordDurum }) {
  if (!isEdit) {
    return draftDocs.map((d) => ({ ...d, key: `draft-${d.belge_id}`, isDraft: true, canDelete: true, canOpen: false }));
  }
  const canDeleteBound = !isClosedWo && (canManage || recordDurum === 'acik');
  return boundDocs.map((d) => {
    const ownOrMgr = canManage || d.yukleyen_user_id == null || Number(d.yukleyen_user_id) === Number(currentUserId);
    return { ...d, key: `doc-${d.belge_id}`, isDraft: false, canDelete: canDeleteBound && ownOrMgr, canOpen: true };
  });
}

export function buildCompleteWorkOrderForm(record, arac) {
  if (!record) {
    return { tarih: getTodayIso(), sayac_degeri: '', tutar: '', servis_adi: '', islem_tipi: '', fatura_no: '', sifirla_parcalar: false, notlar: '' };
  }
  const isHour = isHourOdometer(record.sayac_tipi || arac?.sayac_tipi);
  const rawSayac = record.bildirilen_sayac ?? arac?.guncel_sayac ?? (isHour ? arac?.guncel_calisma_saati : arac?.guncel_km) ?? '';
  let sayacStr = '';
  if (rawSayac !== '' && rawSayac !== null && rawSayac !== undefined) {
    const n = Number(rawSayac);
    if (Number.isFinite(n)) sayacStr = String(isHour ? n : Math.round(n));
  }
  const hasCost = record.tahmini_maliyet !== null && record.tahmini_maliyet !== undefined && record.tahmini_maliyet !== '';
  return {
    tarih: getTodayIso(), sayac_degeri: sayacStr,
    tutar: hasCost ? String(Number(record.tahmini_maliyet)) : '',
    servis_adi: record.servis_adi || '',
    islem_tipi: record.kategori === 'periyodik_bakim' ? 'Periyodik Bakım' : (record.baslik || '').slice(0, 150),
    fatura_no: '', sifirla_parcalar: false, notlar: '',
  };
}
