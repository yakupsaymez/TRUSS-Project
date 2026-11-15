import api from '@/services/api';

const authService = {
    // Kayıt Olma
    register: async (userData) => {
        // BAŞ MİMAR NOTU: Buradaki adres /users olmalı (api.js zaten /api ekliyor)
        const response = await api.post('/users/register', userData);
        return response.data;
    },

    // Giriş Yapma (token kalıcılığı useAuthStore tarafından yönetilir)
    login: async (credentials) => {
        const response = await api.post('/users/login', credentials);
        return response.data;
    },
};

export default authService;