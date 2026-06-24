import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardStats, ChartAreaInteractive } from '@/components/dashboard';
import aracService from '@/services/aracService';
import bakimService from '@/services/bakimService';
import yakitService from '@/services/yakitService';
import raporService from '@/services/raporService';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    ChartContainer, ChartTooltip, ChartTooltipContent,
    ChartLegend, ChartLegendContent, BarChart, Bar, XAxis, YAxis,
} from '@/components/ui/chart';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, FileWarning } from 'lucide-react';

const aracChartConfig = {
    yakit: { label: 'Yakıt (TL)', color: 'var(--chart-1)' },
    bakim: { label: 'Bakım (TL)', color: 'var(--chart-2)' },
};

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

const Dashboard = () => {
    const navigate = useNavigate();

    const [filoOzeti, setFiloOzeti] = useState({ tehlike: 0, uyari: 0, sorunsuz: 0, evrakSorunu: 0, gelecekAyTahmin: 0 });
    const [chartData, setChartData] = useState([]);
    const [aylikData, setAylikData] = useState([]);

    const fetchData = useCallback(async () => {
        const [data, giderler, aylik] = await Promise.all([
            aracService.getAraclar(),
            raporService.getAracGiderleri().catch(() => []),
            raporService.getAylikOzet().catch(() => []),
        ]);

        setAylikData(Array.isArray(aylik) ? aylik : []);

        const aracListesi = Array.isArray(data) ? data : (data?.araclar || []);
        const giderListesi = Array.isArray(giderler) ? giderler : [];
        setChartData(giderListesi.map(r => ({
            label: r.plaka,
            yakit: Math.round(Number(r.toplam_yakit) || 0),
            bakim: Math.round(Number(r.toplam_bakim) || 0),
        })));

        const son30GunBaslangic = new Date(Date.now() - 30 * MILLISECONDS_IN_DAY);
        let tehlikeCount = 0;
        let uyariCount = 0;
        let sorunsuzCount = 0;
        let evrakSorunuCount = 0;
        let gelecekAyTahminToplami = 0;

        await Promise.all(aracListesi.map(async (arac) => {
            try {
                const [bakimRes, yakitRes] = await Promise.all([
                    bakimService.getBakimlarByArac(arac.arac_id),
                    yakitService.getYakitlarByArac(arac.arac_id),
                ]);
                const bakimlar = Array.isArray(bakimRes) ? bakimRes : (bakimRes?.bakimlar || []);
                const yakitlar = Array.isArray(yakitRes) ? yakitRes : (yakitRes?.yakitlar || []);

                gelecekAyTahminToplami += yakitlar.reduce((sum, y) => {
                    const t = new Date(y?.tarih);
                    return t >= son30GunBaslangic ? sum + (Number(y?.tutar) || 0) : sum;
                }, 0);

                const tumKmler = [...bakimlar, ...yakitlar].map(i => Number(i.km)).filter(Number.isFinite);
                const guncelKm = tumKmler.length > 0 ? Math.max(...tumKmler) : 0;
                const sonBakim = bakimlar.length > 0
                    ? bakimlar.reduce((max, cur) => Number(cur.km) > Number(max.km) ? cur : max, bakimlar[0])
                    : null;

                if (sonBakim) {
                    const kalanKm = (Number(sonBakim.km) + 10000) - guncelKm;
                    if (kalanKm <= 0) tehlikeCount++;
                    else if (kalanKm <= 1500) uyariCount++;
                    else sorunsuzCount++;
                } else {
                    sorunsuzCount++;
                }

                const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
                const evrakRiskiVar = [arac.muayene_tarihi, arac.kasko_tarihi, arac.sigorta_tarihi].some(tarih => {
                    if (!tarih) return false;
                    const hedef = new Date(tarih); hedef.setHours(0, 0, 0, 0);
                    return Math.ceil((hedef - bugun) / MILLISECONDS_IN_DAY) <= 15;
                });
                if (evrakRiskiVar) evrakSorunuCount++;
            } catch { /* per-vehicle errors silently ignored */ }
        }));

        setFiloOzeti({
            tehlike: tehlikeCount,
            uyari: uyariCount,
            sorunsuz: sorunsuzCount,
            evrakSorunu: evrakSorunuCount,
            gelecekAyTahmin: gelecekAyTahminToplami,
        });
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        fetchData();
    }, [navigate, fetchData]);

    const formatTahminTL = (v) => formatCurrency(v || 0);
    const handleStatClick = (filtre) => navigate(`/vehicles?filtre=${filtre}`);

    return (
        <div className="space-y-4">
            <DashboardStats
                filoOzeti={filoOzeti}
                setAktifFiltre={handleStatClick}
                formatTahminTL={formatTahminTL}
            />

            {(filoOzeti.tehlike > 0 || filoOzeti.evrakSorunu > 0) && (
                <div className="flex flex-col gap-2">
                    {filoOzeti.tehlike > 0 && (
                        <Alert variant="destructive">
                            <AlertTriangle className="size-4" />
                            <div>
                                <AlertTitle>Acil Bakım Gerekiyor</AlertTitle>
                                <AlertDescription>
                                    {filoOzeti.tehlike} araç bakım limitini aşmış durumda — hemen müdahale gerekiyor.
                                </AlertDescription>
                            </div>
                        </Alert>
                    )}
                    {filoOzeti.evrakSorunu > 0 && (
                        <Alert variant="warning">
                            <FileWarning className="size-4" />
                            <div>
                                <AlertTitle>Evrak Süresi Dolmak Üzere</AlertTitle>
                                <AlertDescription>
                                    {filoOzeti.evrakSorunu} aracın muayene / kasko / sigorta tarihi 15 gün içinde doluyor.
                                </AlertDescription>
                            </div>
                        </Alert>
                    )}
                </div>
            )}

            <ChartAreaInteractive data={aylikData} />

            {chartData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Araç Bazlı Giderler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={aracChartConfig} className="h-[260px] w-full">
                            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="yakit" fill="var(--color-yakit)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="bakim" fill="var(--color-bakim)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Dashboard;
