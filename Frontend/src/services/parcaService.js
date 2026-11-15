import api from '@/services/api';

const parcaService = {
    // Kullanicinin tum parca takip kayitlarini getirir.
    getAllParcalar: async () => {
        const response = await api.get('/parcalar');
        return response.data;
    },

    // Aracin tum parca takip kayitlarini getirir.
    getParcalarByArac: async (aracId) => {
        const response = await api.get(`/parcalar/arac/${aracId}`);
        return response.data;
    },

    // Yeni bir parcayi takibe alir.
    parcaEkle: async (veriler) => {
        const response = await api.post('/parcalar', veriler);
        return response.data;
    },

    // Parca takip kaydini gunceller.
    parcaGuncelle: async (parcaId, veriler) => {
        const response = await api.put(`/parcalar/${parcaId}`, veriler);
        return response.data;
    },

    // Parca takip kaydini siler.
    parcaSil: async (parcaId) => {
        const response = await api.delete(`/parcalar/${parcaId}`);
        return response.data;
    }
};

export default parcaService;
