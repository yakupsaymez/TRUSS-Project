import api from '@/services/api';

function cleanQueryParams(params = {}) {
    return Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
}

function parseFilenameFromDisposition(disposition, fallback) {
    if (!disposition || typeof disposition !== 'string') return fallback;
    const utf8Match = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''));
        } catch {
            return fallback;
        }
    }
    const match = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
    return match?.[1]?.trim() || fallback;
}

function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function parseBlobError(err) {
    const blob = err?.response?.data;
    if (!(blob instanceof Blob)) return err;
    try {
        const parsed = JSON.parse(await blob.text());
        const wrapped = new Error(parsed?.message || 'CSV dışa aktarma başarısız.');
        wrapped.code = parsed?.code;
        wrapped.response = { ...err.response, data: parsed };
        return wrapped;
    } catch {
        const wrapped = new Error('CSV dışa aktarma sırasında beklenmeyen bir hata oluştu.');
        wrapped.response = err?.response;
        return wrapped;
    }
}

async function downloadCsv(path, params, fallbackFilename) {
    try {
        const response = await api.get(path, {
            params: cleanQueryParams(params),
            responseType: 'blob',
        });
        const headers = response.headers || {};
        const filename = parseFilenameFromDisposition(headers['content-disposition'], fallbackFilename);
        const blob = response.data instanceof Blob
            ? response.data
            : new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        triggerBlobDownload(blob, filename);
        const countNum = Number(headers['x-export-count']);
        const limitNum = Number(headers['x-export-limit']);
        return {
            truncated: String(headers['x-export-truncated'] || '').toLowerCase() === 'true',
            count: Number.isFinite(countNum) ? countNum : null,
            limit: Number.isFinite(limitNum) ? limitNum : null,
            filename,
        };
    } catch (err) {
        throw await parseBlobError(err);
    }
}

const raporService = {
    getGenelOzet: async () => (await api.get('/raporlar/genel-ozet')).data,
    getAylikHarcamaTrendi: async () => (await api.get('/raporlar/aylik-trend')).data,
    getAracMaliyetDagilimi: async () => (await api.get('/raporlar/arac-maliyet')).data,
    getButceAnalizi: async () => (await api.get('/raporlar/butce')).data,
    getTcoAnalizi: async (donemGun = 90) => (
        await api.get('/raporlar/tco-analizi', { params: { donem_gun: donemGun } })
    ).data,
    updateButceHedefi: async (payload) => (await api.put('/raporlar/butce', payload)).data,
    exportFiloMaliyetCsv: (params = {}) => downloadCsv('/raporlar/export/filo-maliyet', params, 'filo-maliyet.csv'),
    exportHareketlerCsv: (params = {}) => downloadCsv('/raporlar/export/hareketler', params, 'hareketler.csv'),
    exportIsEmirleriCsv: (params = {}) => downloadCsv('/raporlar/export/is-emirleri', params, 'is-emirleri.csv'),
};

export default raporService;
