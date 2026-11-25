import api from '@/services/api';

function cleanQueryParams(params = {}) {
  const cleaned = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'all' || value === 'tum') {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

const isEmriService = {
  getIsEmirleri: async (params = {}) => {
    const response = await api.get('/is-emirleri', { params: cleanQueryParams(params) });
    return response.data;
  },

  createIsEmri: async (payload) => {
    const response = await api.post('/is-emirleri', payload);
    return response.data;
  },

  updateIsEmri: async (id, payload) => {
    const response = await api.patch(`/is-emirleri/${id}`, payload);
    return response.data;
  },

  completeIsEmri: async (id, payload) => {
    const response = await api.post(`/is-emirleri/${id}/tamamla`, payload);
    return response.data;
  },

  cancelIsEmri: async (id, payload = {}) => {
    const response = await api.post(`/is-emirleri/${id}/iptal`, payload);
    return response.data;
  },
};

export default isEmriService;
