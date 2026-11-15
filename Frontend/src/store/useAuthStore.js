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

const useAuthStore = create((set) => ({
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

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
