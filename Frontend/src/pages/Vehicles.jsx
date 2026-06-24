import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Fuel, Download, ArrowUpDown, ArrowUp, ArrowDown, Eye, Pencil, Trash2 } from 'lucide-react';
import aracService from '@/services/aracService';
import bakimService from '@/services/bakimService';
import yakitServiceModule from '@/services/yakitService';
import { formatTurkishPlate, formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';
import { exportToCSV } from '@/utils/exporter';
import { AddVehicleModal, QuickFuelModal } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

function getEvrakRisk(arac) {
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    return [arac.muayene_tarihi, arac.kasko_tarihi, arac.sigorta_tarihi].some(t => {
        if (!t) return false;
        const hedef = new Date(t); hedef.setHours(0, 0, 0, 0);
        return Math.ceil((hedef - bugun) / MILLISECONDS_IN_DAY) <= 15;
    });
}

function AracDurumBadge({ arac, riskliIdler }) {
    const tehlikede = riskliIdler.tehlike.includes(arac.arac_id);
    const evrakSorunu = riskliIdler.evrak.includes(arac.arac_id);
    if (tehlikede) return <Badge variant="destructive">Bakım Gerekli</Badge>;
    if (evrakSorunu) return <Badge variant="outline" className="border-orange-400/50 text-orange-500">Evrak Sorunu</Badge>;
    return <Badge variant="outline" className="border-emerald-400/50 text-emerald-500">Sorunsuz</Badge>;
}

export default function Vehicles() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [araclar, setAraclar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [riskliAracIdler, setRiskliAracIdler] = useState({ tehlike: [], evrak: [] });
    const [aktifFiltre, setAktifFiltre] = useState(searchParams.get('filtre') || 'tum');
    const [aramaMetni, setAramaMetni] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'plaka', order: 'asc' });

    // Add Vehicle Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingAracId, setEditingAracId] = useState(null);
    const [formData, setFormData] = useState({ plaka: '', marka: '', model: '', yil: '', muayene_tarihi: '', kasko_tarihi: '', sigorta_tarihi: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const plakaInputRef = useRef(null);
    const modalCloseTimerRef = useRef(null);

    // Quick Fuel Modal
    const [isQuickFuelModalOpen, setIsQuickFuelModalOpen] = useState(false);
    const [isQuickFuelModalVisible, setIsQuickFuelModalVisible] = useState(false);
    const [quickFuelData, setQuickFuelData] = useState({ arac_id: '', tarih: '', litre: '', tutar: '', km: '' });
    const [quickFuelError, setQuickFuelError] = useState(null);
    const [isQuickFuelSubmitting, setIsQuickFuelSubmitting] = useState(false);
    const quickFuelAracSelectRef = useRef(null);
    const quickFuelCloseTimerRef = useRef(null);

    const fetchAraclar = useCallback(async () => {
        try {
            setLoading(true);
            const data = await aracService.getAraclar();
            const liste = Array.isArray(data) ? data : (data?.araclar || []);
            setAraclar(liste);

            const tehlikeIdler = [];
            const evrakIdler = [];
            await Promise.all(liste.map(async (arac) => {
                try {
                    const [bakimRes, yakitRes] = await Promise.all([
                        bakimService.getBakimlarByArac(arac.arac_id),
                        yakitService.getYakitlarByArac(arac.arac_id),
                    ]);
                    const bakimlar = Array.isArray(bakimRes) ? bakimRes : (bakimRes?.bakimlar || []);
                    const yakitlar = Array.isArray(yakitRes) ? yakitRes : (yakitRes?.yakitlar || []);
                    const tumKmler = [...bakimlar, ...yakitlar].map(i => Number(i.km)).filter(Number.isFinite);
                    const guncelKm = tumKmler.length > 0 ? Math.max(...tumKmler) : 0;
                    const sonBakim = bakimlar.length > 0
                        ? bakimlar.reduce((mx, cur) => Number(cur.km) > Number(mx.km) ? cur : mx, bakimlar[0])
                        : null;
                    if (sonBakim && (Number(sonBakim.km) + 10000) - guncelKm <= 0) {
                        tehlikeIdler.push(arac.arac_id);
                    }
                    if (getEvrakRisk(arac)) evrakIdler.push(arac.arac_id);
                } catch { /* ignored */ }
            }));
            setRiskliAracIdler({ tehlike: tehlikeIdler, evrak: evrakIdler });
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Araçlar yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        fetchAraclar();
    }, [navigate, fetchAraclar]);

    useEffect(() => () => {
        if (modalCloseTimerRef.current) clearTimeout(modalCloseTimerRef.current);
        if (quickFuelCloseTimerRef.current) clearTimeout(quickFuelCloseTimerRef.current);
    }, []);

    useEffect(() => {
        if (isModalOpen && isModalVisible && plakaInputRef.current) plakaInputRef.current.focus();
    }, [isModalOpen, isModalVisible]);

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

    // Modals
    const openModal = () => {
        setEditingAracId(null);
        setFormData({ plaka: '', marka: '', model: '', yil: '', muayene_tarihi: '', kasko_tarihi: '', sigorta_tarihi: '' });
        setIsModalOpen(true); setIsModalVisible(true);
    };
    const openEditModal = (arac) => {
        setEditingAracId(arac.arac_id);
        setFormData({
            plaka: formatTurkishPlate(arac.plaka || ''),
            marka: arac.marka || '', model: arac.model || '', yil: arac.yil || '',
            muayene_tarihi: arac.muayene_tarihi ? String(arac.muayene_tarihi).slice(0, 10) : '',
            kasko_tarihi: arac.kasko_tarihi ? String(arac.kasko_tarihi).slice(0, 10) : '',
            sigorta_tarihi: arac.sigorta_tarihi ? String(arac.sigorta_tarihi).slice(0, 10) : '',
        });
        setIsModalOpen(true); setIsModalVisible(true);
    };
    const closeModal = () => {
        setIsModalVisible(false);
        modalCloseTimerRef.current = setTimeout(() => { setIsModalOpen(false); setEditingAracId(null); }, 200);
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'plaka' ? formatTurkishPlate(value) : value }));
    };
    const handleFormEnterKeyDown = (e) => {
        if (e.key !== 'Enter' || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault(); e.currentTarget.requestSubmit();
    };
    const handleAddArac = async (e) => {
        e.preventDefault();
        if (!formData.plaka || !formData.marka || !formData.model || !formData.yil) {
            toast.error('Lütfen tüm alanları doldurun.'); return;
        }
        try {
            setIsSubmitting(true);
            if (editingAracId) await aracService.aracGuncelle(editingAracId, { ...formData, yil: Number(formData.yil) });
            else await aracService.aracEkle({ ...formData, yil: Number(formData.yil) });
            setFormData({ plaka: '', marka: '', model: '', yil: '', muayene_tarihi: '', kasko_tarihi: '', sigorta_tarihi: '' });
            closeModal(); await fetchAraclar();
            toast.success(editingAracId ? 'Araç güncellendi.' : 'Araç eklendi.');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'İşlem başarısız.');
        } finally { setIsSubmitting(false); }
    };
    const handleDeleteArac = async (aracId) => {
        if (!window.confirm('Bu aracı silmek istediğinize emin misiniz?')) return;
        try {
            await aracService.aracSil(aracId); await fetchAraclar();
            toast.success('Araç silindi.');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Araç silinemedi.');
        }
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

    return (
        <>
        <div className="space-y-4">
            {/* Başlık + Aksiyonlar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Araç Listesi</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Filonuzdaki tüm araçları yönetin.</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-2" onClick={openQuickFuelModal}>
                        <Fuel className="size-4" /> Hızlı Yakıt
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                            const rows = gosterilenAraclar.map(a => ({ Plaka: a.plaka || '-', Marka: a.marka || '-', Model: a.model || '-', Yıl: a.yil || '-' }));
                            exportToCSV(rows, `araclar_${new Date().toISOString().slice(0, 10)}`);
                        }}
                    >
                        <Download className="size-4" /> CSV
                    </Button>
                    <Button size="sm" className="gap-2" onClick={openModal}>
                        <Plus className="size-4" /> Araç Ekle
                    </Button>
                </div>
            </div>

            {/* Filtre + Arama */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {filterBtns.map(({ key, label, count }) => (
                        <Button
                            key={key}
                            size="sm"
                            variant={aktifFiltre === key ? 'default' : 'outline'}
                            onClick={() => setAktifFiltre(key)}
                            className="h-7 gap-1.5 text-xs"
                        >
                            {label}
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${aktifFiltre === key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {count}
                            </span>
                        </Button>
                    ))}
                </div>
                <Input
                    type="search"
                    placeholder="Plaka, marka, model ara…"
                    className="h-8 w-full text-sm sm:w-56"
                    value={aramaMetni}
                    onChange={e => setAramaMetni(e.target.value)}
                />
            </div>

            {/* Tablo */}
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
                    ))}
                </div>
            ) : gosterilenAraclar.length === 0 ? (
                <div className="rounded-xl border border-border py-16 text-center text-muted-foreground">
                    <p className="text-sm">Bu filtreye uyan araç bulunamadı.</p>
                    {aktifFiltre !== 'tum' && (
                        <Button size="sm" variant="ghost" className="mt-3" onClick={() => setAktifFiltre('tum')}>
                            Tüm araçları göster
                        </Button>
                    )}
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-32 cursor-pointer select-none" onClick={() => handleSort('plaka')}>
                                    Plaka <SortIcon colKey="plaka" />
                                </TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('marka')}>
                                    Marka <SortIcon colKey="marka" />
                                </TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('model')}>
                                    Model <SortIcon colKey="model" />
                                </TableHead>
                                <TableHead className="cursor-pointer select-none w-20" onClick={() => handleSort('yil')}>
                                    Yıl <SortIcon colKey="yil" />
                                </TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {gosterilenAraclar.map(arac => (
                                <TableRow
                                    key={arac.arac_id}
                                    className="cursor-pointer hover:bg-muted/30"
                                    onClick={() => navigate(`/arac/${arac.arac_id}`)}
                                >
                                    <TableCell className="font-mono font-semibold text-sm">{arac.plaka || '-'}</TableCell>
                                    <TableCell>{arac.marka || '-'}</TableCell>
                                    <TableCell>{arac.model || '-'}</TableCell>
                                    <TableCell className="text-muted-foreground">{arac.yil || '-'}</TableCell>
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        <AracDurumBadge arac={arac} riskliIdler={riskliAracIdler} />
                                    </TableCell>
                                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button size="icon" variant="ghost" className="size-7" onClick={() => navigate(`/arac/${arac.arac_id}`)}>
                                                <Eye className="size-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditModal(arac)}>
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteArac(arac.arac_id)}>
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>

        <AddVehicleModal
            isModalOpen={isModalOpen}
            isModalVisible={isModalVisible}
            editingAracId={editingAracId}
            formData={formData}
            isSubmitting={isSubmitting}
            handleAddArac={handleAddArac}
            handleFormEnterKeyDown={handleFormEnterKeyDown}
            handleInputChange={handleInputChange}
            closeModal={closeModal}
            plakaInputRef={plakaInputRef}
        />
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
