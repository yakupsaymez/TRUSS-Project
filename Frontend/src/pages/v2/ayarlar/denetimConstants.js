export const DENETIM_PAGE_SIZE = 25;

export const VARLIK_TIPI_OPTIONS = [
  { value: 'all', label: 'Tüm Varlıklar' },
  { value: 'arac', label: 'Araç' },
  { value: 'yakit', label: 'Yakıt' },
  { value: 'bakim', label: 'Bakım' },
  { value: 'is_emri', label: 'İş Emri' },
  { value: 'yakit_anomali', label: 'Anomali' },
  { value: 'user', label: 'Kullanıcı' },
];

export const VARLIK_TIPI_LABELS = {
  arac: 'Araç',
  yakit: 'Yakıt',
  bakim: 'Bakım',
  is_emri: 'İş Emri',
  yakit_anomali: 'Anomali',
  user: 'Kullanıcı',
};

export const EYLEM_META = {
  ARAC_ARSIVLENDI: {
    label: 'Araç Arşivlendi',
    className: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
  },
  ARAC_GERI_YUKLENDI: {
    label: 'Araç Geri Yüklendi',
    className: 'border-status-success/30 bg-status-success/10 text-status-success',
  },
  ARAC_SILINDI: {
    label: 'Araç Silindi',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  YAKIT_SILINDI: {
    label: 'Yakıt Silindi',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  YAKIT_TOPLU_AKTARIM: {
    label: 'Toplu Yakıt Aktarımı',
    className: 'border-status-info/30 bg-status-info/10 text-status-info',
  },
  BAKIM_SILINDI: {
    label: 'Bakım Silindi',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  IS_EMRI_ACILDI: {
    label: 'İş Emri Açıldı',
    className: 'border-status-info/30 bg-status-info/10 text-status-info',
  },
  IS_EMRI_GUNCELLENDI: {
    label: 'İş Emri Güncellendi',
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
  IS_EMRI_TAMAMLANDI: {
    label: 'İş Emri Tamamlandı',
    className: 'border-status-success/30 bg-status-success/10 text-status-success',
  },
  IS_EMRI_IPTAL: {
    label: 'İş Emri İptal Edildi',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  ANOMALI_GUNCELLENDI: {
    label: 'Anomali Güncellendi',
    className: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
  },
  KULLANICI_ROL_GUNCELLENDI: {
    label: 'Kullanıcı Rolü Güncellendi',
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
  KULLANICI_YETKI_GUNCELLENDI: {
    label: 'Kullanıcı Yetkisi Güncellendi',
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
};

export const EYLEM_OPTIONS = [
  { value: 'all', label: 'Tüm Eylemler' },
  ...Object.entries(EYLEM_META).map(([value, meta]) => ({ value, label: meta.label })),
];

const AUDIT_DT_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function formatAuditDateTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return AUDIT_DT_FORMATTER.format(date);
}
