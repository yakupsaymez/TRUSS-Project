import { Shield, ShieldAlert, User } from 'lucide-react';
import { ROLES } from '@/components/v2/channelAccess';
import { formatTurkishPlate } from '@/utils/formatters';

export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const SELF_LOCK_MESSAGE = 'Kendi rol ve yetkinizi değiştiremezsiniz.';
export const ADMIN_LOCK_MESSAGE =
  'Sistem Admini kayıtları Filo Yöneticisi tarafından değiştirilemez.';

export const ROLE_META = {
  [ROLES.SYSTEM_ADMIN]: {
    key: ROLES.SYSTEM_ADMIN,
    label: 'Sistem Admini',
    shortLabel: 'Sistem Admini',
    icon: ShieldAlert,
    iconClass: 'text-destructive',
    badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  [ROLES.FLEET_MANAGER]: {
    key: ROLES.FLEET_MANAGER,
    label: 'Filo Yöneticisi',
    shortLabel: 'Filo Yöneticisi',
    icon: Shield,
    iconClass: 'text-primary',
    badgeClass: 'border-primary/40 bg-primary/10 text-primary',
  },
  [ROLES.DRIVER]: {
    key: ROLES.DRIVER,
    label: 'Şoför',
    shortLabel: 'Şoför',
    icon: User,
    iconClass: 'text-muted-foreground',
    badgeClass: 'border-border bg-muted text-muted-foreground',
  },
};

export const PERMISSION_DEFINITIONS = [
  { key: 'yakit', label: 'Yakıt', fullLabel: 'Yakıt Girişi', desc: 'Yakıt ikmali ve litre kaydı' },
  { key: 'bakim', label: 'Bakım', fullLabel: 'Servis Onayı', desc: 'Bakım ve onarım emri kaydı' },
  { key: 'finans', label: 'Finans', fullLabel: 'Finansal Rapor', desc: 'Bütçe ve maliyet telemetrisi' },
];

export const INITIAL_PERMS = {
  [ROLES.SYSTEM_ADMIN]: {
    yakit: true,
    bakim: true,
    finans: true,
  },
  [ROLES.FLEET_MANAGER]: {
    yakit: true,
    bakim: true,
    finans: true,
  },
  [ROLES.DRIVER]: {
    yakit: false,
    bakim: false,
    finans: false,
  },
};

export function resolveMemberPerms(member) {
  const serverPerms =
    member?.yetkiler && typeof member.yetkiler === 'object' ? member.yetkiler : {};
  return {
    yakit: serverPerms.yakit === true,
    bakim: serverPerms.bakim === true,
    finans: serverPerms.finans === true,
  };
}

export function getInitials(name) {
  const clean = String(name || '').trim();
  if (!clean) return 'EK';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('tr-TR');
  }
  return clean.slice(0, 2).toLocaleUpperCase('tr-TR');
}

export function formatTrDate(isoLike) {
  if (!isoLike) return null;
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function countCrewRoles(users) {
  const counts = {
    ALL: users.length,
    [ROLES.SYSTEM_ADMIN]: 0,
    [ROLES.FLEET_MANAGER]: 0,
    [ROLES.DRIVER]: 0,
  };
  users.forEach((member) => {
    const r = member?.role || ROLES.DRIVER;
    if (counts[r] !== undefined) counts[r] += 1;
  });
  return counts;
}

export function filterCrewUsers(users, searchQuery, roleFilter) {
  const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
  const compactQ = q.replace(/\s+/g, '');

  return users.filter((member) => {
    if (roleFilter !== 'ALL' && (member?.role || ROLES.DRIVER) !== roleFilter) {
      return false;
    }

    if (!q) return true;

    const name = String(member?.ad_soyad || '').toLocaleLowerCase('tr-TR');
    const email = String(member?.email || '').toLocaleLowerCase('tr-TR');
    const phone = String(member?.telefon || '').toLocaleLowerCase('tr-TR');
    const compactPhone = phone.replace(/\s+/g, '');

    if (
      name.includes(q) ||
      email.includes(q) ||
      phone.includes(q) ||
      (compactQ && compactPhone.includes(compactQ))
    ) {
      return true;
    }

    const assigned = Array.isArray(member?.zimmetli_araclar) ? member.zimmetli_araclar : [];
    return assigned.some((arac) => {
      const rawPlate = String(arac?.plaka || '').toLocaleLowerCase('tr-TR');
      const formattedPlate = formatTurkishPlate(arac?.plaka || '').toLocaleLowerCase('tr-TR');
      const compactPlate = rawPlate.replace(/\s+/g, '');
      return (
        rawPlate.includes(q) ||
        formattedPlate.includes(q) ||
        (compactQ && compactPlate.includes(compactQ))
      );
    });
  });
}
