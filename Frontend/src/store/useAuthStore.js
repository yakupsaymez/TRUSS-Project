import { create } from 'zustand';
import authService from '@/services/authService';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
};

// Rol veya yetkiler gerçekten değiştiyse true (gereksiz render/yazma olmasın)
const isAccessChanged = (prev, next) => {
  if ((prev?.role ?? null) !== (next?.role ?? null)) return true;
  const a = prev?.yetkiler && typeof prev.yetkiler === 'object' ? prev.yetkiler : {};
  const b = next?.yetkiler && typeof next.yetkiler === 'object' ? next.yetkiler : {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (a[k] !== b[k]) return true;
  }
  return false;
};

let refreshInFlight = null;

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: readUser(),
  isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY)),

  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
    set({ token, user: user || null, isAuthenticated: true });
  },

  login: async (credentials) => {
    const data = await authService.login(credentials);
    if (!data?.token) {
      throw new Error('Sunucudan token alınamadı.');
    }
    useAuthStore.getState().setSession(data.token, data.user);
    return data;
  },

  // Canlı yetki senkronu: GET /users/me. Endpoint yoksa / hata verirse sessizce geçer.
  // 401 akışını api.js yönetir (oturumu temizler ve /login'e yönlendirir).
  refreshUser: async () => {
    if (!get().token || refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      try {
        const data = await authService.getMe();
        const nextUser = data?.user;
        if (!nextUser || typeof nextUser !== 'object') return;
        if (!isAccessChanged(get().user, nextUser)) return;
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        set({ user: nextUser });
      } catch {
        // 404/500/ağ hatası: sessizce vazgeç; uygulama mevcut oturumla çalışmaya devam eder.
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
