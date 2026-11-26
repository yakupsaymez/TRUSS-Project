import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL: 'http://localhost:5001/api', // Backend'in ana kapısı
});

let lastRequestId = null;

export function getLastRequestId() {
    return lastRequestId;
}

function captureRequestId(headers, data) {
    const reqId = headers?.['x-request-id'] || data?.requestId || null;
    if (typeof reqId === 'string' && reqId.trim()) {
        lastRequestId = reqId.trim();
    }
}

// 1. İSTEK (REQUEST) MÜFETTİŞİ: Giden her isteğe Bearer token ekler.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const AUTH_ENDPOINTS = ['/users/login', '/users/register', '/users/settings/password'];

// Aynı anda birden fazla 401/ACCOUNT_DISABLED gelirse yalnızca TEK yönlendirme yapılır.
let isRedirecting = false;

function clearSessionAndRedirect(reasonExpired) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const isOnLogin = window.location.pathname.startsWith('/login');
    if (!isOnLogin && !isRedirecting) {
        isRedirecting = true;
        window.location.href = reasonExpired ? '/login?reason=expired' : '/login';
    }
}

// 2. CEVAP (RESPONSE) MÜFETTİŞİ: Gelen cevapları denetler.
api.interceptors.response.use(
    (response) => {
        captureRequestId(response?.headers, response?.data);
        return response;
    },
    (error) => {
        captureRequestId(error.response?.headers, error.response?.data);
        const status = error.response?.status;
        const data = error.response?.data;
        const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => error.config?.url?.includes(path));

        // 401 = oturum geçersiz. Login/Register'daki 401 "hatalı şifre" demektir; forma iletilir.
        if (status === 401 && !isAuthEndpoint) {
            clearSessionAndRedirect(data?.code === 'TOKEN_EXPIRED');
        }

        // 403 ACCOUNT_DISABLED = hesap devre dışı bırakıldı; oturumu temizle ve girişe yönlendir.
        if (status === 403 && data?.code === 'ACCOUNT_DISABLED') {
            clearSessionAndRedirect(true);
            return Promise.reject(error);
        }

        // 403 = yetki yok. Oturuma DOKUNMA; yalnızca kullanıcıyı bilgilendir.
        if (status === 403 && !error.config?.silent403) {
            toast.error(data?.message || 'Bu işlem için yetkiniz yok.', { id: 'forbidden' });
        }

        return Promise.reject(error);
    }
);

export default api;
