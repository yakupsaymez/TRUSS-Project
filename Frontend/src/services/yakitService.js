import api from '@/services/api';

const yakitService = {
    getYakitlarByArac: async (aracId) => {
        const response = await api.get(`/yakitlar/arac/${aracId}`);
        return response.data;
    },

    yakitEkle: async (yakitVerisi) => {
        const response = await api.post('/yakitlar', yakitVerisi);
        return response.data;
    },

    yakitSil: async (yakitId) => {
        const response = await api.delete(`/yakitlar/${yakitId}`);
        return response.data;
    }
};

export default yakitService;

