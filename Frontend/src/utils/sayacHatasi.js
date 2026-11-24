// Backend 422 sayaç hata sözleşmesi (tüm biçimlerde `sayac_tipi` ve `birim` ('km' | 'saat') bulunur):
//   Parça:            { message, guncel_sayac, sayac_tipi, birim }
//   Bakım/Yakıt PUT:  { message, alt_sinir, ust_sinir (null olabilir), sayac_tipi, birim }
//   Araç PUT:         { message, max_kayitli_sayac, sayac_tipi, birim }

const SAYAC_ALANLARI = [
  'guncel_sayac',
  'alt_sinir',
  'ust_sinir',
  'max_kayitli_sayac',
  'sayac_tipi',
  'birim',
];

const sayiFormati = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

const sayiOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const fmt = (n) => sayiFormati.format(n);

// 422 sayaç hatası değilse null döner (çağıran taraf toast'a düşer).
export function parseSayacHatasi(err) {
  const res = err?.response;
  if (!res || res.status !== 422) return null;

  const d = res.data && typeof res.data === 'object' ? res.data : {};
  if (!SAYAC_ALANLARI.some((k) => d[k] !== undefined)) return null;

  const birim =
    d.birim === 'saat' || d.birim === 'km' ? d.birim : d.sayac_tipi === 'SMH' ? 'saat' : 'km';

  const alt = sayiOrNull(d.alt_sinir);
  const ust = sayiOrNull(d.ust_sinir);
  const maxKayitli = sayiOrNull(d.max_kayitli_sayac);
  const guncel = sayiOrNull(d.guncel_sayac);

  let ipucu = null;
  if (alt !== null && ust !== null) {
    ipucu = `İzin verilen aralık: ${fmt(alt)} – ${fmt(ust)} ${birim}`;
  } else if (alt !== null) {
    ipucu = `En az ${fmt(alt)} ${birim}`;
  } else if (ust !== null) {
    ipucu = `En fazla ${fmt(ust)} ${birim}`;
  } else if (maxKayitli !== null) {
    ipucu = `En az ${fmt(maxKayitli)} ${birim}`;
  } else if (guncel !== null) {
    ipucu = `En fazla ${fmt(guncel)} ${birim}`;
  }

  return {
    alanHatasi: d.message || 'Girilen sayaç değeri geçersiz.',
    ipucu,
  };
}

// Aracın sayaç tipine göre birim: SMH → 'saat', diğerleri → 'km'. (Araç yoksa 'km')
export const isSmhArac = (arac) =>
  arac?.sayac_tipi === 'SMH' || Number(arac?.calisma_saati_bakim) > 0;

export const getSayacBirimi = (arac) => (isSmhArac(arac) ? 'saat' : 'km');

// Mevcut Chrono arayüzündeki büyük harfli etiket: 'KM' | 'SMH'
export const getSayacBirimEtiketi = (arac) => (isSmhArac(arac) ? 'SMH' : 'KM');

// Ekran okuyucu bağlantısı: input'a yayılır → <input {...sayacAria(hata, 'id')} />
export const sayacAria = (hata, hataId) =>
  hata ? { 'aria-invalid': true, 'aria-describedby': hataId } : {};
