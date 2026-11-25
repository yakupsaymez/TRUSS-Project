import api from '@/services/api';

const aracService = {
    // Kullanıcının araçlarını getirir (varsayılan: aktif araçlar)
    getAraclar: async ({ arsiv } = {}) => {
        const response = await api.get('/araclar', arsiv ? { params: { arsiv } } : undefined);
        return response.data;
    },

    // Araç Ekleme fonksiyonu
    aracEkle: async (aracVerisi) => {
        const response = await api.post('/araclar/ekle', aracVerisi);
        return response.data;
    },

    // Aracı soft-arşivler
    archiveArac: async (id, arsiv_nedeni) =>
        (await api.patch(`/araclar/${id}/arsiv`, arsiv_nedeni ? { arsiv_nedeni } : {})).data,

    // Arşivlenmiş aracı geri yükler
    restoreArac: async (id) => (await api.patch(`/araclar/${id}/geri-yukle`)).data,

    // Araç Silme / Arşivleme fonksiyonu
    deleteArac: async (id, { arsiv_nedeni } = {}) =>
        (await api.delete(`/araclar/${id}`, arsiv_nedeni ? { data: { arsiv_nedeni } } : undefined)).data,

    // Geriye dönük uyumluluk için alias
    aracSil: async (id, opts) => aracService.deleteArac(id, opts),

    // Araç Güncelleme fonksiyonu
    aracGuncelle: async (id, aracVerisi) => {
        const response = await api.put(`/araclar/${id}`, aracVerisi);
        return response.data;
    },

    // Araç Konum (Check-In) Güncelleme fonksiyonu
    aracKonumGuncelle: async (aracId, payload) => (await api.put(`/araclar/${aracId}/konum`, payload)).data,
};

export default aracService;
