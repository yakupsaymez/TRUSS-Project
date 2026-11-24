import {
  Bell,
  Cog,
  FileCheck2,
  LaptopMinimal,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  User,
  Wallet,
  Wrench,
} from 'lucide-react';
import { ROLES } from '@/components/v2/channelAccess';

export const BASE_SETTINGS_TABS = [
  { id: 'genel', label: 'Genel', icon: SlidersHorizontal },
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'guvenlik', label: 'Güvenlik', icon: ShieldCheck },
  { id: 'bildirimler', label: 'Bildirimler', icon: Bell },
];

export const TAX_NUMBER_RE = /^\d{10,11}$/;

export const DEFAULT_NOTIFICATION_MATRIX = {
  belge_vadesi: { email: true, sms: true },
  periyodik_bakim: { email: true, sms: true },
  parca_omru: { email: true, sms: false },
  maliyet_ozeti: { email: true, sms: false },
};

export const NOTIFICATION_CATEGORIES = [
  {
    key: 'belge_vadesi',
    label: 'Resmi Belge & Poliçe Vadeleri',
    description: 'Muayene, trafik sigortası ve kasko poliçesi vade uyarıları',
    icon: FileCheck2,
  },
  {
    key: 'periyodik_bakim',
    label: 'Periyodik Bakım Eşikleri',
    description: "KM / SMH periyodunun son %10'una giren ve geciken araç uyarıları",
    icon: Wrench,
  },
  {
    key: 'parca_omru',
    label: 'Kritik Parça Ömrü',
    description: 'Triger, balata, yağ ve filtre bileşenlerinin kritik ömür uyarıları',
    icon: Cog,
  },
  {
    key: 'maliyet_ozeti',
    label: 'Haftalık Filo & Gider Özeti',
    description: 'Haftalık yakıt tüketimi, bakım harcamaları ve filo sağlık bülteni',
    icon: Wallet,
  },
];

export function normalizeNotificationMatrix(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return Object.keys(DEFAULT_NOTIFICATION_MATRIX).reduce((acc, key) => {
    const def = DEFAULT_NOTIFICATION_MATRIX[key];
    const item = src[key] && typeof src[key] === 'object' ? src[key] : {};
    acc[key] = {
      email: typeof item.email === 'boolean' ? item.email : def.email,
      sms: typeof item.sms === 'boolean' ? item.sms : def.sms,
    };
    return acc;
  }, {});
}

export function formatOrgDate(isoLike) {
  if (!isoLike) return '—';
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) {
    const str = String(isoLike).slice(0, 10);
    const [y, m, d] = str.split('-');
    return y && m && d ? `${d}.${m}.${y}` : '—';
  }
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export const THEME_OPTIONS = [
  { value: 'light', label: 'Açık', icon: Sun },
  { value: 'dark', label: 'Koyu', icon: Moon },
  { value: 'system', label: 'Sistem', icon: LaptopMinimal },
];

export const ROLE_LABELS = {
  [ROLES.SYSTEM_ADMIN]: 'Sistem Admini',
  [ROLES.FLEET_MANAGER]: 'Filo Yöneticisi',
  [ROLES.DRIVER]: 'Şoför',
};

export const PERMISSION_LABELS = {
  // Backend & CrewDataTable yetki anahtarları
  yakit: 'Yakıt Kayıtları',
  bakim: 'Bakım Kayıtları',
  finans: 'Finans & Analitik',
  zimmet: 'Araç Zimmeti',
  envanter: 'Parça & Envanter',
  ekip: 'Ekip Yönetimi',
  // Blueprint alias anahtarları
  arac_goruntuleme: 'Araç Görüntüleme',
  yakit_bakim: 'Yakıt & Bakım',
  parca_takibi: 'Parça Takibi',
  filo_yonetimi: 'Filo Yönetimi',
  ekip_yonetimi: 'Ekip Yönetimi',
};
