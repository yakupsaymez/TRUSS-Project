import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import aracService from '../services/aracService';
import bakimService from '../services/bakimService';
import yakitService from '../services/yakitService';

const AracDetay = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [arac, setArac] = useState(null);
    const [bakimlar, setBakimlar] = useState([]);
    const [yakitlar, setYakitlar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bakimLoadError, setBakimLoadError] = useState(null);
    const [yakitLoadError, setYakitLoadError] = useState(null);
    const [activeTab, setActiveTab] = useState('bakim');
    const [searchTerm, setSearchTerm] = useState('');

    const [bakimFormError, setBakimFormError] = useState(null);
    const [yakitFormError, setYakitFormError] = useState(null);
    const [isBakimSubmitting, setIsBakimSubmitting] = useState(false);
    const [isYakitSubmitting, setIsYakitSubmitting] = useState(false);

    const [bakimFormData, setBakimFormData] = useState({
        bakim_tipi: 'Periyodik Bakım',
        tarih: '',
        km: '',
        maliyet: '',
        notlar: ''
    });

    const [yakitFormData, setYakitFormData] = useState({
        yakit_tipi: 'Benzin',
        tarih: '',
        litre: '',
        tutar: '',
        km: '',
        notlar: ''
    });

    const bakimTipleri = useMemo(
        () => ['Periyodik Bakım', 'Yağ Değişimi', 'Fren Kontrolü', 'Lastik Değişimi', 'Diğer'],
        []
    );

    const yakitTipleri = useMemo(
        () => ['Benzin', 'Dizel', 'LPG', 'Elektrik', 'Hibrit', 'Diğer'],
        []
    );

    const formatTarih = useCallback((tarih) => {
        if (!tarih) return '-';
        const date = new Date(tarih);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('tr-TR');
    }, []);

    const formatPara = useCallback((deger) => {
        const sayi = Number(deger);
        if (Number.isNaN(sayi)) return '-';
        return `${sayi.toLocaleString('tr-TR')} TL`;
    }, []);

    const formatSure = useCallback((tarih) => {
        if (!tarih) return '-';

        const hedefTarih = new Date(tarih);
        if (Number.isNaN(hedefTarih.getTime())) return '-';

        const saniye = Math.floor((Date.now() - hedefTarih.getTime()) / 1000);
        const araliklar = [
            { etiket: 'yıl', saniye: 60 * 60 * 24 * 365 },
            { etiket: 'ay', saniye: 60 * 60 * 24 * 30 },
            { etiket: 'gün', saniye: 60 * 60 * 24 },
            { etiket: 'saat', saniye: 60 * 60 },
            { etiket: 'dakika', saniye: 60 }
        ];

        for (const aralik of araliklar) {
            const deger = Math.floor(saniye / aralik.saniye);
            if (deger >= 1) {
                return `${deger} ${aralik.etiket} önce`;
            }
        }

        return 'az önce';
    }, []);

    const fetchAracVeKayitlar = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setBakimLoadError(null);
            setYakitLoadError(null);

            const [aracResult, bakimResult, yakitResult] = await Promise.allSettled([
                aracService.getAraclar(),
                bakimService.getBakimlarByArac(id),
                yakitService.getYakitlarByArac(id)
            ]);

            if (aracResult.status === 'fulfilled') {
                const aracListesi = Array.isArray(aracResult.value)
                    ? aracResult.value
                    : (aracResult.value?.araclar || []);
                const seciliArac = aracListesi.find((item) => String(item.arac_id) === String(id));
                setArac(seciliArac || null);
            } else {
                setError(
                    aracResult.reason?.response?.data?.message ||
                    aracResult.reason?.message ||
                    'Araç bilgileri alınırken bir hata oluştu.'
                );
            }

            if (bakimResult.status === 'fulfilled') {
                const bakimListesi = Array.isArray(bakimResult.value)
                    ? bakimResult.value
                    : (bakimResult.value?.bakimlar || []);
                setBakimlar(bakimListesi);
            } else {
                setBakimLoadError(
                    bakimResult.reason?.response?.data?.message ||
                    bakimResult.reason?.message ||
                    'Bakım kayıtları alınırken bir hata oluştu.'
                );
            }

            if (yakitResult.status === 'fulfilled') {
                const yakitListesi = Array.isArray(yakitResult.value)
                    ? yakitResult.value
                    : (yakitResult.value?.yakitlar || []);
                setYakitlar(yakitListesi);
            } else {
                setYakitLoadError(
                    yakitResult.reason?.response?.data?.message ||
                    yakitResult.reason?.message ||
                    'Yakıt kayıtları alınırken bir hata oluştu.'
                );
            }
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchAracVeKayitlar();
    }, [fetchAracVeKayitlar, navigate]);

    const handleBakimInputChange = (e) => {
        const { name, value } = e.target;
        setBakimFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleYakitInputChange = (e) => {
        const { name, value } = e.target;
        setYakitFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleBakimEkle = async (e) => {
        e.preventDefault();
        setBakimFormError(null);
        setError(null);

        if (!bakimFormData.bakim_tipi || !bakimFormData.tarih || !bakimFormData.km || !bakimFormData.maliyet) {
            setBakimFormError('Lütfen zorunlu alanları eksiksiz doldurun.');
            return;
        }

        try {
            setIsBakimSubmitting(true);
            await bakimService.bakimEkle({
                arac_id: Number(id),
                bakim_tipi: bakimFormData.bakim_tipi,
                tarih: bakimFormData.tarih,
                km: Number(bakimFormData.km),
                maliyet: Number(bakimFormData.maliyet),
                notlar: bakimFormData.notlar
            });
            setBakimFormData({
                bakim_tipi: 'Periyodik Bakım',
                tarih: '',
                km: '',
                maliyet: '',
                notlar: ''
            });
            await fetchAracVeKayitlar();
        } catch (err) {
            setBakimFormError(err?.response?.data?.message || err?.message || 'Bakım kaydı eklenirken bir hata oluştu.');
        } finally {
            setIsBakimSubmitting(false);
        }
    };

    const handleYakitEkle = async (e) => {
        e.preventDefault();
        setYakitFormError(null);
        setError(null);

        if (!yakitFormData.tarih || !yakitFormData.yakit_tipi || !yakitFormData.litre || !yakitFormData.tutar || !yakitFormData.km) {
            setYakitFormError('Lütfen zorunlu alanları eksiksiz doldurun.');
            return;
        }

        try {
            setIsYakitSubmitting(true);
            await yakitService.yakitEkle({
                arac_id: Number(id),
                yakit_tipi: yakitFormData.yakit_tipi,
                tarih: yakitFormData.tarih,
                litre: Number(yakitFormData.litre),
                tutar: Number(yakitFormData.tutar),
                km: Number(yakitFormData.km),
                notlar: yakitFormData.notlar
            });
            setYakitFormData({
                yakit_tipi: 'Benzin',
                tarih: '',
                litre: '',
                tutar: '',
                km: '',
                notlar: ''
            });
            await fetchAracVeKayitlar();
        } catch (err) {
            setYakitFormError(err?.response?.data?.message || err?.message || 'Yakıt kaydı eklenirken bir hata oluştu.');
        } finally {
            setIsYakitSubmitting(false);
        }
    };

    const handleBakimSil = async (bakimId) => {
        if (!window.confirm('Bu bakım kaydını silmek istediğinize emin misiniz?')) return;
        try {
            setError(null);
            await bakimService.bakimSil(bakimId);
            await fetchAracVeKayitlar();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Bakım kaydı silinirken bir hata oluştu.');
        }
    };

    const handleYakitSil = async (yakitId) => {
        if (!window.confirm('Bu yakıt kaydını silmek istediğinize emin misiniz?')) return;
        try {
            setError(null);
            await yakitService.yakitSil(yakitId);
            await fetchAracVeKayitlar();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Yakıt kaydı silinirken bir hata oluştu.');
        }
    };

    const toplamBakimHarcama = useMemo(
        () => bakimlar.reduce((toplam, bakim) => toplam + (Number(bakim.maliyet) || 0), 0),
        [bakimlar]
    );

    const sonBakim = useMemo(() => {
        if (!bakimlar.length) return null;
        return [...bakimlar].reduce((enYeni, mevcut) => {
            const mevcutKm = Number(mevcut.km) || 0;
            const enYeniKm = Number(enYeni?.km) || 0;
            return mevcutKm > enYeniKm ? mevcut : enYeni;
        }, bakimlar[0]);
    }, [bakimlar]);

    const filtrelenmisBakimlar = useMemo(() => {
        const arama = searchTerm.trim().toLowerCase();
        if (!arama) return bakimlar;
        return bakimlar.filter((bakim) => String(bakim.bakim_tipi || '').toLowerCase().includes(arama));
    }, [bakimlar, searchTerm]);

    const yakitOzeti = useMemo(() => {
        const toplamTutar = yakitlar.reduce((toplam, yakit) => toplam + (Number(yakit.tutar) || 0), 0);
        const kmDegerleri = yakitlar.map((y) => Number(y.km)).filter(Number.isFinite);
        let katEdilenToplamKm = 0;
        if (kmDegerleri.length >= 2) {
            katEdilenToplamKm = Math.max(0, Math.max(...kmDegerleri) - Math.min(...kmDegerleri));
        }
        return {
            toplamTutar,
            katEdilenToplamKm,
            ortalamaKmBasinaMaliyet: katEdilenToplamKm > 0 ? toplamTutar / katEdilenToplamKm : 0
        };
    }, [yakitlar]);

    const formatKmBasinaMaliyet = useCallback((deger) => {
        if (!deger || !Number.isFinite(deger)) return '-';
        return `${deger.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL / KM`;
    }, []);

    const maliyetPieData = useMemo(
        () => [
            { name: 'Toplam Bakım Maliyeti', value: toplamBakimHarcama, color: '#10B981' },
            { name: 'Toplam Yakıt Maliyeti', value: yakitOzeti.toplamTutar, color: '#3B82F6' }
        ],
        [toplamBakimHarcama, yakitOzeti.toplamTutar]
    );

    const yakitTrendData = useMemo(() => {
        return [...yakitlar]
            .filter((item) => item?.tarih)
            .sort((a, b) => new Date(a.tarih) - new Date(b.tarih))
            .map((item) => ({
                tarih: formatTarih(item.tarih),
                tutar: Number(item.tutar) || 0,
                litre: Number(item.litre) || 0
            }));
    }, [formatTarih, yakitlar]);

    const pieTooltipFormatter = useCallback((value) => formatPara(value), [formatPara]);
    const barTooltipFormatter = useCallback((value, name) => [name === 'tutar' ? formatPara(value) : value, name === 'tutar' ? 'Tutar' : 'Litre'], [formatPara]);

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-800">ABTS - Bakım ve Yakıt Takip Paneli</h1>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200"
                    >
                        Geri Dön
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
                {loading && <div className="bg-white shadow-md rounded-lg p-8 text-center"><p className="text-gray-700 text-lg font-medium">Araç detayları yükleniyor...</p></div>}
                {!loading && error && <div className="bg-red-50 border border-red-200 text-red-700 shadow-md rounded-lg p-4 text-center">{error}</div>}

                {!loading && !error && (
                    <>
                        <section className="bg-white shadow-md rounded-lg border border-blue-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Araç Bilgileri</h2>
                            {arac ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 rounded-md p-4">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Plaka</p>
                                        <p className="text-base font-semibold text-gray-800">{arac.plaka || '-'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-md p-4">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Marka</p>
                                        <p className="text-base font-semibold text-gray-800">{arac.marka || '-'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-md p-4">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Model</p>
                                        <p className="text-base font-semibold text-gray-800">{arac.model || '-'}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-600">ID: {id} için araç bilgisi bulunamadı.</p>
                            )}
                        </section>

                        <section className="bg-white shadow-md rounded-lg border border-gray-200 p-2 sm:p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button type="button" onClick={() => setActiveTab('bakim')} className={`rounded-md px-4 py-2 font-medium transition-colors duration-200 ${activeTab === 'bakim' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Bakım Kayıtları</button>
                                <button type="button" onClick={() => setActiveTab('yakit')} className={`rounded-md px-4 py-2 font-medium transition-colors duration-200 ${activeTab === 'yakit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Yakıt Kayıtları</button>
                                <button type="button" onClick={() => setActiveTab('istatistik')} className={`rounded-md px-4 py-2 font-medium transition-colors duration-200 ${activeTab === 'istatistik' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>İstatistikler</button>
                            </div>
                        </section>

                        {activeTab === 'bakim' && (
                            <>
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white shadow-md rounded-lg border border-emerald-100 p-6">
                                        <p className="text-sm text-emerald-700 font-medium mb-2">Toplam Harcama</p>
                                        <p className="text-3xl font-bold text-gray-800">{formatPara(toplamBakimHarcama)}</p>
                                    </div>
                                    <div className="bg-white shadow-md rounded-lg border border-blue-100 p-6">
                                        <p className="text-sm text-blue-700 font-medium mb-2">Son İşlem</p>
                                        {sonBakim ? (
                                            <><p className="text-2xl font-bold text-gray-800">{sonBakim.km ?? '-'} KM</p><p className="text-sm text-gray-600 mt-2">{formatTarih(sonBakim.tarih)} tarihinde işlem görmüş</p></>
                                        ) : (<p className="text-gray-600">Henüz bakım kaydı bulunmuyor.</p>)}
                                    </div>
                                </section>

                                <section className="bg-white shadow-md rounded-lg border border-emerald-100 p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Yeni Bakım Kaydı</h2>
                                    {bakimFormError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">{bakimFormError}</div>}
                                    <form onSubmit={handleBakimEkle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium mb-1">Tür</label><select name="bakim_tipi" value={bakimFormData.bakim_tipi} onChange={handleBakimInputChange} className="w-full border rounded-md px-3 py-2">{bakimTipleri.map(tip => <option key={tip} value={tip}>{tip}</option>)}</select></div>
                                        <div><label className="block text-sm font-medium mb-1">Tarih</label><input type="date" name="tarih" value={bakimFormData.tarih} onChange={handleBakimInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm font-medium mb-1">KM</label><input type="number" name="km" value={bakimFormData.km} onChange={handleBakimInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm font-medium mb-1">Maliyet (TL)</label><input type="number" name="maliyet" value={bakimFormData.maliyet} onChange={handleBakimInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                                        <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Notlar</label><textarea name="notlar" value={bakimFormData.notlar} onChange={handleBakimInputChange} rows={3} className="w-full border rounded-md px-3 py-2" /></div>
                                        <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={isBakimSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md">{isBakimSubmitting ? 'Kaydediliyor...' : 'Bakım Kaydı Ekle'}</button></div>
                                    </form>
                                </section>

                                <section className="bg-white shadow-md rounded-lg border border-blue-100 p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Geçmiş Bakımlar</h2>
                                    {filtrelenmisBakimlar.map((bakim) => (
                                        <div key={bakim.bakim_id} className="border rounded-lg p-4 flex justify-between items-center mb-3">
                                            <div><p className="font-semibold">{bakim.bakim_tipi}</p><p className="text-sm text-gray-500">{formatTarih(bakim.tarih)} - {bakim.km} KM - {formatPara(bakim.maliyet)}</p></div>
                                            <button onClick={() => handleBakimSil(bakim.bakim_id)} className="text-red-600 border border-red-200 px-3 py-1 rounded-md">Sil</button>
                                        </div>
                                    ))}
                                </section>
                            </>
                        )}

                        {activeTab === 'yakit' && (
                            <>
                                <section className="bg-white shadow-md rounded-lg border border-blue-100 p-6">
                                    <p className="text-sm text-blue-700 font-medium mb-2">Yakıt Özeti</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-gray-50 rounded-md p-4"><p className="text-xs text-gray-500 mb-1">Toplam Tutar</p><p className="text-xl font-semibold">{formatPara(yakitOzeti.toplamTutar)}</p></div>
                                        <div className="bg-gray-50 rounded-md p-4"><p className="text-xs text-gray-500 mb-1">Kat Edilen KM</p><p className="text-xl font-semibold">{yakitOzeti.katEdilenToplamKm}</p></div>
                                        <div className="bg-gray-50 rounded-md p-4"><p className="text-xs text-gray-500 mb-1">Maliyet</p><p className="text-xl font-semibold">{formatKmBasinaMaliyet(yakitOzeti.ortalamaKmBasinaMaliyet)}</p></div>
                                    </div>
                                </section>

                                <section className="bg-white shadow-md rounded-lg border border-blue-100 p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Yeni Yakıt Kaydı</h2>
                                    <form onSubmit={handleYakitEkle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm mb-1">Tarih</label><input type="date" name="tarih" value={yakitFormData.tarih} onChange={handleYakitInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm mb-1">Yakıt Tipi</label><select name="yakit_tipi" value={yakitFormData.yakit_tipi} onChange={handleYakitInputChange} className="w-full border rounded-md px-3 py-2">{yakitTipleri.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                        <div><label className="block text-sm mb-1">Litre</label><input type="number" step="0.01" name="litre" value={yakitFormData.litre} onChange={handleYakitInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm mb-1">Tutar (TL)</label><input type="number" step="0.01" name="tutar" value={yakitFormData.tutar} onChange={handleYakitInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm mb-1">KM</label><input type="number" name="km" value={yakitFormData.km} onChange={handleYakitInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                                        <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={isYakitSubmitting} className="bg-blue-600 text-white px-5 py-2 rounded-md">Yakıt Kaydı Ekle</button></div>
                                    </form>
                                </section>

                                <section className="bg-white shadow-md rounded-lg border border-blue-100 p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Geçmiş Yakıt Kayıtları</h2>
                                    {yakitlar.map((yakit) => (
                                        <div key={yakit.yakit_id} className="border rounded-lg p-4 flex justify-between items-center mb-3">
                                            <div><p className="font-semibold">{yakit.yakit_tipi}</p><p className="text-sm text-gray-500">{formatTarih(yakit.tarih)} - {yakit.litre}L - {formatPara(yakit.tutar)}</p></div>
                                            <button onClick={() => handleYakitSil(yakit.yakit_id)} className="text-red-600 border border-red-200 px-3 py-1 rounded-md">Sil</button>
                                        </div>
                                    ))}
                                </section>
                            </>
                        )}

                        {activeTab === 'istatistik' && (
                            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="bg-white shadow-md rounded-lg border border-emerald-100 p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Maliyet Dağılımı</h2>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }} className="focus:outline-none">
                                            <PieChart style={{ outline: 'none' }} className="focus:outline-none">
                                                <Pie data={maliyetPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name}: %${((percent || 0) * 100).toFixed(0)}`}>
                                                    {maliyetPieData.map((entry) => <Cell key={entry.name} fill={entry.color} style={{ outline: 'none' }} className="focus:outline-none" />)}
                                                </Pie>
                                                <Tooltip formatter={pieTooltipFormatter} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white shadow-md rounded-lg border border-blue-100 p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Yakıt Trend Grafiği</h2>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }} className="focus:outline-none">
                                            <BarChart data={yakitTrendData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }} style={{ outline: 'none' }} className="focus:outline-none">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="tarih" />
                                                <YAxis />
                                                <Tooltip formatter={barTooltipFormatter} />
                                                <Legend />
                                                <Bar dataKey="tutar" name="Tutar" fill="#3B82F6" radius={[8, 8, 0, 0]} style={{ outline: 'none' }} className="focus:outline-none" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default AracDetay;