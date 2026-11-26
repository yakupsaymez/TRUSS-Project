import api from './api';

const cleanParams = (raw = {}) => {
  const params = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined && v !== null && v !== '') {
      params[k] = v;
    }
  }
  return params;
};

const zimmetService = {
  getZimmetler: async (params = {}) => {
    const response = await api.get('/zimmetler', { params: cleanParams(params) });
    return response.data;
  },

  getZimmetDetail: async (atamaId) => {
    const response = await api.get(`/zimmetler/${atamaId}`);
    return response.data;
  },

  createMuayene: async (atamaId, payload) => {
    const response = await api.post(`/zimmetler/${atamaId}/muayeneler`, payload);
    return response.data;
  },

  assignVehicle: async (assignData) => {
    const response = await api.post('/admin/assign', assignData);
    return response.data;
  },

  unassignVehicle: async (aracId) => {
    const response = await api.delete(`/admin/assign/${aracId}`);
    return response.data;
  },
};

export default zimmetService;
