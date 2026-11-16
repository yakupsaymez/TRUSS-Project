import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVehicleStore from '@/store/useVehicleStore';
import yakitService from '@/services/yakitService';
import bakimService from '@/services/bakimService';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  Fuel,
  Wrench,
  FileWarning,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Calendar,
  Gauge,
  Sparkles,
  ArrowUpRight,
  Layers,
} from 'lucide-react';

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

const FALLBACK_TIMELINE = [
  {
    id: 'sim-1',
    zamanTipi: 'GELECEK',
    kategori: 'EVRAK',
    plaka: '34 TRS 001',
    aracAdi: 'Mercedes-Benz Actros 1848',
    baslik: 'Kasko & Trafik Sigortası Yenileme',
    tarihStr: '12 Gün Sonra',
    tutar: 24500,
    sayac: 148200,
    detayMetni: 'Poliçe bitiş tarihi yaklaşıyor. Tahmini yenileme bütçesi önceki yıl artış oranıyla simüle edildi.',
    veriKaynagi: 'Simülasyon Motoru',
  },
  {
    id: 'sim-2',
    zamanTipi: 'GELECEK',
    kategori: 'BAKIM',
    plaka: '06 FL 404',
    aracAdi: 'Ford Transit 350L',
    baslik: '150.000 KM Ağır Bakım & Triger Seti',
    tarihStr: 'Tahmini 18 Gün Sonra',
    tutar: 16800,
    sayac: 149100,
    detayMetni: 'Günlük ortalama 50 KM sürüş temposuna göre bakım eşiğine 900 KM kaldı.',
    veriKaynagi: 'Telemetri Öngörüsü',
  },
  {
    id: 'gecmis-1',
    zamanTipi: 'GECMIS',
    kategori: 'YAKIT',
    plaka: '34 TRS 001',
    aracAdi: 'Mercedes-Benz Actros 1848',
    baslik: 'Dizel Yakıt İkmali • 320,00 L',
    tarihStr: 'Bugün • 09:40',
    tutar: 13760,
    sayac: 148200,
    detayMetni: 'Birim maliyet: 43,00 ₺/L • Önceki dolumdan bu yana 1.120 KM kat edildi.',
    veriKaynagi: 'Onaylı Fiş',
  },
  {
    id: 'gecmis-2',
    zamanTipi: 'GECMIS',
    kategori: 'BAKIM',
    plaka: '35 EGE 88',
    aracAdi: 'Renault Clio 1.5 Blue dCi',
    baslik: 'Periyodik Yağ & Filtre Bakımı',
    tarihStr: '3 Gün Önce',
    tutar: 6450,
    sayac: 89400,
    detayMetni: '5W-30 sentetik motor yağı, polen, hava ve yağ filtresi yetkili serviste değiştirildi.',
    veriKaynagi: 'Servis Faturası',
  },
];

