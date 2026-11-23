import api from '@/services/api';

const raporService = {
    getGenelOzet: async () => {
        const response = await api.get('/raporlar/genel-ozet');
        return response.data;
    },

    getAylikHarcamaTrendi: async () => {
        const response = await api.get('/raporlar/aylik-trend');
        return response.data;
    },

    getAracMaliyetDagilimi: async () => {
        const response = await api.get('/raporlar/arac-maliyet');
        return response.data;
    },

    // Geriye donuk uyumluluk (Dashboard.js)
    getAracGiderleri: async () => {
        const response = await api.get('/raporlar/arac-giderleri');
        return response.data;
    },

    getAylikOzet: async () => {
        const response = await api.get('/raporlar/aylik-ozet');
        return response.data;
    },

    getButceAnalizi: async () => (await api.get('/raporlar/butce')).data,

    updateButceHedefi: async (payload) => (await api.put('/raporlar/butce', payload)).data,
};

export default raporService;
