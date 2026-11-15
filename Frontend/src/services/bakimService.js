import api from '@/services/api';

const bakimService = {
    getAllBakimlar: async () => {
        const response = await api.get('/bakimlar');
        return response.data;
    },

    getBakimlarByArac: async (aracId) => {
        const response = await api.get(`/bakimlar/arac/${aracId}`);
        return response.data;
    },

    bakimEkle: async (bakimVerisi) => {
        const response = await api.post('/bakimlar', bakimVerisi);
        return response.data;
    },

    bakimGuncelle: async (bakimId, bakimVerisi) => {
        const response = await api.put(`/bakimlar/${bakimId}`, bakimVerisi);
        return response.data;
    },

    bakimSil: async (bakimId) => {
        const response = await api.delete(`/bakimlar/${bakimId}`);
        return response.data;
    }
};

export default bakimService;
