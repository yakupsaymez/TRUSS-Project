import { create } from 'zustand';
import toast from 'react-hot-toast';
import api from '@/services/api';

const defaultSettingsForm = {
  ad_soyad: '',
  email: '',
  telefon: '',
  email_bildirim_aktif: true,
  sms_bildirim_aktif: true,
  dil: 'TR',
  para_birimi: 'TRY',
  olcu_birimi: 'KM'
};

let settingsCloseTimer = null;

const applyThemeToDocument = (theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('abts-theme', theme);
};

// noinspection JSUnusedGlobalSymbols
const useAppStore = create((set, get) => ({
  theme: localStorage.getItem('abts-theme') || 'light',
  isSettingsOpen: false,
  isSettingsVisible: false,
  isSaving: false,
  settingsForm: defaultSettingsForm,
  activeSettingsTab: 'hesap',
  isDirty: false,
  deleteConfirmText: '',

  syncTheme: () => {
    applyThemeToDocument(get().theme);
  },

  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyThemeToDocument(nextTheme);
      return { theme: nextTheme };
    });
  },

  syncPreferenceSummary: async (isAuthenticated) => {
    if (!isAuthenticated) {
      set({ settingsForm: defaultSettingsForm });
      return;
    }

    try {
      const preferencesRes = await api.get('/users/settings/preferences');
      const preferences = preferencesRes.data?.preferences || {};
      set((state) => ({
        settingsForm: {
          ...state.settingsForm,
          dil: preferences.dil || defaultSettingsForm.dil,
          para_birimi: preferences.para_birimi || defaultSettingsForm.para_birimi,
          olcu_birimi: preferences.olcu_birimi || defaultSettingsForm.olcu_birimi
        }
      }));
    } catch (_err) {
      // Keep defaults when summary fetch fails; full fetch has explicit feedback in modal open action.
    }
  },

  openSettings: async (isAuthenticated) => {
    if (!isAuthenticated) {
      toast.error('Ayarlar icin once giris yapmalisiniz.');
      return;
    }

    try {
      const [preferencesResult, notificationsResult] = await Promise.allSettled([
        api.get('/users/settings/preferences'),
        api.get('/users/settings/notifications')
      ]);

      const preferences = preferencesResult.status === 'fulfilled'
        ? preferencesResult.value.data?.preferences || {}
        : {};
      const userInfo = notificationsResult.status === 'fulfilled'
        ? notificationsResult.value.data?.user || {}
        : {};

      set({
        settingsForm: {
          ad_soyad: userInfo.ad_soyad || '',
          email: userInfo.email || '',
          telefon: userInfo.telefon || '',
          email_bildirim_aktif: userInfo.email_bildirim_aktif !== false,
          sms_bildirim_aktif: userInfo.sms_bildirim_aktif !== false,
          dil: preferences.dil || defaultSettingsForm.dil,
          para_birimi: preferences.para_birimi || defaultSettingsForm.para_birimi,
          olcu_birimi: preferences.olcu_birimi || defaultSettingsForm.olcu_birimi
        }
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Ayarlar yuklenemedi.');
      set({ settingsForm: defaultSettingsForm });
    }

    set({
      activeSettingsTab: 'hesap',
      deleteConfirmText: '',
      isDirty: false,
      isSettingsOpen: true,
      isSettingsVisible: true
    });
  },

  closeSettings: () => {
    set({ isSettingsVisible: false });

    if (settingsCloseTimer) {
      clearTimeout(settingsCloseTimer);
    }

    settingsCloseTimer = setTimeout(() => {
      set({
        isSettingsOpen: false,
        isDirty: false,
        deleteConfirmText: '',
        activeSettingsTab: 'hesap'
      });
      settingsCloseTimer = null;
    }, 200);
  },

  cleanupSettingsTimer: () => {
    if (settingsCloseTimer) {
      clearTimeout(settingsCloseTimer);
      settingsCloseTimer = null;
    }
  },

  handleAttemptCloseSettings: () => {
    if (get().isDirty) {
      const onay = window.confirm('Kaydedilmemis degisiklikleriniz var, cikmak istediginize emin misiniz?');
      if (!onay) return;
    }
    get().closeSettings();
  },

  setActiveSettingsTab: (tab) => {
    set({ activeSettingsTab: tab });
  },

  setDeleteConfirmText: (text) => {
    set({ deleteConfirmText: text, isDirty: true });
  },

  handleSettingsChange: (event) => {
    const { name, value, type, checked } = event.target;
    set((state) => ({
      settingsForm: {
        ...state.settingsForm,
        [name]: type === 'checkbox' ? checked : value
      },
      isDirty: true
    }));
  },

  handlePreferenceChange: (event) => {
    const { name, value } = event.target;
    set((state) => ({
      settingsForm: {
        ...state.settingsForm,
        [name]: value
      },
      isDirty: true
    }));
  },

  handleSettingsSave: async (event) => {
    event.preventDefault();

    const { settingsForm, closeSettings } = get();

    try {
      set({ isSaving: true });
      await Promise.all([
        api.put('/users/settings/preferences', {
          dil: settingsForm.dil,
          para_birimi: settingsForm.para_birimi,
          olcu_birimi: settingsForm.olcu_birimi
        }),
        api.put('/users/settings/notifications', {
          telefon: settingsForm.telefon,
          email_bildirim_aktif: settingsForm.email_bildirim_aktif,
          sms_bildirim_aktif: settingsForm.sms_bildirim_aktif
        })
      ]);

      set({ isDirty: false });
      toast.success('Ayarlar Kaydedildi');
      closeSettings();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Ayarlar kaydedilemedi.');
    } finally {
      set({ isSaving: false });
    }
  },

  handleDeleteAccountIntent: async (navigate) => {
    const { deleteConfirmText } = get();

    if (deleteConfirmText.trim().toUpperCase() !== 'ONAYLIYORUM') {
      toast.error('Devam etmek icin ONAYLIYORUM yazmalisiniz.');
      return;
    }

    try {
      set({ isSaving: true });
      await api.delete('/users/settings/account');
      toast.success('Hesabiniz silindi.');
      localStorage.removeItem('token');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Hesap silinemedi.');
    } finally {
      set({ isSaving: false });
    }
  },

  handleLogout: (navigate) => {
    localStorage.clear();
    navigate('/login');
  }
}));

export default useAppStore;


