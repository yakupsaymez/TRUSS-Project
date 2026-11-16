import toast from 'react-hot-toast';

export const getErrorStatus = (err) => err?.response?.status ?? null;

// api.js her 403'te kendi toast'unu (id: 'forbidden') gösterir; burada ikinci bir uyarı basılmaz.
// Backend mesajı her zaman önceliklidir; yoksa duruma özel metin, o da yoksa genel metin kullanılır.
export function notifyApiError(err, fallback, byStatus = {}) {
  const status = getErrorStatus(err);
  if (status === 403) return;
  const message = err?.response?.data?.message || byStatus[status] || fallback;
  toast.error(message);
}
