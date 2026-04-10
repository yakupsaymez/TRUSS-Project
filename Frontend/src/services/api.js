import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Backend'in ana kapısı
});

// 1. İSTEK (REQUEST) MÜFETTİŞİ: Giden her kuryenin cebine Token koyar.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 2. CEVAP (RESPONSE) MÜFETTİŞİ: Gelen cevapları denetler.
api.interceptors.response.use(
    (response) => {
        // Her şey yolundaysa paketi içeri al.
        return response;
    },
    (error) => {
        // Eğer hata 401 (Yetkisiz) veya 403 (Yasaklı) ise:
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.warn("🚨 Şantiye Güvenliği: Kimlik süresi doldu, dışarı atılıyorsunuz.");

            // Çürümüş token'ı temizle
            localStorage.removeItem('token');

            // React dışı bir dosyada olduğumuz için useNavigate kullanamayız, bu yüzden doğrudan window objesiyle yönlendiriyoruz.
            window.location.href = '/login';
        }

        // Hatayı sayfaya da ilet (formda uyarı göstermek istersek diye)
        return Promise.reject(error);
    }
);

export default api;