export const MAX_IMPORT_BYTES = 1024 * 1024;
export const MAX_CSV_CHARS = 1000000;

export const DURUM_BADGES = {
  gecerli: { label: 'Geçerli', className: 'border-status-success/30 bg-status-success/10 text-status-success' },
  mukerrer: { label: 'Mükerrer', className: 'border-status-warning/30 bg-status-warning/10 text-status-warning' },
  hatali: { label: 'Hatalı', className: 'border-destructive/30 bg-destructive/10 text-destructive' },
};

export const UYARI_SEVIYE_BADGES = {
  kritik: 'border-destructive/30 bg-destructive/10 text-destructive',
  uyari: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
};

export const UYARI_TIP_LABELS = {
  DEPO_ASIMI: 'Depo Aşımı',
  ARDISIK_DOLUM: 'Ardışık Dolum',
  YUKSEK_TUKETIM: 'Yüksek Tüketim',
};

export const NEDEN_KODU_LABELS = {
  ARAC_ARSIVLI: 'Arşivli Araç',
  TANIMSIZ_PLAKA: 'Tanımsız Plaka',
  MUKERRER_KAYIT: 'Mükerrer Kayıt',
  SAYAC_TUTARSIZ: 'Sayaç Tutarsız',
};

export const getNedenKoduLabel = (kod) => {
  const key = String(kod || '').toUpperCase();
  return NEDEN_KODU_LABELS[key] || kod || '';
};

export const getNedenKoduBadgeClass = (kod) =>
  String(kod || '').toUpperCase() === 'ARAC_ARSIVLI'
    ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
    : 'border-destructive/30 bg-destructive/10 text-destructive';

export const getUyariTipLabel = (tip) =>
  UYARI_TIP_LABELS[String(tip || '').toUpperCase()] || tip || 'Uyarı';

export const formatImportDate = (raw) => {
  if (!raw) return '—';
  const match = String(raw).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : String(raw);
};

export async function decodeCsvFile(file) {
  if (!file) throw new Error('Lütfen bir CSV dosyası seçin.');
  if (!/\.(csv|txt)$/i.test(String(file.name || ''))) {
    throw new Error('Yalnızca .csv veya .txt uzantılı dosyalar yüklenebilir.');
  }
  if (file.size <= 0) throw new Error('Seçilen dosya boş.');
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Dosya boyutu 1 MB sınırını aşıyor.');

  const buf = await file.arrayBuffer();
  let text = '';
  let encoding = 'UTF-8';
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    text = new TextDecoder('windows-1254').decode(buf);
    encoding = 'Windows-1254';
  }

  if (!text.trim()) throw new Error('CSV içeriği boş olamaz.');
  if (text.length > MAX_CSV_CHARS) throw new Error('CSV içeriği 1.000.000 karakter sınırını aşıyor.');
  if (new Blob([JSON.stringify({ csv_text: text })]).size > MAX_IMPORT_BYTES) {
    throw new Error('İstek boyutu 1 MB sınırını aşıyor.');
  }
  return { text, encoding };
}

const formatTrDaysAgo = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
};

export function downloadSampleFuelCsv() {
  const header = 'Plaka;Tarih;Litre;Tutar;KM;Yakıt Tipi;İstasyon;Fatura No';
  const rows = [
    `34 ABC 123;${formatTrDaysAgo(3)};45,50;1980,25;125400;Dizel;Shell Maslak;FT-2026-001`,
    `06 DEF 456;${formatTrDaysAgo(1)};52,00;2262,00;84210;Dizel;Opet Çankaya;FT-2026-002`,
  ];
  const blob = new Blob([`\uFEFF${[header, ...rows].join('\n')}\n`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = 'truss-yakit-ekstre-sablonu.csv';
    document.body.appendChild(link);
    link.click();
  } finally {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }
}
