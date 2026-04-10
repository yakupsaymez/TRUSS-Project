import api from './api';

const aracService = {
    // Kullanıcının tüm araçlarını getirir
    getAraclar: async () => {
        const response = await api.get('/araclar'); // Backend'deki rotana göre burayı değiştirebiliriz
        return response.data;
    },

    // Araç Ekleme fonksiyonu
    aracEkle: async (aracVerisi) => {
        const response = await api.post('/araclar/ekle', aracVerisi);
        return response.data;
    },

    // Araç Silme fonksiyonu
    aracSil: async (id) => {
        const response = await api.delete(`/araclar/${id}`);
        return response.data;
    }
};

export default aracService;
