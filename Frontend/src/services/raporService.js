import api from './api';

const raporService = {
    getAracGiderleri: async () => {
        const response = await api.get('/raporlar/arac-giderleri');
        return response.data;
    },
    getAylikOzet: async () => {
        const response = await api.get('/raporlar/aylik-ozet');
        return response.data;
    },
};

export default raporService;