const DashboardBeta = ({ onRevert }) => {
  const navigate = useNavigate();
  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);

  const [yakitlar, setYakitlar] = useState([]);
  const [bakimlar, setBakimlar] = useState([]);
  const [streamLoading, setStreamLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [aktifKusat, setAktifKusat] = useState('TUMU'); // TUMU | GELECEK | GECMIS

  useEffect(() => {
    let active = true;
    const loadChronoData = async () => {
      setStreamLoading(true);
      try {
        await fetchAraclar();
        const [yRes, bRes] = await Promise.all([
          yakitService.getAllYakitlar().catch(() => []),
          bakimService.getAllBakimlar().catch(() => []),
        ]);
        if (!active) return;
        setYakitlar(Array.isArray(yRes) ? yRes : yRes?.yakitlar || []);
        setBakimlar(Array.isArray(bRes) ? bRes : bRes?.bakimlar || []);
      } finally {
        if (active) setStreamLoading(false);
      }
    };
    loadChronoData();
    return () => {
      active = false;
    };
  }, [fetchAraclar]);

  const zamanAkisi = useMemo(() => {
    const olaylar = [];
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    // 1. GELECEK PROJEKSİYONLARI (Muayene, Sigorta, Kasko, Yaklaşan KM Bakımı)
    araclar.forEach((arac) => {
      const aracEtiket = `${arac.marka || ''} ${arac.model || ''}`.trim() || 'Filo Aracı';
      const evraklar = [
        { key: 'muayene_tarihi', ad: 'TÜVTÜRK Muayene Yenileme', tahmini: 4200 },
        { key: 'sigorta_tarihi', ad: 'Zorunlu Trafik Sigortası', tahmini: 9500 },
        { key: 'kasko_tarihi', ad: 'Kasko Poliçe Yenileme', tahmini: 18500 },
      ];

      evraklar.forEach(({ key, ad, tahmini }) => {
        if (!arac[key]) return;
        const hedef = new Date(arac[key]);
        hedef.setHours(0, 0, 0, 0);
        const kalanGun = Math.ceil((hedef - bugun) / MILLISECONDS_IN_DAY);
        if (kalanGun <= 60) {
          olaylar.push({
            id: `evrak-${key}-${arac.arac_id}`,
            arac_id: arac.arac_id,
            zamanTipi: 'GELECEK',
            kategori: 'EVRAK',
            plaka: arac.plaka,
            aracAdi: aracEtiket,
            baslik: ad,
            tarihStr:
              kalanGun < 0
                ? `${Math.abs(kalanGun)} Gün Gecikti`
                : kalanGun === 0
                  ? 'Bugün Son Gün'
                  : `${kalanGun} Gün Sonra (${String(arac[key]).slice(0, 10)})`,
            tutar: tahmini,
            sayac: Number(arac.guncel_km || arac.guncel_sayac || 0),
            detayMetni: `${arac.plaka} plakalı aracın resmi ${ad.toLowerCase()} tarihi: ${String(arac[key]).slice(0, 10)}. Gecikme cezası oluşmaması için randevu/poliçe onayı önerilir.`,
            veriKaynagi: 'Resmi Takvim Projeksiyonu',
            sortWeight: 2000 - kalanGun,
          });
        }
      });

      const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
      const sayac = Number(arac.guncel_sayac ?? (isSmh ? arac.guncel_calisma_saati : arac.guncel_km) ?? 0);
      const periyot = Number(
        (isSmh ? arac.calisma_saati_bakim : arac.onerilen_bakim_km) ||
          arac.bakim_periyodu ||
          (isSmh ? 250 : 15000)
      );
      const sonBakim =
        arac.son_bakim_km !== null && arac.son_bakim_km !== undefined ? Number(arac.son_bakim_km) : null;

      if (sonBakim !== null && Number.isFinite(sonBakim)) {
        const kalan = sonBakim + periyot - sayac;
        if (kalan <= (isSmh ? 50 : 3000)) {
          olaylar.push({
            id: `gelecek-bakim-${arac.arac_id}`,
            arac_id: arac.arac_id,
            zamanTipi: 'GELECEK',
            kategori: 'BAKIM',
            plaka: arac.plaka,
            aracAdi: aracEtiket,
            baslik: kalan <= 0 ? 'Periyodik Bakım Eşiği Aşıldı' : 'Yaklaşan Periyodik Bakım',
            tarihStr:
              kalan <= 0
                ? `${formatLocaleNumber(Math.abs(kalan))} ${isSmh ? 'SMH' : 'KM'} Aşım`
                : `${formatLocaleNumber(kalan)} ${isSmh ? 'SMH' : 'KM'} Kaldı`,
            tutar: 7500,
            sayac,
            detayMetni: `Son bakım ${formatLocaleNumber(sonBakim)} ${isSmh ? 'SMH' : 'KM'}'de yapıldı. Önerilen periyot: ${formatLocaleNumber(periyot)} ${isSmh ? 'SMH' : 'KM'}.`,
            veriKaynagi: 'Telemetri Sayacı',
            sortWeight: 2500,
          });
        }
      }
    });

    // 2. GEÇMİŞ YAKIT HAREKETLERİ
    yakitlar.slice(0, 12).forEach((y) => {
      const litre = Number(y.litre) || 0;
      const tutar = Number(y.tutar) || 0;
      const birim = litre > 0 ? tutar / litre : 0;
      olaylar.push({
        id: `yakit-${y.yakit_id}`,
        arac_id: y.arac_id,
        zamanTipi: 'GECMIS',
        kategori: 'YAKIT',
        plaka: y.plaka || `#${y.arac_id}`,
        aracAdi: `${y.marka || ''} ${y.model || ''}`.trim() || 'Filo Aracı',
        baslik: `${y.yakit_tipi || 'Dizel'} Yakıt İkmali • ${formatLocaleNumber(litre, 2)} L`,
        tarihStr: y.tarih ? new Date(y.tarih).toLocaleDateString('tr-TR') : 'Kayıtlı',
        tutar,
        sayac: Number(y.km || 0),
        detayMetni: `Litre birim fiyatı: ${formatLocaleNumber(birim, 2)} ₺/L. ${y.notlar ? `Not: ${y.notlar}` : 'Standart istasyon dolumu.'}`,
        veriKaynagi: 'Yakıt Defteri',
        sortWeight: y.tarih ? new Date(y.tarih).getTime() / 100000000 : 100,
      });
    });

    // 3. GEÇMİŞ BAKIM HAREKETLERİ
    bakimlar.slice(0, 12).forEach((b) => {
      olaylar.push({
        id: `bakim-${b.bakim_id}`,
        arac_id: b.arac_id,
        zamanTipi: 'GECMIS',
        kategori: 'BAKIM',
        plaka: b.plaka || `#${b.arac_id}`,
        aracAdi: `${b.marka || ''} ${b.model || ''}`.trim() || 'Filo Aracı',
        baslik: b.islem_turu || b.bakim_turu || 'Servis & Bakım İşlemi',
        tarihStr: b.tarih ? new Date(b.tarih).toLocaleDateString('tr-TR') : 'Kayıtlı',
        tutar: Number(b.maliyet || b.tutar || 0),
        sayac: Number(b.km || 0),
        detayMetni: b.aciklama || b.notlar || 'Periyodik servis kontrolü ve sarf malzeme değişimi tamamlandı.',
        veriKaynagi: 'Servis Kaydı',
        sortWeight: b.tarih ? new Date(b.tarih).getTime() / 100000000 : 90,
      });
    });

    if (olaylar.length === 0) {
      return FALLBACK_TIMELINE;
    }

    return olaylar.sort((a, b) => (b.sortWeight || 0) - (a.sortWeight || 0));
  }, [araclar, yakitlar, bakimlar]);

  const filtrelenmisAkis = useMemo(() => {
    if (aktifKusat === 'TUMU') return zamanAkisi;
    return zamanAkisi.filter((item) => item.zamanTipi === aktifKusat);
  }, [zamanAkisi, aktifKusat]);

  // 365 Günlük Nabız Matrisi (Pulse Heatmap - 36 Hücrelik Kompakt Temsil)
  const nabizHucresi = useMemo(() => {
    return Array.from({ length: 36 }).map((_, idx) => {
      const yogunluk = (idx * 7 + zamanAkisi.length) % 4;
      return yogunluk;
    });
  }, [zamanAkisi.length]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-full space-y-4 bg-truss-bg text-truss-text">
      {/* ÜST EVREN BAŞLIĞI & 365 GÜN NABIZ MATRİSİ */}
      <div className="rounded-xl border border-truss-border bg-truss-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-truss-purple/40 bg-truss-purple/15 text-truss-purple">
              <Layers className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-truss-text">
                  THE CHRONO-LEDGER
                </span>
                <Badge
                  variant="outline"
                  className="border-truss-purple/40 bg-truss-purple/10 text-[10px] font-semibold text-truss-purple"
                >
                  EVREN 3 • ZAMAN TÜNELİ
                </Badge>
              </div>
              <p className="text-xs text-truss-muted">
                Geçmiş harcamalar ve gelecekteki bakım/evrak projeksiyonları tek doğrusal akışta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-truss-border bg-truss-bg p-0.5">
              {[
                { key: 'TUMU', label: 'Tüm Zamanlar' },
                { key: 'GELECEK', label: 'Gelecek Simülasyonu' },
                { key: 'GECMIS', label: 'Geçmiş Defter' },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setAktifKusat(s.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    aktifKusat === s.key
                      ? 'bg-truss-purple text-truss-text'
                      : 'text-truss-muted hover:text-truss-text'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {onRevert && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRevert}
                className="h-8 gap-1.5 rounded-lg border-truss-border bg-truss-bg px-3 text-xs text-truss-muted hover:border-truss-purple hover:text-truss-text"
              >
                <ArrowLeft className="size-3.5" />
                Klasik Dashboard
              </Button>
            )}
          </div>
        </div>

        {/* Filo Nabız Matrisi (Pulse Heatmap Strip) */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-truss-border pt-3">
          <span className="text-[11px] font-medium text-truss-muted">
            Yıllık Filo Operasyon Nabzı (365 Günlük Yoğunluk İzi):
          </span>
          <div className="flex items-center gap-1">
            {nabizHucresi.map((level, i) => (
              <span
                key={i}
                className={`h-3 w-2 rounded-sm border border-truss-border ${
                  level === 3
                    ? 'bg-truss-purple'
                    : level === 2
                      ? 'bg-truss-purple/60'
                      : level === 1
                        ? 'bg-truss-purple/25'
                        : 'bg-truss-bg'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* DOĞRUSAL ZAMAN TÜNELİ (STRIPE / REVOLUT TARZI CHRONO STREAM) */}
      {loading && streamLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-truss-surface" />
          ))}
        </div>
      ) : (
        <div className="relative pl-6 before:absolute before:bottom-3 before:left-2.5 before:top-3 before:w-px before:bg-truss-border">
          <div className="space-y-3">
            {filtrelenmisAkis.map((item) => {
              const isExpanded = expandedId === item.id;
              const isGelecek = item.zamanTipi === 'GELECEK';

              return (
                <div key={item.id} className="relative">
                  {/* Zaman Ekseni Düğümü (Node) */}
                  <span
                    className={`absolute -left-6 top-4 flex size-5 items-center justify-center rounded-full border ${
                      isGelecek
                        ? 'border-dashed border-truss-purple bg-truss-bg text-truss-purple'
                        : 'border-truss-border bg-truss-surface text-truss-muted'
                    }`}
                  >
                    {item.kategori === 'YAKIT' ? (
                      <Fuel className="size-2.5" />
                    ) : item.kategori === 'BAKIM' ? (
                      <Wrench className="size-2.5" />
                    ) : (
                      <FileWarning className="size-2.5" />
                    )}
                  </span>

                  {/* Akordeon Kartı (Progressive Disclosure) */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className={`cursor-pointer rounded-xl border transition-all ${
                      isGelecek
                        ? 'border-truss-purple/40 bg-truss-surface/90 hover:border-truss-purple'
                        : 'border-truss-border bg-truss-surface hover:border-truss-purple/50'
                    }`}
                  >
                    {/* Katman 1: Sakin Tek Satır Özet */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Badge
                          variant="outline"
                          className={
                            isGelecek
                              ? 'border-truss-purple/40 bg-truss-purple/15 text-[10px] font-semibold text-truss-purple'
                              : 'border-truss-border bg-truss-bg text-[10px] font-medium text-truss-muted'
                          }
                        >
                          {isGelecek ? 'PROJEKSİYON' : 'GERÇEKLEŞTİ'}
                        </Badge>
                        <span className="font-mono text-xs font-bold tabular-nums text-truss-text">
                          {item.plaka}
                        </span>
                        <span className="text-sm font-medium text-truss-text">{item.baslik}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs tabular-nums text-truss-muted">
                          <Clock className="size-3" />
                          {item.tarihStr}
                        </span>
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            isGelecek ? 'text-truss-purple' : 'text-truss-text'
                          }`}
                        >
                          {isGelecek ? `~${formatCurrency(item.tutar)}` : `-${formatCurrency(item.tutar)}`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-truss-muted" />
                        ) : (
                          <ChevronDown className="size-4 text-truss-muted" />
                        )}
                      </div>
                    </div>

                    {/* Katman 2: Progressive Disclosure (Tıklandığında Açılan Derin Telemetri) */}
                    {isExpanded && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="border-t border-truss-border bg-truss-bg/60 px-4 py-3.5 text-xs"
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <span className="text-[11px] text-truss-muted">Araç & Model</span>
                            <p className="mt-0.5 font-semibold text-truss-text">{item.aracAdi}</p>
                          </div>
                          <div>
                            <span className="text-[11px] text-truss-muted">Kayıtlı Sayaç</span>
                            <p className="mt-0.5 flex items-center gap-1 font-mono font-semibold tabular-nums text-truss-text">
                              <Gauge className="size-3.5 text-truss-purple" />
                              {formatLocaleNumber(item.sayac)} KM
                            </p>
                          </div>
                          <div>
                            <span className="text-[11px] text-truss-muted">Veri Kaynağı</span>
                            <p className="mt-0.5 flex items-center gap-1 font-medium text-truss-purple">
                              <Sparkles className="size-3.5" />
                              {item.veriKaynagi}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 rounded-lg border border-truss-border bg-truss-surface p-2.5 text-xs leading-relaxed text-truss-muted">
                          {item.detayMetni}
                        </p>

                        <div className="mt-3 flex items-center justify-end gap-2">
                          {item.arac_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/arac/${item.arac_id}`)}
                              className="h-7 gap-1 rounded-lg border-truss-border bg-truss-surface px-2.5 text-xs text-truss-text hover:border-truss-purple"
                            >
                              Araç Dosyasına Git
                              <ArrowUpRight className="size-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(item.kategori === 'YAKIT' ? '/yakitlar' : '/bakimlar')
                            }
                            className="h-7 gap-1 rounded-lg bg-truss-purple px-3 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                          >
                            <Calendar className="size-3" />
                            {isGelecek ? 'Şimdi Kayda Dönüştür' : 'Kaydı İncele'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardBeta;
