import api from './api';

const katalogService = {
  getKategoriler: async () => {
    const response = await api.get('/katalog/kategoriler');
    return response.data?.kategoriler || [];
  },

  getMarkalar: async (kategori_id) => {
    const params = kategori_id ? { kategori_id } : {};
    const response = await api.get('/katalog/markalar', { params });
    return response.data?.markalar || [];
  },

  getModeller: async (marka_id, kategori_id) => {
    if (!marka_id) return [];
    const params = { marka_id };
    if (kategori_id) params.kategori_id = kategori_id;
    const response = await api.get('/katalog/modeller', { params });
    return response.data?.modeller || [];
  },

  getVaryantlar: async (model_id) => {
    if (!model_id) return [];
    const response = await api.get('/katalog/varyantlar', {
      params: { model_id },
    });
    return response.data?.varyantlar || [];
  },
};

export default katalogService;

