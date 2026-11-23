import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useVehicleStore from '@/store/useVehicleStore';
import yakitService from '@/services/yakitService';
import bakimService from '@/services/bakimService';
import parcaService from '@/services/parcaService';
import aracService from '@/services/aracService';
import { getTodayIso, addYearsToIso } from '@/utils/dateUtils';
import { formatCurrency, formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { notifyApiError } from '@/utils/apiError';
import {
  parseSayacHatasi,
  getSayacBirimEtiketi,
  sayacAria,
  sayacInputSinifi,
} from '@/utils/sayacHatasi';
import SayacHatasi from './SayacHatasi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Fuel,
  Wrench,
  Cog,
  FileWarning,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Trash2,
  Gauge,
  Compass,
  History,
  CornerDownLeft,
  CalendarCheck2,
  FileText,
} from 'lucide-react';

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

const YAKIT_TIPLERI = ['Dizel', 'Benzin', 'LPG', 'Elektrik', 'Diğer'];

const ISLEM_TURLERI = [
  'Periyodik Bakım',
  'Yağ & Filtre Bakımı',
  'Fren Sistemi Bakımı',
  'Triger & Ağır Bakım',
  'Arıza & Mekanik Onarım',
  'Lastik & Rot Balans',
  'Kaporta & Boya',
  'Akü & Elektrik',
  'Muayene & Resmi Evrak',
  'Diğer Servis',
];

const FALLBACK_FUTURE = [
  {
    id: 'sim-fut-1',
    zamanKusagi: 'GELECEK',
    tip: 'EVRAK',
    plaka: '34 TRS 001',
    aracEtiket: 'Mercedes-Benz Actros 1848',
    baslik: 'Kasko & Trafik Sigortası Yenileme Ufku',
    zamanMetni: '12 Gün Sonra',
    tutar: 24500,
    sayac: 148200,
    aciklama: 'Yıllık poliçe vadesi doluyor. Simülasyon bütçesi geçen yılki prim üzerinden hesaplandı.',
  },
  {
    id: 'sim-fut-2',
    zamanKusagi: 'GELECEK',
    tip: 'BAKIM',
    plaka: '06 FL 404',
    aracEtiket: 'Ford Transit 350L',
    baslik: 'Periyodik 15.000 KM Yağ & Filtre Eşiğine Yaklaşıyor',
    zamanMetni: 'Tahmini 19 Gün Sonra (850 KM Kaldı)',
    tutar: 8200,
    sayac: 149150,
    aciklama: 'Günlük ortalama 45 KM sürüş hızıyla 19 gün içinde servis eşiğine ulaşılacak.',
  },
];

const FALLBACK_PAST = [
  {
    id: 'sim-past-1',
    zamanKusagi: 'GECMIS',
    tip: 'YAKIT',
    yakit_tipi: 'Dizel',
    plaka: '34 TRS 001',
    aracEtiket: 'Mercedes-Benz Actros 1848',
    baslik: 'Dizel Yakıt İkmali • 280,00 L',
    zamanMetni: 'Bugün',
    tutar: 12040,
    litre: 280,
    sayac: 148200,
    fatura_bilgisi: 'FT-2026-0891',
    notlar: 'İstasyon telemetri kaydı',
    aciklama: 'Birim maliyet: 43,00 ₺/L • Fatura: FT-2026-0891 • İstasyon telemetri kaydı.',
  },
  {
    id: 'sim-past-2',
    zamanKusagi: 'GECMIS',
    tip: 'BAKIM',
    islem_turu: 'Fren Sistemi Bakımı',
    plaka: '35 EGE 88',
    aracEtiket: 'Renault Clio 1.5 Blue dCi',
    baslik: 'Fren Sistemi Bakımı',
    zamanMetni: '4 Gün Önce',
    tutar: 5900,
    sayac: 89400,
    fatura_bilgisi: 'SRV-99412',
    notlar: 'Ön fren disk ve balata takımı yenilendi.',
    aciklama: 'Fatura: SRV-99412 • Ön fren disk ve balata takımı yenilendi.',
  },
];

