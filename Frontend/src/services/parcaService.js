import api from '@/services/api';

const parcaService = {
    // Aracin tum parca takip kayitlarini getirir.
    getParcalarByArac: async (aracId) => {
        const response = await api.get(`/parca-takip/arac/${aracId}`);
        return response.data;
    },

    // Parcanin son degisim km/tarih bilgilerini gunceller.
    parcaGuncelle: async (parcaId, veriler) => {
        const response = await api.put(`/parca-takip/${parcaId}`, veriler);
        return response.data;
    },

    // Yeni bir parcayi takibe alir.
    parcaEkle: async (veriler) => {
        const response = await api.post('/parca-takip', veriler);
        return response.data;
    }
};

export default parcaService;

