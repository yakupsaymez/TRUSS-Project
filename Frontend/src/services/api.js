import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5001/api', // Backend'in ana kapısı
});

// 1. İSTEK (REQUEST) MÜFETTİŞİ: Giden her isteğe Bearer token ekler.
// Not: useAuthStore token'ı localStorage ile senkron tutar; store'u import etmek döngüsel bağımlılık yaratacağı için buradan okunur.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const AUTH_ENDPOINTS = ['/users/login', '/users/register'];

// 2. CEVAP (RESPONSE) MÜFETTİŞİ: Gelen cevapları denetler.
api.interceptors.response.use(
    (response) => {
        // Her şey yolundaysa paketi içeri al.
        return response;
    },
    (error) => {
        const status = error.response?.status;
        const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => error.config?.url?.includes(path));

        // Login/Register'daki 401 "hatalı şifre" demektir; yönlendirme yapılmaz, hata forma iletilir.
        if (!isAuthEndpoint && (status === 401 || status === 403)) {
            console.warn("🚨 Şantiye Güvenliği: Kimlik süresi doldu, dışarı atılıyorsunuz.");

            // Çürümüş oturumu temizle
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // React dışı bir dosyada olduğumuz için useNavigate kullanamayız, bu yüzden doğrudan window objesiyle yönlendiriyoruz.
            window.location.href = '/login';
        }

        // Hatayı sayfaya da ilet (formda uyarı göstermek istersek diye)
        return Promise.reject(error);
    }
);

export default api;