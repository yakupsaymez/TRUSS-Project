const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
export const EVRAK_UYARI_GUN = 15;
const VARSAYILAN_KM_PERIYODU = 15000;
const VARSAYILAN_SMH_PERIYODU = 250;
const UYARI_ORANI = 0.1; // Periyodun son %10'u "yaklaşıyor" kabul edilir

const sayi = (deger) => {
  const n = Number(deger);
  return Number.isFinite(n) ? n : null;
};

export const isSmhArac = (arac) => arac?.sayac_tipi === 'SMH';

export const getSayacBirimi = (arac) => (isSmhArac(arac) ? 'saat' : 'km');

export const getBakimPeriyodu = (arac) => {
  const backend = sayi(arac?.bakim_periyodu);
  if (backend && backend > 0) return backend;
  if (isSmhArac(arac)) {
    const smh = sayi(arac?.calisma_saati_bakim);
    return smh && smh > 0 ? smh : VARSAYILAN_SMH_PERIYODU;
  }
  const km = sayi(arac?.onerilen_bakim_km);
  return km && km > 0 ? km : VARSAYILAN_KM_PERIYODU;
};

export const getGuncelSayac = (arac) => {
  const backend = sayi(arac?.guncel_sayac);
  if (backend !== null) return backend;
  return (isSmhArac(arac) ? sayi(arac?.guncel_calisma_saati) : sayi(arac?.guncel_km)) || 0;
};

/**
 * Aracın periyodik bakım durumunu, kendi varyant periyoduna (onerilen_bakim_km / calisma_saati_bakim) göre hesaplar.
 * @returns {{ durum: 'tehlike'|'uyari'|'sorunsuz'|'bilinmiyor', kalan: number|null, periyot: number, birim: string }}
 */
export const hesaplaBakimDurumu = (arac) => {
  const periyot = getBakimPeriyodu(arac);
  const birim = getSayacBirimi(arac);
  const sonBakim = sayi(arac?.son_bakim_km);

  if (sonBakim === null) {
    return { durum: 'bilinmiyor', kalan: null, periyot, birim };
  }

  const kalan = sonBakim + periyot - getGuncelSayac(arac);
  if (kalan <= 0) return { durum: 'tehlike', kalan, periyot, birim };
  if (kalan <= periyot * UYARI_ORANI) return { durum: 'uyari', kalan, periyot, birim };
  return { durum: 'sorunsuz', kalan, periyot, birim };
};

export const parseLocalMidnight = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();
  const pureDate = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDate) {
    return new Date(Number(pureDate[1]), Number(pureDate[2]) - 1, Number(pureDate[3]));
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const hesaplaKalanGun = (tarih, referans = new Date()) => {
  const hedef = parseLocalMidnight(tarih);
  if (!hedef) return null;
  const bugun = new Date(referans.getFullYear(), referans.getMonth(), referans.getDate());
  return Math.round((hedef.getTime() - bugun.getTime()) / MILLISECONDS_IN_DAY);
};

export const evrakRiskliMi = (arac, gun = EVRAK_UYARI_GUN) => {
  const bugun = new Date();
  return [arac?.muayene_tarihi, arac?.kasko_tarihi, arac?.sigorta_tarihi].some((t) => {
    const kalanGun = hesaplaKalanGun(t, bugun);
    return kalanGun !== null && kalanGun <= gun;
  });
};

export const ozetleFilo = (araclar = []) =>
  araclar.reduce(
    (acc, arac) => {
      const { durum } = hesaplaBakimDurumu(arac);
      if (durum === 'tehlike') {
        acc.tehlike += 1;
        acc.tehlikeIdler.push(arac.arac_id);
      } else if (durum === 'uyari') {
        acc.uyari += 1;
        acc.uyariIdler.push(arac.arac_id);
      } else if (durum === 'sorunsuz') {
        acc.sorunsuz += 1;
      } else {
        acc.bilinmiyor += 1;
      }
      if (evrakRiskliMi(arac)) {
        acc.evrakSorunu += 1;
        acc.evrakIdler.push(arac.arac_id);
      }
      [arac?.muayene_tarihi, arac?.kasko_tarihi, arac?.sigorta_tarihi].forEach((t) => {
        if (hesaplaKalanGun(t) === null) acc.eksikBelgeSayisi += 1;
        else acc.tanimliBelgeSayisi += 1;
      });
      acc.gelecekAyTahmin += Number(arac?.son_30_gun_yakit_tutari) || 0;
      return acc;
    },
    {
      tehlike: 0,
      uyari: 0,
      sorunsuz: 0,
      bilinmiyor: 0,
      evrakSorunu: 0,
      eksikBelgeSayisi: 0,
      tanimliBelgeSayisi: 0,
      gelecekAyTahmin: 0,
      tehlikeIdler: [],
      uyariIdler: [],
      evrakIdler: [],
    }
  );
