import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import aracService from '../services/aracService';
import bakimService from '../services/bakimService';
import yakitService from '../services/yakitService';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate, parseLocaleNumber } from '../utils/formatters';
import { exportToCSV, sortByKey } from '../utils/exporter';

const Dashboard = () => {
    const navigate = useNavigate();

    const [araclar, setAraclar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filoOzeti, setFiloOzeti] = useState({ tehlike: 0, uyari: 0, sorunsuz: 0, evrakSorunu: 0, gelecekAyTahmin: 0 });
    const [aktifFiltre, setAktifFiltre] = useState('tum');
    const [riskliAracIdler, setRiskliAracIdler] = useState({ tehlike: [], evrak: [] });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingAracId, setEditingAracId] = useState(null);
    const [formData, setFormData] = useState({
        plaka: '',
        marka: '',
        model: '',
        yil: '',
        muayene_tarihi: '',
        kasko_tarihi: '',
        sigorta_tarihi: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isQuickFuelModalOpen, setIsQuickFuelModalOpen] = useState(false);
    const [isQuickFuelModalVisible, setIsQuickFuelModalVisible] = useState(false);
    const [quickFuelData, setQuickFuelData] = useState({
        arac_id: '',
        tarih: '',
        litre: '',
        tutar: '',
        km: ''
    });
    const [quickFuelError, setQuickFuelError] = useState(null);
    const [isQuickFuelSubmitting, setIsQuickFuelSubmitting] = useState(false);
    const [listMotionSeed, setListMotionSeed] = useState(0);
    const [sortConfig, setSortConfig] = useState({ key: 'plaka', order: 'asc' });
    const modalCloseTimerRef = useRef(null);
    const quickFuelCloseTimerRef = useRef(null);
    const plakaInputRef = useRef(null);
    const quickFuelAracSelectRef = useRef(null);

    const fetchAraclar = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await aracService.getAraclar();
            const aracListesi = Array.isArray(data) ? data : (data?.araclar || []);
            setAraclar(aracListesi);

            let tehlikeCount = 0;
            let uyariCount = 0;
            let sorunsuzCount = 0;
            let evrakSorunuCount = 0;
            let gelecekAyTahminToplami = 0;
            const tehlikeAracIdleri = [];
            const evrakSorunuAracIdleri = [];
            const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
            const EVRAK_ESIK_GUN = 15;
            const son30GunBaslangic = new Date(Date.now() - (30 * MILLISECONDS_IN_DAY));

            await Promise.all(aracListesi.map(async (arac) => {
                try {
                    const [bakimRes, yakitRes] = await Promise.all([
                        bakimService.getBakimlarByArac(arac.arac_id),
                        yakitService.getYakitlarByArac(arac.arac_id)
                    ]);

                    const bakimlar = Array.isArray(bakimRes) ? bakimRes : (bakimRes?.bakimlar || []);
                    const yakitlar = Array.isArray(yakitRes) ? yakitRes : (yakitRes?.yakitlar || []);

                    const son30GunYakitToplami = yakitlar.reduce((toplam, yakit) => {
                        const yakitTarihi = new Date(yakit?.tarih);
                        if (Number.isNaN(yakitTarihi.getTime())) return toplam;
                        if (yakitTarihi < son30GunBaslangic) return toplam;
                        return toplam + (Number(yakit?.tutar) || 0);
                    }, 0);
                    gelecekAyTahminToplami += son30GunYakitToplami;

                    const tumKmler = [...bakimlar, ...yakitlar].map(i => Number(i.km)).filter(Number.isFinite);
                    const guncelKm = tumKmler.length > 0 ? Math.max(...tumKmler) : 0;

                    const sonBakim = bakimlar.length > 0
                        ? bakimlar.reduce((max, current) => (Number(current.km) > Number(max.km) ? current : max), bakimlar[0])
                        : null;

                    if (sonBakim) {
                        const kalanKm = (Number(sonBakim.km) + 10000) - guncelKm;
                        if (kalanKm <= 0) {
                            tehlikeCount++;
                            tehlikeAracIdleri.push(arac.arac_id);
                        }
                        else if (kalanKm <= 1500) uyariCount++;
                        else sorunsuzCount++;
                    } else {
                        sorunsuzCount++; // Bakım yoksa şimdilik sorunsuz say.
                    }

                    // Muayene/Kasko/Sigorta tarihinden herhangi biri 15 gune dusmusse veya gecmisse evrak sorunu say.
                    const bugun = new Date();
                    bugun.setHours(0, 0, 0, 0);
                    const evrakTarihleri = [arac.muayene_tarihi, arac.kasko_tarihi, arac.sigorta_tarihi];
                    const evrakRiskiVar = evrakTarihleri.some((tarihDegeri) => {
                        if (!tarihDegeri) return false;
                        const hedefTarih = new Date(tarihDegeri);
                        if (Number.isNaN(hedefTarih.getTime())) return false;
                        hedefTarih.setHours(0, 0, 0, 0);
                        const kalanGun = Math.ceil((hedefTarih.getTime() - bugun.getTime()) / MILLISECONDS_IN_DAY);
                        return kalanGun <= EVRAK_ESIK_GUN;
                    });

                    if (evrakRiskiVar) {
                        evrakSorunuCount++;
                        evrakSorunuAracIdleri.push(arac.arac_id);
                    }
                } catch (e) {
                    // Araç bazlı hata olursa diğer araçlar için hesaplamayı sürdür.
                }
            }));

            setFiloOzeti({
                tehlike: tehlikeCount,
                uyari: uyariCount,
                sorunsuz: sorunsuzCount,
                evrakSorunu: evrakSorunuCount,
                gelecekAyTahmin: gelecekAyTahminToplami > 0 ? gelecekAyTahminToplami : 0
            });
            setRiskliAracIdler({ tehlike: tehlikeAracIdleri, evrak: evrakSorunuAracIdleri });
        } catch (err) {
            const hataMesaji =
                err?.response?.data?.message ||
                err?.message ||
                'Araçlar alınırken bir hata oluştu.';
            setError(hataMesaji);
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

        fetchAraclar();
    }, [navigate, fetchAraclar]);

    useEffect(() => {
        if (!loading) {
            setListMotionSeed((prev) => prev + 1);
        }
    }, [aktifFiltre, loading]);

    useEffect(() => () => {
        if (modalCloseTimerRef.current) clearTimeout(modalCloseTimerRef.current);
        if (quickFuelCloseTimerRef.current) clearTimeout(quickFuelCloseTimerRef.current);
    }, []);

    useEffect(() => {
        if (isModalOpen && isModalVisible && plakaInputRef.current) {
            plakaInputRef.current.focus();
        }
    }, [isModalOpen, isModalVisible]);

    useEffect(() => {
        if (isQuickFuelModalOpen && isQuickFuelModalVisible && quickFuelAracSelectRef.current) {
            quickFuelAracSelectRef.current.focus();
        }
    }, [isQuickFuelModalOpen, isQuickFuelModalVisible]);


    const openModal = () => {
        setEditingAracId(null);
        setFormData({
            plaka: '',
            marka: '',
            model: '',
            yil: '',
            muayene_tarihi: '',
            kasko_tarihi: '',
            sigorta_tarihi: ''
        });
        setIsModalOpen(true);
        setIsModalVisible(true);
    };

    const openEditModal = (arac) => {
        setEditingAracId(arac.arac_id);
        setFormData({
            plaka: formatTurkishPlate(arac.plaka || ''),
            marka: arac.marka || '',
            model: arac.model || '',
            yil: arac.yil || '',
            muayene_tarihi: arac.muayene_tarihi ? String(arac.muayene_tarihi).slice(0, 10) : '',
            kasko_tarihi: arac.kasko_tarihi ? String(arac.kasko_tarihi).slice(0, 10) : '',
            sigorta_tarihi: arac.sigorta_tarihi ? String(arac.sigorta_tarihi).slice(0, 10) : ''
        });
        setIsModalOpen(true);
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        modalCloseTimerRef.current = setTimeout(() => {
            setIsModalOpen(false);
            setEditingAracId(null);
        }, 200);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'plaka' ? formatTurkishPlate(value) : value
        }));
    };

    const openQuickFuelModal = () => {
        setQuickFuelError(null);
        setQuickFuelData({
            arac_id: '',
            tarih: '',
            litre: '',
            tutar: '',
            km: ''
        });
        setIsQuickFuelModalOpen(true);
        setIsQuickFuelModalVisible(true);
    };

    const closeQuickFuelModal = () => {
        setIsQuickFuelModalVisible(false);
        quickFuelCloseTimerRef.current = setTimeout(() => {
            setIsQuickFuelModalOpen(false);
            setQuickFuelError(null);
        }, 200);
    };

    const handleQuickFuelInputChange = (e) => {
        const { name, value } = e.target;
        setQuickFuelData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleQuickFuelNumberBlur = (e) => {
        const { name, value } = e.target;
        if (!['tutar', 'km'].includes(name)) return;

        const parsed = parseLocaleNumber(value);
        if (parsed === null) return;

        setQuickFuelData((prev) => ({
            ...prev,
            [name]: formatLocaleNumber(parsed, name === 'tutar' ? 2 : 0)
        }));
    };

    const handleFormEnterKeyDown = (e) => {
        if (e.key !== 'Enter') return;
        if (e.target instanceof HTMLTextAreaElement) return;

        e.preventDefault();
        e.currentTarget.requestSubmit();
    };

    const handleQuickFuelSubmit = async (e) => {
        e.preventDefault();
        setQuickFuelError(null);

        const parsedLitre = parseLocaleNumber(quickFuelData.litre);
        const parsedTutar = parseLocaleNumber(quickFuelData.tutar);
        const parsedKm = parseLocaleNumber(quickFuelData.km);

        if (!quickFuelData.arac_id || !quickFuelData.tarih || parsedLitre === null || parsedTutar === null || parsedKm === null) {
            setQuickFuelError('Lutfen tum alanlari eksiksiz doldurun.');
            return;
        }

        try {
            setIsQuickFuelSubmitting(true);
            await yakitService.yakitEkle({
                arac_id: Number(quickFuelData.arac_id),
                tarih: quickFuelData.tarih,
                litre: parsedLitre,
                tutar: parsedTutar,
                km: parsedKm
            });

            closeQuickFuelModal();
            await fetchAraclar();
        } catch (err) {
            const hataMesaji =
                err?.response?.data?.message ||
                err?.message ||
                'Hizli yakit kaydi eklenirken bir hata olustu.';
            setQuickFuelError(hataMesaji);
        } finally {
            setIsQuickFuelSubmitting(false);
        }
    };

    const handleAddArac = async (e) => {
        e.preventDefault();

        if (!formData.plaka || !formData.marka || !formData.model || !formData.yil) {
            toast.error('Lutfen tum alanlari doldurun.');
            return;
        }

        try {
            setIsSubmitting(true);

            if (editingAracId) {
                await aracService.aracGuncelle(editingAracId, {
                    ...formData,
                    yil: Number(formData.yil)
                });
            } else {
                await aracService.aracEkle({
                    ...formData,
                    yil: Number(formData.yil)
                });
            }

            setFormData({
                plaka: '',
                marka: '',
                model: '',
                yil: '',
                muayene_tarihi: '',
                kasko_tarihi: '',
                sigorta_tarihi: ''
            });
            closeModal();
            await fetchAraclar();
        } catch (err) {
            const hataMesaji =
                err?.response?.data?.message ||
                err?.message ||
                editingAracId ? 'Araç güncellenirken bir hata oluştu.' : 'Araç eklenirken bir hata oluştu.';
            toast.error(hataMesaji);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTahminTL = useCallback((deger) => formatCurrency(deger || 0), []);

    const gosterilenAraclar = useMemo(() => {
        if (aktifFiltre === 'tehlike') {
            const ids = new Set(riskliAracIdler.tehlike);
            return araclar.filter((arac) => ids.has(arac.arac_id));
        }
        if (aktifFiltre === 'evrak') {
            const ids = new Set(riskliAracIdler.evrak);
            return araclar.filter((arac) => ids.has(arac.arac_id));
        }
        return araclar;
    }, [aktifFiltre, araclar, riskliAracIdler.evrak, riskliAracIdler.tehlike]);

    const handleDeleteArac = async (aracId) => {
        // Kullanıcının yanlışlıkla silme yapmaması için önce onay alıyoruz.
        const onaylandiMi = window.confirm('Bu aracı silmek istediğinize emin misiniz?');
        if (!onaylandiMi) return;

        try {
            setError(null);
            await aracService.aracSil(aracId);
            // Silme başarılı olursa araç listesini tekrar çekip ekranı güncelliyoruz.
            await fetchAraclar();
        } catch (err) {
            const hataMesaji =
                err?.response?.data?.message ||
                err?.message ||
                'Araç silinirken bir hata oluştu.';
            setError(hataMesaji);
        }
    };

    const sortedAraclar = useMemo(() => {
        return sortByKey(gosterilenAraclar, sortConfig.key, sortConfig.order === 'asc');
    }, [gosterilenAraclar, sortConfig]);

    const handleSortClick = (key) => {
        setSortConfig((prev) => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div className="min-h-screen" style={{ color: 'var(--text-main)' }}>
            <main>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white dark:text-white mb-6 tracking-tight">Dashboard</h2>

                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
                    <button type="button" onClick={() => setAktifFiltre('tehlike')} className="interactive-card text-left glass-card p-4 shadow-md hover:scale-[1.01] transition-transform duration-300">
                        <p className="text-sm font-medium text-slate-50">Bakımı Geçen Araçlar</p>
                        <p className="text-3xl font-bold text-rose-400 mt-2">{filoOzeti.tehlike}</p>
                    </button>
                    <div className="glass-card p-4 shadow-md">
                        <p className="text-sm font-medium text-slate-50">Bakımı Yaklaşan Araçlar</p>
                        <p className="text-3xl font-bold text-amber-400 mt-2">{filoOzeti.uyari}</p>
                    </div>
                    <div className="glass-card p-4 shadow-md">
                        <p className="text-sm font-medium text-slate-50">Sorunsuz Araçlar</p>
                        <p className="text-3xl font-bold text-emerald-400 mt-2">{filoOzeti.sorunsuz}</p>
                    </div>
                    <button type="button" onClick={() => setAktifFiltre('evrak')} className="interactive-card text-left glass-card p-4 shadow-md hover:scale-[1.01] transition-transform duration-300">
                        <p className="text-sm font-medium text-slate-50">Evrakları Yaklaşan/Biten</p>
                        <p className="text-3xl font-bold text-amber-400 mt-2">{filoOzeti.evrakSorunu}</p>
                    </button>
                    <div className="glass-card p-4">
                        <p className="text-sm font-medium text-slate-50">Tahmini Gelecek Ay Gideri</p>
                        <p className="text-2xl font-bold text-indigo-300 mt-2">{formatTahminTL(filoOzeti.gelecekAyTahmin)}</p>
                    </div>
                </section>

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-50">Araçlarım</h2>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Araç ara..."
                            className="w-44 sm:w-56 px-3 py-2 rounded-md bg-white/95 dark:bg-slate-950/80 border border-slate-400/60 dark:border-white/25 text-slate-900 dark:text-slate-200 placeholder:text-slate-600 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                        <button
                            onClick={openQuickFuelModal}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2 rounded-md transition-colors duration-300 shadow-md"
                        >
                            Hızlı Kayıt
                        </button>
                        <button
                            onClick={openModal}
                            className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-4 py-2 rounded-md transition-colors duration-300 shadow-md"
                        >
                            Yeni Araç Ekle
                        </button>
                    </div>
                </div>

                {aktifFiltre !== 'tum' && (
                    <div className="mb-4 flex items-center justify-between glass-card px-4 py-3">
                        <p className="text-sm text-slate-300 font-medium">
                            {aktifFiltre === 'tehlike' ? 'Bakımı geçen araçlar filtreleniyor.' : 'Evrak sorunu olan araçlar filtreleniyor.'}
                        </p>
                        <button type="button" onClick={() => setAktifFiltre('tum')} className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold">
                            Filtreyi Temizle
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="glass-card p-6 sm:p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={`dash-skel-card-${i}`} className="rounded-xl border border-white/15 p-4">
                                    <div className="skeleton-block h-4 w-2/3 rounded mb-3" />
                                    <div className="skeleton-block h-8 w-1/2 rounded" />
                                </div>
                            ))}
                        </div>
                        <div className="rounded-xl border border-white/15 p-4">
                            <div className="skeleton-block h-5 w-40 rounded mb-4" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={`dash-skel-item-${i}`} className="rounded-lg border border-white/15 p-4">
                                        <div className="skeleton-block h-4 w-20 rounded mb-2" />
                                        <div className="skeleton-block h-5 w-32 rounded mb-3" />
                                        <div className="skeleton-block h-4 w-28 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {!loading && error && (
                    <div className="rounded-lg p-4 text-center border border-red-300/50 bg-red-950/40 text-red-200 shadow-md">
                        {error}
                    </div>
                )}

                {!loading && !error && gosterilenAraclar.length === 0 && (
                    <div className="glass-card p-8 sm:p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/40 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-lg font-semibold text-slate-300 mb-2">Henüz araç bulunmuyor</p>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto">Bu görünüm için araç kaydı bulunamadı. Yeni bir araç ekleyerek başlayın.</p>
                    </div>
                )}

                {!loading && !error && gosterilenAraclar.length > 0 && (
                    <div className="glass-card p-5 sm:p-6">
                        <div className="mb-4 pb-3 border-b border-white/20 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-50 uppercase tracking-wide">Araç Listesi</p>
                                <p className="text-xs text-slate-200 mt-1">Plaka, Marka ve Model bilgileri</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const exportData = sortedAraclar.map(arac => ({
                                            Plaka: arac.plaka || '-',
                                            Marka: arac.marka || '-',
                                            Model: arac.model || '-',
                                            Yıl: arac.yil || '-'
                                        }));
                                        exportToCSV(exportData, `araçlar_${new Date().toISOString().split('T')[0]}`);
                                    }}
                                    className="text-sm px-3 py-1.5 rounded-md bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-200 border border-slate-400/60 dark:border-white/25 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-300 shadow-md"
                                >
                                    📥 CSV İndir
                                </button>
                            </div>
                        </div>
                        <div className="mb-4 hidden sm:grid grid-cols-3 gap-6 px-2 py-2 text-xs font-semibold text-slate-300 border-b border-white/10">
                            <button
                                onClick={() => handleSortClick('plaka')}
                                className="text-left hover:text-slate-50 transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
                            >
                                Plaka
                                {sortConfig.key === 'plaka' && (
                                    <span className="text-indigo-400">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </button>
                            <button
                                onClick={() => handleSortClick('marka')}
                                className="text-left hover:text-slate-50 transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
                            >
                                Marka
                                {sortConfig.key === 'marka' && (
                                    <span className="text-indigo-400">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </button>
                            <button
                                onClick={() => handleSortClick('model')}
                                className="text-left hover:text-slate-50 transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
                            >
                                Model
                                {sortConfig.key === 'model' && (
                                    <span className="text-indigo-400">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </button>
                        </div>
                    <div key={`arac-list-${listMotionSeed}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedAraclar.map((arac, index) => (
                            <div
                                key={arac.arac_id || arac.id || arac.plaka}
                                className="stagger-fade-in relative bg-white/95 dark:bg-slate-900/80 border border-slate-400/50 dark:border-white/25 rounded-xl p-5"
                                style={{ animationDelay: `${index * 45}ms` }}
                            >
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/arac/${arac.arac_id}`)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-400 border border-indigo-300/70 rounded-md transition-colors duration-300"
                                    >
                                        Detayları Gör
                                    </button>
                                    <button
                                        onClick={() => openEditModal(arac)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 border border-amber-300/80 rounded-md transition-colors duration-300 shadow-md"
                                    >
                                        Düzenle
                                    </button>
                                    <button
                                        onClick={() => handleDeleteArac(arac.arac_id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-400 border border-rose-300/80 rounded-md transition-colors duration-300 shadow-md"
                                    >
                                        Sil
                                    </button>
                                </div>

                                <p className="text-sm text-slate-400 mb-1">Plaka</p>
                                <p className="text-lg font-semibold text-slate-50 mb-3">
                                    {arac.plaka || '-'}
                                </p>

                                <p className="text-sm text-slate-400 mb-1">Marka</p>
                                <p className="text-slate-300 mb-3">{arac.marka || '-'}</p>

                                <p className="text-sm text-slate-400 mb-1">Model</p>
                                <p className="text-slate-300">{arac.model || '-'}</p>
                            </div>
                        ))}
                    </div>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ${isModalVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
                    <div className={`w-full max-w-md glass-card rounded-xl shadow-xl p-6 text-slate-100 ${isModalVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
                        <h3 className="text-xl font-semibold text-slate-50 mb-4">{editingAracId ? 'Araç Düzenle' : 'Yeni Araç Ekle'}</h3>


                        <form onSubmit={handleAddArac} onKeyDown={handleFormEnterKeyDown} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Plaka</label>
                                <input
                                    ref={plakaInputRef}
                                    type="text"
                                    name="plaka"
                                    value={formData.plaka}
                                    onChange={handleInputChange}
                                    autoFocus
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                    placeholder="34 ABC 123"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Marka</label>
                                <input
                                    type="text"
                                    name="marka"
                                    value={formData.marka}
                                    onChange={handleInputChange}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                    placeholder="Toyota"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Model</label>
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleInputChange}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                    placeholder="Corolla"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Yıl</label>
                                <input
                                    type="number"
                                    name="yil"
                                    value={formData.yil}
                                    onChange={handleInputChange}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                    placeholder="2020"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Muayene Tarihi</label>
                                <input
                                    type="date"
                                    name="muayene_tarihi"
                                    value={formData.muayene_tarihi}
                                    onChange={handleInputChange}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Kasko Tarihi</label>
                                <input
                                    type="date"
                                    name="kasko_tarihi"
                                    value={formData.kasko_tarihi}
                                    onChange={handleInputChange}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Sigorta Tarihi</label>
                                <input
                                    type="date"
                                    name="sigorta_tarihi"
                                    value={formData.sigorta_tarihi}
                                    onChange={handleInputChange}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-md border border-slate-400/60 dark:border-white/30 bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/90 transition-colors duration-300"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold disabled:opacity-60 transition-colors duration-300 shadow-md"
                                >
                                    {isSubmitting ? (editingAracId ? 'Guncelleniyor...' : 'Ekleniyor...') : (editingAracId ? 'Guncelle' : 'Kaydet')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isQuickFuelModalOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ${isQuickFuelModalVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
                    <div className={`w-full max-w-md glass-card rounded-xl shadow-xl p-6 text-slate-100 ${isQuickFuelModalVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
                        <h3 className="text-xl font-semibold text-slate-50 mb-4">Hızlı Yakıt Kaydı</h3>

                        {quickFuelError && (
                            <div className="mb-4 bg-red-950/40 border border-red-300/50 text-red-200 text-sm rounded-md px-3 py-2">
                                {quickFuelError}
                            </div>
                        )}

                        <form onSubmit={handleQuickFuelSubmit} onKeyDown={handleFormEnterKeyDown} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Araç Seç</label>
                                <select
                                    ref={quickFuelAracSelectRef}
                                    name="arac_id"
                                    value={quickFuelData.arac_id}
                                    onChange={handleQuickFuelInputChange}
                                    autoFocus
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                >
                                    <option value="">Araç seçiniz</option>
                                    {araclar.map((arac) => (
                                        <option key={arac.arac_id} value={arac.arac_id}>
                                            {(arac.plaka || '-') + ' - ' + (arac.marka || '-') + ' ' + (arac.model || '')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tarih</label>
                                <input
                                    type="date"
                                    name="tarih"
                                    value={quickFuelData.tarih}
                                    onChange={handleQuickFuelInputChange}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Litre</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    name="litre"
                                    value={quickFuelData.litre}
                                    onChange={handleQuickFuelInputChange}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    placeholder="45.5"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tutar</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    name="tutar"
                                    value={quickFuelData.tutar}
                                    onChange={handleQuickFuelInputChange}
                                    onBlur={handleQuickFuelNumberBlur}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    placeholder="2500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">KM</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    name="km"
                                    value={quickFuelData.km}
                                    onChange={handleQuickFuelInputChange}
                                    onBlur={handleQuickFuelNumberBlur}
                                    className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    placeholder="125000"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeQuickFuelModal}
                                    className="px-4 py-2 rounded-md border border-slate-400/60 dark:border-white/30 bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/90 transition-colors duration-300"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isQuickFuelSubmitting}
                                    className="px-4 py-2 rounded-md bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-semibold disabled:opacity-60 transition-colors duration-300 shadow-md"
                                >
                                    {isQuickFuelSubmitting ? 'Kaydediliyor...' : 'Yakıt Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;
