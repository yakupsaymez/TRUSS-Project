import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardStats, ChartAreaInteractive } from '@/components/dashboard';
import aracService from '@/services/aracService';
import raporService from '@/services/raporService';
import useVehicleStore from '@/store/useVehicleStore';
import ConfirmAlertDialog from '@/components/ConfirmAlertDialog';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    ChartContainer, ChartTooltip, ChartTooltipContent,
    ChartLegend, ChartLegendContent, BarChart, Bar, XAxis, YAxis,
} from '@/components/ui/chart';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileWarning, Car, Wrench, Fuel } from 'lucide-react';
import DashboardBeta from '@/pages/DashboardBeta';

const aracChartConfig = {
    yakit: { label: 'Yakıt (TL)', color: 'var(--chart-1)' },
    bakim: { label: 'Bakım (TL)', color: 'var(--chart-2)' },
};

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

const Dashboard = () => {
    const [showBeta, setShowBeta] = useState(false);
    const navigate = useNavigate();
    const deleteVehicle = useVehicleStore((s) => s.deleteVehicle);

    const [filoOzeti, setFiloOzeti] = useState({ tehlike: 0, uyari: 0, sorunsuz: 0, evrakSorunu: 0, gelecekAyTahmin: 0 });
    const [chartData, setChartData] = useState([]);
    const [aylikData, setAylikData] = useState([]);
    const [deleteId, setDeleteId] = useState(null);

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

        let tehlikeCount = 0;
        let uyariCount = 0;
        let sorunsuzCount = 0;
        let evrakSorunuCount = 0;
        let gelecekAyTahminToplami = 0;

        aracListesi.forEach((arac) => {
            gelecekAyTahminToplami += Number(arac.son_30_gun_yakit_tutari) || 0;
            const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
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
            const kalan =
                sonBakim !== null && Number.isFinite(sonBakim) && Number.isFinite(periyot)
                    ? sonBakim + periyot - sayac
                    : Infinity;
            if (kalan <= 0) tehlikeCount++;
            else if (kalan <= Math.min(isSmh ? 25 : 1500, periyot * 0.1)) uyariCount++;
            else sorunsuzCount++;

            const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
            if ([arac.muayene_tarihi, arac.kasko_tarihi, arac.sigorta_tarihi].some(tarih => {
                if (!tarih) return false;
                const hedef = new Date(tarih); hedef.setHours(0, 0, 0, 0);
                return Math.ceil((hedef - bugun) / MILLISECONDS_IN_DAY) <= 15;
            })) evrakSorunuCount++;
        });

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

    const handleDeleteConfirm = async () => {
        if (deleteId !== null) {
            await deleteVehicle(deleteId);
            await fetchData();
        }
        setDeleteId(null);
    };

    const formatTahminTL = (v) => formatCurrency(v || 0);

    if (showBeta) {
        return <DashboardBeta onRevert={() => setShowBeta(false)} />;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 border-truss-border bg-truss-surface text-xs text-truss-muted hover:border-truss-purple hover:text-truss-text"
                    onClick={() => setShowBeta(true)}
                >
                    🚀 Chrono-Ledger Beta Dene
                </Button>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => navigate('/yakitlar')}>
                        <Fuel className="size-3.5" /> Yakıt Kaydı
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => navigate('/bakim')}>
                        <Wrench className="size-3.5" /> Bakım Kaydı
                    </Button>
                    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => navigate('/vehicles')}>
                        <Car className="size-3.5" /> Araçlar
                    </Button>
                </div>
            </div>

            <DashboardStats
                filoOzeti={filoOzeti}
                formatTahminTL={formatTahminTL}
            />

            {(filoOzeti.tehlike > 0 || filoOzeti.evrakSorunu > 0) && (
                <div className="flex flex-col gap-2">
                    {filoOzeti.tehlike > 0 && (
                        <div
                            onClick={() => navigate('/vehicles?filtre=tehlike')}
                            className="cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all rounded-lg"
                        >
                            <Alert variant="destructive">
                                <AlertTriangle className="size-4" />
                                <div>
                                    <AlertTitle>Acil Bakım Gerekiyor</AlertTitle>
                                    <AlertDescription>
                                        {filoOzeti.tehlike} araç bakım limitini aşmış durumda — hemen müdahale gerekiyor.
                                    </AlertDescription>
                                </div>
                            </Alert>
                        </div>
                    )}
                    {filoOzeti.evrakSorunu > 0 && (
                        <div
                            onClick={() => navigate('/vehicles?filtre=evrak')}
                            className="cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all rounded-lg"
                        >
                            <Alert variant="warning">
                                <FileWarning className="size-4" />
                                <div>
                                    <AlertTitle>Evrak Süresi Dolmak Üzere</AlertTitle>
                                    <AlertDescription>
                                        {filoOzeti.evrakSorunu} aracın muayene / kasko / sigorta tarihi 15 gün içinde doluyor.
                                    </AlertDescription>
                                </div>
                            </Alert>
                        </div>
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

            <ConfirmAlertDialog
                open={deleteId !== null}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Aracı sil?"
                description="Bu araç ve ilişkili kayıtları silinecek. Bu işlem geri alınamaz."
                onConfirm={handleDeleteConfirm}
            />
        </div>
    );
};

export default Dashboard;
