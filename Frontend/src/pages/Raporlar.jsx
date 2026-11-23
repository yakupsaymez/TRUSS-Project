import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Printer,
  Banknote,
  Fuel,
  Wrench,
  Truck,
  AlertTriangle,
  PieChart as PieChartIcon,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import raporService from '@/services/raporService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PIE_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

const paraFormatla = (deger) =>
  `${Number(deger || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;

const ayEtiketiFormatla = (ayStr) => {
  if (!ayStr) return '';
  const [yil, ay] = String(ayStr).split('-');
  const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const idx = parseInt(ay, 10) - 1;
  return `${aylar[idx] || ay} ${yil}`;
};

export default function Raporlar() {
  const navigate = useNavigate();

  const [genelOzet, setGenelOzet] = useState({
    toplam_arac: 0,
    toplam_yakit_gideri: 0,
    toplam_bakim_gideri: 0,
    toplam_gider: 0,
    yaklasan_parca_sayisi: 0,
  });
  const [aylikTrend, setAylikTrend] = useState([]);
  const [aracDagilimi, setAracDagilimi] = useState([]);
  const [loading, setLoading] = useState(true);

  const verileriYukle = useCallback(async () => {
    setLoading(true);
    try {
      const [ozetRes, trendRes, dagilimRes] = await Promise.all([
        raporService.getGenelOzet(),
        raporService.getAylikHarcamaTrendi(),
        raporService.getAracMaliyetDagilimi(),
      ]);

      if (ozetRes) setGenelOzet(ozetRes);
      setAylikTrend(Array.isArray(trendRes) ? trendRes : []);
      setAracDagilimi(Array.isArray(dagilimRes) ? dagilimRes : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Rapor verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    verileriYukle();
  }, [navigate, verileriYukle]);

  const grafikTrendVerisi = useMemo(
    () =>
      aylikTrend.map((item) => ({
        ay: ayEtiketiFormatla(item.ay),
        Yakit: Number(item.toplam_yakit) || 0,
        Bakim: Number(item.toplam_bakim) || 0,
        Toplam: Number(item.toplam_harcama) || 0,
      })),
    [aylikTrend]
  );

  const pastaVerisi = useMemo(() => {
    const veriler = aracDagilimi
      .map((a) => ({
        name: a.plaka || `#${a.arac_id}`,
        value: Number(a.toplam_maliyet) || 0,
      }))
      .filter((item) => item.value > 0);

    if (veriler.length > 0) return veriler;

    const yakit = Number(genelOzet.toplam_yakit_gideri) || 0;
    const bakim = Number(genelOzet.toplam_bakim_gideri) || 0;
    if (yakit === 0 && bakim === 0) return [];
    return [
      { name: 'Yakıt Gideri', value: yakit },
      { name: 'Bakım Gideri', value: bakim },
    ];
  }, [aracDagilimi, genelOzet]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 print:space-y-4">
      {/* Kompakt Aksiyon Çubuğu (Toolbar) */}
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs print:hidden"
          onClick={handlePrint}
        >
          <Printer className="size-3.5" /> Raporu Yazdır (Print)
        </Button>
      </div>

      {/* Kompakt Tek Satırlık KPI Şeridi */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Banknote className="size-4 shrink-0 text-primary" />
            Toplam Filo Gideri
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight">
            {paraFormatla(genelOzet.toplam_gider)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Fuel className="size-4 shrink-0 text-sky-500" />
            Yakıt Gideri
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-sky-500">
            {paraFormatla(genelOzet.toplam_yakit_gideri)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Wrench className="size-4 shrink-0 text-emerald-500" />
            Bakım Gideri
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-emerald-500">
            {paraFormatla(genelOzet.toplam_bakim_gideri)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Truck className="size-4 shrink-0 text-amber-500" />
            Aktif Araç & Uyarı
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tabular-nums tracking-tight">
              {genelOzet.toplam_arac}
            </span>
            {Number(genelOzet.yaklasan_parca_sayisi) > 0 && (
              <Badge variant="outline" className="gap-1 border-amber-500/50 px-1.5 py-0 text-[10px] tabular-nums text-amber-500">
                <AlertTriangle className="size-3" />
                {genelOzet.yaklasan_parca_sayisi}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Orta Bölüm: Grafikler */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl bg-muted/40 lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-xl bg-muted/40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Sol: Son 6 Ay Harcama Trendi (AreaChart) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <TrendingUp className="size-4 text-primary" />
                  Aylık Harcama Trendi (Son 6 Ay)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ay bazında yakıt ve bakım giderlerinin karşılaştırmalı analizi
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={grafikTrendVerisi} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorYakit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBakim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => paraFormatla(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="Yakit"
                    name="Yakıt Gideri"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorYakit)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Bakim"
                    name="Bakım Gideri"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBakim)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sağ: Maliyet Dağılımı (Donut / PieChart) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <PieChartIcon className="size-4 text-primary" />
                Maliyet Dağılımı
              </h2>
              <p className="text-xs text-muted-foreground">
                Araç bazında toplam harcama payları
              </p>
            </div>

            {pastaVerisi.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                Henüz maliyet verisi bulunmuyor.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pastaVerisi}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pastaVerisi.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => paraFormatla(value)} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alt Bölüm: Araç Bazlı Maliyet Tablosu */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Araç Bazlı Maliyet Özeti</h2>
          <p className="text-xs text-muted-foreground">
            Her aracın yakıt, bakım ve toplam operasyonel gider kırılımı
          </p>
        </div>

        {aracDagilimi.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Kayıtlı araç bulunamadı.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Plaka</TableHead>
                <TableHead>Marka / Model</TableHead>
                <TableHead className="text-right">Yakıt Gideri</TableHead>
                <TableHead className="text-right">Bakım Gideri</TableHead>
                <TableHead className="text-right">Toplam Maliyet</TableHead>
                <TableHead className="text-right">Filo Payı</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aracDagilimi.map((arac) => {
                const toplamFilo = Number(genelOzet.toplam_gider) || 0;
                const aracMaliyet = Number(arac.toplam_maliyet) || 0;
                const pay = toplamFilo > 0 ? ((aracMaliyet / toplamFilo) * 100).toFixed(1) : '0.0';

                return (
                  <TableRow key={arac.arac_id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-semibold">{arac.plaka}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {arac.marka} {arac.model} {arac.yil ? `(${arac.yil})` : ''}
                    </TableCell>
                    <TableCell className="text-right text-sm text-sky-500">
                      {paraFormatla(arac.toplam_yakit)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-500">
                      {paraFormatla(arac.toplam_bakim)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold">
                      {paraFormatla(arac.toplam_maliyet)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">%{pay}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
