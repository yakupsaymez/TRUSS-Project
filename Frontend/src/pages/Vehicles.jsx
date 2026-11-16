import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Fuel, Download, ArrowUpDown, ArrowUp, ArrowDown, Eye, Pencil, Trash2 } from 'lucide-react';
import yakitServiceModule from '@/services/yakitService';
import { formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';
import { exportToCSV } from '@/utils/exporter';
import { AddVehicleModal, QuickFuelModal } from '@/components/dashboard';
import useVehicleStore from '@/store/useVehicleStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import AraclarBeta from '@/pages/AraclarBeta';

function AracDurumBadge({ arac, riskliIdler }) {
    const tehlikede = riskliIdler.tehlike.includes(arac.arac_id);
    const evrakSorunu = riskliIdler.evrak.includes(arac.arac_id);
    if (tehlikede) return <Badge variant="destructive" className="text-xs">Bakım Gerekli</Badge>;
    if (evrakSorunu) return <Badge variant="outline" className="border-orange-400/50 text-orange-500 text-xs">Evrak Sorunu</Badge>;
    return <Badge variant="outline" className="border-emerald-400/50 text-emerald-500 text-xs">Sorunsuz</Badge>;
}

export default function Vehicles() {
    const [showBeta, setShowBeta] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const araclar = useVehicleStore((s) => s.araclar);
    const loading = useVehicleStore((s) => s.loading);
    const riskliAracIdler = useVehicleStore((s) => s.riskliAracIdler);
    const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
    const openModal = useVehicleStore((s) => s.openModal);
    const openEditModal = useVehicleStore((s) => s.openEditModal);
    const deleteVehicle = useVehicleStore((s) => s.deleteVehicle);

    const [aktifFiltre, setAktifFiltre] = useState(searchParams.get('filtre') || 'tum');
    const [aramaMetni, setAramaMetni] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'plaka', order: 'asc' });

    // Quick Fuel Modal
    const [isQuickFuelModalOpen, setIsQuickFuelModalOpen] = useState(false);
    const [isQuickFuelModalVisible, setIsQuickFuelModalVisible] = useState(false);
    const [quickFuelData, setQuickFuelData] = useState({ arac_id: '', tarih: '', litre: '', tutar: '', km: '' });
    const [quickFuelError, setQuickFuelError] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [isQuickFuelSubmitting, setIsQuickFuelSubmitting] = useState(false);
    const quickFuelAracSelectRef = useRef(null);
    const quickFuelCloseTimerRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        fetchAraclar();
    }, [navigate, fetchAraclar]);

    useEffect(() => () => {
        if (quickFuelCloseTimerRef.current) clearTimeout(quickFuelCloseTimerRef.current);
    }, []);

    useEffect(() => {
        if (isQuickFuelModalOpen && isQuickFuelModalVisible && quickFuelAracSelectRef.current) quickFuelAracSelectRef.current.focus();
    }, [isQuickFuelModalOpen, isQuickFuelModalVisible]);

    // Filtered + sorted vehicle list
    const gosterilenAraclar = React.useMemo(() => {
        let liste = araclar;
        if (aktifFiltre === 'tehlike') {
            const ids = new Set(riskliAracIdler.tehlike);
            liste = araclar.filter(a => ids.has(a.arac_id));
        } else if (aktifFiltre === 'evrak') {
            const ids = new Set(riskliAracIdler.evrak);
            liste = araclar.filter(a => ids.has(a.arac_id));
        }
        if (aramaMetni.trim()) {
            const q = aramaMetni.trim().toLowerCase();
            liste = liste.filter(a =>
                (a.plaka || '').toLowerCase().includes(q) ||
                (a.marka || '').toLowerCase().includes(q) ||
                (a.model || '').toLowerCase().includes(q)
            );
        }
        return [...liste].sort((a, b) => {
            const av = String(a[sortConfig.key] ?? '').toLowerCase();
            const bv = String(b[sortConfig.key] ?? '').toLowerCase();
            return sortConfig.order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        });
    }, [araclar, aktifFiltre, aramaMetni, sortConfig, riskliAracIdler]);

    const handleSort = (key) => setSortConfig(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
    }));

    const SortIcon = ({ colKey }) => {
        if (sortConfig.key !== colKey) return <ArrowUpDown className="ml-1 inline-block size-3 opacity-40" />;
        return sortConfig.order === 'asc'
            ? <ArrowUp className="ml-1 inline-block size-3" />
            : <ArrowDown className="ml-1 inline-block size-3" />;
    };

    const handleFormEnterKeyDown = (e) => {
        if (e.key !== 'Enter' || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault(); e.currentTarget.requestSubmit();
    };

    const handleDeleteConfirm = async () => {
        if (deleteId !== null) {
            await deleteVehicle(deleteId);
        }
        setDeleteId(null);
    };

    const openQuickFuelModal = () => {
        setQuickFuelError(null);
        setQuickFuelData({ arac_id: '', tarih: '', litre: '', tutar: '', km: '' });
        setIsQuickFuelModalOpen(true); setIsQuickFuelModalVisible(true);
    };
    const closeQuickFuelModal = () => {
        setIsQuickFuelModalVisible(false);
        quickFuelCloseTimerRef.current = setTimeout(() => { setIsQuickFuelModalOpen(false); setQuickFuelError(null); }, 200);
    };
    const handleQuickFuelInputChange = (e) => {
        const { name, value } = e.target;
        setQuickFuelData(prev => ({ ...prev, [name]: value }));
    };
    const handleQuickFuelNumberBlur = (e) => {
        const { name, value } = e.target;
        if (!['tutar', 'km'].includes(name)) return;
        const parsed = parseLocaleNumber(value);
        if (parsed === null) return;
        setQuickFuelData(prev => ({ ...prev, [name]: formatLocaleNumber(parsed, name === 'tutar' ? 2 : 0) }));
    };
    const handleQuickFuelSubmit = async (e) => {
        e.preventDefault(); setQuickFuelError(null);
        const parsedLitre = parseLocaleNumber(quickFuelData.litre);
        const parsedTutar = parseLocaleNumber(quickFuelData.tutar);
        const parsedKm = parseLocaleNumber(quickFuelData.km);
        if (!quickFuelData.arac_id || !quickFuelData.tarih || parsedLitre === null || parsedTutar === null || parsedKm === null) {
            setQuickFuelError('Lütfen tüm alanları eksiksiz doldurun.'); return;
        }
        try {
            setIsQuickFuelSubmitting(true);
            await yakitServiceModule.yakitEkle({ arac_id: Number(quickFuelData.arac_id), yakit_tipi: 'Diğer', tarih: quickFuelData.tarih, litre: parsedLitre, tutar: parsedTutar, km: parsedKm });
            closeQuickFuelModal();
            toast.success('Yakıt kaydı eklendi.');
        } catch (err) {
            setQuickFuelError(err?.response?.data?.message || 'Yakıt eklenemedi.');
        } finally { setIsQuickFuelSubmitting(false); }
    };

    const filterBtns = [
        { key: 'tum', label: 'Tümü', count: araclar.length },
        { key: 'tehlike', label: 'Bakım Gerekli', count: riskliAracIdler.tehlike.length },
        { key: 'evrak', label: 'Evrak Sorunu', count: riskliAracIdler.evrak.length },
    ];

    if (showBeta) {
        return <AraclarBeta onRevert={() => setShowBeta(false)} />;
    }

    return (
        <>
        <div className="space-y-4">
            {/* Kompakt Filtre ve Aksiyon Çubuğu (Toolbar) */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1.5 flex-wrap items-center">
                    {filterBtns.map(({ key, label, count }) => (
                        <Button
                            key={key}
                            size="sm"
                            variant={aktifFiltre === key ? 'default' : 'outline'}
                            onClick={() => setAktifFiltre(key)}
                            className="h-8 gap-1.5 text-xs"
                        >
                            {label}
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums ${aktifFiltre === key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {count}
                            </span>
                        </Button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-truss-border bg-truss-surface text-xs text-truss-muted hover:border-truss-purple hover:text-truss-text"
                        onClick={() => setShowBeta(true)}
                    >
                        🛸 Digital Garage Beta Dene
                    </Button>
                    <Input
                        type="search"
                        placeholder="Plaka, marka, model ara…"
                        className="h-8 w-full text-sm sm:w-52"
                        value={aramaMetni}
                        onChange={e => setAramaMetni(e.target.value)}
                    />
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={openQuickFuelModal}>
                        <Fuel className="size-3.5" /> Hızlı Yakıt
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => {
                            const rows = gosterilenAraclar.map(a => ({ Plaka: a.plaka || '-', Marka: a.marka || '-', Model: a.model || '-', Yıl: a.yil || '-' }));
                            exportToCSV(rows, `araclar_${new Date().toISOString().slice(0, 10)}`);
                        }}
                    >
                        <Download className="size-3.5" /> CSV
                    </Button>
                    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openModal}>
                        <Plus className="size-3.5" /> Araç Ekle
                    </Button>
                </div>
            </div>

            {/* Tablo */}
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
                    ))}
                </div>
            ) : gosterilenAraclar.length === 0 ? (
                <div className="rounded-xl border border-border p-3.5 py-12 text-center text-muted-foreground">
                    <p className="text-sm">Bu filtreye uyan araç bulunamadı.</p>
                    {aktifFiltre !== 'tum' && (
                        <Button size="sm" variant="ghost" className="mt-3 text-xs" onClick={() => setAktifFiltre('tum')}>
                            Tüm araçları göster
                        </Button>
                    )}
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <Table className="text-sm">
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-32 px-3 py-2.5 text-xs font-medium cursor-pointer select-none" onClick={() => handleSort('plaka')}>
                                    Plaka <SortIcon colKey="plaka" />
                                </TableHead>
                                <TableHead className="px-3 py-2.5 text-xs font-medium cursor-pointer select-none" onClick={() => handleSort('marka')}>
                                    Marka <SortIcon colKey="marka" />
                                </TableHead>
                                <TableHead className="px-3 py-2.5 text-xs font-medium cursor-pointer select-none" onClick={() => handleSort('model')}>
                                    Model <SortIcon colKey="model" />
                                </TableHead>
                                <TableHead className="w-20 px-3 py-2.5 text-xs font-medium cursor-pointer select-none" onClick={() => handleSort('yil')}>
                                    Yıl <SortIcon colKey="yil" />
                                </TableHead>
                                <TableHead className="px-3 py-2.5 text-xs font-medium cursor-pointer select-none" onClick={() => handleSort('guncel_sayac')}>
                                    Sayaç <SortIcon colKey="guncel_sayac" />
                                </TableHead>
                                <TableHead className="px-3 py-2.5 text-xs font-medium">Durum</TableHead>
                                <TableHead className="px-3 py-2.5 text-xs font-medium text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {gosterilenAraclar.map(arac => {
                                const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
                                const sayac = Number(arac.guncel_sayac ?? (isSmh ? arac.guncel_calisma_saati : arac.guncel_km) ?? 0);
                                return (
                                    <TableRow
                                        key={arac.arac_id}
                                        className="cursor-pointer hover:bg-muted/30"
                                        onClick={() => navigate(`/arac/${arac.arac_id}`)}
                                    >
                                        <TableCell className="px-3 py-2.5 font-mono font-semibold text-sm tabular-nums">{arac.plaka || '-'}</TableCell>
                                        <TableCell className="px-3 py-2.5 text-sm">{arac.marka || '-'}</TableCell>
                                        <TableCell className="px-3 py-2.5 text-sm">{arac.model || '-'}</TableCell>
                                        <TableCell className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">{arac.yil || '-'}</TableCell>
                                        <TableCell className="px-3 py-2.5 text-sm tabular-nums">
                                            {sayac.toLocaleString('tr-TR')} {isSmh ? 'SMH' : 'KM'}
                                        </TableCell>
                                        <TableCell className="px-3 py-2.5 text-sm" onClick={e => e.stopPropagation()}>
                                            <AracDurumBadge arac={arac} riskliIdler={riskliAracIdler} />
                                        </TableCell>
                                        <TableCell className="px-3 py-2.5 text-sm text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button size="icon" variant="ghost" className="size-7" onClick={() => navigate(`/arac/${arac.arac_id}`)}>
                                                    <Eye className="size-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditModal(arac)}>
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(arac.arac_id)}>
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>

        <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Aracı sil?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bu araç ve ilişkili kayıtları silinecek. Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
                        Sil
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AddVehicleModal />
        <QuickFuelModal
            isQuickFuelModalOpen={isQuickFuelModalOpen}
            isQuickFuelModalVisible={isQuickFuelModalVisible}
            quickFuelError={quickFuelError}
            handleQuickFuelSubmit={handleQuickFuelSubmit}
            handleFormEnterKeyDown={handleFormEnterKeyDown}
            quickFuelData={quickFuelData}
            handleQuickFuelInputChange={handleQuickFuelInputChange}
            handleQuickFuelNumberBlur={handleQuickFuelNumberBlur}
            araclar={araclar}
            closeQuickFuelModal={closeQuickFuelModal}
            isQuickFuelSubmitting={isQuickFuelSubmitting}
            quickFuelAracSelectRef={quickFuelAracSelectRef}
        />
        </>
    );
}
