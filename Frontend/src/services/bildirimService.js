import api from '@/services/api';

const bildirimService = {
  getBildirimler: async (params = {}) => {
    const response = await api.get('/bildirimler', { params });
    return response.data;
  },

  getAksiyonMerkezi: async () => {
    const response = await api.get('/bildirimler/aksiyon-merkezi');
    return response.data;
  },

  markOkundu: async (id) => {
    const response = await api.patch(`/bildirimler/${id}/okundu`);
    return response.data;
  },

  markTumunuOkundu: async () => {
    const response = await api.patch('/bildirimler/tumunu-oku');
    return response.data;
  },
};

export default bildirimService;
