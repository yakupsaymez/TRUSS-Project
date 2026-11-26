import api from '@/services/api';

const belgeService = {
  requestUploadUrl: async (payload) => {
    const response = await api.post('/belgeler/yukleme-url', payload);
    return response.data;
  },

  uploadToPresignedUrl: async ({ url, method = 'PUT', headers = {}, file, signal }) => {
    const response = await fetch(url, {
      method,
      headers,
      body: file,
      credentials: 'omit',
      signal,
    });
    if (!response.ok) {
      let message = `Belge yükleme başarısız (${response.status}).`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // XML/boş S3 cevabı — varsayılan hata mesajı korunur
      }
      throw new Error(message);
    }
    return true;
  },

  bindDocument: async (belgeId, payload) => {
    const response = await api.post(`/belgeler/${belgeId}/bagla`, payload);
    return response.data;
  },

  listDocuments: async (params = {}) => {
    const response = await api.get('/belgeler', { params });
    return response.data;
  },

  getAccessUrlById: async (belgeId, disposition = 'inline') => {
    const indir = disposition === 'attachment';
    const response = await api.get(`/belgeler/${belgeId}/erisim`, { params: { indir } });
    return response.data;
  },

  getAccessUrlByKey: async (anahtar, disposition = 'inline') => {
    const indir = disposition === 'attachment';
    const response = await api.get('/belgeler/erisim', { params: { anahtar, indir } });
    return response.data;
  },

  deleteDocument: async (belgeId) => {
    const response = await api.delete(`/belgeler/${belgeId}`);
    return response.data;
  },

  openUrlSafely: (url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
      return false;
    }
    window.open(url.trim(), '_blank', 'noopener,noreferrer');
    return true;
  },
};

export default belgeService;
