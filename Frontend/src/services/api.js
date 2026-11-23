import axios from 'axios';
import toast from 'react-hot-toast';

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

const AUTH_ENDPOINTS = ['/users/login', '/users/register', '/users/settings/password'];

// Aynı anda birden fazla 401 gelirse yalnızca TEK yönlendirme yapılır (sayfa yenilenince sıfırlanır).
let isRedirecting = false;

// 2. CEVAP (RESPONSE) MÜFETTİŞİ: Gelen cevapları denetler.
api.interceptors.response.use(
    (response) => {
        // Her şey yolundaysa paketi içeri al.
        return response;
    },
    (error) => {
        const status = error.response?.status;
        const data = error.response?.data;
        const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => error.config?.url?.includes(path));

        // 401 = oturum geçersiz. Login/Register'daki 401 "hatalı şifre" demektir; forma iletilir.
        if (status === 401 && !isAuthEndpoint) {
            // Çürümüş oturumu temizle
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Zaten /login'deysek yönlendirme yapma (sonsuz döngü engeli); tek yönlendirme bayrağı.
            const isOnLogin = window.location.pathname.startsWith('/login');
            if (!isOnLogin && !isRedirecting) {
                isRedirecting = true;
                // React dışı dosyada olduğumuz için useNavigate yerine window.location kullanılır.
                window.location.href =
                    data?.code === 'TOKEN_EXPIRED' ? '/login?reason=expired' : '/login';
            }
        }

        // 403 = yetki yok. Oturuma DOKUNMA; yalnızca kullanıcıyı bilgilendir.
        // Arka plan istekleri `silent403: true` ile toast'ı kapatabilir.
        if (status === 403 && !error.config?.silent403) {
            toast.error(data?.message || 'Bu işlem için yetkiniz yok.', { id: 'forbidden' });
        }

        // Hatayı sayfaya da ilet
        return Promise.reject(error);
    }
);

export default api;