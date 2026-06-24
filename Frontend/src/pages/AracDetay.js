import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    Area, AreaChart, CartesianGrid, Cell,
    Line, LineChart, Pie, PieChart,
    PolarAngleAxis, PolarGrid, PolarRadiusAxis,
    Radar, RadarChart, ReferenceLine, Label,
    XAxis, YAxis,
} from '@/components/ui/chart';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import aracService from '@/services/aracService';
import bakimService from '@/services/bakimService';
import parcaService from '@/services/parcaService';
import yakitService from '@/services/yakitService';
import { formatCurrency, formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';
import { exportToCSV, sortByKey } from '@/utils/exporter';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Clock, FileWarning, Pencil, Trash2, Download, ArrowLeft } from 'lucide-react';

const MALIYET_CHART_CONFIG = {
    bakim: { label: 'Bakım',  color: 'var(--chart-1)' },
    yakit: { label: 'Yakıt',  color: 'var(--chart-2)' },
    diger: { label: 'Diğer',  color: 'var(--chart-3)' },
}

const TREND_CHART_CONFIG = {
    yakit: { label: 'Yakıt (TL)', color: 'var(--chart-1)' },
    bakim: { label: 'Bakım (TL)', color: 'var(--chart-2)' },
}

const RADAR_CHART_CONFIG = {
    skor: { label: 'Sağlık Skoru', color: 'var(--chart-1)' },
}

