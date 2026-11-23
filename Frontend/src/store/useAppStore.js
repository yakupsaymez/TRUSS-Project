import { create } from 'zustand';
import api from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';

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

const useAppStore = create((set) => ({
  settingsForm: defaultSettingsForm,

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
      // Keep defaults when summary fetch fails.
    }
  },

  handleLogout: (navigate) => {
    useAuthStore.getState().logout();
    useVehicleStore.getState().reset();
    localStorage.clear();
    navigate('/login');
  }
}));

export default useAppStore;
