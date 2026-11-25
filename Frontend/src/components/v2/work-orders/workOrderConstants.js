export const WORK_ORDER_PAGE_SIZE = 25;

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