const PROJEKSIYON_CHART_CONFIG = {
    gercekKm:  { label: 'Geçmiş KM',  color: 'var(--chart-2)' },
    tahminiKm: { label: 'Tahmini KM', color: 'var(--chart-3)' },
}

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

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        plaka: '', marka: '', model: '', yil: '',
        muayene_tarihi: '', kasko_tarihi: '', sigorta_tarihi: ''
    });
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
            { name: 'bakim', label: 'Bakım',  value: bakimGider,                 fill: 'var(--color-bakim)' },
            { name: 'yakit', label: 'Yakıt',  value: yakitOzeti.toplamTutar,     fill: 'var(--color-yakit)' },
            { name: 'diger', label: 'Diğer',  value: digerGider,                 fill: 'var(--color-diger)' },
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


    const openEditDialog = () => {
        if (!arac) return;
        setEditFormData({
            plaka: arac.plaka || '',
            marka: arac.marka || '',
            model: arac.model || '',
            yil: arac.yil || '',
            muayene_tarihi: arac.muayene_tarihi ? String(arac.muayene_tarihi).slice(0, 10) : '',
            kasko_tarihi: arac.kasko_tarihi ? String(arac.kasko_tarihi).slice(0, 10) : '',
            sigorta_tarihi: arac.sigorta_tarihi ? String(arac.sigorta_tarihi).slice(0, 10) : '',
        });
        setIsEditOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsEditSubmitting(true);
            await aracService.aracGuncelle(id, { ...editFormData, yil: Number(editFormData.yil) });
            toast.success('Araç bilgileri güncellendi.');
            setIsEditOpen(false);
            await fetchAracVeKayitlar();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Güncelleme sırasında bir hata oluştu.');
        } finally {
            setIsEditSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await aracService.aracSil(id);
            toast.success('Araç silindi.');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Silme sırasında bir hata oluştu.');
            setIsDeleteOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

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
        doc.text('truss Arac Raporu', 14, 16);

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

        doc.save(`truss_${plaka || 'arac'}_rapor.pdf`);
    }, [arac, bakimUyari?.mesaj, bakimlar, formatPara, formatTarih, guncelKm, sonBakim, yakitlar]);

    const statusBadge = useMemo(() => {
        if (!bakimUyari) return { label: 'Aktif', variant: 'default', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
        if (bakimUyari.tip === 'tehlike') return { label: 'Bakım Gerekli', variant: 'destructive', className: 'bg-destructive/15 text-destructive border-destructive/30' };
        if (bakimUyari.tip === 'uyari') return { label: 'Uyarı', variant: 'outline', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
        return { label: 'Bilgi', variant: 'secondary', className: '' };
    }, [bakimUyari]);

    const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30';
    const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';


    return (
        <div className="flex flex-col gap-4">
            {/* ── Loading Skeleton ── */}
            {loading && (
                <div className="flex gap-4 h-[calc(100vh-9rem)]">
                    <div className="w-64 shrink-0 flex flex-col gap-4">
                        <Skeleton className="h-full rounded-xl" />
                    </div>
                    <div className="flex-1 flex flex-col gap-4">
                        <Skeleton className="h-10 w-64 rounded-xl" />
                        <Skeleton className="flex-1 rounded-xl" />
                    </div>
                </div>
            )}

            {/* ── Error ── */}
            {!loading && error && (
                <Card className="border-destructive/40 bg-destructive/5">
                    <CardContent className="py-6 text-center text-sm text-destructive">{error}</CardContent>
                </Card>
            )}

            {/* ── Alert banner ── */}
            {!loading && bakimUyari && (
                <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    bakimUyari.tip === 'tehlike' ? 'border-destructive/40 bg-destructive/10 text-destructive' :
                    bakimUyari.tip === 'uyari'   ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' :
                                                   'border-primary/40 bg-primary/10 text-primary'
                }`}>
                    {bakimUyari.tip === 'tehlike' ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> :
                     bakimUyari.tip === 'uyari'   ? <Clock className="mt-0.5 size-4 shrink-0" /> :
                                                    <FileWarning className="mt-0.5 size-4 shrink-0" />}
                    <span>{bakimUyari.mesaj}</span>
                </div>
            )}

            {/* ── Main Resizable Layout ── */}
            {!loading && !error && (
                <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-9rem)] rounded-xl border border-border overflow-hidden">
                    {/* ── LEFT: Araç Künyesi ── */}
                    <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                        <div className="flex h-full flex-col gap-4 p-4">
                            <Card className="flex-1 flex flex-col">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Araç Künyesi</p>
                                            <CardTitle className="text-2xl font-bold tracking-tight">
                                                {arac?.plaka || '—'}
                                            </CardTitle>
                                        </div>
                                        <Badge className={`shrink-0 mt-1 border ${statusBadge.className}`}>
                                            {statusBadge.label}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col gap-3 pb-4">
                                    <dl className="space-y-3">
                                        {[
                                            { label: 'Marka', value: arac?.marka },
                                            { label: 'Model', value: arac?.model },
                                            { label: 'Yıl', value: arac?.yil },
                                            { label: 'Güncel KM', value: guncelKm > 0 ? `${guncelKm.toLocaleString('tr-TR')} KM` : '—' },
                                            { label: 'Muayene', value: formatTarih(arac?.muayene_tarihi) },
                                            { label: 'Kasko', value: formatTarih(arac?.kasko_tarihi) },
                                            { label: 'Sigorta', value: formatTarih(arac?.sigorta_tarihi) },
                                        ].map(({ label, value }) => (
                                            <div key={label}>
                                                <dt className="text-xs text-muted-foreground">{label}</dt>
                                                <dd className="text-sm font-medium text-foreground">{value || '—'}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <div className="mt-auto pt-4 border-t border-border flex flex-col gap-2">
                                        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={openEditDialog}>
                                            <Pencil className="size-3.5" />
                                            Düzenle
                                        </Button>
                                        <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setIsDeleteOpen(true)}>
                                            <Trash2 className="size-3.5" />
                                            Aracı Sil
                                        </Button>
                                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={exportPDF}>
                                            <Download className="size-3.5" />
                                            PDF Rapor
                                        </Button>
                                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => navigate('/dashboard')}>
                                            <ArrowLeft className="size-3.5" />
                                            Geri Dön
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* ── RIGHT: Tabs ── */}
                    <ResizablePanel defaultSize={75} minSize={50}>
                        <div className="h-full overflow-auto p-4">
                            <Tabs defaultValue="genel" className="h-full">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="genel">Genel Bakış</TabsTrigger>
                                    <TabsTrigger value="bakim">Bakım</TabsTrigger>
                                    <TabsTrigger value="yakit">Yakıt</TabsTrigger>
                                    <TabsTrigger value="istatistik">İstatistikler</TabsTrigger>
                                </TabsList>

                                {/* ── Genel Bakış ── */}
                                <TabsContent value="genel" className="space-y-4 mt-0">
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        {[
                                            { label: 'Toplam Bakım', value: formatPara(toplamBakimHarcama), icon: <CheckCircle2 className="size-4 text-emerald-500" /> },
                                            { label: 'Toplam Yakıt', value: formatPara(yakitOzeti.toplamTutar), icon: <AlertTriangle className="size-4 text-rose-400" /> },
                                            { label: 'Sağlık Puanı', value: `%${genelSaglikPuani}`, icon: <CheckCircle2 className="size-4 text-primary" /> },
                                            { label: 'Yıllık Tahmin', value: `${yillikTahminiGider.toLocaleString('tr-TR')} TL`, icon: <Clock className="size-4 text-amber-400" /> },
                                        ].map(({ label, value, icon }) => (
                                            <Card key={label}>
                                                <CardHeader className="pb-1 flex flex-row items-center justify-between">
                                                    <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                                                    {icon}
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-lg font-bold tracking-tight">{value}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Bakım Öngörüsü Progress */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-semibold">Bakım Öngörüsü</CardTitle>
                                            <CardDescription>{bakimOngorusu?.mesaj || 'Yeterli veri yok.'}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                                <span>Son bakımdan bu yana</span>
                                                <span>%{Math.round(bakimOngorusu?.progress ?? 0)}</span>
                                            </div>
                                            <Progress
                                                value={bakimOngorusu?.progress ?? 0}
                                                className={`h-2 ${bakimOngorusu?.tip === 'tehlike' ? '[&>div]:bg-destructive' : bakimOngorusu?.tip === 'uyari' ? '[&>div]:bg-amber-400' : ''}`}
                                            />
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Tahmini Tarih</p>
                                                    <p className="font-semibold">{bakimOngorusu?.tahminiTarih || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Kalan Mesafe</p>
                                                    <p className="font-semibold">{bakimOngorusu?.kalanKm !== null && bakimOngorusu?.kalanKm !== undefined ? `${Number(bakimOngorusu.kalanKm).toLocaleString('tr-TR')} KM` : '—'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Parça Takibi */}
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                                            <CardTitle className="text-sm font-semibold">Parça Ömür Takibi</CardTitle>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setSadeceKritikParcalar(p => !p)}>
                                                    {sadeceKritikParcalar ? 'Tümünü Göster' : 'Sadece Kritik'}
                                                </Button>
                                                <Button size="sm" className="h-7 px-2 text-xs" onClick={openYeniParcaModal}>+ Parça</Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {gorunenParcalar.length === 0 && (
                                                <p className="text-sm text-muted-foreground text-center py-4">Parça kaydı bulunamadı.</p>
                                            )}
                                            {gorunenParcalar.map((parca) => (
                                                <div key={parca.parca_id} className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium">{parca.parca_adi}</p>
                                                            <p className="text-xs text-muted-foreground">Kalan: {parca.kalanMetin}</p>
                                                        </div>
                                                        <Button
                                                            variant="outline" size="sm"
                                                            className={`h-7 px-2 text-xs ${parca.danger ? 'border-destructive/40 text-destructive' : ''}`}
                                                            disabled={isParcaUpdating}
                                                            onClick={() => handleParcaDegistir(parca)}
                                                        >Değiştir</Button>
                                                    </div>
                                                    <Progress
                                                        value={parca.oran}
                                                        className={`h-1.5 ${parca.danger ? '[&>div]:bg-destructive' : parca.warning ? '[&>div]:bg-amber-400' : '[&>div]:bg-emerald-500'}`}
                                                    />
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ── Bakım Tab ── */}
                                <TabsContent value="bakim" className="space-y-4 mt-0">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Card>
                                            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Toplam Harcama</CardTitle></CardHeader>
                                            <CardContent><p className="text-xl font-bold">{formatPara(toplamBakimHarcama)}</p></CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Son Bakım</CardTitle></CardHeader>
                                            <CardContent>
                                                {sonBakim ? (
                                                    <>
                                                        <p className="text-xl font-bold">{sonBakim.km?.toLocaleString('tr-TR')} KM</p>
                                                        <p className="text-xs text-muted-foreground">{formatTarih(sonBakim.tarih)}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Kayıt yok</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <Card>
                                        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Yeni Bakım Kaydı</CardTitle></CardHeader>
                                        <CardContent>
                                            <form onSubmit={handleBakimEkle} onKeyDown={handleFormEnterKeyDown} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className={labelCls}>Tür</label>
                                                    <select name="bakim_tipi" value={bakimFormData.bakim_tipi} onChange={handleBakimInputChange} className={inputCls}>
                                                        {bakimTipleri.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Tarih</label>
                                                    <input type="date" name="tarih" value={bakimFormData.tarih} onChange={handleBakimInputChange} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>KM</label>
                                                    <input type="text" inputMode="numeric" name="km" value={bakimFormData.km} onChange={handleBakimInputChange} onBlur={handleBakimNumberBlur} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Maliyet (TL)</label>
                                                    <input type="text" inputMode="decimal" name="maliyet" value={bakimFormData.maliyet} onChange={handleBakimInputChange} onBlur={handleBakimNumberBlur} className={inputCls} />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className={labelCls}>Notlar</label>
                                                    <textarea name="notlar" value={bakimFormData.notlar} onChange={handleBakimInputChange} rows={2} className={inputCls} />
                                                </div>
                                                <div className="sm:col-span-2 flex justify-end">
                                                    <Button type="submit" disabled={isBakimSubmitting} size="sm">
                                                        {isBakimSubmitting ? 'Kaydediliyor…' : 'Bakım Kaydı Ekle'}
                                                    </Button>
                                                </div>
                                            </form>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                                            <CardTitle className="text-sm font-semibold">Geçmiş Bakımlar</CardTitle>
                                            {bakimlar.length > 0 && (
                                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1.5" onClick={() => {
                                                    exportToCSV(
                                                        sortByKey(bakimlar, bakimSortConfig.key, bakimSortConfig.order).map(b => ({
                                                            Tarih: formatTarih(b.tarih), Tip: b.bakim_tipi, KM: b.km,
                                                            Maliyet_TL: b.maliyet, Notlar: b.notlar || '-'
                                                        })),
                                                        `bakimlar_${new Date().toISOString().split('T')[0]}`
                                                    );
                                                }}>
                                                    <Download className="size-3" /> CSV
                                                </Button>
                                            )}
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {bakimlar.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-8">Henüz bakım kaydı bulunmuyor.</p>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="cursor-pointer" onClick={() => setBakimSortConfig(s => ({ key: 'tarih', order: s.order === 'asc' ? 'desc' : 'asc' }))}>Tarih</TableHead>
                                                            <TableHead>Tür</TableHead>
                                                            <TableHead className="cursor-pointer" onClick={() => setBakimSortConfig(s => ({ key: 'km', order: s.order === 'asc' ? 'desc' : 'asc' }))}>KM</TableHead>
                                                            <TableHead className="cursor-pointer text-right" onClick={() => setBakimSortConfig(s => ({ key: 'maliyet', order: s.order === 'asc' ? 'desc' : 'asc' }))}>Maliyet</TableHead>
                                                            <TableHead className="w-16"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sortByKey(bakimlar, bakimSortConfig.key, bakimSortConfig.order).map((bakim) => (
                                                            <TableRow key={bakim.bakim_id}>
                                                                <TableCell className="text-xs">{formatTarih(bakim.tarih)}</TableCell>
                                                                <TableCell className="text-xs">{bakim.bakim_tipi}</TableCell>
                                                                <TableCell className="text-xs">{bakim.km?.toLocaleString('tr-TR')}</TableCell>
                                                                <TableCell className="text-xs text-right">{formatPara(bakim.maliyet)}</TableCell>
                                                                <TableCell>
                                                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleBakimSil(bakim.bakim_id)}>
                                                                        <Trash2 className="size-3" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ── Yakıt Tab ── */}
                                <TabsContent value="yakit" className="space-y-4 mt-0">
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Toplam Tutar', value: formatPara(yakitOzeti.toplamTutar) },
                                            { label: 'Kat Edilen KM', value: `${yakitOzeti.katEdilenToplamKm.toLocaleString('tr-TR')} KM` },
                                            { label: 'KM Başına Maliyet', value: formatKmBasinaMaliyet(yakitOzeti.ortalamaKmBasinaMaliyet) },
                                        ].map(({ label, value }) => (
                                            <Card key={label}>
                                                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
                                                <CardContent><p className="text-base font-bold">{value}</p></CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    <Card>
                                        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Yeni Yakıt Kaydı</CardTitle></CardHeader>
                                        <CardContent>
                                            <form onSubmit={handleYakitEkle} onKeyDown={handleFormEnterKeyDown} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className={labelCls}>Tarih</label>
                                                    <input type="date" name="tarih" value={yakitFormData.tarih} onChange={handleYakitInputChange} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Yakıt Tipi</label>
                                                    <select name="yakit_tipi" value={yakitFormData.yakit_tipi} onChange={handleYakitInputChange} className={inputCls}>
                                                        {yakitTipleri.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Litre</label>
                                                    <input type="text" inputMode="decimal" name="litre" value={yakitFormData.litre} onChange={handleYakitInputChange} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Tutar (TL)</label>
                                                    <input type="text" inputMode="decimal" name="tutar" value={yakitFormData.tutar} onChange={handleYakitInputChange} onBlur={handleYakitNumberBlur} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>KM</label>
                                                    <input type="text" inputMode="numeric" name="km" value={yakitFormData.km} onChange={handleYakitInputChange} onBlur={handleYakitNumberBlur} className={inputCls} />
                                                </div>
                                                <div className="flex items-end">
                                                    <Button type="submit" disabled={isYakitSubmitting} size="sm" className="w-full">
                                                        {isYakitSubmitting ? 'Kaydediliyor…' : 'Yakıt Kaydı Ekle'}
                                                    </Button>
                                                </div>
                                            </form>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                                            <CardTitle className="text-sm font-semibold">Geçmiş Yakıt Kayıtları</CardTitle>
                                            {yakitlar.length > 0 && (
                                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1.5" onClick={() => {
                                                    exportToCSV(
                                                        sortByKey(yakitlar, yakitSortConfig.key, yakitSortConfig.order).map(y => ({
                                                            Tarih: formatTarih(y.tarih), Tip: y.yakit_tipi,
                                                            Litre: y.litre, Tutar_TL: y.tutar, KM: y.km
                                                        })),
                                                        `yakitlar_${new Date().toISOString().split('T')[0]}`
                                                    );
                                                }}>
                                                    <Download className="size-3" /> CSV
                                                </Button>
                                            )}
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {yakitlar.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-8">Henüz yakıt kaydı bulunmuyor.</p>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Tarih</TableHead>
                                                            <TableHead>Tip</TableHead>
                                                            <TableHead>Litre</TableHead>
                                                            <TableHead>KM</TableHead>
                                                            <TableHead className="text-right">Tutar</TableHead>
                                                            <TableHead className="w-16"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sortByKey(yakitlar, yakitSortConfig.key, yakitSortConfig.order).map((yakit) => (
                                                            <TableRow key={yakit.yakit_id}>
                                                                <TableCell className="text-xs">{formatTarih(yakit.tarih)}</TableCell>
                                                                <TableCell className="text-xs">{yakit.yakit_tipi}</TableCell>
                                                                <TableCell className="text-xs">{yakit.litre}</TableCell>
                                                                <TableCell className="text-xs">{yakit.km?.toLocaleString('tr-TR')}</TableCell>
                                                                <TableCell className="text-xs text-right">{formatPara(yakit.tutar)}</TableCell>
                                                                <TableCell>
                                                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleYakitSil(yakit.yakit_id)}>
                                                                        <Trash2 className="size-3" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ── İstatistikler Tab ── */}
                                <TabsContent value="istatistik" className="space-y-4 mt-0">
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'KM Başına Maliyet', value: formatKmBasinaMaliyet(kmBasinaToplamMaliyet) },
                                            { label: 'Yıllık Tahmin', value: `${yillikTahminiGider.toLocaleString('tr-TR')} TL` },
                                            { label: 'Sağlık Puanı', value: `%${genelSaglikPuani}` },
                                        ].map(({ label, value }) => (
                                            <Card key={label}>
                                                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
                                                <CardContent><p className="text-lg font-bold">{value}</p></CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        {/* Maliyet Analizi – Donut */}
                                        <Card className="bg-card border-border/50">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-semibold">Maliyet Analizi</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pb-3">
                                                <ChartContainer config={MALIYET_CHART_CONFIG} className="h-64 w-full">
                                                    <PieChart>
                                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                                        <ChartLegend content={<ChartLegendContent />} />
                                                        <Pie
                                                            data={maliyetAnaliziData}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%" cy="48%"
                                                            innerRadius={58} outerRadius={85}
                                                            paddingAngle={3}
                                                        >
                                                            {maliyetAnaliziData.map((e) => (
                                                                <Cell key={e.name} fill={e.fill} />
                                                            ))}
                                                        </Pie>
                                                        <text x="50%" y="44%" textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">Toplam</text>
                                                        <text x="50%" y="53%" textAnchor="middle" fill="var(--foreground)" fontSize="13" fontWeight="700">
                                                            {`${toplamHarcama.toLocaleString('tr-TR')} TL`}
                                                        </text>
                                                    </PieChart>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>

                                        {/* Tüketim Trendi – Area */}
                                        <Card className="bg-card border-border/50">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-semibold">Tüketim Trendi (6 Ay)</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pb-3">
                                                <ChartContainer config={TREND_CHART_CONFIG} className="h-64 w-full">
                                                    <AreaChart data={tuketimTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="gradYakit" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%"  stopColor="var(--color-yakit)" stopOpacity={0.35} />
                                                                <stop offset="95%" stopColor="var(--color-yakit)" stopOpacity={0.02} />
                                                            </linearGradient>
                                                            <linearGradient id="gradBakim" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%"  stopColor="var(--color-bakim)" stopOpacity={0.35} />
                                                                <stop offset="95%" stopColor="var(--color-bakim)" stopOpacity={0.02} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid vertical={false} />
                                                        <XAxis dataKey="ayEtiket" tickLine={false} axisLine={false} tickMargin={8} />
                                                        <YAxis tickLine={false} axisLine={false} tickMargin={4} />
                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <ChartLegend content={<ChartLegendContent />} />
                                                        <Area type="monotone" dataKey="yakit" stroke="var(--color-yakit)" fill="url(#gradYakit)" strokeWidth={2} />
                                                        <Area type="monotone" dataKey="bakim" stroke="var(--color-bakim)" fill="url(#gradBakim)" strokeWidth={2} />
                                                    </AreaChart>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>

                                        {/* Araç Sağlık Skoru – Radar */}
                                        <Card className="bg-card border-border/50">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-semibold">Araç Sağlık Skoru</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pb-3">
                                                <ChartContainer config={RADAR_CHART_CONFIG} className="h-64 w-full">
                                                    <RadarChart data={aracSaglikRadarData} outerRadius="70%">
                                                        <PolarGrid />
                                                        <PolarAngleAxis dataKey="konu" />
                                                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <Radar
                                                            name="skor"
                                                            dataKey="skor"
                                                            stroke="var(--color-skor)"
                                                            fill="var(--color-skor)"
                                                            fillOpacity={0.28}
                                                        />
                                                        <ChartLegend content={<ChartLegendContent />} />
                                                    </RadarChart>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>

                                        {/* KM Projeksiyon – Line */}
                                        <Card className="bg-card border-border/50">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-semibold">KM Projeksiyon</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pb-3">
                                                <ChartContainer config={PROJEKSIYON_CHART_CONFIG} className="h-64 w-full">
                                                    <LineChart data={gelecekProjeksiyonVerisi} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                                        <CartesianGrid vertical={false} />
                                                        <XAxis dataKey="ayEtiketi" tickLine={false} axisLine={false} tickMargin={8} />
                                                        <YAxis tickLine={false} axisLine={false} tickMargin={4} tickFormatter={(v) => `${Number(v).toLocaleString('tr-TR')}`} />
                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <ChartLegend content={<ChartLegendContent />} />
                                                        {Number.isFinite(bakimOngorusu?.hedefKm) && bakimOngorusu.hedefKm > 0 && (
                                                            <ReferenceLine y={bakimOngorusu.hedefKm} stroke="var(--destructive)" strokeDasharray="6 6" strokeWidth={2}>
                                                                <Label value="Bakım Hedefi" position="insideTopRight" fill="var(--destructive)" style={{ fontSize: 11, fontWeight: 700 }} />
                                                            </ReferenceLine>
                                                        )}
                                                        <Line type="monotone" dataKey="gercekKm"  stroke="var(--color-gercekKm)"  strokeWidth={2.5} dot={false} connectNulls />
                                                        <Line type="monotone" dataKey="tahminiKm" stroke="var(--color-tahminiKm)" strokeWidth={2.5} strokeDasharray="5 5" dot={false} connectNulls />
                                                    </LineChart>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            )}

            {/* ── Edit Vehicle Dialog ── */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Araç Bilgilerini Düzenle</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                            <label className={labelCls}>Plaka</label>
                            <input name="plaka" value={editFormData.plaka} onChange={e => setEditFormData(p => ({...p, plaka: e.target.value}))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Yıl</label>
                            <input type="number" name="yil" value={editFormData.yil} onChange={e => setEditFormData(p => ({...p, yil: e.target.value}))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Marka</label>
                            <input name="marka" value={editFormData.marka} onChange={e => setEditFormData(p => ({...p, marka: e.target.value}))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Model</label>
                            <input name="model" value={editFormData.model} onChange={e => setEditFormData(p => ({...p, model: e.target.value}))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Muayene Tarihi</label>
                            <input type="date" value={editFormData.muayene_tarihi} onChange={e => setEditFormData(p => ({...p, muayene_tarihi: e.target.value}))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Kasko Tarihi</label>
                            <input type="date" value={editFormData.kasko_tarihi} onChange={e => setEditFormData(p => ({...p, kasko_tarihi: e.target.value}))} className={inputCls} />
                        </div>
                        <div className="col-span-2">
                            <label className={labelCls}>Sigorta Tarihi</label>
                            <input type="date" value={editFormData.sigorta_tarihi} onChange={e => setEditFormData(p => ({...p, sigorta_tarihi: e.target.value}))} className={inputCls} />
                        </div>
                        <DialogFooter className="col-span-2 mt-2">
                            <DialogClose asChild><Button variant="outline" type="button">İptal</Button></DialogClose>
                            <Button type="submit" disabled={isEditSubmitting}>{isEditSubmitting ? 'Kaydediliyor…' : 'Kaydet'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Delete AlertDialog ── */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Aracı silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>{arac?.plaka}</strong> plakalı araç ve tüm bakım, yakıt, parça kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Siliniyor…' : 'Evet, Sil'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Parça Ekle Modal ── */}
            {isParcaModalOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 ${isParcaModalVisible ? 'animate-in fade-in-0' : 'animate-out fade-out-0'}`}>
                    <Card className="w-full max-w-lg">
                        <CardHeader><CardTitle>Yeni Parça Ekle</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleYeniParcaEkle} className="space-y-4">
                                <div>
                                    <label className={labelCls}>Parça Adı</label>
                                    <select name="parca_adi" value={yeniParcaFormu.parca_adi} onChange={handleYeniParcaInputChange} className={inputCls}>
                                        <option value="">Parça seçiniz</option>
                                        {parcaSecenekleri.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                {secilenParcaBilgisi && (
                                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{secilenParcaBilgisi.aciklama}</div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>Değişim Aralığı (KM)</label>
                                        <input type="number" name="degisim_araligi_km" value={yeniParcaFormu.degisim_araligi_km} onChange={handleYeniParcaInputChange} className={inputCls} placeholder="Zaman bazlıysa boş" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Son Değişim KM</label>
                                        <input type="number" name="son_degisim_km" value={yeniParcaFormu.son_degisim_km} onChange={handleYeniParcaInputChange} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Son Değişim Tarihi</label>
                                    <input type="date" name="son_degisim_tarihi" value={yeniParcaFormu.son_degisim_tarihi} onChange={handleYeniParcaInputChange} className={inputCls} />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={closeYeniParcaModal}>Vazgeç</Button>
                                    <Button type="submit" disabled={isParcaEkleSubmitting}>{isParcaEkleSubmitting ? 'Ekleniyor…' : 'Parçayı Kaydet'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AracDetay;
