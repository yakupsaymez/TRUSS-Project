import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AddVehicleModal, DashboardStats, QuickFuelModal, VehicleList } from '@/components/dashboard';
import aracService from '@/services/aracService';
import bakimService from '@/services/bakimService';
import yakitService from '@/services/yakitService';
import { formatCurrency, formatTurkishPlate, formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';

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
                        sorunsuzCount++;
                    }

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
                } catch (_e) {
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

    const handleDeleteArac = async (aracId) => {
        const onaylandiMi = window.confirm('Bu aracı silmek istediğinize emin misiniz?');
        if (!onaylandiMi) return;

        try {
            setError(null);
            await aracService.aracSil(aracId);
            await fetchAraclar();
        } catch (err) {
            const hataMesaji =
                err?.response?.data?.message ||
                err?.message ||
                'Araç silinirken bir hata oluştu.';
            setError(hataMesaji);
        }
    };

    const formatTahminTL = (deger) => formatCurrency(deger || 0);

    return (
        <div className="min-h-screen" style={{ color: 'var(--text-main)' }}>
            <main>
                <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl dark:text-white">Dashboard</h2>

                <DashboardStats
                    filoOzeti={filoOzeti}
                    setAktifFiltre={setAktifFiltre}
                    formatTahminTL={formatTahminTL}
                />

                <VehicleList
                    araclar={araclar}
                    loading={loading}
                    error={error}
                    aktifFiltre={aktifFiltre}
                    setAktifFiltre={setAktifFiltre}
                    riskliAracIdler={riskliAracIdler}
                    listMotionSeed={listMotionSeed}
                    navigate={navigate}
                    openQuickFuelModal={openQuickFuelModal}
                    openModal={openModal}
                    openEditModal={openEditModal}
                    handleDeleteArac={handleDeleteArac}
                />
            </main>

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
        </div>
    );
};

export default Dashboard;
