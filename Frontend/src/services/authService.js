import api from '@/services/api';

const authService = {
    // Kayıt Olma
    register: async (userData) => {
        // BAŞ MİMAR NOTU: Buradaki adres /users olmalı (api.js zaten /api ekliyor)
        const response = await api.post('/users/register', userData);
        return response.data;
    },

    // Giriş Yapma
    login: async (credentials) => {
        const response = await api.post('/users/login', credentials);
        // Eğer giriş başarılıysa token'ı saklıyoruz
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    },

    // Çıkış Yapma
    logout: () => {
        localStorage.removeItem('token');
    }
};

export default authService;