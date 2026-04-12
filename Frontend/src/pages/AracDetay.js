import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    ReferenceLine,
    Label,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import aracService from '../services/aracService';
import bakimService from '../services/bakimService';
import parcaService from '../services/parcaService';
import yakitService from '../services/yakitService';
import { formatCurrency, formatLocaleNumber, parseLocaleNumber } from '../utils/formatters';
import { exportToCSV, sortByKey } from '../utils/exporter';

const AracDetay = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [arac, setArac] = useState(null);
    const [bakimlar, setBakimlar] = useState([]);
    const [yakitlar, setYakitlar] = useState([]);
    const [parcalar, setParcalar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('bakim');

    const [bakimFormError, setBakimFormError] = useState(null);
    const [isBakimSubmitting, setIsBakimSubmitting] = useState(false);
    const [isYakitSubmitting, setIsYakitSubmitting] = useState(false);
    const [isParcaUpdating, setIsParcaUpdating] = useState(false);
    const [sadeceKritikParcalar, setSadeceKritikParcalar] = useState(false);
    const [isParcaModalOpen, setIsParcaModalOpen] = useState(false);
    const [isParcaModalVisible, setIsParcaModalVisible] = useState(false);
    const [isParcaEkleSubmitting, setIsParcaEkleSubmitting] = useState(false);
    const parcaModalCloseTimerRef = useRef(null);
    const predictiveToastRef = useRef(null);
    const [yeniParcaFormu, setYeniParcaFormu] = useState({
        parca_adi: '',
        degisim_araligi_km: '',
        son_degisim_km: 0,
        son_degisim_tarihi: ''
    });
    const [bakimSortConfig, setBakimSortConfig] = useState({ key: 'tarih', order: 'desc' });
    const [yakitSortConfig, setYakitSortConfig] = useState({ key: 'tarih', order: 'desc' });

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

    const parcaBilgileri = useMemo(() => ({
        'Motor Yağı': {
            aciklama: 'Motorun asinmasini onler, can damaridir.',
            varsayilanKm: 10000
        },
        'Yağ Filtresi': {
            aciklama: 'Yagdaki metal tozu ve kirleri tutar.',
            varsayilanKm: 10000
        },
        'Hava Filtresi': {
            aciklama: 'Motora giren havayi temizler, yakit tuketimini etkiler.',
            varsayilanKm: 10000
        },
        'Polen Filtresi': {
            aciklama: 'Kabin icine giren havayi temizler.',
            varsayilanKm: 10000
        },
        'Yakıt Filtresi': {
            aciklama: 'Enjektorleri ve motoru kirli yakittan korur.',
            varsayilanKm: 30000
        },
        'Ön Fren Balataları': {
            aciklama: 'Guvenli durus icin hayati onem tasir.',
            varsayilanKm: 30000
        },
        'Arka Fren Balataları': {
            aciklama: 'Guvenli durus icin hayati onem tasir.',
            varsayilanKm: 30000
        },
        'Fren Diskleri': {
            aciklama: 'Incelendiginde fren mesafesi uzar ve titreme yapar.',
            varsayilanKm: 60000
        },
        'Fren Hidroliği': {
            aciklama: 'Zamanla su tutar, kaynama noktasi duserse fren tutmaz.',
            varsayilanKm: 40000
        },
        'Triger Kayışı': {
            aciklama: 'Koparsa motor pistonlari ve subaplari birbirine girer, motor agir hasar alir.',
            varsayilanKm: 80000
        },
        'V Kayışı': {
            aciklama: 'Koparsa aku sarj olmaz, direksiyon sertlesir.',
            varsayilanKm: 60000
        },
        Bujiler: {
            aciklama: 'Eskiyince tekleme yapar, yakit artar.',
            varsayilanKm: 40000
        },
        'Kızdırma Bujisi': {
            aciklama: 'Soguk havalarda dizel motorun calismasini saglar.',
            varsayilanKm: 80000
        },
        'Şanzıman Yağı': {
            aciklama: 'Vites gecislerinin puruzsuz olmasini saglar.',
            varsayilanKm: 60000
        },
        Antifriz: {
            aciklama: 'Motorun donmasini ve paslanmasini engeller.',
            varsayilanKm: null
        },
        'Akü': {
            aciklama: 'Omru bitince arac mars basmaz.',
            varsayilanKm: null
        },
        Lastikler: {
            aciklama: 'Kavrama icin tek temas noktasidir.',
            varsayilanKm: 50000
        }
    }), []);

    const parcaSecenekleri = useMemo(() => Object.keys(parcaBilgileri), [parcaBilgileri]);

    const formatTarih = useCallback((tarih) => {
        if (!tarih) return '-';
        const date = new Date(tarih);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('tr-TR');
    }, []);

    const formatUzunTarih = useCallback((tarih) => {
        if (!tarih) return '-';
        const date = new Date(tarih);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }, []);

    const formatPara = useCallback((deger) => formatCurrency(deger), []);

    const fetchAracVeKayitlar = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [aracResult, bakimResult, yakitResult, parcaResult] = await Promise.allSettled([
                aracService.getAraclar(),
                bakimService.getBakimlarByArac(id),
                yakitService.getYakitlarByArac(id),
                parcaService.getParcalarByArac(id)
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
                // Bakım listesi hatası genel sayfayı düşürmemeli; mevcut veri korunur.
            }

            if (yakitResult.status === 'fulfilled') {
                const yakitListesi = Array.isArray(yakitResult.value)
                    ? yakitResult.value
                    : (yakitResult.value?.yakitlar || []);
                setYakitlar(yakitListesi);
            } else {
                // Yakıt listesi hatası genel sayfayı düşürmemeli; mevcut veri korunur.
            }

            if (parcaResult.status === 'fulfilled') {
                const parcaListesi = Array.isArray(parcaResult.value)
                    ? parcaResult.value
                    : (parcaResult.value?.parcalar || []);
                setParcalar(parcaListesi);
            } else {
                setError((prev) => prev || 'Parça takip kayıtları alınırken bir hata oluştu.');
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

    useEffect(() => () => {
        if (parcaModalCloseTimerRef.current) {
            clearTimeout(parcaModalCloseTimerRef.current);
        }
    }, []);

    const handleBakimInputChange = (e) => {
        const { name, value } = e.target;
        setBakimFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleYakitInputChange = (e) => {
        const { name, value } = e.target;
        setYakitFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleBakimNumberBlur = (e) => {
        const { name, value } = e.target;
        if (!['km', 'maliyet'].includes(name)) return;

        const parsed = parseLocaleNumber(value);
        if (parsed === null) return;

        setBakimFormData((prev) => ({
            ...prev,
            [name]: formatLocaleNumber(parsed, name === 'maliyet' ? 2 : 0)
        }));
    };

    const handleYakitNumberBlur = (e) => {
        const { name, value } = e.target;
        if (!['km', 'tutar'].includes(name)) return;

        const parsed = parseLocaleNumber(value);
        if (parsed === null) return;

        setYakitFormData((prev) => ({
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

    const handleBakimEkle = async (e) => {
        e.preventDefault();
        setBakimFormError(null);
        setError(null);

        const parsedBakimKm = parseLocaleNumber(bakimFormData.km);
        const parsedBakimMaliyet = parseLocaleNumber(bakimFormData.maliyet);

        if (!bakimFormData.bakim_tipi || !bakimFormData.tarih || parsedBakimKm === null || parsedBakimMaliyet === null) {
            toast.error('Lutfen zorunlu bakim alanlarini eksiksiz doldurun.');
            return;
        }

        try {
            setIsBakimSubmitting(true);
            await bakimService.bakimEkle({
                arac_id: Number(id),
                bakim_tipi: bakimFormData.bakim_tipi,
                tarih: bakimFormData.tarih,
                km: parsedBakimKm,
                maliyet: parsedBakimMaliyet,
                notlar: bakimFormData.notlar
            });
            setBakimFormData({
                bakim_tipi: 'Periyodik Bakım',
                tarih: '',
                km: '',
                maliyet: '',
                notlar: ''
            });
            toast.success('Bakim kaydi eklendi.');
            await fetchAracVeKayitlar();
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Bakim kaydi eklenirken bir hata olustu.');
        } finally {
            setIsBakimSubmitting(false);
        }
    };

    const handleYakitEkle = async (e) => {
        e.preventDefault();
        setError(null);

        const parsedYakitLitre = parseLocaleNumber(yakitFormData.litre);
        const parsedYakitTutar = parseLocaleNumber(yakitFormData.tutar);
        const parsedYakitKm = parseLocaleNumber(yakitFormData.km);

        if (!yakitFormData.tarih || !yakitFormData.yakit_tipi || parsedYakitLitre === null || parsedYakitTutar === null || parsedYakitKm === null) {
            toast.error('Lutfen zorunlu yakit alanlarini eksiksiz doldurun.');
            return;
        }

        try {
            setIsYakitSubmitting(true);
            await yakitService.yakitEkle({
                arac_id: Number(id),
                yakit_tipi: yakitFormData.yakit_tipi,
                tarih: yakitFormData.tarih,
                litre: parsedYakitLitre,
                tutar: parsedYakitTutar,
                km: parsedYakitKm,
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
            toast.success('Yakit kaydi eklendi.');
            await fetchAracVeKayitlar();
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Yakit kaydi eklenirken bir hata olustu.');
        } finally {
            setIsYakitSubmitting(false);
        }
    };

    const handleBakimSil = async (bakimId) => {
        if (!window.confirm('Bu bakım kaydını silmek istediğinize emin misiniz?')) return;
        try {
            setError(null);
            await bakimService.bakimSil(bakimId);
            toast.success('Bakim kaydi silindi.');
            await fetchAracVeKayitlar();
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Bakim kaydi silinirken bir hata olustu.');
        }
    };

    const handleYakitSil = async (yakitId) => {
        if (!window.confirm('Bu yakıt kaydını silmek istediğinize emin misiniz?')) return;
        try {
            setError(null);
            await yakitService.yakitSil(yakitId);
            toast.success('Yakit kaydi silindi.');
            await fetchAracVeKayitlar();
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Yakit kaydi silinirken bir hata olustu.');
        }
    };

    const normalizeParcaAdi = useCallback((deger) => String(deger || '')
        .trim()
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c'), []);

    const secilenParcaBilgisi = useMemo(() => {
        const giris = normalizeParcaAdi(yeniParcaFormu.parca_adi);
        if (!giris) return null;

        const eslesenAnahtar = parcaSecenekleri.find((anahtar) => normalizeParcaAdi(anahtar) === giris)
            || parcaSecenekleri.find((anahtar) => normalizeParcaAdi(anahtar).includes(giris));

        if (!eslesenAnahtar) return null;
        return { anahtar: eslesenAnahtar, ...parcaBilgileri[eslesenAnahtar] };
    }, [normalizeParcaAdi, parcaBilgileri, parcaSecenekleri, yeniParcaFormu.parca_adi]);

    const openYeniParcaModal = () => {
        setYeniParcaFormu({
            parca_adi: '',
            degisim_araligi_km: '',
            son_degisim_km: guncelKm,
            son_degisim_tarihi: new Date().toISOString().slice(0, 10)
        });
        setIsParcaModalOpen(true);
        setIsParcaModalVisible(true);
    };

    const closeYeniParcaModal = () => {
        setIsParcaModalVisible(false);
        parcaModalCloseTimerRef.current = setTimeout(() => setIsParcaModalOpen(false), 200);
    };

    const handleYeniParcaInputChange = (e) => {
        const { name, value } = e.target;

        setYeniParcaFormu((prev) => {
            const next = { ...prev, [name]: value };

            if (name === 'parca_adi') {
                const normalized = normalizeParcaAdi(value);
                const matched = parcaSecenekleri.find((anahtar) => normalizeParcaAdi(anahtar) === normalized)
                    || parcaSecenekleri.find((anahtar) => normalizeParcaAdi(anahtar).includes(normalized));

                if (matched) {
                    const varsayilan = parcaBilgileri[matched]?.varsayilanKm;
                    next.degisim_araligi_km = Number.isFinite(varsayilan) ? String(varsayilan) : '';
                }
            }

            return next;
        });
    };

    const handleYeniParcaEkle = async (e) => {
        e.preventDefault();

        if (!yeniParcaFormu.parca_adi) {
            toast.error('Parca adi zorunludur.');
            return;
        }

        try {
            setIsParcaEkleSubmitting(true);
            await parcaService.parcaEkle({
                arac_id: Number(id),
                parca_adi: yeniParcaFormu.parca_adi,
                son_degisim_km: Number(yeniParcaFormu.son_degisim_km || guncelKm),
                degisim_araligi_km: yeniParcaFormu.degisim_araligi_km === '' ? null : Number(yeniParcaFormu.degisim_araligi_km),
                son_degisim_tarihi: yeniParcaFormu.son_degisim_tarihi || new Date().toISOString().slice(0, 10)
            });

            toast.success('Yeni parça takibe alındı! 🛠️');
            closeYeniParcaModal();
            await fetchAracVeKayitlar();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Parça eklenirken hata oluştu.');
        } finally {
            setIsParcaEkleSubmitting(false);
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

    const guncelKm = useMemo(() => {
        const kmDegerleri = [...bakimlar, ...yakitlar]
            .map((kayit) => Number(kayit?.km))
            .filter(Number.isFinite);
        return kmDegerleri.length ? Math.max(...kmDegerleri) : 0;
    }, [bakimlar, yakitlar]);

    const bakimUyari = useMemo(() => {
        const mesajlar = [];
        let tip = null;

        if (!sonBakim) {
            mesajlar.push('Bu araca ait bakım kaydı bulunmuyor. Takibe başlamak için ilk bakımı ekleyin.');
            tip = 'bilgi';
        } else {
            // Mevcut KM bazlı bakım kuralını aynen koruyoruz.
            const periyodikBakimAraligi = 10000;
            const sonBakimKm = Number(sonBakim.km) || 0;
            const kalanKm = (sonBakimKm + periyodikBakimAraligi) - guncelKm;

            if (kalanKm <= 0) {
                mesajlar.push(`DİKKAT! Bakım zamanı ${Math.abs(kalanKm).toLocaleString('tr-TR')} KM geçmiş! Lütfen en kısa sürede bakım yaptırın.`);
                tip = 'tehlike';
            } else if (kalanKm <= 1500) {
                mesajlar.push(`Uyarı: Bakım zamanı yaklaştı! Sonraki bakıma ortalama ${kalanKm.toLocaleString('tr-TR')} KM kaldı.`);
                tip = 'uyari';
            }
        }

        const bugun = new Date();
        bugun.setHours(0, 0, 0, 0);
        const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
        const EVRAK_ESIK_GUN = 15;

        const evraklar = [
            { etiket: 'Muayene', tarih: arac?.muayene_tarihi },
            { etiket: 'Kasko', tarih: arac?.kasko_tarihi },
            { etiket: 'Sigorta', tarih: arac?.sigorta_tarihi }
        ];

        evraklar.forEach((evrak) => {
            if (!evrak.tarih) return;

            const hedefTarih = new Date(evrak.tarih);
            if (Number.isNaN(hedefTarih.getTime())) return;

            hedefTarih.setHours(0, 0, 0, 0);
            const kalanGun = Math.ceil((hedefTarih.getTime() - bugun.getTime()) / MILLISECONDS_IN_DAY);

            if (kalanGun < 0) {
                mesajlar.push(`DİKKAT! ${evrak.etiket} tarihi geçmiş.`);
                tip = 'tehlike';
            } else if (kalanGun <= EVRAK_ESIK_GUN) {
                mesajlar.push(`Uyarı: ${evrak.etiket} bitimine ${kalanGun} gün kaldı.`);
                if (tip !== 'tehlike') tip = 'uyari';
            }
        });

        if (!mesajlar.length) return null;
        return { tip: tip || 'bilgi', mesaj: mesajlar.join(' | ') };
    }, [arac, guncelKm, sonBakim]);

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

    const parcaIlerlemeListesi = useMemo(() => {
        const msGun = 1000 * 60 * 60 * 24;
        const bugun = new Date();
        bugun.setHours(0, 0, 0, 0);

        return parcalar.map((parca) => {
            const isim = String(parca.parca_adi || 'Parça');
            const kmAralik = Number(parca.degisim_araligi_km);
            const sonKm = Number(parca.son_degisim_km) || 0;
            const kmBazli = Number.isFinite(kmAralik) && kmAralik > 0;

            let oran = 0;
            let kalanMetin = '-';

            if (kmBazli) {
                const kullanilanKm = Math.max(0, guncelKm - sonKm);
                oran = Math.min((kullanilanKm / kmAralik) * 100, 100);
                const kalanKm = Math.max(0, kmAralik - kullanilanKm);
                kalanMetin = `${kalanKm.toLocaleString('tr-TR')} KM`;
            } else {
                const yilAraligi = isim === 'Akü' ? 4 : isim === 'Lastikler' ? 5 : 1;
                const toplamGun = yilAraligi * 365;
                const sonDegisimTarihi = new Date(parca.son_degisim_tarihi || bugun);
                sonDegisimTarihi.setHours(0, 0, 0, 0);
                const gecenGun = Math.max(0, Math.floor((bugun.getTime() - sonDegisimTarihi.getTime()) / msGun));
                oran = Math.min((gecenGun / toplamGun) * 100, 100);
                const kalanGun = Math.max(0, toplamGun - gecenGun);
                kalanMetin = `${kalanGun} gun`;
            }

            return {
                ...parca,
                oran,
                kalanMetin,
                danger: oran >= 100,
                warning: oran >= 80 && oran < 100
            };
        });
    }, [guncelKm, parcalar]);

    const gorunenParcalar = useMemo(() => {
        if (!sadeceKritikParcalar) return parcaIlerlemeListesi;
        return parcaIlerlemeListesi.filter((parca) => parca.oran >= 80);
    }, [parcaIlerlemeListesi, sadeceKritikParcalar]);

    const handleParcaDegistir = async (parca) => {
        try {
            setIsParcaUpdating(true);
            await parcaService.parcaGuncelle(parca.parca_id, {
                son_degisim_km: guncelKm,
                son_degisim_tarihi: new Date().toISOString().slice(0, 10)
            });
            await fetchAracVeKayitlar();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Parca guncellenemedi.');
        } finally {
            setIsParcaUpdating(false);
        }
    };

    const formatKmBasinaMaliyet = useCallback((deger) => {
        if (!deger || !Number.isFinite(deger)) return '-';
        return `${deger.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL / KM`;
    }, []);

    const formatKisaPara = useCallback((deger) => {
        const sayi = Number(deger) || 0;
        return `${sayi.toLocaleString('tr-TR')} TL`;
    }, []);

    const maliyetAnaliziData = useMemo(() => {
        const digerGider = bakimlar.reduce((toplam, bakim) => {
            const tip = String(bakim?.bakim_tipi || '').toLowerCase();
            return tip.includes('diğer') || tip.includes('diger') ? toplam + (Number(bakim?.maliyet) || 0) : toplam;
        }, 0);

        const bakimGider = Math.max(0, toplamBakimHarcama - digerGider);
        return [
            { name: 'Bakım', value: bakimGider, color: '#34d399' },
            { name: 'Yakıt', value: yakitOzeti.toplamTutar, color: '#f43f5e' },
            { name: 'Diğer', value: digerGider, color: '#fbbf24' }
        ];
    }, [bakimlar, toplamBakimHarcama, yakitOzeti.toplamTutar]);

    const toplamHarcama = useMemo(
        () => maliyetAnaliziData.reduce((toplam, item) => toplam + (Number(item.value) || 0), 0),
        [maliyetAnaliziData]
    );

    const tuketimTrendData = useMemo(() => {
        const aylar = [];
        const bugun = new Date();
        const thisMonth = new Date(bugun.getFullYear(), bugun.getMonth(), 1);

        for (let i = 5; i >= 0; i--) {
            const ay = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - i, 1);
            const key = `${ay.getFullYear()}-${String(ay.getMonth() + 1).padStart(2, '0')}`;
            aylar.push({
                key,
                ayEtiket: ay.toLocaleDateString('tr-TR', { month: 'short' }),
                yakit: 0,
                bakim: 0
            });
        }

        const ayMap = new Map(aylar.map((a) => [a.key, a]));

        yakitlar.forEach((yakit) => {
            const tarih = new Date(yakit?.tarih);
            if (Number.isNaN(tarih.getTime())) return;
            const key = `${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, '0')}`;
            const mevcut = ayMap.get(key);
            if (mevcut) mevcut.yakit += Number(yakit?.tutar) || 0;
        });

        bakimlar.forEach((bakim) => {
            const tarih = new Date(bakim?.tarih);
            if (Number.isNaN(tarih.getTime())) return;
            const key = `${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, '0')}`;
            const mevcut = ayMap.get(key);
            if (mevcut) mevcut.bakim += Number(bakim?.maliyet) || 0;
        });

        return aylar;
    }, [bakimlar, yakitlar]);

    const aracSaglikRadarData = useMemo(() => {
        const kategoriler = [
            { etiket: 'Lastik', anahtarlar: ['lastik'] },
            { etiket: 'Motor', anahtarlar: ['motor', 'triger', 'buji'] },
            { etiket: 'Fren', anahtarlar: ['fren'] },
            { etiket: 'Yağ', anahtarlar: ['yağ', 'yag'] },
            { etiket: 'Filtre', anahtarlar: ['filtre'] }
        ];

        return kategoriler.map((kategori) => {
            const eslesen = parcaIlerlemeListesi.filter((parca) => {
                const ad = normalizeParcaAdi(parca?.parca_adi);
                return kategori.anahtarlar.some((anahtar) => ad.includes(normalizeParcaAdi(anahtar)));
            });

            if (!eslesen.length) return { konu: kategori.etiket, skor: 85 };

            const ortalamaOran = eslesen.reduce((toplam, parca) => toplam + (Number(parca?.oran) || 0), 0) / eslesen.length;
            const skor = Math.max(0, Math.min(100, Math.round(100 - ortalamaOran)));
            return { konu: kategori.etiket, skor };
        });
    }, [normalizeParcaAdi, parcaIlerlemeListesi]);

    const genelSaglikPuani = useMemo(() => {
        if (!aracSaglikRadarData.length) return 85;
        const toplam = aracSaglikRadarData.reduce((sum, item) => sum + item.skor, 0);
        return Math.round(toplam / aracSaglikRadarData.length);
    }, [aracSaglikRadarData]);

    const yillikTahminiGider = useMemo(() => {
        if (!tuketimTrendData.length) return 0;
        const altiAylikToplam = tuketimTrendData.reduce((toplam, ay) => toplam + ay.yakit + ay.bakim, 0);
        const aylikOrtalama = altiAylikToplam / 6;
        return Math.round(aylikOrtalama * 12);
    }, [tuketimTrendData]);

    const kmBasinaToplamMaliyet = useMemo(() => {
        if (!guncelKm || guncelKm <= 0) return 0;
        return (toplamBakimHarcama + yakitOzeti.toplamTutar) / guncelKm;
    }, [guncelKm, toplamBakimHarcama, yakitOzeti.toplamTutar]);

    const bakimOngorusu = useMemo(() => {
        const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

        if (!sonBakim) {
            return {
                tip: 'bilgi',
                mesaj: 'Bu araca ait yeterli bakım verisi bulunmuyor. Tahmine başlamak için bakım kaydı ekleyin.',
                tahminiTarih: null,
                kalanKm: null,
                kalanGun: null,
                gunlukOrtalamaKm: null,
                progress: 0,
                hedefKm: null
            };
        }

        const tarihliKayitlar = [...bakimlar, ...yakitlar]
            .map((kayit) => {
                const tarih = new Date(kayit?.tarih);
                const km = Number(kayit?.km);

                return {
                    tarih,
                    km
                };
            })
            .filter((kayit) => !Number.isNaN(kayit.tarih.getTime()) && Number.isFinite(kayit.km))
            .sort((a, b) => b.tarih.getTime() - a.tarih.getTime() || b.km - a.km)
            .slice(0, 2);

        if (tarihliKayitlar.length < 2) {
            return {
                tip: 'bilgi',
                mesaj: 'Tahmini bakım için en az iki tarihli kayıt gerekiyor. Lütfen yakıt veya bakım kaydı ekleyin.',
                tahminiTarih: null,
                kalanKm: null,
                kalanGun: null,
                gunlukOrtalamaKm: null,
                progress: 0,
                hedefKm: (Number(sonBakim.km) || 0) + 10000
            };
        }

        const [enYeniKayit, oncekiKayit] = tarihliKayitlar;
        const kmFarki = Math.abs((Number(enYeniKayit.km) || 0) - (Number(oncekiKayit.km) || 0));
        const gunFarki = Math.max(
            1,
            Math.round(Math.abs(enYeniKayit.tarih.getTime() - oncekiKayit.tarih.getTime()) / MILLISECONDS_IN_DAY)
        );
        const gunlukOrtalamaKm = kmFarki / gunFarki;

        if (!Number.isFinite(gunlukOrtalamaKm) || gunlukOrtalamaKm <= 0) {
            return {
                tip: 'bilgi',
                mesaj: 'Tahmini bakım için anlamlı kilometre artışı bulunamadı.',
                tahminiTarih: null,
                kalanKm: null,
                kalanGun: null,
                gunlukOrtalamaKm: null,
                progress: 0,
                hedefKm: (Number(sonBakim.km) || 0) + 10000
            };
        }

        const hedefKm = (Number(sonBakim.km) || 0) + 10000;
        const kalanKm = hedefKm - guncelKm;
        const kalanGun = Math.ceil(kalanKm / gunlukOrtalamaKm);
        const tahminiTarih = new Date();
        tahminiTarih.setDate(tahminiTarih.getDate() + Math.max(0, kalanGun));

        const progress = Math.max(0, Math.min(((guncelKm - (Number(sonBakim.km) || 0)) / 10000) * 100, 100));
        const tip = kalanKm <= 0 ? 'tehlike' : (kalanKm <= 1500 || kalanGun <= 7 ? 'uyari' : 'bilgi');

        let mesaj = `Günlük ortalama ${gunlukOrtalamaKm.toFixed(1)} KM ile bakım için yaklaşık ${Math.max(0, kalanGun)} gün kaldı.`;
        if (kalanKm <= 0) {
            mesaj = `Bakım kilometresi ${Math.abs(kalanKm).toLocaleString('tr-TR')} KM aşıldı. En kısa sürede bakım yapılmalı.`;
        } else if (kalanGun <= 7) {
            mesaj = `Tahmini bakım tarihi yaklaşıyor. ${Math.max(0, kalanKm).toLocaleString('tr-TR')} KM ve yaklaşık ${Math.max(0, kalanGun)} gün kaldı.`;
        }

        return {
            tip,
            mesaj,
            tahminiTarih: formatUzunTarih(tahminiTarih),
            kalanKm: Math.max(0, kalanKm),
            kalanGun: Math.max(0, kalanGun),
            gunlukOrtalamaKm,
            progress,
            hedefKm
        };
    }, [bakimlar, formatUzunTarih, guncelKm, yakitlar, sonBakim]);

    useEffect(() => {
        if (!bakimOngorusu || bakimOngorusu.kalanGun === null || bakimOngorusu.kalanGun > 7) return;

        const toastKey = `${arac?.arac_id || id}-${bakimOngorusu.tahminiTarih || bakimOngorusu.mesaj}`;
        if (predictiveToastRef.current === toastKey) return;

        predictiveToastRef.current = toastKey;
        if (bakimOngorusu.tip === 'tehlike') {
            toast.error(bakimOngorusu.mesaj);
        } else {
            toast(bakimOngorusu.mesaj);
        }
    }, [arac?.arac_id, bakimOngorusu, id]);

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;

        const nokta = payload.find((item) => item?.value !== null && item?.value !== undefined);
        const veri = nokta?.payload || payload[0]?.payload || {};
        const tarih = veri.tarih ? formatUzunTarih(veri.tarih) : payload[0]?.label || '-';
        const kmDegeri = Number(nokta?.value);
        const isFuturePoint = String(nokta?.dataKey || '').toLowerCase().includes('tahmini');
        const kalanGun = isFuturePoint && veri.tarih
            ? Math.max(0, Math.ceil((new Date(veri.tarih).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null;

        return (
            <div className="glass-card min-w-[220px] rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">Proje Noktası</p>
                <div className="space-y-2 text-sm">
                    <div>
                        <span className="block text-xs text-slate-400 uppercase tracking-wide">Tarih</span>
                        <span className="block text-slate-100 font-semibold">{tarih}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-400 uppercase tracking-wide">Kilometre</span>
                        <span className={`block font-semibold ${isFuturePoint ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {Number.isFinite(kmDegeri) ? `${kmDegeri.toLocaleString('tr-TR')} KM` : '-'}
                        </span>
                    </div>
                    {isFuturePoint && kalanGun !== null && (
                        <div>
                            <span className="block text-xs text-slate-400 uppercase tracking-wide">Hedefe Kalan Gün</span>
                            <span className="block font-semibold text-amber-400">{kalanGun} gün</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const gelecekProjeksiyonVerisi = useMemo(() => {
        const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
        const bugun = new Date();
        const bugunAyBaslangic = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
        const baslangicAy = new Date(bugunAyBaslangic.getFullYear(), bugunAyBaslangic.getMonth() - 5, 1);
        const gelecekAySayisi = Math.max(2, Math.min(6, Math.ceil((bakimOngorusu?.kalanGun ?? 60) / 30)));
        const bitisAy = new Date(bugunAyBaslangic.getFullYear(), bugunAyBaslangic.getMonth() + gelecekAySayisi, 1);

        const tarihliKayitlar = [...bakimlar, ...yakitlar]
            .map((kayit) => ({
                tarih: new Date(kayit?.tarih),
                km: Number(kayit?.km)
            }))
            .filter((kayit) => !Number.isNaN(kayit.tarih.getTime()) && Number.isFinite(kayit.km))
            .sort((a, b) => a.tarih.getTime() - b.tarih.getTime() || a.km - b.km);

        const ortalamaGunlukKm = Number.isFinite(bakimOngorusu?.gunlukOrtalamaKm) && bakimOngorusu.gunlukOrtalamaKm > 0
            ? bakimOngorusu.gunlukOrtalamaKm
            : 45;

        const baslangicKm = Number(guncelKm) || Number(sonBakim?.km) || 0;

        const aylar = [];
        for (let cursor = new Date(baslangicAy); cursor <= bitisAy; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
            aylar.push(new Date(cursor));
        }

        const findLatestKmBefore = (cutoffDate) => {
            let latestKm = null;
            tarihliKayitlar.forEach((kayit) => {
                if (kayit.tarih <= cutoffDate) {
                    latestKm = kayit.km;
                }
            });
            return latestKm;
        };

        return aylar.map((ay) => {
            const ayBitis = new Date(ay.getFullYear(), ay.getMonth() + 1, 0, 23, 59, 59, 999);
            const ayEtiketi = ay.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });

            const gercekKm = ay <= bugunAyBaslangic ? findLatestKmBefore(ayBitis) : null;
            const tahminiKm = ay >= bugunAyBaslangic
                ? (ay.getFullYear() === bugunAyBaslangic.getFullYear() && ay.getMonth() === bugunAyBaslangic.getMonth()
                    ? baslangicKm
                    : baslangicKm + (ortalamaGunlukKm * Math.max(0, Math.round((ayBitis.getTime() - bugun.getTime()) / MILLISECONDS_IN_DAY))))
                : null;

            return {
                ayEtiketi,
                tarih: ayBitis,
                gercekKm,
                tahminiKm,
                hedefKm: bakimOngorusu?.hedefKm || null
            };
        });
    }, [bakimOngorusu?.gunlukOrtalamaKm, bakimOngorusu?.hedefKm, bakimOngorusu?.kalanGun, bakimlar, guncelKm, yakitlar, sonBakim]);

    const parcaSiklikData = useMemo(() => {
        const kaynakMetinler = bakimlar.map((bakim) => normalizeParcaAdi(`${bakim?.bakim_tipi || ''} ${bakim?.notlar || ''}`));

        return parcaIlerlemeListesi.map((parca) => {
            const parcaAdiNormalized = normalizeParcaAdi(parca?.parca_adi);
            const degisimSayisi = kaynakMetinler.filter((metin) => metin.includes(parcaAdiNormalized)).length;
            return {
                parcaAdi: parca?.parca_adi || 'Parça',
                degisimSayisi,
                durumSkoru: Math.max(0, Math.round(100 - (Number(parca?.oran) || 0)))
            };
        })
            .sort((a, b) => {
                if (b.degisimSayisi !== a.degisimSayisi) return b.degisimSayisi - a.degisimSayisi;
                return a.durumSkoru - b.durumSkoru;
            })
            .slice(0, 3);
    }, [bakimlar, normalizeParcaAdi, parcaIlerlemeListesi]);

    const pieTooltipFormatter = useCallback((value) => formatPara(value), [formatPara]);
    const areaTooltipFormatter = useCallback((value, name) => [formatPara(value), name === 'yakit' ? 'Yakıt' : 'Bakım'], [formatPara]);
    const radarTooltipFormatter = useCallback((value) => [`${value} / 100`, 'Skor'], []);

    const exportPDF = useCallback(() => {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const safeText = (metin) => String(metin || '')
            .replace(/İ/g, 'I')
            .replace(/ı/g, 'i')
            .replace(/Ş/g, 'S')
            .replace(/ş/g, 's')
            .replace(/Ğ/g, 'G')
            .replace(/ğ/g, 'g')
            .replace(/Ü/g, 'U')
            .replace(/ü/g, 'u')
            .replace(/Ö/g, 'O')
            .replace(/ö/g, 'o')
            .replace(/Ç/g, 'C')
            .replace(/ç/g, 'c');

        const plaka = safeText(arac?.plaka || '-');
        const marka = safeText(arac?.marka || '-');
        const model = safeText(arac?.model || '-');
        const warningText = safeText(bakimUyari?.mesaj || 'Aktif uyari bulunmuyor.');
        const kmDurumu = sonBakim
            ? `Son bakim: ${safeText(sonBakim.km)} KM | Guncel KM: ${safeText(guncelKm)}`
            : `Bakim kaydi yok | Guncel KM: ${safeText(guncelKm)}`;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('ABTS Arac Raporu', 14, 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Rapor Tarihi: ${safeText(new Date().toLocaleDateString('tr-TR'))}`, 14, 23);
        doc.text(`Plaka: ${plaka} | Marka: ${marka} | Model: ${model}`, 14, 29);
        doc.text(`KM Durumu: ${kmDurumu}`, 14, 35);
        doc.text(`Uyarilar: ${warningText}`, 14, 41, { maxWidth: 182 });

        const bakimRows = bakimlar.length
            ? bakimlar.map((bakim) => [
                safeText(formatTarih(bakim.tarih)),
                safeText(bakim.bakim_tipi || '-'),
                safeText(bakim.km || '-'),
                safeText(formatPara(bakim.maliyet)),
                safeText(bakim.notlar || '-')
            ])
            : [['-', '-', '-', '-', '-']];

        autoTable(doc, {
            startY: 48,
            head: [['Bakim Tarihi', 'Bakim Tipi', 'KM', 'Maliyet', 'Notlar']],
            body: bakimRows,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
            styles: { font: 'helvetica', fontSize: 9 }
        });

        const finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : 120;
        const yakitRows = yakitlar.length
            ? yakitlar.map((yakit) => [
                safeText(formatTarih(yakit.tarih)),
                safeText(yakit.yakit_tipi || '-'),
                safeText(yakit.litre || '-'),
                safeText(formatPara(yakit.tutar)),
                safeText(yakit.km || '-'),
                safeText(yakit.notlar || '-')
            ])
            : [['-', '-', '-', '-', '-', '-']];

        autoTable(doc, {
            startY: finalY,
            head: [['Yakit Tarihi', 'Yakit Tipi', 'Litre', 'Tutar', 'KM', 'Notlar']],
            body: yakitRows,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
            styles: { font: 'helvetica', fontSize: 9 }
        });

        doc.save(`ABTS_${plaka || 'arac'}_rapor.pdf`);
    }, [arac, bakimUyari?.mesaj, bakimlar, formatPara, formatTarih, guncelKm, sonBakim, yakitlar]);

    return (
        <div className="min-h-screen" style={{ color: 'var(--text-main)' }}>
            <div className="flex items-center justify-end gap-2 mb-4">
                <button
                    onClick={exportPDF}
                    className="neo-btn bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 shadow-md"
                >
                    PDF Raporu İndir
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="neo-btn bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-4 py-2 shadow-md"
                >
                    Geri Dön
                </button>
            </div>
            <main className="space-y-6">
                {bakimUyari && (
                    <div
                        className={`rounded-lg border p-4 shadow-sm flex items-start gap-3 ${bakimUyari.tip === 'tehlike'
                            ? 'bg-red-950/45 border-red-300/55 text-red-200 shadow-md'
                            : bakimUyari.tip === 'uyari'
                                ? 'bg-amber-950/40 border-amber-300/55 text-amber-200 shadow-md'
                                : 'bg-indigo-950/40 border-indigo-300/55 text-indigo-200'
                            }`}
                    >
                        <div className="mt-0.5">
                            {bakimUyari.tip === 'tehlike' && (
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.591c.75 1.334-.213 2.99-1.742 2.99H3.48c-1.53 0-2.493-1.656-1.743-2.99L8.257 3.1zM11 7a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 7a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 14z" clipRule="evenodd" />
                                </svg>
                            )}
                            {bakimUyari.tip === 'uyari' && (
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M18 10A8 8 0 114.293 4.293 8 8 0 0118 10zm-8-3a1 1 0 00-2 0v4a1 1 0 102 0V7zm-1 7a1 1 0 10-2 0 1 1 0 002 0V9a1 1 0 10-2 0v5z" clipRule="evenodd" />
                                </svg>
                            )}
                            {bakimUyari.tip === 'bilgi' && (
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-8-4a1 1 0 100 2 1 1 0 000-2zm1 8a1 1 0 10-2 0 1 1 0 002 0V9a1 1 0 10-2 0v5z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <p className="text-sm sm:text-base font-medium">{bakimUyari.mesaj}</p>
                    </div>
                )}
                {loading && (
                    <div className="glass-card p-6 sm:p-8 space-y-4">
                        <div className="rounded-xl border border-white/15 p-4">
                            <div className="skeleton-block h-6 w-48 rounded mb-4" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={`detay-skel-info-${i}`} className="rounded-lg border border-white/15 p-4">
                                        <div className="skeleton-block h-3 w-20 rounded mb-2" />
                                        <div className="skeleton-block h-5 w-28 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/15 p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={`detay-skel-tab-${i}`} className="skeleton-block h-10 rounded-md" />
                                ))}
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/15 p-4">
                            <div className="skeleton-block h-6 w-52 rounded mb-4" />
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <div className="skeleton-block h-64 rounded-xl" />
                                <div className="skeleton-block h-64 rounded-xl" />
                            </div>
                        </div>
                    </div>
                )}
                {!loading && error && <div className="bg-red-950/45 border border-red-300/55 text-red-200 shadow-md rounded-lg p-4 text-center">{error}</div>}

                {!loading && !error && (
                    <>
                        <section className="glass-card p-6">
                            <h2 className="text-xl font-bold text-slate-50 mb-4 tracking-wide">Araç Bilgileri</h2>
                            {arac ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="bg-transparent border border-white/20 rounded-xl p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Plaka</p>
                                        <p className="text-base font-semibold text-slate-100">{arac.plaka || '-'}</p>
                                    </div>
                                    <div className="bg-transparent border border-white/20 rounded-xl p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Marka</p>
                                        <p className="text-base font-semibold text-slate-100">{arac.marka || '-'}</p>
                                    </div>
                                    <div className="bg-transparent border border-white/20 rounded-xl p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Model</p>
                                        <p className="text-base font-semibold text-slate-100">{arac.model || '-'}</p>
                                    </div>
                                    <div className="bg-transparent border border-white/20 rounded-xl p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Muayene Tarihi</p>
                                        <p className="text-base font-semibold text-slate-100">{formatTarih(arac.muayene_tarihi)}</p>
                                    </div>
                                    <div className="bg-transparent border border-white/20 rounded-xl p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Kasko Tarihi</p>
                                        <p className="text-base font-semibold text-slate-100">{formatTarih(arac.kasko_tarihi)}</p>
                                    </div>
                                    <div className="bg-transparent border border-white/20 rounded-xl p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Sigorta Tarihi</p>
                                        <p className="text-base font-semibold text-slate-100">{formatTarih(arac.sigorta_tarihi)}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-600">ID: {id} için araç bilgisi bulunamadı.</p>
                            )}
                        </section>

                        <section className="glass-card p-2 sm:p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <button type="button" onClick={() => setActiveTab('bakim')} className={`rounded-md px-4 py-2 font-medium transition-colors duration-300 ${activeTab === 'bakim' ? 'bg-emerald-400 text-slate-950 shadow-md' : 'bg-white/95 dark:bg-slate-900/75 text-slate-900 dark:text-slate-200 border border-slate-400/60 dark:border-white/25 hover:bg-slate-200 dark:hover:bg-slate-800/80'}`}>Bakım Kayıtları</button>
                                <button type="button" onClick={() => setActiveTab('yakit')} className={`rounded-md px-4 py-2 font-medium transition-colors duration-300 ${activeTab === 'yakit' ? 'bg-indigo-500 text-white shadow-md' : 'bg-white/95 dark:bg-slate-900/75 text-slate-900 dark:text-slate-200 border border-slate-400/60 dark:border-white/25 hover:bg-slate-200 dark:hover:bg-slate-800/80'}`}>Yakıt Kayıtları</button>
                                <button type="button" onClick={() => setActiveTab('parca')} className={`rounded-md px-4 py-2 font-medium transition-colors duration-300 ${activeTab === 'parca' ? 'bg-violet-500 text-white shadow-md' : 'bg-white/95 dark:bg-slate-900/75 text-slate-900 dark:text-slate-200 border border-slate-400/60 dark:border-white/25 hover:bg-slate-200 dark:hover:bg-slate-800/80'}`}>Parça Takibi</button>
                                <button type="button" onClick={() => setActiveTab('istatistik')} className={`rounded-md px-4 py-2 font-medium transition-colors duration-300 ${activeTab === 'istatistik' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-white/95 dark:bg-slate-900/75 text-slate-900 dark:text-slate-200 border border-slate-400/60 dark:border-white/25 hover:bg-slate-200 dark:hover:bg-slate-800/80'}`}>İstatistikler</button>
                            </div>
                        </section>

                        <div key={activeTab} className="tab-switch-enter">
                        {activeTab === 'bakim' && (
                            <>
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="glass-card rounded-lg border border-emerald-300/35 p-6">
                                        <p className="text-sm text-emerald-300 font-medium mb-2">Toplam Harcama</p>
                                        <p className="text-3xl font-bold text-slate-50">{formatPara(toplamBakimHarcama)}</p>
                                    </div>
                                    <div className="glass-card rounded-lg border border-indigo-300/35 p-6">
                                        <p className="text-sm text-indigo-300 font-medium mb-2">Son İşlem</p>
                                        {sonBakim ? (
                                            <><p className="text-2xl font-bold text-slate-50">{sonBakim.km ?? '-'} KM</p><p className="text-sm text-slate-300 mt-2">{formatTarih(sonBakim.tarih)} tarihinde işlem görmüş</p></>
                                        ) : (<p className="text-slate-300">Henüz bakım kaydı bulunmuyor.</p>)}
                                    </div>
                                </section>

                                <section className="glass-card rounded-lg border border-emerald-300/35 p-6">
                                    <h2 className="text-lg font-semibold text-slate-50 mb-4">Yeni Bakım Kaydı</h2>
                                    {bakimFormError && <div className="mb-4 bg-red-950/45 border border-red-300/55 text-red-200 text-sm rounded-md px-3 py-2">{bakimFormError}</div>}
                                    <form onSubmit={handleBakimEkle} onKeyDown={handleFormEnterKeyDown} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Tür</label><select name="bakim_tipi" value={bakimFormData.bakim_tipi} onChange={handleBakimInputChange} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2">{bakimTipleri.map(tip => <option key={tip} value={tip}>{tip}</option>)}</select></div>
                                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Tarih</label><input type="date" name="tarih" value={bakimFormData.tarih} onChange={handleBakimInputChange} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm font-medium text-slate-300 mb-1">KM</label><input type="text" inputMode="numeric" name="km" value={bakimFormData.km} onChange={handleBakimInputChange} onBlur={handleBakimNumberBlur} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Maliyet (TL)</label><input type="text" inputMode="decimal" name="maliyet" value={bakimFormData.maliyet} onChange={handleBakimInputChange} onBlur={handleBakimNumberBlur} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2" /></div>
                                        <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-300 mb-1">Notlar</label><textarea name="notlar" value={bakimFormData.notlar} onChange={handleBakimInputChange} rows={3} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2" /></div>
                                        <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={isBakimSubmitting} className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold px-5 py-2 rounded-md shadow-md">{isBakimSubmitting ? 'Kaydediliyor...' : 'Bakım Kaydı Ekle'}</button></div>
                                    </form>
                                </section>

                                <section className="glass-card rounded-lg border border-indigo-300/35 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold text-slate-50">Geçmiş Bakımlar</h2>
                                        {bakimlar.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    const exportData = sortByKey(bakimlar, bakimSortConfig.key, bakimSortConfig.order).map(bakim => ({
                                                        Tarih: formatTarih(bakim.tarih),
                                                        Tip: bakim.bakim_tipi,
                                                        KM: bakim.km,
                                                        Maliyet_TL: bakim.maliyet,
                                                        Notlar: bakim.notlar || '-'
                                                    }));
                                                    exportToCSV(exportData, `bakimlar_${new Date().toISOString().split('T')[0]}`);
                                                }}
                                                className="text-sm px-3 py-1.5 rounded-md bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-200 border border-slate-400/60 dark:border-white/25 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-300 shadow-md"
                                            >
                                                📥 CSV İndir
                                            </button>
                                        )}
                                    </div>
                                    {bakimlar.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-700/40 mb-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-300 font-medium">Henüz bakım kaydı bulunmuyor</p>
                                            <p className="text-sm text-slate-400 mt-1">Yeni bir bakım kaydı ekleyerek başlayın</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                                <button
                                                    onClick={() => setBakimSortConfig({ key: 'tarih', order: bakimSortConfig.order === 'asc' ? 'desc' : 'asc' })}
                                                    className="flex-1 rounded-md px-4 py-2 font-medium transition-colors duration-300 flex items-center justify-center gap-2"
                                                >
                                                    Tarih
                                                    {bakimSortConfig.order === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 4H8m8-8H8m8 4h4m-8 4h4m-4-8h4" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 4h4m-4-8h4m-8 4H4m4 4h4m-4-8h4" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setBakimSortConfig({ key: 'km', order: bakimSortConfig.order === 'asc' ? 'desc' : 'asc' })}
                                                    className="flex-1 rounded-md px-4 py-2 font-medium transition-colors duration-300 flex items-center justify-center gap-2"
                                                >
                                                    KM
                                                    {bakimSortConfig.order === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 4H8m8-8H8m8 4h4m-8 4h4m-4-8h4" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 4h4m-4-8h4m-8 4H4m4 4h4m-4-8h4" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setBakimSortConfig({ key: 'maliyet', order: bakimSortConfig.order === 'asc' ? 'desc' : 'asc' })}
                                                    className="flex-1 rounded-md px-4 py-2 font-medium transition-colors duration-300 flex items-center justify-center gap-2"
                                                >
                                                    Maliyet
                                                    {bakimSortConfig.order === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 4H8m8-8H8m8 4h4m-8 4h4m-4-8h4" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 4h4m-4-8h4m-8 4H4m4 4h4m-4-8h4" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {sortByKey(bakimlar, bakimSortConfig.key, bakimSortConfig.order).map((bakim) => (
                                                    <div key={bakim.bakim_id} className="border border-white/20 bg-slate-950/35 rounded-lg p-4 flex justify-between items-center">
                                                        <div>
                                                            <p className="font-semibold text-slate-100">{bakim.bakim_tipi}</p>
                                                            <p className="text-sm text-slate-400">{formatTarih(bakim.tarih)} - {bakim.km} KM - {formatPara(bakim.maliyet)}</p>
                                                        </div>
                                                        <button onClick={() => handleBakimSil(bakim.bakim_id)} className="text-white border border-rose-300/70 bg-rose-500 hover:bg-rose-400 px-3 py-1 rounded-md shadow-md">Sil</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {activeTab === 'yakit' && (
                            <>
                                <section className="glass-card rounded-lg border border-indigo-300/35 p-6">
                                    <p className="text-sm text-indigo-300 font-medium mb-2">Yakıt Özeti</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-slate-950/40 border border-white/20 rounded-md p-4"><p className="text-xs text-slate-400 mb-1">Toplam Tutar</p><p className="text-xl font-semibold text-slate-100">{formatPara(yakitOzeti.toplamTutar)}</p></div>
                                        <div className="bg-slate-950/40 border border-white/20 rounded-md p-4"><p className="text-xs text-slate-400 mb-1">Kat Edilen KM</p><p className="text-xl font-semibold text-slate-100">{yakitOzeti.katEdilenToplamKm}</p></div>
                                        <div className="bg-slate-950/40 border border-white/20 rounded-md p-4"><p className="text-xs text-slate-400 mb-1">Maliyet</p><p className="text-xl font-semibold text-slate-100">{formatKmBasinaMaliyet(yakitOzeti.ortalamaKmBasinaMaliyet)}</p></div>
                                    </div>
                                </section>

                                <section className="glass-card rounded-lg border border-indigo-300/35 p-6">
                                    <h2 className="text-lg font-semibold text-slate-50 mb-4">Yeni Yakıt Kaydı</h2>
                                    <form onSubmit={handleYakitEkle} onKeyDown={handleFormEnterKeyDown} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm text-slate-300 mb-1">Tarih</label><input type="date" name="tarih" value={yakitFormData.tarih} onChange={handleYakitInputChange} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm text-slate-300 mb-1">Yakıt Tipi</label><select name="yakit_tipi" value={yakitFormData.yakit_tipi} onChange={handleYakitInputChange} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2">{yakitTipleri.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                        <div><label className="block text-sm text-slate-300 mb-1">Litre</label><input type="text" inputMode="decimal" name="litre" value={yakitFormData.litre} onChange={handleYakitInputChange} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm text-slate-300 mb-1">Tutar (TL)</label><input type="text" inputMode="decimal" name="tutar" value={yakitFormData.tutar} onChange={handleYakitInputChange} onBlur={handleYakitNumberBlur} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2" /></div>
                                        <div><label className="block text-sm text-slate-300 mb-1">KM</label><input type="text" inputMode="numeric" name="km" value={yakitFormData.km} onChange={handleYakitInputChange} onBlur={handleYakitNumberBlur} className="w-full border border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2" /></div>
                                        <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={isYakitSubmitting} className="bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-semibold px-5 py-2 rounded-md shadow-md">Yakıt Kaydı Ekle</button></div>
                                    </form>
                                </section>

                                <section className="glass-card rounded-lg border border-indigo-300/35 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold text-slate-50">Geçmiş Yakıt Kayıtları</h2>
                                        {yakitlar.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    const exportData = sortByKey(yakitlar, yakitSortConfig.key, yakitSortConfig.order).map(yakit => ({
                                                        Tarih: formatTarih(yakit.tarih),
                                                        Tip: yakit.yakit_tipi,
                                                        Litre: yakit.litre,
                                                        Tutar_TL: yakit.tutar,
                                                        KM: yakit.km,
                                                        Notlar: yakit.notlar || '-'
                                                    }));
                                                    exportToCSV(exportData, `yakitlar_${new Date().toISOString().split('T')[0]}`);
                                                }}
                                                className="text-sm px-3 py-1.5 rounded-md bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-200 border border-slate-400/60 dark:border-white/25 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-300 shadow-md"
                                            >
                                                📥 CSV İndir
                                            </button>
                                        )}
                                    </div>
                                    {yakitlar.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-700/40 mb-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-300 font-medium">Henüz yakıt kaydı bulunmuyor</p>
                                            <p className="text-sm text-slate-400 mt-1">Yeni bir yakıt kaydı ekleyerek başlayın</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                                <button
                                                    onClick={() => setYakitSortConfig({ key: 'tarih', order: yakitSortConfig.order === 'asc' ? 'desc' : 'asc' })}
                                                    className="flex-1 rounded-md px-4 py-2 font-medium transition-colors duration-300 flex items-center justify-center gap-2"
                                                >
                                                    Tarih
                                                    {yakitSortConfig.order === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 4H8m8-8H8m8 4h4m-8 4h4m-4-8h4" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 4h4m-4-8h4m-8 4H4m4 4h4m-4-8h4" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setYakitSortConfig({ key: 'km', order: yakitSortConfig.order === 'asc' ? 'desc' : 'asc' })}
                                                    className="flex-1 rounded-md px-4 py-2 font-medium transition-colors duration-300 flex items-center justify-center gap-2"
                                                >
                                                    KM
                                                    {yakitSortConfig.order === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 4H8m8-8H8m8 4h4m-8 4h4m-4-8h4" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 4h4m-4-8h4m-8 4H4m4 4h4m-4-8h4" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setYakitSortConfig({ key: 'tutar', order: yakitSortConfig.order === 'asc' ? 'desc' : 'asc' })}
                                                    className="flex-1 rounded-md px-4 py-2 font-medium transition-colors duration-300 flex items-center justify-center gap-2"
                                                >
                                                    Tutar
                                                    {yakitSortConfig.order === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 4H8m8-8H8m8 4h4m-8 4h4m-4-8h4" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 4h4m-4-8h4m-8 4H4m4 4h4m-4-8h4" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {sortByKey(yakitlar, yakitSortConfig.key, yakitSortConfig.order).map((yakit) => (
                                                    <div key={yakit.yakit_id} className="border border-white/20 bg-slate-950/35 rounded-lg p-4 flex justify-between items-center">
                                                        <div>
                                                            <p className="font-semibold text-slate-100">{yakit.yakit_tipi}</p>
                                                            <p className="text-sm text-slate-400">{formatTarih(yakit.tarih)} - {yakit.litre}L - {formatPara(yakit.tutar)}</p>
                                                        </div>
                                                        <button onClick={() => handleYakitSil(yakit.yakit_id)} className="text-white border border-rose-300/70 bg-rose-500 hover:bg-rose-400 px-3 py-1 rounded-md shadow-md">Sil</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {activeTab === 'parca' && (
                            <section className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4 gap-3">
                                    <h2 className="text-xl font-bold text-slate-50">Detaylı Parça Ömür Takibi</h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSadeceKritikParcalar((prev) => !prev)}
                                            className={`text-sm px-4 py-2 rounded-full border transition-all duration-300 ${sadeceKritikParcalar ? 'bg-emerald-400/25 text-emerald-100 border-emerald-300/80 brightness-125 shadow-md' : 'bg-slate-800/70 text-slate-200 border-white/30 hover:bg-slate-700/80'}`}
                                        >
                                            Sadece Kritik Parçaları Göster
                                        </button>
                                        <button
                                            type="button"
                                            onClick={openYeniParcaModal}
                                            className="text-sm px-3 py-1.5 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold transition-colors duration-300 shadow-md"
                                        >
                                            Yeni Parça Ekle
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {gorunenParcalar.map((parca) => (
                                        <div key={parca.parca_id} className="glass-card p-4">
                                            <div className="flex items-center justify-between gap-4 mb-2">
                                                <div>
                                                    <p className="font-semibold text-slate-200">{parca.parca_adi}</p>
                                                    <p className="text-sm text-slate-400">Kalan Ömür: {parca.kalanMetin}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleParcaDegistir(parca)}
                                                    disabled={isParcaUpdating}
                                                    className="text-sm bg-violet-400 hover:bg-violet-300 text-slate-950 font-semibold px-3 py-1.5 rounded-md disabled:opacity-60 shadow-md"
                                                >
                                                    Parçayı Değiştir
                                                </button>
                                            </div>
                                            <div className="h-3 bg-slate-800/90 rounded-full overflow-hidden border border-white/20">
                                                <div
                                                    className={`h-full rounded-full transition-all brightness-125 ${parca.danger ? 'bg-rose-500' : parca.warning ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                                    style={{ width: `${Math.max(6, parca.oran)}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Kullanım: %{parca.oran.toFixed(1)}</p>
                                        </div>
                                    ))}
                                    {!gorunenParcalar.length && <p className="text-sm text-slate-400">Filtreye uygun parça bulunamadı.</p>}
                                </div>
                            </section>
                        )}

                        {activeTab === 'istatistik' && (
                            <section className="space-y-6">
                                <div className="glass-card rounded-lg border border-white/15 p-6">
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="max-w-2xl">
                                            <p className="text-sm uppercase tracking-[0.2em] text-slate-400 mb-2">Akıllı Bakım Asistanı</p>
                                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-50">Yapay Zeka Destekli Bakım Öngörüsü</h2>
                                            <p className="text-sm text-slate-300 mt-3">
                                                {bakimOngorusu?.mesaj || 'Tahmini bakım verisi hazırlanıyor.'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:min-w-[360px]">
                                            <div className="bg-slate-950/45 border border-white/15 rounded-xl p-4">
                                                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Tahmini Tarih</p>
                                                <p className={`text-2xl font-bold ${bakimOngorusu?.tip === 'bilgi' ? 'text-emerald-400' : bakimOngorusu?.tip === 'uyari' ? 'text-amber-400' : 'text-rose-500'}`}>
                                                    {bakimOngorusu?.tahminiTarih || '-'}
                                                </p>
                                            </div>
                                            <div className="bg-slate-950/45 border border-white/15 rounded-xl p-4">
                                                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Kalan Mesafe</p>
                                                <p className="text-2xl font-bold text-slate-50">
                                                    {bakimOngorusu?.kalanKm !== null && bakimOngorusu?.kalanKm !== undefined
                                                        ? `${Number(bakimOngorusu.kalanKm).toLocaleString('tr-TR')} KM kaldı`
                                                        : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5">
                                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                            <span>Durum Çubuğu</span>
                                            <span>
                                                {bakimOngorusu?.progress !== undefined
                                                    ? `%${bakimOngorusu.progress.toFixed(0)}`
                                                    : '%0'}
                                            </span>
                                        </div>
                                        <div className="h-3 rounded-full bg-slate-800/80 border border-white/15 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${bakimOngorusu?.tip === 'tehlike'
                                                    ? 'bg-rose-500'
                                                    : bakimOngorusu?.tip === 'uyari'
                                                        ? 'bg-amber-400'
                                                        : 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-rose-500'
                                                    }`}
                                                style={{ width: `${bakimOngorusu?.progress ?? 0}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {bakimOngorusu?.gunlukOrtalamaKm !== null && bakimOngorusu?.gunlukOrtalamaKm !== undefined
                                                ? `Günlük ortalama kullanım: ${bakimOngorusu.gunlukOrtalamaKm.toFixed(1)} KM`
                                                : 'Günlük ortalama kullanım için yeterli veri yok.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="glass-card rounded-lg border border-indigo-300/35 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-300">KM Başına Maliyet</p>
                                        <p className="text-2xl font-bold text-white mt-2">{formatKmBasinaMaliyet(kmBasinaToplamMaliyet)}</p>
                                    </div>
                                    <div className="glass-card rounded-lg border border-amber-300/35 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-300">Yıllık Tahmini Gider</p>
                                        <p className="text-2xl font-bold text-white mt-2">{formatKisaPara(yillikTahminiGider)}</p>
                                    </div>
                                    <div className="glass-card rounded-lg border border-emerald-300/35 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-300">Genel Sağlık Puanı</p>
                                        <p className="text-2xl font-bold text-white mt-2">%{genelSaglikPuani}</p>
                                    </div>
                                </div>

                                <div className="glass-card rounded-lg border border-white/15 p-6 space-y-5">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Gelecek Projeksiyon</p>
                                            <h2 className="text-2xl font-bold text-slate-50">Tahmini KM İvme Grafiği</h2>
                                        </div>
                                        <p className="text-sm text-slate-400 max-w-xl">
                                            Araç kullanımının hedef bakıma nasıl hızlandığını geçmiş ve tahmini çizgilerle izleyin.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="glass-card rounded-lg border border-emerald-300/25 p-4 bg-slate-950/45">
                                            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Günlük Ortalama Kullanım</p>
                                            <p className="text-2xl font-bold text-emerald-400">
                                                {Number.isFinite(bakimOngorusu?.gunlukOrtalamaKm)
                                                    ? `${bakimOngorusu.gunlukOrtalamaKm.toFixed(0)} KM/Gün`
                                                    : '45 KM/Gün'}
                                            </p>
                                        </div>
                                        <div className="glass-card rounded-lg border border-amber-300/25 p-4 bg-slate-950/45">
                                            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Kalan Güvenli Mesafe</p>
                                            <p className="text-2xl font-bold text-amber-400">
                                                {Number.isFinite(bakimOngorusu?.kalanKm)
                                                    ? `${Math.max(0, bakimOngorusu.kalanKm).toLocaleString('tr-TR')} KM`
                                                    : '1.200 KM'}
                                            </p>
                                        </div>
                                        <div className="glass-card rounded-lg border border-rose-300/25 p-4 bg-slate-950/45">
                                            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Kritik Tarih</p>
                                            <p className="text-2xl font-bold text-rose-500">
                                                {bakimOngorusu?.tahminiTarih || '15 Ağustos 2026'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-96">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={gelecekProjeksiyonVerisi} margin={{ top: 10, right: 24, left: 0, bottom: 12 }}>
                                                <CartesianGrid stroke="#94a3b8" strokeOpacity={0.1} strokeDasharray="4 4" />
                                                <XAxis
                                                    dataKey="ayEtiketi"
                                                    stroke="#cbd5e1"
                                                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                                                    axisLine={{ stroke: 'rgba(148,163,184,0.25)' }}
                                                    tickLine={{ stroke: 'rgba(148,163,184,0.25)' }}
                                                />
                                                <YAxis
                                                    stroke="#cbd5e1"
                                                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                                                    tickFormatter={(value) => Number(value).toLocaleString('tr-TR')}
                                                    axisLine={{ stroke: 'rgba(148,163,184,0.25)' }}
                                                    tickLine={{ stroke: 'rgba(148,163,184,0.25)' }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                {Number.isFinite(bakimOngorusu?.hedefKm) && bakimOngorusu.hedefKm > 0 && (
                                                    <ReferenceLine
                                                        y={bakimOngorusu.hedefKm}
                                                        stroke="#f43f5e"
                                                        strokeDasharray="6 6"
                                                        strokeWidth={2}
                                                        label={
                                                            <Label
                                                                value={`Bakım Hedefi (${Math.max(0, bakimOngorusu?.kalanGun ?? 0)} Gün Kaldı)`}
                                                                position="insideTopRight"
                                                                offset={10}
                                                                fill="#f43f5e"
                                                                style={{ fontSize: 12, fontWeight: 700 }}
                                                            />
                                                        }
                                                    />
                                                )}
                                                <Line
                                                    type="monotone"
                                                    dataKey="gercekKm"
                                                    name="Geçmiş KM"
                                                    stroke="#34d399"
                                                    strokeWidth={3}
                                                    dot={false}
                                                    connectNulls
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tahminiKm"
                                                    name="Tahmini KM"
                                                    stroke="#fbbf24"
                                                    strokeWidth={3}
                                                    strokeDasharray="5 5"
                                                    dot={false}
                                                    connectNulls
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="glass-card rounded-lg border border-emerald-300/35 p-6">
                                        <h2 className="text-lg font-semibold text-slate-50 mb-4">Maliyet Analizi</h2>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={maliyetAnaliziData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={78}
                                                        outerRadius={115}
                                                        paddingAngle={3}
                                                    >
                                                        {maliyetAnaliziData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                                                    </Pie>
                                                    <text x="50%" y="48%" textAnchor="middle" fill="#e2e8f0" fontSize="12">Toplam Harcama</text>
                                                    <text x="50%" y="56%" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="700">{formatKisaPara(toplamHarcama)}</text>
                                                    <Tooltip formatter={pieTooltipFormatter} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="glass-card rounded-lg border border-indigo-300/35 p-6">
                                        <h2 className="text-lg font-semibold text-slate-50 mb-4">Tüketim Trendi (Son 6 Ay)</h2>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={tuketimTrendData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                                                    <defs>
                                                        <linearGradient id="trendYakit" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.45} />
                                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.06} />
                                                        </linearGradient>
                                                        <linearGradient id="trendBakim" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.45} />
                                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0.06} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="4 4" />
                                                    <XAxis dataKey="ayEtiketi" stroke="#94a3b8" />
                                                    <YAxis stroke="#94a3b8" />
                                                    <Tooltip formatter={areaTooltipFormatter} />
                                                    <Legend />
                                                    <Area type="monotone" dataKey="yakit" name="Yakıt" stroke="#f43f5e" fill="url(#trendYakit)" strokeWidth={2} />
                                                    <Area type="monotone" dataKey="bakim" name="Bakım" stroke="#34d399" fill="url(#trendBakim)" strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="glass-card rounded-lg border border-slate-500/35 p-6">
                                        <h2 className="text-lg font-semibold text-slate-50 mb-4">Araç Sağlık Skoru</h2>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart data={aracSaglikRadarData} outerRadius="70%">
                                                    <PolarGrid stroke="rgba(148,163,184,0.12)" />
                                                    <PolarAngleAxis dataKey="konu" stroke="#cbd5e1" />
                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(148,163,184,0.4)" />
                                                    <Radar name="Skor" dataKey="skor" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.28} />
                                                    <Tooltip formatter={radarTooltipFormatter} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="glass-card rounded-lg border border-rose-300/35 p-6">
                                        <h2 className="text-lg font-semibold text-slate-50 mb-4">Parça İstatistikleri (Top 3)</h2>
                                        <div className="overflow-hidden rounded-lg border border-white/10">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-900/70 text-slate-200">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Parça</th>
                                                        <th className="px-3 py-2 text-left">Değişim Sıklığı</th>
                                                        <th className="px-3 py-2 text-left">Durum</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parcaSiklikData.map((satir) => (
                                                        <tr key={satir.parcaAdi} className="border-t border-white/10 text-slate-100">
                                                            <td className="px-3 py-2">{satir.parcaAdi}</td>
                                                            <td className="px-3 py-2">{satir.degisimSayisi}</td>
                                                            <td className="px-3 py-2">%{satir.durumSkoru}</td>
                                                        </tr>
                                                    ))}
                                                    {!parcaSiklikData.length && (
                                                        <tr>
                                                            <td className="px-3 py-3 text-slate-300" colSpan={3}>Parça istatistiği için yeterli veri bulunamadı.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                        </div>
                    </>
                )}
            </main>


            {isParcaModalOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 ${isParcaModalVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
                    <div className={`w-full max-w-lg glass-card p-6 text-slate-100 ${isParcaModalVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
                        <h3 className="text-xl font-semibold mb-4 text-slate-50">Yeni Parça Ekle</h3>

                        <form onSubmit={handleYeniParcaEkle} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Parça Adı</label>
                                <select
                                    name="parca_adi"
                                    value={yeniParcaFormu.parca_adi}
                                    onChange={handleYeniParcaInputChange}
                                    className="w-full border border-white/20 bg-transparent rounded-md px-3 py-2 text-slate-100"
                                >
                                    <option value="">Parça seçiniz</option>
                                    {parcaSecenekleri.map((parcaAdi) => (
                                        <option key={parcaAdi} value={parcaAdi}>{parcaAdi}</option>
                                    ))}
                                </select>
                            </div>

                            {secilenParcaBilgisi && (
                                <div className="rounded-lg border border-white/35 bg-black/60 backdrop-blur-xl px-4 py-3">
                                    <p className="text-xs uppercase tracking-wide text-emerald-300 mb-1">Parça Bilgisi</p>
                                    <p className="text-sm text-white">{secilenParcaBilgisi.aciklama}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Değişim Aralığı (KM)</label>
                                    <input
                                        type="number"
                                        name="degisim_araligi_km"
                                        value={yeniParcaFormu.degisim_araligi_km}
                                        onChange={handleYeniParcaInputChange}
                                        className="w-full border border-white/20 bg-transparent rounded-md px-3 py-2 text-slate-100"
                                        placeholder="Zaman bazlıysa boş bırakın"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Son Değişim KM</label>
                                    <input
                                        type="number"
                                        name="son_degisim_km"
                                        value={yeniParcaFormu.son_degisim_km}
                                        onChange={handleYeniParcaInputChange}
                                        className="w-full border border-white/20 bg-transparent rounded-md px-3 py-2 text-slate-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Son Değişim Tarihi</label>
                                <input
                                    type="date"
                                    name="son_degisim_tarihi"
                                    value={yeniParcaFormu.son_degisim_tarihi}
                                    onChange={handleYeniParcaInputChange}
                                    className="w-full border border-white/20 bg-transparent rounded-md px-3 py-2 text-slate-100"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeYeniParcaModal}
                                    className="px-4 py-2 rounded-md border border-white/30 text-slate-200 hover:bg-white/10"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={isParcaEkleSubmitting}
                                    className="px-4 py-2 rounded-md bg-violet-400 hover:bg-violet-300 text-slate-950 font-semibold disabled:opacity-60 shadow-md"
                                >
                                    {isParcaEkleSubmitting ? 'Ekleniyor...' : 'Parçayı Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AracDetay;
