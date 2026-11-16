// Chrono-OS kanal erişimi — TEK DOĞRULUK KAYNAĞI (ChronoLayout ve ChronoApp buradan okur)

export const ROLES = Object.freeze({
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  FLEET_MANAGER: 'FLEET_MANAGER',
  DRIVER: 'DRIVER',
});

const MANAGEMENT_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER];

// Sıra = üst bardaki gösterim sırası. `isAllowed(role, yetkiler)` kanalın erişim kuralıdır.
const CHANNELS = [
  { key: 'ledger', label: 'Zaman Defteri (The Ledger)', isAllowed: () => true },
  { key: 'horizon', label: 'Filo Ufku', isAllowed: () => true },
  {
    key: 'analytics',
    label: 'Telemetri & İstatistik',
    isAllowed: (role, yetkiler) => MANAGEMENT_ROLES.includes(role) || yetkiler.finans === true,
  },
  { key: 'components', label: 'Parça & Envanter', isAllowed: () => true },
  {
    key: 'crew',
    label: 'Ekip Komutası',
    isAllowed: (role, yetkiler) => MANAGEMENT_ROLES.includes(role) || yetkiler.ekip === true,
  },
];

export const DEFAULT_CHANNEL = 'ledger';

// user veya role yoksa / bilinmeyen bir role geliyorsa en kısıtlı rol (DRIVER) varsayılır.
export function resolveRole(user) {
  const role = user?.role;
  return Object.prototype.hasOwnProperty.call(ROLES, role) ? role : ROLES.DRIVER;
}

function resolveYetkiler(user) {
  const y = user?.yetkiler;
  return y && typeof y === 'object' ? y : {};
}

export function canAccessChannel(user, key) {
  const channel = CHANNELS.find((ch) => ch.key === key);
  if (!channel) return false;
  return channel.isAllowed(resolveRole(user), resolveYetkiler(user));
}

export function getVisibleChannels(user) {
  const role = resolveRole(user);
  const yetkiler = resolveYetkiler(user);
  return CHANNELS.filter((ch) => ch.isAllowed(role, yetkiler)).map(({ key, label }) => ({
    key,
    label,
  }));
}
