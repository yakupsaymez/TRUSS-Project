const pad2 = (n) => String(n).padStart(2, '0');

// Yerel saat dilimine göre YYYY-MM-DD (UTC kaymasından etkilenmez; gece 00:00-03:00 hatası yok)
export const toLocalIsoDate = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const getTodayIso = () => toLocalIsoDate(new Date());

// 'YYYY-MM-DD' (veya ISO timestamp) değerine yıl ekler; 29 Şubat -> 28 Şubat güvenli.
export const addYearsToIso = (isoLike, years = 1) => {
  const [y, m, d] = String(isoLike).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const lastDay = new Date(y + years, m, 0).getDate();
  return `${y + years}-${pad2(m)}-${pad2(Math.min(d, lastDay))}`;
};
