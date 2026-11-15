import api from '@/services/api';

const yakitService = {
    getAllYakitlar: async () => {
        const response = await api.get('/yakitlar');
        return response.data;
    },

    getYakitlarByArac: async (aracId) => {
        const response = await api.get(`/yakitlar/arac/${aracId}`);
        return response.data;
    },

    yakitEkle: async (yakitVerisi) => {
        const response = await api.post('/yakitlar', yakitVerisi);
        return response.data;
    },

    yakitGuncelle: async (yakitId, yakitVerisi) => {
        const response = await api.put(`/yakitlar/${yakitId}`, yakitVerisi);
        return response.data;
    },

    yakitSil: async (yakitId) => {
        const response = await api.delete(`/yakitlar/${yakitId}`);
        return response.data;
    }
};

export default yakitService;
