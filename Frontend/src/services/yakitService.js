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
    },

    getYakitAnomalileri: async ({ durum, arac_id, tip, limit } = {}) => {
        const params = {};
        if (durum !== undefined && durum !== null && durum !== '') params.durum = durum;
        if (arac_id !== undefined && arac_id !== null && arac_id !== '') params.arac_id = arac_id;
        if (tip !== undefined && tip !== null && tip !== '') params.tip = tip;
        if (limit !== undefined && limit !== null && limit !== '') params.limit = limit;
        const response = await api.get('/yakitlar/anomaliler', { params });
        return response.data;
    },

    updateYakitAnomali: async (id, { durum, inceleme_notu }) => {
        const response = await api.patch(`/yakitlar/anomaliler/${id}`, {
            durum,
            inceleme_notu,
        });
        return response.data;
    },

    taraYakitAnomalileri: async () => {
        const response = await api.post('/yakitlar/anomaliler/tara');
        return response.data;
    }
};

export default yakitService;