// Doğal Dil "ŞİMDİ (NOW)" Komut Ayrıştırıcı (Tam Veri Seti Destekli)
// Yakıt Örneği: "34 ABC 123 Benzin 45L 1950TL 128000KM Fatura:FT-102"
// Bakım Örneği: "34 ABC 123 Arıza 6500TL 128000KM Alternatör revizyonu"
function parseNowStreamInput(rawText, araclar, seciliAracId) {
  const text = String(rawText || '').trim();
  const varsayilanArac =
    (seciliAracId !== 'tum'
      ? araclar.find((a) => String(a.arac_id) === String(seciliAracId))
      : null) || araclar[0] || null;

  if (!text) {
    return {
      islemTipi: 'YAKIT',
      yakit_tipi: 'Dizel',
      islem_turu: 'Periyodik Bakım',
      arac: varsayilanArac,
      plaka: varsayilanArac?.plaka || null,
      litre: null,
      tutar: null,
      km: null,
      fatura_bilgisi: '',
      notlar: '',
      aciklama: '',
      hazirMi: false,
    };
  }

  const plateMatch = text.match(/\b(\d{2}\s*[A-Za-zÇĞİÖŞÜçğıöşü]{1,3}\s*\d{2,5})\b/);
  const rawPlate = plateMatch ? plateMatch[1].toUpperCase().replace(/\s+/g, ' ').trim() : null;
  const compactPlate = rawPlate ? rawPlate.replace(/\s+/g, '') : '';

  const eslesenArac =
    (compactPlate
      ? araclar.find(
          (a) =>
            String(a.plaka || '')
              .toUpperCase()
              .replace(/\s+/g, '') === compactPlate
        )
      : null) || varsayilanArac;

  // Yakıt tipi NLP algılama (Dizel, Benzin, LPG, Elektrik)
  let algilananYakitTipi = 'Dizel';
  if (/\b(benzin|kurşunsuz|kursunsuz)\b/i.test(text)) {
    algilananYakitTipi = 'Benzin';
  } else if (/\b(lpg|otogaz)\b/i.test(text)) {
    algilananYakitTipi = 'LPG';
  } else if (/\b(elektrik|kwh|şarj|sarj)\b/i.test(text)) {
    algilananYakitTipi = 'Elektrik';
  } else if (/\b(dizel|mazot|motorin)\b/i.test(text)) {
    algilananYakitTipi = 'Dizel';
  }

  // Bakım / İşlem türü NLP algılama
  let algilananIslemTuru = 'Periyodik Bakım';
  if (/\b(arıza|ariza|onarım|onarim|tamir|mekanik)\b/i.test(text)) {
    algilananIslemTuru = 'Arıza & Mekanik Onarım';
  } else if (/\b(lastik|rot|balans|jant)\b/i.test(text)) {
    algilananIslemTuru = 'Lastik & Rot Balans';
  } else if (/\b(kaporta|boya|göçük|gocuk|cam)\b/i.test(text)) {
    algilananIslemTuru = 'Kaporta & Boya';
  } else if (/\b(fren|balata|disk)\b/i.test(text)) {
    algilananIslemTuru = 'Fren Sistemi Bakımı';
  } else if (/\b(triger|ağır bakım|agir bakim|baskı balata|debriyaj)\b/i.test(text)) {
    algilananIslemTuru = 'Triger & Ağır Bakım';
  } else if (/\b(yağ|yag|filtre)\b/i.test(text)) {
    algilananIslemTuru = 'Yağ & Filtre Bakımı';
  } else if (/\b(akü|aku|alternatör|marş|mars)\b/i.test(text)) {
    algilananIslemTuru = 'Akü & Elektrik';
  } else if (/\b(muayene|tüvtürk|tuvturk|egzoz)\b/i.test(text)) {
    algilananIslemTuru = 'Muayene & Resmi Evrak';
  }

  const isBakimKeyword =
    /\b(bakim|bakım|servis|tamir|onarım|onarim|arıza|ariza|fren|balata|yag|yağ|triger|lastik|kaporta|boya|akü|aku|rot|balans)\b/i.test(
      text
    );

  const litreMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|litre|kwh)\b/i);
  const litre = litreMatch ? parseLocaleNumber(litreMatch[1]) : null;

  const islemTipi = isBakimKeyword && !litre ? 'BAKIM' : 'YAKIT';

  const tutarMatch = text.match(/(\d+(?:[.,]\d+)*)\s*(?:tl|₺|lira)\b/i);
  const tutar = tutarMatch ? parseLocaleNumber(tutarMatch[1]) : null;

  const kmMatch = text.match(/(\d+(?:[.,]\d+)*)\s*(?:km|kilometre|smh|saat)\b/i);
  const km = kmMatch ? parseLocaleNumber(kmMatch[1]) : null;

  const faturaMatch = text.match(/\b(?:fatura|fiş|fis|belge|no)[:\s#-]*([A-Za-z0-9-_]+)\b/i);
  const faturaBilgisi = faturaMatch ? faturaMatch[1].trim() : '';

  let temizNot = text;
  if (plateMatch) temizNot = temizNot.replace(plateMatch[0], '');
  if (litreMatch) temizNot = temizNot.replace(litreMatch[0], '');
  if (tutarMatch) temizNot = temizNot.replace(tutarMatch[0], '');
  if (kmMatch) temizNot = temizNot.replace(kmMatch[0], '');
  if (faturaMatch) temizNot = temizNot.replace(faturaMatch[0], '');
  temizNot = temizNot
    .replace(/\b(yakit|yakıt|dizel|mazot|motorin|benzin|lpg|otogaz|elektrik|bakım|bakim|servis)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const hazirMi =
    islemTipi === 'YAKIT'
      ? Boolean((eslesenArac || rawPlate) && litre > 0 && tutar !== null && tutar > 0)
      : Boolean((eslesenArac || rawPlate) && tutar !== null && tutar > 0);

  return {
    islemTipi,
    yakit_tipi: algilananYakitTipi,
    islem_turu: algilananIslemTuru,
    arac: eslesenArac,
    plaka: eslesenArac?.plaka || rawPlate,
    litre,
    tutar,
    km,
    fatura_bilgisi: faturaBilgisi,
    notlar: temizNot,
    aciklama:
      temizNot ||
      (islemTipi === 'BAKIM' ? algilananIslemTuru : `${algilananYakitTipi} Yakıt İkmali`),
    hazirMi,
  };
}

// Notlar içinden fatura bilgisini ayrıştırma ve birleştirme yardımcıları
function cozumleNotVeFatura(rawNotlar, rawFatura) {
  const ham = String(rawNotlar || '').trim();
  if (rawFatura) {
    return { fatura_bilgisi: String(rawFatura).trim(), notlar: ham };
  }
  const match = ham.match(/^\[Fatura:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return { fatura_bilgisi: match[1].trim(), notlar: match[2].trim() };
  }
  return { fatura_bilgisi: '', notlar: ham };
}

function birlestirNotVeFatura(notlar, faturaBilgisi) {
  const temizNot = String(notlar || '').trim();
  const temizFatura = String(faturaBilgisi || '').trim();
  if (temizFatura && temizNot) {
    return `[Fatura: ${temizFatura}] ${temizNot}`;
  }
  if (temizFatura) {
    return `[Fatura: ${temizFatura}]`;
  }
  return temizNot || null;
}

export default function TheLedger({ seciliAracId = 'tum' }) {
  const araclar = useVehicleStore((s) => s.araclar);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);

  const [yakitlar, setYakitlar] = useState([]);
  const [bakimlar, setBakimlar] = useState([]);
  const [parcalar, setParcalar] = useState([]);
  const [loading, setLoading] = useState(true);

  // "ŞİMDİ (NOW)" Canlı Akış Girişi (Modal Yok, Tablo Yok, TrussDatePicker ile Tarih Seçimi)
  const [nowCommand, setNowCommand] = useState('');
  const [nowDate, setNowDate] = useState(() => getTodayIso());
  const materializeLockRef = useRef(new Set());
  const [isRecording, setIsRecording] = useState(false);

  // Progressive Disclosure Akordeon State (Eksiksiz Veri Seti)
  const [expandedId, setExpandedId] = useState(null);
  const [inlineEditState, setInlineEditState] = useState({
    arac_id: '',
    yakit_tipi: 'Dizel',
    islem_turu: 'Periyodik Bakım',
    tarih: '',
    tutar: '',
    litre: '',
    km: '',
    fatura_bilgisi: '',
    notlar: '',
  });
  const [isUpdatingInline, setIsUpdatingInline] = useState(false);
  const [sayacHata, setSayacHata] = useState(null);

  // Silme Onayı (Shadcn AlertDialog - Tarayıcı confirm yasak)
  const [deleteTarget, setDeleteTarget] = useState(null);

  const verileriSenkronizeEt = useCallback(async () => {
    setLoading(true);
    try {
      const [yRes, bRes, pRes] = await Promise.all([
        yakitService.getAllYakitlar().catch(() => []),
        bakimService.getAllBakimlar().catch(() => []),
        parcaService.getAllParcalar().catch(() => []),
      ]);
      setYakitlar(Array.isArray(yRes) ? yRes : yRes?.yakitlar || []);
      setBakimlar(Array.isArray(bRes) ? bRes : bRes?.bakimlar || []);
      setParcalar(Array.isArray(pRes) ? pRes : pRes?.parcalar || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verileriSenkronizeEt();
  }, [verileriSenkronizeEt]);

  const parsedNow = useMemo(
    () => parseNowStreamInput(nowCommand, araclar, seciliAracId),
    [nowCommand, araclar, seciliAracId]
  );

  // GELECEK PROJEKSİYONLARI VE GEÇMİŞ HAREKETLERİ HARMANLAYAN CHRONO MOTORU
  const { gelecekOlaylar, gecmisOlaylar, finansalNabiz } = useMemo(() => {
    const gelecek = [];
    const gecmis = [];
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    const filtreliAraclar =
      seciliAracId === 'tum'
        ? araclar
        : araclar.filter((a) => String(a.arac_id) === String(seciliAracId));

    // 1. ÜST KUŞAK: GELECEK SİMÜLASYONLARI (Muayene, Sigorta, Kasko, Yaklaşan KM/Parça Bakımı)
    filtreliAraclar.forEach((arac) => {
      const aracEtiket = `${arac.marka || ''} ${arac.model || ''}`.trim() || 'Filo Aracı';
      const evrakTanimlari = [
        { key: 'muayene_tarihi', ad: 'TÜVTÜRK Muayene Vizesi', tahminiMaliyet: 4250 },
        { key: 'sigorta_tarihi', ad: 'Zorunlu Trafik Sigortası', tahminiMaliyet: 9800 },
        { key: 'kasko_tarihi', ad: 'Kasko Poliçe Yenileme', tahminiMaliyet: 19400 },
      ];

      evrakTanimlari.forEach(({ key, ad, tahminiMaliyet }) => {
        if (!arac[key]) return;
        const hedef = new Date(arac[key]);
        hedef.setHours(0, 0, 0, 0);
        const kalanGun = Math.ceil((hedef - bugun) / MILLISECONDS_IN_DAY);
        if (kalanGun <= 90) {
          gelecek.push({
            id: `fut-evrak-${key}-${arac.arac_id}`,
            zamanKusagi: 'GELECEK',
            tip: 'EVRAK',
            evrakKey: key,
            arac_id: arac.arac_id,
            plaka: arac.plaka,
            aracEtiket,
            baslik: ad,
            zamanMetni:
              kalanGun < 0
                ? `${Math.abs(kalanGun)} Gün Gecikti!`
                : kalanGun === 0
                  ? 'Bugün Son Gün!'
                  : `${kalanGun} Gün Sonra (${String(arac[key]).slice(0, 10)})`,
            tutar: tahminiMaliyet,
            sayac: Number(arac.guncel_km || arac.guncel_sayac || 0),
            aciklama: `${arac.plaka} için resmi vade tarihi: ${String(arac[key]).slice(0, 10)}. Tek tıkla gerçekleşti olarak muhasebeleştirebilirsiniz.`,
            oncelik: kalanGun,
          });
        }
      });

      const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
      const birim = isSmh ? 'SMH' : 'KM';
      const sayac = Number(
        arac.guncel_sayac ?? (isSmh ? arac.guncel_calisma_saati : arac.guncel_km) ?? 0
      );
      const periyot = Number(
        (isSmh ? arac.calisma_saati_bakim : arac.onerilen_bakim_km) ||
          arac.bakim_periyodu ||
          (isSmh ? 250 : 15000)
      );
      const sonBakim =
        arac.son_bakim_km !== null && arac.son_bakim_km !== undefined
          ? Number(arac.son_bakim_km)
          : null;

      if (sonBakim !== null && Number.isFinite(sonBakim)) {
        const kalanMesafe = sonBakim + periyot - sayac;
        if (kalanMesafe <= (isSmh ? 60 : 4000)) {
          gelecek.push({
            id: `fut-bakim-${arac.arac_id}`,
            zamanKusagi: 'GELECEK',
            tip: 'BAKIM',
            arac_id: arac.arac_id,
            plaka: arac.plaka,
            aracEtiket,
            baslik:
              kalanMesafe <= 0
                ? 'Periyodik Bakım Sınırı Aşıldı'
                : 'Yaklaşan Periyodik Servis Bakımı',
            zamanMetni:
              kalanMesafe <= 0
                ? `${formatLocaleNumber(Math.abs(kalanMesafe))} ${birim} Aşım`
                : `${formatLocaleNumber(kalanMesafe)} ${birim} Kaldı`,
            tutar: 7800,
            sayac,
            aciklama: `Son servis: ${formatLocaleNumber(sonBakim)} ${birim} • Periyot: ${formatLocaleNumber(periyot)} ${birim}.`,
            oncelik: kalanMesafe <= 0 ? -30 : 15,
          });
        }
      }
    });

    // 2. ALT KUŞAK: GEÇMİŞ BİRLEŞİK FİNANSAL & OPERASYONEL DEFTER (Yakıt + Bakım + Parça)
    yakitlar.forEach((y) => {
      if (seciliAracId !== 'tum' && String(y.arac_id) !== String(seciliAracId)) return;
      const litre = Number(y.litre) || 0;
      const tutar = Number(y.tutar) || 0;
      const birimFiyat = litre > 0 ? tutar / litre : 0;
      const { fatura_bilgisi, notlar } = cozumleNotVeFatura(y.notlar, y.fatura_no || y.fatura_bilgisi);
      const yakitTipi = y.yakit_tipi || 'Dizel';

      gecmis.push({
        id: `past-yakit-${y.yakit_id}`,
        rawId: y.yakit_id,
        zamanKusagi: 'GECMIS',
        tip: 'YAKIT',
        arac_id: y.arac_id,
        yakit_tipi: yakitTipi,
        tarihRaw: y.tarih,
        plaka: y.plaka || `#${y.arac_id}`,
        aracEtiket: `${y.marka || ''} ${y.model || ''}`.trim() || 'Filo Aracı',
        baslik: `${yakitTipi} Yakıt İkmali • ${formatLocaleNumber(litre, 2)} L`,
        zamanMetni: y.tarih ? new Date(y.tarih).toLocaleDateString('tr-TR') : 'Kayıtlı',
        tutar,
        litre,
        sayac: y.km !== null && y.km !== undefined ? Number(y.km) : null,
        fatura_bilgisi,
        notlar,
        aciklama: `Birim fiyat: ${formatLocaleNumber(birimFiyat, 2)} ₺/L${fatura_bilgisi ? ` • Fatura: ${fatura_bilgisi}` : ''}${notlar ? ` • Not: ${notlar}` : ''}`,
        timestamp: y.tarih ? new Date(y.tarih).getTime() : 0,
      });
    });

    bakimlar.forEach((b) => {
      if (seciliAracId !== 'tum' && String(b.arac_id) !== String(seciliAracId)) return;
      const tutar = Number(b.maliyet ?? b.tutar ?? 0);
      const islemTuru = b.bakim_tipi || b.islem_turu || b.bakim_turu || 'Periyodik Bakım';
      const { fatura_bilgisi, notlar } = cozumleNotVeFatura(
        b.notlar || b.aciklama,
        b.fatura_no || b.fatura_bilgisi
      );

      gecmis.push({
        id: `past-bakim-${b.bakim_id}`,
        rawId: b.bakim_id,
        zamanKusagi: 'GECMIS',
        tip: 'BAKIM',
        arac_id: b.arac_id,
        islem_turu: islemTuru,
        tarihRaw: b.tarih,
        plaka: b.plaka || `#${b.arac_id}`,
        aracEtiket: `${b.marka || ''} ${b.model || ''}`.trim() || 'Filo Aracı',
        baslik: islemTuru,
        zamanMetni: b.tarih ? new Date(b.tarih).toLocaleDateString('tr-TR') : 'Kayıtlı',
        tutar,
        sayac: b.km !== null && b.km !== undefined ? Number(b.km) : null,
        fatura_bilgisi,
        notlar,
        aciklama: `${fatura_bilgisi ? `Fatura: ${fatura_bilgisi} • ` : ''}${notlar || 'Servis işlemi zaman defterine işlendi.'}`,
        timestamp: b.tarih ? new Date(b.tarih).getTime() : 0,
      });
    });

    parcalar.forEach((p) => {
      if (seciliAracId !== 'tum' && String(p.arac_id) !== String(seciliAracId)) return;
      const degisimTarihi = p.son_degisim_tarihi || p.degisim_tarihi;
      gecmis.push({
        id: `past-parca-${p.parca_id || p.takip_id}`,
        rawId: p.parca_id || p.takip_id,
        zamanKusagi: 'GECMIS',
        tip: 'PARCA',
        arac_id: p.arac_id,
        plaka: p.plaka || `#${p.arac_id}`,
        aracEtiket: `${p.marka || ''} ${p.model || ''}`.trim() || 'Filo Aracı',
        baslik: `Parça Değişimi • ${p.parca_adi || 'Yedek Parça'}`,
        zamanMetni: degisimTarihi
          ? new Date(degisimTarihi).toLocaleDateString('tr-TR')
          : 'Takip Kaydı',
        tutar: Number(p.maliyet || 0),
        sayac: p.son_degisim_km ?? p.degisim_km ? Number(p.son_degisim_km ?? p.degisim_km) : null,
        aciklama: `Ömür limiti: ${formatLocaleNumber(p.degisim_araligi_km || p.omur_km || 0)} ${getSayacBirimEtiketi(
          araclar.find((a) => String(a.arac_id) === String(p.arac_id))
        )}`,
        timestamp: degisimTarihi ? new Date(degisimTarihi).getTime() : 0,
      });
    });

    gelecek.sort((a, b) => (a.oncelik ?? 99) - (b.oncelik ?? 99));
    gecmis.sort((a, b) => b.timestamp - a.timestamp);

    const finalGelecek = gelecek.length > 0 || araclar.length > 0 ? gelecek : FALLBACK_FUTURE;
    const finalGecmis = gecmis.length > 0 || araclar.length > 0 ? gecmis : FALLBACK_PAST;

    const gecmisToplam = finalGecmis.reduce((acc, x) => acc + (Number(x.tutar) || 0), 0);
    const gelecekTahmini = finalGelecek.reduce((acc, x) => acc + (Number(x.tutar) || 0), 0);

    return {
      gelecekOlaylar: finalGelecek,
      gecmisOlaylar: finalGecmis,
      finansalNabiz: { gecmisToplam, gelecekTahmini },
    };
  }, [araclar, yakitlar, bakimlar, parcalar, seciliAracId]);

  // "ŞİMDİ" Kuşağından Anında Kayıt (Enter ile - NLP Yakıt Tipi & İşlem Türü Destekli)
  const handleNowRecord = async () => {
    if (!parsedNow.hazirMi || isRecording) {
      const ob = getSayacBirimEtiketi(parsedNow.arac || araclar[0]);
      toast.error(
        `Örnek komut: "34 ABC 123 Benzin 45L 1950TL 128000${ob}" veya "34 ABC 123 Arıza 6500TL 128000${ob}"`
      );
      return;
    }

    const hedefArac = parsedNow.arac || araclar[0];
    if (!hedefArac?.arac_id) {
      toast.error('Kayıt için sistemde en az bir araç bulunmalıdır.');
      return;
    }

    setIsRecording(true);
    try {
      const kayitTarihi = nowDate || getTodayIso();
      const birlesikNot = birlestirNotVeFatura(parsedNow.notlar, parsedNow.fatura_bilgisi);
      const mevcutSayac = Number(
        hedefArac.guncel_sayac ?? hedefArac.guncel_km ?? hedefArac.guncel_calisma_saati ?? 0
      );

      if (parsedNow.islemTipi === 'YAKIT') {
        await yakitService.yakitEkle({
          arac_id: Number(hedefArac.arac_id),
          yakit_tipi: parsedNow.yakit_tipi || 'Dizel',
          tarih: kayitTarihi,
          litre: Number(parsedNow.litre),
          tutar: Number(parsedNow.tutar),
          km: parsedNow.km !== null ? Number(parsedNow.km) : mevcutSayac,
          notlar: birlesikNot || 'Chrono-OS Zaman Akışı',
        });
      } else {
        await bakimService.bakimEkle({
          arac_id: Number(hedefArac.arac_id),
          bakim_tipi: parsedNow.islem_turu || 'Periyodik Bakım',
          tarih: kayitTarihi,
          km: parsedNow.km !== null ? Number(parsedNow.km) : mevcutSayac,
          maliyet: Number(parsedNow.tutar),
          notlar: birlesikNot || parsedNow.aciklama || 'Chrono-OS üzerinden işlendi',
        });
      }

      toast.success(`${hedefArac.plaka} olayı zaman akışına mühürlendi.`);
      setNowCommand('');
      await Promise.all([verileriSenkronizeEt(), fetchAraclar()]);
    } catch (err) {
      const sh = parseSayacHatasi(err);
      if (sh) {
        toast.error(sh.ipucu ? `${sh.alanHatasi} ${sh.ipucu}` : sh.alanHatasi);
      } else {
        notifyApiError(err, 'Zaman akışına kayıt eklenemedi.');
      }
    } finally {
      setIsRecording(false);
    }
  };

  // Gelecekteki Projeksiyonu Tek Tıkla "Gerçekleşti" Olarak Bugüne Düşürme
  const handleMaterializeFuture = async (futItem) => {
    if (!futItem.arac_id) {
      toast.success('Simülasyon olayı bugünün akışına aktarıldı.');
      return;
    }
    if (materializeLockRef.current.has(futItem.id)) return;
    materializeLockRef.current.add(futItem.id);

    const bugunIso = getTodayIso();
    let bakimKaydedildi = false;
    try {
      await bakimService.bakimEkle({
        arac_id: Number(futItem.arac_id),
        bakim_tipi: futItem.baslik || 'Periyodik Bakım',
        tarih: bugunIso,
        km: Number(futItem.sayac || 0),
        maliyet: Number(futItem.tutar || 0),
        notlar: 'Gelecek projeksiyonundan tek tıkla muhasebeleştirildi.',
      });
      bakimKaydedildi = true;

      // EVRAK ise: ilgili vade tarihini +1 yıl ileri at (aracSchema tam payload zorunlu)
      if (futItem.tip === 'EVRAK' && futItem.evrakKey) {
        const arac = araclar.find((a) => String(a.arac_id) === String(futItem.arac_id));
        if (!arac) throw new Error('VADE_ARAC_YOK');

        const mevcutVade = arac[futItem.evrakKey]
          ? String(arac[futItem.evrakKey]).slice(0, 10)
          : bugunIso;
        // Vade geçmişte kaldıysa bugünden itibaren +1 yıl; aksi halde mevcut vadeye +1 yıl
        const temelTarih = mevcutVade < bugunIso ? bugunIso : mevcutVade;
        const yeniVade = addYearsToIso(temelTarih, 1);

        const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
        const toIsoOrNull = (v) => (v ? String(v).slice(0, 10) : null);

        await aracService.aracGuncelle(arac.arac_id, {
          plaka: arac.plaka,
          kategori_id: arac.kategori_id || null,
          kategori: arac.kategori || 'Otomobil',
          sayac_tipi: isSmh ? 'SMH' : 'KM',
          marka: arac.marka,
          model: arac.model,
          yil: Number(arac.yil),
          varyant_id: arac.varyant_id || null,
          guncel_km: Number(arac.guncel_km || 0),
          guncel_calisma_saati: Number(arac.guncel_calisma_saati || 0),
          onerilen_bakim_km: isSmh ? null : Number(arac.onerilen_bakim_km) || null,
          calisma_saati_bakim: isSmh ? Number(arac.calisma_saati_bakim) || null : null,
          triger_degisim_km: !isSmh && arac.triger_degisim_km ? Number(arac.triger_degisim_km) : null,
          muayene_tarihi: toIsoOrNull(arac.muayene_tarihi),
          sigorta_tarihi: toIsoOrNull(arac.sigorta_tarihi),
          kasko_tarihi: toIsoOrNull(arac.kasko_tarihi),
          [futItem.evrakKey]: yeniVade,
        });
        toast.success(
          `${futItem.plaka} • ${futItem.baslik} bugüne işlendi. Yeni vade: ${yeniVade}`
        );
      } else {
        toast.success(`${futItem.plaka} • ${futItem.baslik} bugüne işlendi.`);
      }
    } catch (err) {
      notifyApiError(
        err,
        bakimKaydedildi
          ? 'Bakım kaydı eklendi ancak evrak vade tarihi güncellenemedi. Aracı Filo Ufku’ndan düzeltin.'
          : 'İşlem tamamlanamadı.'
      );
    } finally {
      materializeLockRef.current.delete(futItem.id);
      await Promise.all([verileriSenkronizeEt(), fetchAraclar()]);
    }
  };

  const handleExpandToggle = (item) => {
    setSayacHata(null);
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    setInlineEditState({
      arac_id: item.arac_id ? String(item.arac_id) : '',
      yakit_tipi: item.yakit_tipi || 'Dizel',
      islem_turu: item.islem_turu || 'Periyodik Bakım',
      tarih: item.tarihRaw
        ? String(item.tarihRaw).slice(0, 10)
        : getTodayIso(),
      tutar: item.tutar !== undefined ? formatLocaleNumber(item.tutar, 2) : '',
      litre: item.litre !== undefined ? formatLocaleNumber(item.litre, 2) : '',
      km: item.sayac !== null && item.sayac !== undefined ? formatLocaleNumber(item.sayac, 0) : '',
      fatura_bilgisi: item.fatura_bilgisi || '',
      notlar: item.notlar || '',
    });
  };

  // Progressive Disclosure İçinden Modalsız Satır Güncelleme (Tam Veri Seti)
  const handleInlineUpdate = async (item) => {
    if (!item.rawId || isUpdatingInline) return;
    const parsedTutar = parseLocaleNumber(inlineEditState.tutar);
    const parsedKm = String(inlineEditState.km || '').trim()
      ? parseLocaleNumber(inlineEditState.km)
      : null;

    if (parsedTutar === null || parsedTutar <= 0) {
      toast.error('Geçerli bir tutar girin.');
      return;
    }

    setSayacHata(null);
    setIsUpdatingInline(true);
    try {
      const tarihStr =
        inlineEditState.tarih ||
        (item.tarihRaw
          ? String(item.tarihRaw).slice(0, 10)
          : getTodayIso());
      const hedefAracId = Number(inlineEditState.arac_id || item.arac_id);
      const birlesikNot = birlestirNotVeFatura(
        inlineEditState.notlar,
        inlineEditState.fatura_bilgisi
      );

      if (item.tip === 'YAKIT') {
        const parsedLitre = parseLocaleNumber(inlineEditState.litre);
        if (!parsedLitre || parsedLitre <= 0) {
          toast.error('Geçerli bir litre değeri girin.');
          setIsUpdatingInline(false);
          return;
        }
        await yakitService.yakitGuncelle(item.rawId, {
          arac_id: hedefAracId,
          yakit_tipi: inlineEditState.yakit_tipi || 'Dizel',
          tarih: tarihStr,
          litre: Number(parsedLitre),
          tutar: Number(parsedTutar),
          km: parsedKm !== null ? Number(parsedKm) : null,
          notlar: birlesikNot,
        });
      } else if (item.tip === 'BAKIM') {
        await bakimService.bakimGuncelle(item.rawId, {
          arac_id: hedefAracId,
          bakim_tipi: inlineEditState.islem_turu || 'Periyodik Bakım',
          tarih: tarihStr,
          km: parsedKm !== null ? Number(parsedKm) : 0,
          maliyet: Number(parsedTutar),
          notlar: birlesikNot,
        });
      }

      toast.success('Zaman düğümü tam veri setiyle güncellendi.');
      setExpandedId(null);
      await Promise.all([verileriSenkronizeEt(), fetchAraclar()]);
    } catch (err) {
      const sh = parseSayacHatasi(err);
      if (sh) {
        setSayacHata(sh);
      } else {
        notifyApiError(err, 'Kayıt güncellenemedi.');
      }
    } finally {
      setIsUpdatingInline(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.tip === 'YAKIT') {
        await yakitService.yakitSil(deleteTarget.rawId);
      } else if (deleteTarget.tip === 'BAKIM') {
        await bakimService.bakimSil(deleteTarget.rawId);
      } else if (deleteTarget.tip === 'PARCA') {
        await parcaService.parcaSil(deleteTarget.rawId);
      }
      toast.success('Kayıt zaman defterinden silindi.');
      setDeleteTarget(null);
      setExpandedId(null);
      await Promise.all([verileriSenkronizeEt(), fetchAraclar()]);
    } catch (err) {
      notifyApiError(err, 'Silme işlemi başarısız.');
    }
  };

  const inlineArac = araclar.find((a) => String(a.arac_id) === String(inlineEditState.arac_id));
  const inlineBirim = getSayacBirimEtiketi(inlineArac);
  const omniBirim = getSayacBirimEtiketi(parsedNow.arac || araclar[0]);

  return (
    <div className="space-y-6">
      {/* ÜST 365 GÜNLÜK NABIZ VE FİNANSAL DENGE UFUK ÇUBUĞU */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-truss-border bg-truss-surface p-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-truss-muted">
            Chrono-Ledger Finansal Denge
          </span>
          <div className="mt-1 flex flex-wrap items-baseline gap-4 tabular-nums">
            <div>
              <span className="text-xs text-truss-muted">Gerçekleşen Defter: </span>
              <strong className="text-base font-bold text-truss-text">
                -{formatCurrency(finansalNabiz.gecmisToplam)}
              </strong>
            </div>
            <div>
              <span className="text-xs text-truss-muted">Gelecek 90 Gün Projeksiyonu: </span>
              <strong className="text-base font-bold text-truss-purple">
                ~{formatCurrency(finansalNabiz.gelecekTahmini)}
              </strong>
            </div>
          </div>
        </div>

        {/* 28 Hücrelik Yoğunluk İzi */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 28 }).map((_, idx) => {
            const mod = (idx * 5 + gecmisOlaylar.length) % 2;
            return (
              <span
                key={idx}
                className={`h-4 w-2 rounded-sm border border-truss-border ${
                  mod === 1 ? 'bg-truss-purple' : 'bg-truss-bg'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. ÜST KUŞAK: GELECEK PROJEKSİYONLARI (YUKARI AKAN SİMÜLASYON UFKU)    */}
      {/* ===================================================================== */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-truss-purple">
            <Compass className="size-4" />
            UFUK HATTI • YAKLAŞAN EVRAK & BAKIM SİMÜLASYONLARI ({gelecekOlaylar.length})
          </span>
          <span className="text-[11px] text-truss-muted">
            Satıra tıklayarak simülasyon detayını açın
          </span>
        </div>

        <div className="relative pl-7 before:absolute before:bottom-0 before:left-3 before:top-2 before:w-px before:border-l before:border-dashed before:border-truss-purple">
          <div className="space-y-2.5">
            {gelecekOlaylar.length === 0 ? (
              <div className="rounded-xl border border-dashed border-truss-border bg-truss-surface p-4 text-xs text-truss-muted">
                Önümüzdeki 90 gün içinde kritik muayene, sigorta veya aşım bekleyen bakım görünmüyor.
              </div>
            ) : (
              gelecekOlaylar.map((item) => {
                const acikMi = expandedId === item.id;
                return (
                  <div key={item.id} className="relative">
                    <span className="absolute -left-7 top-3.5 flex size-6 items-center justify-center rounded-full border border-dashed border-truss-purple bg-truss-bg text-truss-purple">
                      {item.tip === 'EVRAK' ? (
                        <FileWarning className="size-3" />
                      ) : (
                        <Wrench className="size-3" />
                      )}
                    </span>

                    <div
                      onClick={() => handleExpandToggle(item)}
                      className="cursor-pointer rounded-xl border border-truss-border bg-truss-surface transition-all hover:border-truss-purple"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Badge
                            variant="outline"
                            className="border-truss-purple bg-truss-bg text-[10px] font-semibold text-truss-purple"
                          >
                            GELECEK
                          </Badge>
                          <span className="font-mono text-xs font-bold tabular-nums text-truss-text">
                            {item.plaka}
                          </span>
                          <span className="text-sm font-medium text-truss-text">{item.baslik}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium tabular-nums text-truss-purple">
                            {item.zamanMetni}
                          </span>
                          <span className="font-mono text-sm font-bold tabular-nums text-truss-muted">
                            ~{formatCurrency(item.tutar)}
                          </span>
                          {acikMi ? (
                            <ChevronUp className="size-4 text-truss-muted" />
                          ) : (
                            <ChevronDown className="size-4 text-truss-muted" />
                          )}
                        </div>
                      </div>

                      {acikMi && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex flex-wrap items-center justify-between gap-3 border-t border-truss-border bg-truss-bg px-4 py-3 text-xs"
                        >
                          <p className="text-truss-muted">{item.aciklama}</p>
                          <Button
                            size="sm"
                            onClick={() => handleMaterializeFuture(item)}
                            className="h-8 gap-1.5 rounded-lg bg-truss-purple px-3 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                          >
                            <CalendarCheck2 className="size-3.5" />
                            Gerçekleşti Olarak Bugüne İşle
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. MERKEZ KUŞAK: "ŞİMDİ (PRESENT HORIZON)" CANLI KOMUT & AKIŞ GİRİŞİ  */}
      {/* ===================================================================== */}
      <section className="rounded-2xl border-2 border-truss-purple bg-truss-surface p-4 shadow-xl">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-truss-purple">
            <Sparkles className="size-3.5" />
            ŞİMDİ • BUGÜNÜN DÜĞÜMÜ (AKILLI OMNIBAR & TAKVİM GİRİŞİ)
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              `${araclar[0]?.plaka || '34 ABC 123'} Benzin 45L 1950TL 128500${omniBirim} Fatura:FT-104`,
              `${araclar[0]?.plaka || '34 ABC 123'} Arıza 6400TL 128500${omniBirim} Alternatör Onarımı`,
            ].map((ornek, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNowCommand(ornek)}
                className="rounded-md border border-truss-border bg-truss-bg px-2 py-0.5 font-mono text-[10px] text-truss-muted hover:border-truss-purple hover:text-truss-text"
              >
                {ornek}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            type="text"
            value={nowCommand}
            onChange={(e) => setNowCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleNowRecord();
              }
            }}
            placeholder={`Komut: "34 ABC 123 LPG 50L 1450TL 132000${omniBirim}" veya "34 ABC 123 Lastik 8500TL 132000${omniBirim} Fatura:LS-99"`}
            className="h-10 flex-1 rounded-xl border border-truss-border bg-truss-bg px-3.5 font-mono text-sm text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
          />

          <div className="w-full sm:w-44">
            <TrussDatePicker
              name="now_tarih"
              value={nowDate}
              onChange={(e) => setNowDate(e.target.value)}
              placeholder="İşlem tarihi"
            />
          </div>

          <Button
            type="button"
            disabled={!parsedNow.hazirMi || isRecording}
            onClick={handleNowRecord}
            className="h-10 gap-1.5 rounded-xl bg-truss-purple px-4 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
          >
            <span>{isRecording ? 'Mühürleniyor…' : 'Zaman Akışına İşle'}</span>
            <CornerDownLeft className="size-3.5" />
          </Button>
        </div>

        {nowCommand.trim() !== '' && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className="border-truss-purple bg-truss-bg text-truss-purple"
            >
              Kategori: {parsedNow.islemTipi}
            </Badge>
            <Badge variant="outline" className="border-truss-border bg-truss-bg text-truss-text">
              {parsedNow.islemTipi === 'YAKIT'
                ? `Yakıt Tipi: ${parsedNow.yakit_tipi}`
                : `İşlem Türü: ${parsedNow.islem_turu}`}
            </Badge>
            <Badge variant="outline" className="border-truss-border bg-truss-bg text-truss-text">
              Araç: {parsedNow.plaka || 'Seçilmedi'}
            </Badge>
            {parsedNow.litre !== null && (
              <Badge variant="outline" className="border-truss-border bg-truss-bg text-truss-text">
                Miktar: {formatLocaleNumber(parsedNow.litre, 2)} L
              </Badge>
            )}
            <Badge variant="outline" className="border-truss-border bg-truss-bg text-truss-text">
              Tutar: {parsedNow.tutar !== null ? `${formatLocaleNumber(parsedNow.tutar, 2)} ₺` : '?'}
            </Badge>
            {parsedNow.km !== null && (
              <Badge variant="outline" className="border-truss-border bg-truss-bg text-truss-text">
                Sayaç: {formatLocaleNumber(parsedNow.km, 0)} {omniBirim}
              </Badge>
            )}
            {parsedNow.fatura_bilgisi && (
              <Badge variant="outline" className="border-truss-border bg-truss-bg text-truss-text">
                Fatura: {parsedNow.fatura_bilgisi}
              </Badge>
            )}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 3. ALT KUŞAK: GEÇMİŞ DEFTER (YAKIT + BAKIM + PARÇA BİRLEŞİK AKIŞ)      */}
      {/* ===================================================================== */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-truss-muted">
            <History className="size-4 text-truss-purple" />
            GEÇMİŞ ZAMAN DEFTERİ • BİRLEŞİK HAREKETLER ({gecmisOlaylar.length})
          </span>
          <span className="text-[11px] text-truss-muted">
            Progressive Disclosure: Düzenlemek için herhangi bir olaya tıklayın
          </span>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl bg-truss-surface" />
            ))}
          </div>
        ) : (
          <div className="relative pl-7 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-truss-border">
            <div className="space-y-2.5">
              {gecmisOlaylar.map((item) => {
                const acikMi = expandedId === item.id;
                return (
                  <div key={item.id} className="relative">
                    <span className="absolute -left-7 top-3.5 flex size-6 items-center justify-center rounded-full border border-truss-border bg-truss-surface text-truss-purple">
                      {item.tip === 'YAKIT' ? (
                        <Fuel className="size-3" />
                      ) : item.tip === 'BAKIM' ? (
                        <Wrench className="size-3" />
                      ) : (
                        <Cog className="size-3" />
                      )}
                    </span>

                    <div
                      onClick={() => handleExpandToggle(item)}
                      className="cursor-pointer rounded-xl border border-truss-border bg-truss-surface transition-all hover:border-truss-purple"
                    >
                      {/* Sakin Özet Satırı */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Badge
                            variant="outline"
                            className="border-truss-border bg-truss-bg text-[10px] font-semibold text-truss-muted"
                          >
                            {item.tip === 'YAKIT'
                              ? `YAKIT • ${item.yakit_tipi || 'Dizel'}`
                              : item.tip === 'BAKIM'
                                ? `BAKIM • ${item.islem_turu || 'Servis'}`
                                : item.tip}
                          </Badge>
                          <span className="font-mono text-xs font-bold tabular-nums text-truss-text">
                            {item.plaka}
                          </span>
                          <span className="text-sm font-medium text-truss-text">{item.baslik}</span>
                          {item.fatura_bilgisi && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-truss-border bg-truss-bg px-1.5 py-0.5 font-mono text-[10px] text-truss-muted">
                              <FileText className="size-2.5 text-truss-purple" />
                              {item.fatura_bilgisi}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs tabular-nums text-truss-muted">
                            <Clock className="size-3" />
                            {item.zamanMetni}
                          </span>
                          <span className="font-mono text-sm font-bold tabular-nums text-truss-text">
                            -{formatCurrency(item.tutar)}
                          </span>
                          {acikMi ? (
                            <ChevronUp className="size-4 text-truss-muted" />
                          ) : (
                            <ChevronDown className="size-4 text-truss-muted" />
                          )}
                        </div>
                      </div>

                      {/* Progressive Disclosure: Tıklandığında Açılan Eksiksiz Veri Setli Satır İçi Düzenleme */}
                      {acikMi && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="space-y-3 border-t border-truss-border bg-truss-bg px-4 py-4 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-truss-muted">
                            <span>
                              <strong className="text-truss-text">{item.aracEtiket}</strong> •{' '}
                              {item.aciklama}
                            </span>
                            {item.sayac !== null && (
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums text-truss-text">
                                <Gauge className="size-3.5 text-truss-purple" />
                                {formatLocaleNumber(item.sayac, 0)}{' '}
                                {getSayacBirimEtiketi(
                                  araclar.find((a) => String(a.arac_id) === String(item.arac_id))
                                )}
                              </span>
                            )}
                          </div>

                          {item.rawId && (item.tip === 'YAKIT' || item.tip === 'BAKIM') && (
                            <div className="space-y-2.5 pt-1">
                              {/* 1. Satır: Araç Seçimi, Yakıt Tipi / İşlem Türü Dropdown, TrussDatePicker, Tutar */}
                              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                                <div className="space-y-1">
                                  <span className="block text-[11px] font-medium text-truss-muted">
                                    Araç
                                  </span>
                                  <select
                                    value={inlineEditState.arac_id}
                                    onChange={(e) =>
                                    {
                                      setSayacHata(null);
                                      setInlineEditState((p) => ({
                                        ...p,
                                        arac_id: e.target.value,
                                      }));
                                    }
                                    }
                                    className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                                  >
                                    {araclar.map((a) => (
                                      <option
                                        key={a.arac_id}
                                        value={a.arac_id}
                                        className="bg-truss-surface text-truss-text"
                                      >
                                        {a.plaka} — {a.marka} {a.model}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {item.tip === 'YAKIT' ? (
                                  <div className="space-y-1">
                                    <span className="block text-[11px] font-medium text-truss-muted">
                                      Yakıt Tipi
                                    </span>
                                    <select
                                      value={inlineEditState.yakit_tipi}
                                      onChange={(e) =>
                                        setInlineEditState((p) => ({
                                          ...p,
                                          yakit_tipi: e.target.value,
                                        }))
                                      }
                                      className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                                    >
                                      {YAKIT_TIPLERI.map((yt) => (
                                        <option
                                          key={yt}
                                          value={yt}
                                          className="bg-truss-surface text-truss-text"
                                        >
                                          {yt}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="block text-[11px] font-medium text-truss-muted">
                                      İşlem Türü (Bakım Tipi)
                                    </span>
                                    <select
                                      value={inlineEditState.islem_turu}
                                      onChange={(e) =>
                                        setInlineEditState((p) => ({
                                          ...p,
                                          islem_turu: e.target.value,
                                        }))
                                      }
                                      className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                                    >
                                      {!ISLEM_TURLERI.includes(inlineEditState.islem_turu) &&
                                        inlineEditState.islem_turu && (
                                          <option
                                            value={inlineEditState.islem_turu}
                                            className="bg-truss-surface text-truss-text"
                                          >
                                            {inlineEditState.islem_turu}
                                          </option>
                                        )}
                                      {ISLEM_TURLERI.map((it) => (
                                        <option
                                          key={it}
                                          value={it}
                                          className="bg-truss-surface text-truss-text"
                                        >
                                          {it}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <span className="block text-[11px] font-medium text-truss-muted">
                                    İşlem Tarihi
                                  </span>
                                  <TrussDatePicker
                                    name="inline_tarih"
                                    value={inlineEditState.tarih}
                                    onChange={(e) =>
                                      setInlineEditState((p) => ({ ...p, tarih: e.target.value }))
                                    }
                                    placeholder="İşlem tarihi"
                                    className="bg-truss-surface"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <span className="block text-[11px] font-medium text-truss-muted">
                                    Toplam Tutar (₺)
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={inlineEditState.tutar}
                                    onChange={(e) =>
                                      setInlineEditState((p) => ({ ...p, tutar: e.target.value }))
                                    }
                                    placeholder="Tutar (₺)"
                                    className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs tabular-nums text-truss-text focus:border-truss-purple focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* 2. Satır: Litre (Yakıtsa), Sayaç (KM/SMH), Fatura Bilgisi, Notlar */}
                              <div
                                className={`grid grid-cols-1 gap-2.5 ${
                                  item.tip === 'YAKIT' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
                                }`}
                              >
                                {item.tip === 'YAKIT' && (
                                  <div className="space-y-1">
                                    <span className="block text-[11px] font-medium text-truss-muted">
                                      Miktar (Litre / kWh)
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={inlineEditState.litre}
                                      onChange={(e) =>
                                        setInlineEditState((p) => ({
                                          ...p,
                                          litre: e.target.value,
                                        }))
                                      }
                                      placeholder="Litre"
                                      className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs tabular-nums text-truss-text focus:border-truss-purple focus:outline-none"
                                    />
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <span className="block text-[11px] font-medium text-truss-muted">
                                    Güncel Sayaç ({inlineBirim})
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={inlineEditState.km}
                                    onChange={(e) => {
                                      setSayacHata(null);
                                      setInlineEditState((p) => ({ ...p, km: e.target.value }));
                                    }}
                                    placeholder={`Sayaç (${inlineBirim})`}
                                    {...sayacAria(sayacHata, 'ledger-sayac-hata')}
                                    className={`h-10 w-full rounded-xl border bg-truss-surface px-3 font-mono text-xs tabular-nums text-truss-text focus:outline-none ${sayacInputSinifi(sayacHata)}`}
                                  />
                                  <SayacHatasi id="ledger-sayac-hata" hata={sayacHata} />
                                </div>

                                <div className="space-y-1">
                                  <span className="block text-[11px] font-medium text-truss-muted">
                                    Fatura / Belge Bilgisi
                                  </span>
                                  <input
                                    type="text"
                                    value={inlineEditState.fatura_bilgisi}
                                    onChange={(e) =>
                                      setInlineEditState((p) => ({
                                        ...p,
                                        fatura_bilgisi: e.target.value,
                                      }))
                                    }
                                    placeholder="Örn: FT-2026-104"
                                    className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <span className="block text-[11px] font-medium text-truss-muted">
                                    Notlar / Servis Açıklaması
                                  </span>
                                  <input
                                    type="text"
                                    value={inlineEditState.notlar}
                                    onChange={(e) =>
                                      setInlineEditState((p) => ({ ...p, notlar: e.target.value }))
                                    }
                                    placeholder="Açıklama / Not"
                                    className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {item.rawId && (
                            <div className="flex items-center justify-between pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setDeleteTarget({
                                    tip: item.tip,
                                    rawId: item.rawId,
                                    baslik: `${item.plaka} • ${item.baslik}`,
                                  })
                                }
                                className="h-8 gap-1 rounded-lg border-truss-border bg-truss-surface px-2.5 text-xs text-destructive hover:border-destructive"
                              >
                                <Trash2 className="size-3.5" />
                                Kaydı Sil
                              </Button>

                              {(item.tip === 'YAKIT' || item.tip === 'BAKIM') && (
                                <Button
                                  size="sm"
                                  disabled={isUpdatingInline}
                                  onClick={() => handleInlineUpdate(item)}
                                  className="h-8 gap-1 rounded-lg bg-truss-purple px-3 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                                >
                                  <Check className="size-3.5" />
                                  {isUpdatingInline ? 'Kaydediliyor…' : 'Satırda Güncelle'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SHADCN ALERTDIALOG: SİLME ONAYI */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="border-truss-border bg-truss-surface text-truss-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-truss-text">
              Zaman düğümünü kalıcı olarak sil?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-truss-muted">
              {deleteTarget?.baslik} kaydı Chrono-Ledger geçmişinden kaldırılacak. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-truss-border bg-truss-bg text-truss-text hover:bg-truss-surface">
              Vazgeç
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-truss-purple text-truss-text hover:bg-truss-purple-hover"
            >
              Kalıcı Olarak Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
