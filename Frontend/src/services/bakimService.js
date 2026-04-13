import api from '@/services/api';

const bakimService = {
    getBakimlarByArac: async (aracId) => {
        const response = await api.get(`/bakimlar/arac/${aracId}`);
        return response.data;
    },

    bakimEkle: async (bakimVerisi) => {
        const response = await api.post('/bakimlar', bakimVerisi);
        return response.data;
    },

    bakimSil: async (bakimId) => {
        const response = await api.delete(`/bakimlar/${bakimId}`);
        return response.data;
    }
};

export default bakimService;

