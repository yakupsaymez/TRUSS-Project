import api from '@/services/api';

const denetimService = {
  getDenetimKayitlari: async ({
    eylem,
    varlik_tipi,
    baslangic,
    bitis,
    limit = 25,
    offset = 0,
  } = {}) => {
    const params = { limit, offset };
    if (eylem && eylem !== 'all') params.eylem = eylem;
    if (varlik_tipi && varlik_tipi !== 'all') params.varlik_tipi = varlik_tipi;
    if (baslangic) params.baslangic = baslangic;
    if (bitis) params.bitis = bitis;
    const response = await api.get('/denetim-kayitlari', { params });
    return response.data;
  },
};

export default denetimService;
