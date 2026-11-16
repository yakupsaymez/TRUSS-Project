import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import useVehicleStore from '@/store/useVehicleStore';
import yakitService from '@/services/yakitService';
import bakimService from '@/services/bakimService';
import parcaService from '@/services/parcaService';
import raporService from '@/services/raporService';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Fuel,
  Wrench,
  TrendingUp,
  Gauge,
  ChevronDown,
  ChevronUp,
  Activity,
  Banknote,
  Layers,
  Printer,
  Truck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

function ayEtiketiFormatla(ayStr) {
  if (!ayStr) return 'Dönem';
  const str = String(ayStr).trim();
  if (!str.includes('-')) return str;
  const [yil, ay] = str.split('-');
  const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const idx = parseInt(ay, 10) - 1;
  return `${aylar[idx] || ay} ${yil}`;
}

export default function TelemetryAnalytics({ seciliAracId = 'tum' }) {
  const araclar = useVehicleStore((s) => s.araclar);
  const [yakitlar, setYakitlar] = useState([]);
  const [bakimlar, setBakimlar] = useState([]);
  const [parcalar, setParcalar] = useState(null);
  const [genelOzet, setGenelOzet] = useState(null);
  const [aylikRapor, setAylikRapor] = useState([]);
  const [aracDagilimi, setAracDagilimi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaka, setExpandedPlaka] = useState(null);

  const loadTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      const [yRes, bRes, pRes, ozetRes, trendRes, dagilimRes] = await Promise.all([
        yakitService.getAllYakitlar().catch(() => []),
        bakimService.getAllBakimlar().catch(() => []),
        parcaService.getAllParcalar().catch(() => null),
        raporService.getGenelOzet().catch(() => null),
        raporService.getAylikHarcamaTrendi().catch(() => []),
        raporService.getAracMaliyetDagilimi().catch(() => []),
      ]);
      setYakitlar(Array.isArray(yRes) ? yRes : yRes?.yakitlar || []);
      setBakimlar(Array.isArray(bRes) ? bRes : bRes?.bakimlar || []);
      setParcalar(
        pRes === null ? null : Array.isArray(pRes) ? pRes : pRes?.parcalar || []
      );
      if (ozetRes) setGenelOzet(ozetRes);
      setAylikRapor(Array.isArray(trendRes) ? trendRes : []);
      setAracDagilimi(Array.isArray(dagilimRes) ? dagilimRes : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Telemetri raporları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTelemetry();
  }, [loadTelemetry]);

  const {
    toplamGider,
    toplamYakit,
    toplamBakim,
    toplamLitre,
    toplamBakimSayisi,
    aktifAracSayisi,
    yaklasanParcaSayisi,
    ortalamaKmMaliyeti,
    ortalamaYuzKmTuketim,
    yakitOrani,
    bakimOrani,
    aracPerformanslari,
    aylikTrendBarlari,
  } = useMemo(() => {
    const tekAracModu = seciliAracId !== 'tum';
    const aracEslesir = (kayit) => !tekAracModu || String(kayit.arac_id) === String(seciliAracId);

    const filtreliYakit = yakitlar.filter(aracEslesir);
    const filtreliBakim = bakimlar.filter(aracEslesir);
    const filtreliParca = (parcalar || []).filter(aracEslesir);

    const yeniKayit = (kaynak, sayacTipi = 'KM') => ({
      arac_id: kaynak.arac_id,
      plaka: kaynak.plaka || `#${kaynak.arac_id}`,
      etiket:
        `${kaynak.marka || ''} ${kaynak.model || ''} ${kaynak.yil ? `(${kaynak.yil})` : ''}`.trim() ||
        'Filo Aracı',
      sayac_tipi: sayacTipi,
      yakit: 0,
      bakim: 0,
      toplamLitre: 0,
      islemSayisi: 0,
    });

    const harita = new Map();

    araclar.forEach((a) => {
      if (!aracEslesir(a)) return;
      harita.set(String(a.arac_id), yeniKayit(a, a.sayac_tipi || 'KM'));
    });

    // Filo geneli dağılım yalnızca "tüm filo" görünümünde ve kayıt yokken yedek veri olarak kullanılır
    if (!tekAracModu) {
      aracDagilimi.forEach((d) => {
        const key = String(d.arac_id);
        const mevcut = harita.get(key) || yeniKayit(d);
        if (filtreliYakit.length === 0 && Number(d.toplam_yakit) > 0) {
          mevcut.yakit = Number(d.toplam_yakit) || 0;
        }
        if (filtreliBakim.length === 0 && Number(d.toplam_bakim) > 0) {
          mevcut.bakim = Number(d.toplam_bakim) || 0;
        }
        harita.set(key, mevcut);
      });
    }

    // Araç bazlı gerçek km noktaları (yakıt + bakım kayıtlarından)
    const kmNoktalari = new Map();
    const kmNoktasiEkle = (aracId, km) => {
      const deger = Number(km);
      if (!Number.isFinite(deger) || deger <= 0) return;
      const key = String(aracId);
      if (!kmNoktalari.has(key)) kmNoktalari.set(key, []);
      kmNoktalari.get(key).push(deger);
    };

    filtreliYakit.forEach((y) => {
      const key = String(y.arac_id);
      const mevcut = harita.get(key) || yeniKayit(y);
      mevcut.yakit += Number(y.tutar) || 0;
      mevcut.toplamLitre += Number(y.litre) || 0;
      mevcut.islemSayisi += 1;
      harita.set(key, mevcut);
      kmNoktasiEkle(y.arac_id, y.km);
    });

    filtreliBakim.forEach((b) => {
      const key = String(b.arac_id);
      const mevcut = harita.get(key) || yeniKayit(b);
      mevcut.bakim += Number(b.maliyet ?? b.tutar ?? 0);
      mevcut.islemSayisi += 1;
      harita.set(key, mevcut);
      kmNoktasiEkle(b.arac_id, b.km);
    });

    // Gerçek mesafe = DB'deki max(km) - min(km); tüketim litresi = ilk dolum (başlangıç km'si) hariç
    const performansListesi = Array.from(harita.values()).map((item) => {
      const noktalar = kmNoktalari.get(String(item.arac_id)) || [];
      const minKm = noktalar.length > 0 ? Math.min(...noktalar) : 0;
      const maxKm = noktalar.length > 0 ? Math.max(...noktalar) : 0;
      const mesafe = maxKm - minKm > 0 ? maxKm - minKm : null;

      const tuketimLitresi = filtreliYakit
        .filter((y) => String(y.arac_id) === String(item.arac_id) && Number(y.km) > minKm)
        .reduce((acc, y) => acc + (Number(y.litre) || 0), 0);

      return {
        ...item,
        katEdilenKm: mesafe,
        tuketimLitresi: mesafe !== null ? tuketimLitresi : 0,
      };
    });

    let yTop = performansListesi.reduce((acc, x) => acc + x.yakit, 0);
    let bTop = performansListesi.reduce((acc, x) => acc + x.bakim, 0);

    // Genel özet yalnızca "tüm filo" modunda ve araç bazlı veri tamamen boşken devreye girer
    if (!tekAracModu && yTop === 0 && bTop === 0 && genelOzet) {
      yTop = Number(genelOzet.toplam_yakit_gideri) || 0;
      bTop = Number(genelOzet.toplam_bakim_gideri) || 0;
    }

    const genelTop = yTop + bTop;
    const kayitliLitre = performansListesi.reduce((acc, x) => acc + (x.toplamLitre || 0), 0);
    const topLitre =
      kayitliLitre > 0 ? kayitliLitre : tekAracModu ? 0 : Number(genelOzet?.toplam_litre || 0);

    // Verimlilik: yalnızca geçerli mesafesi olan araçlar üzerinden gerçek ağırlıklı ortalama
    const olculenAraclar = performansListesi.filter((x) => x.katEdilenKm !== null);
    const olculenMesafe = olculenAraclar.reduce((acc, x) => acc + x.katEdilenKm, 0);
    const olculenMaliyet = olculenAraclar.reduce((acc, x) => acc + x.yakit + x.bakim, 0);
    const olculenLitre = olculenAraclar.reduce((acc, x) => acc + x.tuketimLitresi, 0);
    const kmMaliyet = olculenMesafe > 0 ? olculenMaliyet / olculenMesafe : null;
    const yuzKmLitreGenel =
      olculenMesafe > 0 && olculenLitre > 0 ? (olculenLitre / olculenMesafe) * 100 : null;

    const yOran = genelTop > 0 ? Math.round((yTop / genelTop) * 100) : 0;
    const bOran = genelTop > 0 ? Math.max(0, 100 - yOran) : 0;

    const islenmisPerformans = performansListesi
      .map((item) => {
        const toplam = item.yakit + item.bakim;
        const payYuzdesi = genelTop > 0 ? Math.round((toplam / genelTop) * 100) : 0;
        const yakitPayi = toplam > 0 ? Math.round((item.yakit / toplam) * 100) : 0;
        const bakimPayi = toplam > 0 ? Math.max(0, 100 - yakitPayi) : 0;
        const mesafeVar = item.katEdilenKm !== null;
        return {
          ...item,
          toplam,
          payYuzdesi,
          yakitPayi,
          bakimPayi,
          kmBasiTl: mesafeVar ? toplam / item.katEdilenKm : null,
          yakitKmBasiTl: mesafeVar ? item.yakit / item.katEdilenKm : null,
          yuzKmLitre:
            mesafeVar && item.tuketimLitresi > 0
              ? (item.tuketimLitresi / item.katEdilenKm) * 100
              : null,
        };
      })
      .sort((a, b) => b.toplam - a.toplam);

    // Aylık trend: tek araçta yalnızca o aracın kayıtlarından; filo modunda raporlama API'si (yoksa kayıtlardan)
    const aylikHarita = new Map();
    const aylikEkle = (tarih, alan, tutar) => {
      const ay = String(tarih || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(ay)) return;
      const satir = aylikHarita.get(ay) || { ay, yakit: 0, bakim: 0 };
      satir[alan] += Number(tutar) || 0;
      aylikHarita.set(ay, satir);
    };
    filtreliYakit.forEach((y) => aylikEkle(y.tarih, 'yakit', y.tutar));
    filtreliBakim.forEach((b) => aylikEkle(b.tarih, 'bakim', b.maliyet ?? b.tutar));

    const kayitTrendi = Array.from(aylikHarita.values())
      .sort((a, b) => a.ay.localeCompare(b.ay))
      .slice(-6)
      .map((t) => ({
        ay: t.ay,
        ayEtiketi: ayEtiketiFormatla(t.ay),
        yakit: t.yakit,
        bakim: t.bakim,
        toplam: t.yakit + t.bakim,
      }));

    const apiTrendi = aylikRapor.slice(-6).map((t) => {
      const yakitVal = Number(t.toplam_yakit) || 0;
      const bakimVal = Number(t.toplam_bakim) || 0;
      const toplamVal = Number(t.toplam_harcama) || yakitVal + bakimVal;
      return {
        ay: t.ay || 'Dönem',
        ayEtiketi: ayEtiketiFormatla(t.ay),
        yakit: yakitVal,
        bakim: bakimVal,
        toplam: toplamVal,
      };
    });

    const trendKaynak =
      !tekAracModu && apiTrendi.length > 0 ? apiTrendi : kayitTrendi;

    const maxTrend = Math.max(...trendKaynak.map((t) => t.toplam), 1);
    const trendBarlari = trendKaynak.map((t) => {
      const yakitPayi = t.toplam > 0 ? Math.round((t.yakit / t.toplam) * 100) : 0;
      return {
        ...t,
        dolulukYuzdesi: t.toplam > 0 ? Math.max(8, Math.round((t.toplam / maxTrend) * 100)) : 0,
        yakitPayi,
        bakimPayi: t.toplam > 0 ? Math.max(0, 100 - yakitPayi) : 0,
      };
    });

    // Yaklaşan parça sayısı: tek araçta yalnızca o aracın parçalarından (genelOzet fallback YOK)
    const parcaYaklasiyorMu = (p) => {
      const arac = araclar.find((a) => String(a.arac_id) === String(p.arac_id));
      const guncel = Number(
        p.guncel_km ??
          (arac?.sayac_tipi === 'SMH' ? arac?.guncel_calisma_saati : arac?.guncel_km) ??
          0
      );
      const son = Number(p.son_degisim_km ?? p.degisim_km ?? 0);
      const aralik = Number(p.degisim_araligi_km) > 0 ? Number(p.degisim_araligi_km) : Number(p.omur_km || 0);
      if (!aralik || aralik <= 0) return false;
      const kalan = aralik - (guncel - son);
      return kalan <= Math.min(1500, Math.round(aralik * 0.15));
    };

    let yaklasanParca = 0;
    if (parcalar !== null) {
      yaklasanParca = filtreliParca.filter(parcaYaklasiyorMu).length;
    } else if (!tekAracModu) {
      yaklasanParca = Number(genelOzet?.yaklasan_parca_sayisi || 0);
    }

    return {
      toplamGider: genelTop,
      toplamYakit: yTop,
      toplamBakim: bTop,
      toplamLitre: topLitre,
      toplamBakimSayisi:
        filtreliBakim.length > 0 || tekAracModu
          ? filtreliBakim.length
          : Number(genelOzet?.toplam_bakim_sayisi || 0),
      aktifAracSayisi: tekAracModu
        ? 1
        : araclar.length || Number(genelOzet?.toplam_arac || 0),
      yaklasanParcaSayisi: yaklasanParca,
      ortalamaKmMaliyeti: kmMaliyet,
      ortalamaYuzKmTuketim: yuzKmLitreGenel,
      yakitOrani: yOran,
      bakimOrani: bOran,
      aracPerformanslari: islenmisPerformans,
      aylikTrendBarlari: trendBarlari,
    };
  }, [araclar, yakitlar, bakimlar, parcalar, genelOzet, aylikRapor, aracDagilimi, seciliAracId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl bg-truss-surface" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl bg-truss-surface" />
      </div>
    );
  }

  return (
    <div className="space-y-5 print:space-y-4">
      {/* ÜST TELEMETRİ KOMUTA VE AKSİYON BARI */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-truss-border bg-truss-surface px-4 py-2.5 print:hidden">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-truss-purple" />
          <span className="text-xs font-bold uppercase tracking-wider text-truss-text">
            CHRONO-OS TELEMETRİ & FİNANSAL ANALİTİK MOTORU
          </span>
          <Badge variant="outline" className="border-truss-border bg-truss-bg font-mono text-[10px] text-truss-muted">
            {seciliAracId === 'tum' ? 'Tüm Filo' : `Araç #${seciliAracId}`}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={loadTelemetry}
            className="h-8 gap-1.5 rounded-lg border-truss-border bg-truss-bg text-xs text-truss-text hover:border-truss-purple hover:bg-truss-surface"
          >
            <RefreshCw className="size-3.5 text-truss-purple" />
            Verileri Yenile
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="h-8 gap-1.5 rounded-lg border-truss-border bg-truss-bg text-xs text-truss-text hover:border-truss-purple hover:bg-truss-surface"
          >
            <Printer className="size-3.5 text-truss-purple" />
            Raporu Yazdır
          </Button>
        </div>
      </div>

      {/* 1. KOMPAKT 5'Lİ TELEMETRİ KPI KARTLARI (TABULAR-NUMS) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <div className="flex items-center justify-between text-xs text-truss-muted">
            <span>Toplam Operasyon Gideri</span>
            <Banknote className="size-4 text-truss-purple" />
          </div>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums text-truss-text">
            {formatCurrency(toplamGider)}
          </p>
          <span className="mt-1 block text-[11px] tabular-nums text-truss-muted">
            Birleşik Yakıt & Servis Hacmi
          </span>
        </div>

        <div className="rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <div className="flex items-center justify-between text-xs text-truss-muted">
            <span>Yakıt Tüketim Maliyeti</span>
            <Fuel className="size-4 text-truss-purple" />
          </div>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums text-truss-purple">
            {formatCurrency(toplamYakit)}
          </p>
          <span className="mt-1 block text-[11px] tabular-nums text-truss-muted">
            Bütçenin %{yakitOrani}&apos;i • {formatLocaleNumber(toplamLitre, 1)} L
          </span>
        </div>

        <div className="rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <div className="flex items-center justify-between text-xs text-truss-muted">
            <span>Servis & Bakım Maliyeti</span>
            <Wrench className="size-4 text-truss-purple" />
          </div>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums text-truss-text">
            {formatCurrency(toplamBakim)}
          </p>
          <span className="mt-1 block text-[11px] tabular-nums text-truss-muted">
            Bütçenin %{bakimOrani}&apos;i • {toplamBakimSayisi} İşlem
          </span>
        </div>

        <div className="rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <div className="flex items-center justify-between text-xs text-truss-muted">
            <span>Yakıt & KM Verimliliği</span>
            <Gauge className="size-4 text-truss-purple" />
          </div>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums text-truss-text">
            {ortalamaKmMaliyeti !== null
              ? `${formatLocaleNumber(ortalamaKmMaliyeti, 2)} ₺/KM`
              : 'Veri Yetersiz'}
          </p>
          <span className="mt-1 block text-[11px] tabular-nums text-truss-muted">
            {ortalamaYuzKmTuketim !== null
              ? `Ort. ${formatLocaleNumber(ortalamaYuzKmTuketim, 1)} L / 100 KM`
              : 'Tüketim için en az 2 km kaydı gerekli'}
          </span>
        </div>

        <div className="rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <div className="flex items-center justify-between text-xs text-truss-muted">
            <span>Aktif Filo & Parça Uyarısı</span>
            <Truck className="size-4 text-truss-purple" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xl font-bold tabular-nums text-truss-text">
              {aktifAracSayisi} Araç
            </span>
            {yaklasanParcaSayisi > 0 ? (
              <Badge variant="destructive" className="gap-1 font-mono text-[10px] tabular-nums">
                <AlertTriangle className="size-3" />
                {yaklasanParcaSayisi} Kritik
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-truss-purple bg-truss-bg font-mono text-[10px] text-truss-purple"
              >
                Optimal
              </Badge>
            )}
          </div>
          <span className="mt-1 block text-[11px] text-truss-muted">
            Yaklaşan parça değişim radarı
          </span>
        </div>
      </div>

      {/* 2. TOPLAM GİDER DAĞILIMI SPEKTRUMU (YAKIT VS BAKIM) */}
      <div className="rounded-xl border border-truss-border bg-truss-surface p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-truss-purple" />
            <span className="text-xs font-bold uppercase tracking-wider text-truss-text">
              TOPLAM GİDER DAĞILIMI (YAKIT VS SERVİS SPEKTRUMU)
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs tabular-nums">
            <span className="flex items-center gap-1.5 font-mono text-truss-text">
              <span className="size-2.5 rounded-full bg-truss-purple" />
              Yakıt: {formatCurrency(toplamYakit)} (%{yakitOrani})
            </span>
            <span className="flex items-center gap-1.5 font-mono text-truss-muted">
              <span className="size-2.5 rounded-full border border-truss-border bg-truss-bg" />
              Bakım & Parça: {formatCurrency(toplamBakim)} (%{bakimOrani})
            </span>
          </div>
        </div>

        <div className="flex h-3 w-full overflow-hidden rounded-full border border-truss-border bg-truss-bg">
          <div
            style={{ width: `${yakitOrani}%` }}
            className="h-full bg-truss-purple transition-all"
          />
        </div>
      </div>

      {/* 3. AYLIK MALİYET TRENDLERİ (RECHARTS + DÖNEMSEL KIRILIM) & ARAÇ VERİMLİLİK MATRİSİ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Sol Sütun: Aylık Maliyet Trendleri */}
        <div className="lg:col-span-6 space-y-4 rounded-xl border border-truss-border bg-truss-surface p-4">
          <div className="flex items-center justify-between border-b border-truss-border pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-truss-purple" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-truss-text">
                  Aylık Maliyet Trendleri (Son 6 Dönem)
                </h3>
                <p className="text-[11px] text-truss-muted">
                  Yakıt ve bakım giderlerinin dönemsel akış grafiği ve dağılımı
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-truss-border bg-truss-bg font-mono text-[10px] text-truss-muted"
            >
              6 Ay
            </Badge>
          </div>

          {/* Kompakt Recharts AreaChart (Sadece TRUSS CSS Değişkenleri ile) */}
          <div className="h-48 w-full rounded-xl border border-truss-border bg-truss-bg p-2.5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={aylikTrendBarlari}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--truss-border)" />
                <XAxis
                  dataKey="ayEtiketi"
                  tick={{ fontSize: 11, fill: 'var(--truss-muted)' }}
                  stroke="var(--truss-border)"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--truss-muted)' }}
                  stroke="var(--truss-border)"
                  width={56}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'var(--truss-surface)',
                    borderColor: 'var(--truss-border)',
                    color: 'var(--truss-text)',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="yakit"
                  name="Yakıt Gideri"
                  stroke="var(--truss-purple)"
                  strokeWidth={2}
                  fill="var(--truss-purple)"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="bakim"
                  name="Bakım Gideri"
                  stroke="var(--truss-text)"
                  strokeWidth={1.5}
                  fill="var(--truss-border)"
                  fillOpacity={0.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Dönemsel Tabular-Nums Bar Listesi */}
          <div className="space-y-2.5">
            {aylikTrendBarlari.map((donem, i) => (
              <div
                key={i}
                className="rounded-xl border border-truss-border bg-truss-bg p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="font-semibold text-truss-text">{donem.ayEtiketi}</span>
                  <span className="font-mono font-bold text-truss-text">
                    {formatCurrency(donem.toplam)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full border border-truss-border bg-truss-surface">
                  <div
                    style={{ width: `${donem.dolulukYuzdesi}%` }}
                    className="h-full rounded-full bg-truss-purple transition-all"
                  />
                </div>
                <div className="flex justify-between font-mono text-[10px] tabular-nums text-truss-muted">
                  <span>
                    Yakıt: {formatCurrency(donem.yakit)} (%{donem.yakitPayi})
                  </span>
                  <span>
                    Bakım: {formatCurrency(donem.bakim)} (%{donem.bakimPayi})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ Sütun: Araç Bazlı Maliyet Özeti & ₺/KM Verimlilik Röntgeni */}
        <div className="lg:col-span-6 rounded-xl border border-truss-border bg-truss-surface p-4">
          <div className="mb-3 flex items-center justify-between border-b border-truss-border pb-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-truss-purple" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-truss-text">
                  Araç Bazlı Verimlilik (₺/KM) & Gider Dağılımı
                </h3>
                <p className="text-[11px] text-truss-muted">
                  Detaylı yakıt/bakım röntgeni için araç kartına tıklayın
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-truss-border bg-truss-bg font-mono text-[10px] text-truss-muted"
            >
              {aracPerformanslari.length} Araç
            </Badge>
          </div>

          <div className="space-y-2.5">
            {aracPerformanslari.map((arac) => {
              const isExpanded = expandedPlaka === arac.plaka;
              const birim = arac.sayac_tipi === 'SMH' ? 'SMH' : 'KM';

              return (
                <div
                  key={arac.plaka}
                  onClick={() =>
                    setExpandedPlaka((prev) => (prev === arac.plaka ? null : arac.plaka))
                  }
                  className="cursor-pointer rounded-xl border border-truss-border bg-truss-bg p-3.5 transition-all hover:border-truss-purple"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-lg border border-truss-border bg-truss-surface px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-truss-text">
                        {arac.plaka}
                      </span>
                      <span className="text-xs font-medium text-truss-muted">{arac.etiket}</span>
                    </div>

                    <div className="flex items-center gap-2.5 tabular-nums">
                      <Badge
                        variant="outline"
                        className="border-truss-purple bg-truss-surface font-mono text-[11px] text-truss-purple"
                      >
                        {arac.kmBasiTl !== null
                          ? `${formatLocaleNumber(arac.kmBasiTl, 2)} ₺/${birim}`
                          : 'Veri Yetersiz'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-truss-border bg-truss-surface font-mono text-[10px] text-truss-muted"
                      >
                        Pay: %{arac.payYuzdesi}
                      </Badge>
                      <span className="font-mono text-sm font-bold text-truss-text">
                        {formatCurrency(arac.toplam)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-truss-muted" />
                      ) : (
                        <ChevronDown className="size-4 text-truss-muted" />
                      )}
                    </div>
                  </div>

                  {/* Filo Payı İlerleyiş Barı */}
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full border border-truss-border bg-truss-surface">
                    <div
                      style={{ width: `${Math.max(6, arac.payYuzdesi)}%` }}
                      className="h-full bg-truss-purple transition-all"
                    />
                  </div>

                  {/* Progressive Disclosure Detay Alanı */}
                  {isExpanded && (
                    <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-truss-border pt-3 text-xs tabular-nums sm:grid-cols-4">
                       <div className="rounded-lg border border-truss-border bg-truss-surface p-2">
                         <span className="text-[10px] text-truss-muted">Yakıt Gideri</span>
                         <p className="mt-0.5 font-mono font-semibold text-truss-purple">
                           {formatCurrency(arac.yakit)}
                         </p>
                         <span className="font-mono text-[10px] text-truss-muted">
                           %{arac.yakitPayi} •{' '}
                           {arac.yakitKmBasiTl !== null
                             ? `${formatLocaleNumber(arac.yakitKmBasiTl, 2)} ₺/${birim}`
                             : 'Veri Yetersiz'}
                         </span>
                       </div>

                       <div className="rounded-lg border border-truss-border bg-truss-surface p-2">
                         <span className="text-[10px] text-truss-muted">Bakım & Parça Gideri</span>
                         <p className="mt-0.5 font-mono font-semibold text-truss-text">
                           {formatCurrency(arac.bakim)}
                         </p>
                         <span className="font-mono text-[10px] text-truss-muted">
                           %{arac.bakimPayi} Bütçe Payı
                         </span>
                       </div>

                       <div className="rounded-lg border border-truss-border bg-truss-surface p-2">
                         <span className="text-[10px] text-truss-muted">Ortalama Yakıt Tüketimi</span>
                         <p className="mt-0.5 flex items-center gap-1 font-mono font-semibold text-truss-text">
                           <Activity className="size-3 text-truss-purple" />
                           {arac.yuzKmLitre !== null
                             ? `${formatLocaleNumber(arac.yuzKmLitre, 1)} L/100${birim}`
                             : 'Veri Yetersiz'}
                         </p>
                         <span className="font-mono text-[10px] text-truss-muted">
                           Top. {formatLocaleNumber(arac.toplamLitre || 0, 1)} L
                         </span>
                       </div>

                       <div className="rounded-lg border border-truss-border bg-truss-surface p-2">
                         <span className="text-[10px] text-truss-muted">Baz Alınan Mesafe</span>
                         <p className="mt-0.5 font-mono font-semibold text-truss-text">
                           {arac.katEdilenKm !== null
                             ? `${formatLocaleNumber(arac.katEdilenKm, 0)} ${birim}`
                             : 'Veri Yetersiz'}
                         </p>
                         <span className="font-mono text-[10px] text-truss-muted">
                           {arac.islemSayisi || 0} Kayıtlı İşlem
                         </span>
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
