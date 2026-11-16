import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useVehicleStore from '@/store/useVehicleStore';
import parcaService from '@/services/parcaService';
import { formatCurrency, formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
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
  Cog,
  Sparkles,
  CornerDownLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Plus,
  Clock,
  Search,
  Banknote,
  Calendar,
} from 'lucide-react';

import { getTodayIso } from '@/utils/dateUtils';
import { notifyApiError } from '@/utils/apiError';
import {
  parseSayacHatasi,
  getSayacBirimEtiketi,
  sayacAria,
  sayacInputSinifi,
} from '@/utils/sayacHatasi';
import SayacHatasi from './SayacHatasi';

const FALLBACK_COMPONENTS = [
  {
    parca_id: 'mock-p1',
    arac_id: 'v-1',
    plaka: '34 TRS 001',
    marka: 'Mercedes-Benz',
    model: 'Actros 1848',
    parca_adi: 'Triger & Gergi Rulmanı Seti',
    guncel_km: 148200,
    son_degisim_km: 90000,
    degisim_araligi_km: 60000,
    maliyet: 18500,
    son_degisim_tarihi: '2025-10-12',
    notlar: 'OEM ağır hizmet seti kullanıldı.',
  },
  {
    parca_id: 'mock-p2',
    arac_id: 'v-2',
    plaka: '06 FL 404',
    marka: 'Ford',
    model: 'Transit 350L',
    parca_adi: 'Ön Fren Disk & Balata Takımı',
    guncel_km: 112400,
    son_degisim_km: 95000,
    degisim_araligi_km: 40000,
    maliyet: 9400,
    son_degisim_tarihi: '2026-03-19',
    notlar: 'Seramik balata ve hava kanallı disk.',
  },
  {
    parca_id: 'mock-p3',
    arac_id: 'v-3',
    plaka: '35 EGE 88',
    marka: 'Renault',
    model: 'Clio 1.5 Blue dCi',
    parca_adi: 'DPF Partikül & Enjektör Bakımı',
    guncel_km: 89400,
    son_degisim_km: 10000,
    degisim_araligi_km: 80000,
    maliyet: 14200,
    son_degisim_tarihi: '2024-08-05',
    notlar: 'Rejenerasyon ve enjektör kalibrasyonu.',
  },
];


const BOS_YENI_PARCA_FORMU = {
  arac_id: '',
  parca_adi: '',
  degisim_km: '',
  omur_km: '30000',
  maliyet: '',
  son_degisim_tarihi: getTodayIso(),
  notlar: '',
};

// Doğal Dil Parça Omnibar Ayrıştırıcı
// Örn: "34 TRS 001 Triger Seti 120000KM 60000KM 14500TL"
function parseComponentCommand(rawText, araclar, seciliAracId) {
  const text = String(rawText || '').trim();
  const varsayilanArac =
    (seciliAracId !== 'tum'
      ? araclar.find((a) => String(a.arac_id) === String(seciliAracId))
      : null) || araclar[0] || null;

  if (!text) {
    return {
      arac: varsayilanArac,
      plaka: varsayilanArac?.plaka || null,
      parcaAdi: '',
      degisimKm: null,
      omurKm: null,
      maliyet: 0,
      hazirMi: false,
    };
  }

  const plateMatch = text.match(/\b(\d{2}\s*[A-Za-zÇĞİÖŞÜçğıöşü]{1,3}\s*\d{2,5})\b/);
  const rawPlate = plateMatch ? plateMatch[1].toUpperCase().replace(/\s+/g, ' ').trim() : null;
  const compactPlate = rawPlate ? rawPlate.replace(/\s+/g, '') : '';

  const eslesenArac =
    (compactPlate
      ? araclar.find(
          (a) =>
            String(a.plaka || '')
              .toUpperCase()
              .replace(/\s+/g, '') === compactPlate
        )
      : null) || varsayilanArac;

  const kmTokens = [...text.matchAll(/(\d+(?:[.,]\d+)*)\s*(?:km|kilometre|smh|saat)/gi)];
  const degisimKm = kmTokens[0]
    ? parseLocaleNumber(kmTokens[0][1])
    : Number(eslesenArac?.guncel_km || 0);
  const omurKm = kmTokens[1] ? parseLocaleNumber(kmTokens[1][1]) : 30000;

  const moneyMatch = text.match(/(\d+(?:[.,]\d+)*)\s*(?:tl|₺|try|lira)/i);
  const maliyet = moneyMatch ? parseLocaleNumber(moneyMatch[1]) || 0 : 0;

  let temizAd = text;
  if (plateMatch) temizAd = temizAd.replace(plateMatch[0], '');
  kmTokens.forEach((m) => {
    temizAd = temizAd.replace(m[0], '');
  });
  if (moneyMatch) temizAd = temizAd.replace(moneyMatch[0], '');
  temizAd = temizAd
    .replace(/\b(son|ömür|omur|aralık|aralik|değişim|degisim|maliyet|tutar)[:\s]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    arac: eslesenArac,
    plaka: eslesenArac?.plaka || rawPlate,
    parcaAdi: temizAd,
    degisimKm,
    omurKm,
    maliyet,
    hazirMi: Boolean((eslesenArac || rawPlate) && temizAd.length >= 2 && omurKm > 0),
  };
}

function hesaplaOmurMetrikleri(parca, aracListesi) {
  const eslesenArac = aracListesi.find((a) => String(a.arac_id) === String(parca.arac_id));
  const sayacBirim = (parca.sayac_tipi || eslesenArac?.sayac_tipi) === 'SMH' ? 'SMH' : 'KM';
  const guncelKm = Number(
    parca.guncel_km ??
      (sayacBirim === 'SMH' ? eslesenArac?.guncel_calisma_saati : eslesenArac?.guncel_km) ??
      0
  );
  const sonKm = Number(parca.son_degisim_km ?? parca.degisim_km ?? 0);
  const aralikKm =
    parca.degisim_araligi_km !== null &&
    parca.degisim_araligi_km !== undefined &&
    Number(parca.degisim_araligi_km) > 0
      ? Number(parca.degisim_araligi_km)
      : Number(parca.omur_km || 0);

  const maliyet = Number(parca.maliyet ?? 0);
  const notlar = parca.notlar ?? '';

  if (!aralikKm || aralikKm <= 0) {
    return {
      sayacBirim,
      guncelKm,
      sonKm,
      aralikKm: 0,
      kullanilanKm: Math.max(0, guncelKm - sonKm),
      kalanKm: null,
      kalanYuzde: 100,
      durum: 'tarih_bazli',
      etiket: 'Tarih Bazlı',
      kritikMi: false,
      uyariMi: false,
      maliyet,
      notlar,
    };
  }

  const kullanilanKm = Math.max(0, guncelKm - sonKm);
  const kalanKm = aralikKm - kullanilanKm;
  const kalanYuzde = Math.max(0, Math.min(100, Math.round((kalanKm / aralikKm) * 100)));
  const kritikMi = kalanKm <= 0;
  const uyariMi = !kritikMi && (kalanKm <= 1500 || kalanYuzde <= 15);

  const durum = kritikMi ? 'kritik' : uyariMi ? 'uyari' : 'iyi';
  const etiket = kritikMi
    ? 'Değişim Gerekli'
    : uyariMi
      ? 'Değişim Yaklaşıyor'
      : 'Optimal Ömür';

  return {
    sayacBirim,
    guncelKm,
    sonKm,
    aralikKm,
    kullanilanKm,
    kalanKm,
    kalanYuzde,
    durum,
    etiket,
    kritikMi,
    uyariMi,
    maliyet,
    notlar,
  };
}

export default function ComponentMatrix({ seciliAracId = 'tum' }) {
  const araclar = useVehicleStore((s) => s.araclar);
  const ornekBirim = getSayacBirimEtiketi(araclar[0]);
  const [parcalar, setParcalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aramaMetni, setAramaMetni] = useState('');

  // Omnibar state
  const [omnibarText, setOmnibarText] = useState('');
  const [omnibarDate, setOmnibarDate] = useState(getTodayIso());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progressive Disclosure Yeni Parça Formu state
  const [isCreateExpanded, setIsCreateExpanded] = useState(false);
  const [yeniParcaForm, setYeniParcaForm] = useState(BOS_YENI_PARCA_FORMU);

  // Progressive Disclosure Satır İçi Düzenleme state
  const [expandedId, setExpandedId] = useState(null);
  const [editFields, setEditFields] = useState({
    arac_id: '',
    parca_adi: '',
    degisim_km: '',
    omur_km: '',
    maliyet: '',
    son_degisim_tarihi: getTodayIso(),
    notlar: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // 422 sayaç hataları toast yerine ilgili input'un altında gösterilir
  const [omnibarSayacHata, setOmnibarSayacHata] = useState(null);
  const [formSayacHata, setFormSayacHata] = useState(null);
  const [editSayacHata, setEditSayacHata] = useState(null);

  const parcalariYukle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await parcaService.getAllParcalar().catch(() => []);
      const liste = Array.isArray(res) ? res : res?.parcalar || [];
      setParcalar(liste);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    parcalariYukle();
  }, [parcalariYukle]);

  // Seçili araç değiştiğinde yeni parça formunun varsayılan aracını senkronize et
  useEffect(() => {
    const varsayilanArac =
      (seciliAracId !== 'tum'
        ? araclar.find((a) => String(a.arac_id) === String(seciliAracId))
        : null) || araclar[0];
    if (varsayilanArac) {
      setYeniParcaForm((prev) => ({
        ...prev,
        arac_id: prev.arac_id || String(varsayilanArac.arac_id),
        degisim_km:
          prev.degisim_km !== ''
            ? prev.degisim_km
            : String(varsayilanArac.guncel_km ?? varsayilanArac.guncel_calisma_saati ?? 0),
      }));
    }
  }, [araclar, seciliAracId]);

  const parsedCommand = useMemo(
    () => parseComponentCommand(omnibarText, araclar, seciliAracId),
    [omnibarText, araclar, seciliAracId]
  );

  const gosterilenParcalar = useMemo(() => {
    const kaynak = parcalar.length > 0 ? parcalar : FALLBACK_COMPONENTS;
    const aracFiltreli =
      seciliAracId === 'tum'
        ? kaynak
        : kaynak.filter((p) => String(p.arac_id) === String(seciliAracId));

    const q = aramaMetni.trim().toLowerCase();
    const aramaFiltreli = !q
      ? aracFiltreli
      : aracFiltreli.filter(
          (p) =>
            String(p.plaka || '')
              .toLowerCase()
              .includes(q) ||
            String(p.parca_adi || '')
              .toLowerCase()
              .includes(q) ||
            String(p.marka || '')
              .toLowerCase()
              .includes(q) ||
            String(p.model || '')
              .toLowerCase()
              .includes(q)
        );

    return aramaFiltreli
      .map((p) => ({
        ...p,
        metrik: hesaplaOmurMetrikleri(p, araclar),
      }))
      .sort((a, b) => a.metrik.kalanYuzde - b.metrik.kalanYuzde);
  }, [parcalar, araclar, seciliAracId, aramaMetni]);

  const matrisOzet = useMemo(() => {
    let kritik = 0;
    let uyari = 0;
    let toplamMaliyet = 0;
    gosterilenParcalar.forEach((p) => {
      if (p.metrik.kritikMi) kritik += 1;
      else if (p.metrik.uyariMi) uyari += 1;
      toplamMaliyet += Number(p.metrik.maliyet || 0);
    });
    return {
      toplam: gosterilenParcalar.length,
      kritik,
      uyari,
      toplamMaliyet,
    };
  }, [gosterilenParcalar]);

  const handleOmnibarCreate = async () => {
    if (!parsedCommand.hazirMi || isSubmitting) {
      toast.error(
        `Örn: "34 ABC 123 Triger Seti 120000${ornekBirim} 60000${ornekBirim} 14500TL" formatında yazın.`
      );
      return;
    }

    const hedefArac = parsedCommand.arac || araclar[0];
    if (!hedefArac?.arac_id) {
      toast.error('Parça kaydı için sistemde araç bulunmalıdır.');
      return;
    }

    const secilenTarih = omnibarDate || getTodayIso();
    if (secilenTarih > getTodayIso()) {
      toast.error('İleri tarihli parça değişim kaydı girilemez.');
      return;
    }

    setOmnibarSayacHata(null);
    setIsSubmitting(true);
    try {
      await parcaService.parcaEkle({
        arac_id: Number(hedefArac.arac_id),
        parca_adi: parsedCommand.parcaAdi,
        son_degisim_km: Math.round(Number(parsedCommand.degisimKm || 0)),
        degisim_araligi_km: Math.round(Number(parsedCommand.omurKm || 30000)),
        son_degisim_tarihi: secilenTarih,
        maliyet: Number(parsedCommand.maliyet || 0),
        notlar: '',
      });

      toast.success(`${parsedCommand.parcaAdi} ömür matrisine eklendi.`);
      setOmnibarText('');
      await parcalariYukle();
    } catch (err) {
      const sayacHata = parseSayacHatasi(err);
      if (sayacHata) setOmnibarSayacHata(sayacHata);
      else notifyApiError(err, 'Parça eklenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const aracIdNum = Number(yeniParcaForm.arac_id || araclar[0]?.arac_id);
    const parcaAdiClean = String(yeniParcaForm.parca_adi || '').trim();
    const degisimKmNum = parseLocaleNumber(yeniParcaForm.degisim_km);
    const omurKmNum =
      String(yeniParcaForm.omur_km || '').trim() === ''
        ? null
        : parseLocaleNumber(yeniParcaForm.omur_km);
    const maliyetNum = parseLocaleNumber(yeniParcaForm.maliyet) || 0;
    const tarihStr = yeniParcaForm.son_degisim_tarihi || getTodayIso();

    if (!aracIdNum || parcaAdiClean.length < 2 || degisimKmNum === null || degisimKmNum < 0) {
      toast.error('Lütfen Araç, Parça Adı ve Değişim Sayacı alanlarını eksiksiz doldurun.');
      return;
    }

    if (tarihStr > getTodayIso()) {
      toast.error('İleri tarihli parça değişim kaydı girilemez.');
      return;
    }

    setFormSayacHata(null);
    setIsSubmitting(true);
    try {
      await parcaService.parcaEkle({
        arac_id: aracIdNum,
        parca_adi: parcaAdiClean,
        son_degisim_km: Math.round(degisimKmNum),
        degisim_araligi_km: omurKmNum !== null && omurKmNum > 0 ? Math.round(omurKmNum) : null,
        son_degisim_tarihi: tarihStr,
        maliyet: Math.max(0, maliyetNum),
        notlar: String(yeniParcaForm.notlar || '').trim(),
      });

      toast.success(`${parcaAdiClean} tam veri setiyle ömür matrisine kaydedildi.`);
      setYeniParcaForm({
        ...BOS_YENI_PARCA_FORMU,
        arac_id: String(aracIdNum),
      });
      setIsCreateExpanded(false);
      await parcalariYukle();
    } catch (err) {
      const sayacHata = parseSayacHatasi(err);
      if (sayacHata) setFormSayacHata(sayacHata);
      else notifyApiError(err, 'Parça kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleExpand = (item) => {
    if (expandedId === item.parca_id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.parca_id);
    setEditSayacHata(null);
    setEditFields({
      arac_id: String(item.arac_id || araclar[0]?.arac_id || ''),
      parca_adi: item.parca_adi || '',
      degisim_km: String(item.metrik.sonKm ?? 0),
      omur_km: item.metrik.aralikKm > 0 ? String(item.metrik.aralikKm) : '',
      maliyet: item.metrik.maliyet > 0 ? String(item.metrik.maliyet) : '',
      son_degisim_tarihi: item.son_degisim_tarihi
        ? String(item.son_degisim_tarihi).slice(0, 10)
        : getTodayIso(),
      notlar: item.metrik.notlar || '',
    });
  };

  const handleInlineSave = async (item) => {
    const parsedSonKm = parseLocaleNumber(editFields.degisim_km);
    const parsedAralikKm =
      String(editFields.omur_km || '').trim() === ''
        ? null
        : parseLocaleNumber(editFields.omur_km);
    const parsedMaliyet = parseLocaleNumber(editFields.maliyet) || 0;
    const secilenTarih = editFields.son_degisim_tarihi || getTodayIso();

    if (parsedSonKm === null || parsedSonKm < 0) {
      toast.error('Geçerli bir Son Değişim Sayacı değeri girin.');
      return;
    }

    if (secilenTarih > getTodayIso()) {
      toast.error('İleri tarihli kayıt girilemez.');
      return;
    }

    const yeniAd = editFields.parca_adi.trim() || item.parca_adi;
    const apiPayloadExtras = {
      maliyet: Math.max(0, parsedMaliyet),
      notlar: String(editFields.notlar || '').trim(),
    };

    if (typeof item.parca_id !== 'number') {
      setParcalar((prev) => {
        const kaynak = prev.length > 0 ? prev : FALLBACK_COMPONENTS;
        return kaynak.map((p) =>
          p.parca_id === item.parca_id
            ? {
                ...p,
                parca_adi: yeniAd,
                son_degisim_km: Math.round(parsedSonKm),
                degisim_araligi_km:
                  parsedAralikKm !== null && parsedAralikKm > 0
                    ? Math.round(parsedAralikKm)
                    : null,
                maliyet: apiPayloadExtras.maliyet,
                son_degisim_tarihi: secilenTarih,
                notlar: apiPayloadExtras.notlar,
              }
            : p
        );
      });
      toast.success('Parça ömür ve maliyet verileri güncellendi.');
      setExpandedId(null);
      return;
    }

    setEditSayacHata(null);
    setIsUpdating(true);
    try {
      await parcaService.parcaGuncelle(item.parca_id, {
        arac_id: Number(editFields.arac_id || item.arac_id),
        parca_adi: yeniAd,
        son_degisim_km: Math.round(Number(parsedSonKm)),
        degisim_araligi_km:
          parsedAralikKm !== null && parsedAralikKm > 0 ? Math.round(Number(parsedAralikKm)) : null,
        son_degisim_tarihi: secilenTarih,
        maliyet: apiPayloadExtras.maliyet,
        notlar: apiPayloadExtras.notlar,
      });

      toast.success('Parça ömür ve maliyet parametreleri güncellendi.');
      setExpandedId(null);
      await parcalariYukle();
    } catch (err) {
      const sayacHata = parseSayacHatasi(err);
      if (sayacHata) setEditSayacHata(sayacHata);
      else notifyApiError(err, 'Parça güncellenemedi.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId === null) return;
    if (typeof deleteId !== 'number') {
      setParcalar((prev) =>
        (prev.length > 0 ? prev : FALLBACK_COMPONENTS).filter((p) => p.parca_id !== deleteId)
      );
      setDeleteId(null);
      setExpandedId(null);
      toast.success('Parça envanterden kaldırıldı.');
      return;
    }
    try {
      await parcaService.parcaSil(deleteId);
      toast.success('Parça envanterden silindi.');
      setDeleteId(null);
      setExpandedId(null);
      await parcalariYukle();
    } catch (err) {
      notifyApiError(err, 'Parça silinemedi.');
    }
  };

  const findArac = (id) => araclar.find((a) => String(a.arac_id) === String(id));
  const formBirim = getSayacBirimEtiketi(findArac(yeniParcaForm.arac_id));
  const editBirim = getSayacBirimEtiketi(findArac(editFields.arac_id));
  const omniBirim = getSayacBirimEtiketi(parsedCommand.arac || araclar[0]);

  return (
    <div className="space-y-5">
      {/* 1. KOMPAKT 4'LÜ PARÇA & ENVANTER KPI ŞERİDİ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <div className="flex items-center justify-between text-xs text-truss-muted">
            <span>Takip Edilen Parça</span>
            <Cog className="size-4 text-truss-purple" />
          </div>
          <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-truss-text">
            {matrisOzet.toplam} Adet
          </p>
          <span className="mt-0.5 block text-[11px] text-truss-muted">
            Aktif ömür çubuğu izlemesi
          </span>
        </div>

        <div className="rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <div className="flex items-center justify-between text-xs text-truss-muted">
            <span>Değişimi Yaklaşan (&le; %15)</span>
            <Clock className="size-4 text-truss-purple" />
          </div>
          <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-truss-purple">
            {matrisOzet.uyari} Parça
          </p>
          <span className="mt-0.5 block text-[11px] text-truss-muted">
            Kalan ömür ≤ %15 erken uyarı radarı
          </span>
        </div>

        <div className="rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <div className="flex items-center justify-between text-xs text-truss-muted">
            <span>Ömrü Dolan / Kritik</span>
            <AlertTriangle className="size-4 text-destructive" />
          </div>
          <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-destructive">
            {matrisOzet.kritik} Parça
          </p>
          <span className="mt-0.5 block text-[11px] text-truss-muted">
            Acil servis müdahalesi gerekenler
          </span>
        </div>

        <div className="rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <div className="flex items-center justify-between text-xs text-truss-muted">
            <span>Kayıtlı Parça Envanter Maliyeti</span>
            <Banknote className="size-4 text-truss-purple" />
          </div>
          <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-truss-text">
            {formatCurrency(matrisOzet.toplamMaliyet)}
          </p>
          <span className="mt-0.5 block text-[11px] text-truss-muted">
            Parça değişim maliyet toplamı
          </span>
        </div>
      </div>

      {/* 2. HIZLI PARÇA OMNIBAR'I + PROGRESSIVE DISCLOSURE TAM VERİ SETİ FORMU */}
      <section className="rounded-2xl border-2 border-truss-purple bg-truss-surface p-4 shadow-xl">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-truss-purple">
              <Sparkles className="size-3.5" />
              PARÇA & ENVANTER OMNIBAR (MODALSIZ HIZLI GİRİŞ)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              `${araclar[0]?.plaka || '34 ABC 123'} Triger Seti 120000${ornekBirim} 60000${ornekBirim} 18500TL`,
              `${araclar[0]?.plaka || '34 ABC 123'} Ön Fren Balatası 135000${ornekBirim} 30000${ornekBirim} 6400TL`,
            ].map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setOmnibarText(preset)}
                className="rounded-md border border-truss-border bg-truss-bg px-2 py-0.5 font-mono text-[10px] text-truss-muted hover:border-truss-purple hover:text-truss-text"
              >
                {preset}
              </button>
            ))}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsCreateExpanded((prev) => !prev)}
              className="h-7 gap-1 rounded-lg border-truss-border bg-truss-bg px-2.5 text-xs text-truss-text hover:border-truss-purple hover:bg-truss-surface"
            >
              <Plus className="size-3.5 text-truss-purple" />
              <span>{isCreateExpanded ? 'Formu Daralt' : 'Detaylı Parça Formu'}</span>
              {isCreateExpanded ? (
                <ChevronUp className="size-3.5 text-truss-muted" />
              ) : (
                <ChevronDown className="size-3.5 text-truss-muted" />
              )}
            </Button>
          </div>
        </div>

        {/* Omnibar Komut Satırı + TrussDatePicker */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <input
              type="text"
              value={omnibarText}
              onChange={(e) => {
                setOmnibarText(e.target.value);
                setOmnibarSayacHata(null);
              }}
              {...sayacAria(omnibarSayacHata, 'omnibar-sayac-hata')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleOmnibarCreate();
                }
              }}
              placeholder={`Komut: "34 ABC 123 Triger Seti 120000${ornekBirim} 60000${ornekBirim} 18500TL" (Plaka + Parça + Değişim + Ömür + Maliyet)`}
              className={`h-10 w-full rounded-xl border bg-truss-bg px-3.5 font-mono text-sm text-truss-text placeholder:text-truss-muted focus:outline-none ${sayacInputSinifi(omnibarSayacHata)}`}
            />
            <SayacHatasi id="omnibar-sayac-hata" hata={omnibarSayacHata} />
          </div>

          <div className="lg:col-span-3">
            <TrussDatePicker
              name="omnibar_son_degisim_tarihi"
              value={omnibarDate}
              onChange={(e) => setOmnibarDate(e.target.value)}
              placeholder="Değişim tarihi"
            />
          </div>

          <div className="lg:col-span-2">
            <Button
              type="button"
              disabled={!parsedCommand.hazirMi || isSubmitting}
              onClick={handleOmnibarCreate}
              className="h-10 w-full gap-1.5 rounded-xl bg-truss-purple px-4 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
            >
              <span>{isSubmitting ? 'İşleniyor…' : 'Matrise Ekle'}</span>
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </div>

        {omnibarText.trim() !== '' && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs tabular-nums">
            <Badge
              variant="outline"
              className="border-truss-purple bg-truss-bg font-mono text-truss-purple"
            >
              Araç: {parsedCommand.plaka || 'Seçilmedi'}
            </Badge>
            <Badge variant="outline" className="border-truss-border bg-truss-bg text-truss-text">
              Parça (`parca_adi`): {parsedCommand.parcaAdi || 'Bekleniyor…'}
            </Badge>
            <Badge
              variant="outline"
              className="border-truss-border bg-truss-bg font-mono text-truss-text"
            >
              Değişim Sayacı (`degisim_km`): {formatLocaleNumber(parsedCommand.degisimKm || 0, 0)}{' '}
              {omniBirim}
            </Badge>
            <Badge
              variant="outline"
              className="border-truss-border bg-truss-bg font-mono text-truss-text"
            >
              Ömür (`omur_km`): {formatLocaleNumber(parsedCommand.omurKm || 0, 0)} {omniBirim}
            </Badge>
            <Badge
              variant="outline"
              className="border-truss-border bg-truss-bg font-mono text-truss-purple"
            >
              Maliyet: {formatCurrency(parsedCommand.maliyet || 0)}
            </Badge>
          </div>
        )}

        {/* Progressive Disclosure: Tam Veri Setli Yeni Parça Ekleme Formu */}
        {isCreateExpanded && (
          <form
            onSubmit={handleDetailedFormSubmit}
            className="mt-4 space-y-3 border-t border-truss-border pt-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-truss-text">
                YENİ PARÇA & ÖMÜR PARAMETRELERİ (TAM VERİ SETİ)
              </span>
              <span className="text-[11px] text-truss-muted">
                Parça Adı, Değişim Sayacı, Ömür Aralığı, Maliyet ve Değişim Tarihi
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-truss-muted">
                  Araç Seçimi *
                </label>
                <select
                  value={yeniParcaForm.arac_id}
                  onChange={(e) => {
                    const secilen = araclar.find(
                      (a) => String(a.arac_id) === String(e.target.value)
                    );
                    setFormSayacHata(null);
                    setYeniParcaForm((p) => ({
                      ...p,
                      arac_id: e.target.value,
                      degisim_km: secilen
                        ? String(secilen.guncel_km ?? secilen.guncel_calisma_saati ?? 0)
                        : p.degisim_km,
                    }));
                  }}
                  className="h-9 w-full rounded-lg border border-truss-border bg-truss-bg px-2.5 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                >
                  {araclar.map((a) => (
                    <option
                      key={a.arac_id}
                      value={a.arac_id}
                      className="bg-truss-surface text-truss-text"
                    >
                      {a.plaka} — {a.marka} {a.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-truss-muted">
                  Parça Adı (`parca_adi`) *
                </label>
                <input
                  type="text"
                  value={yeniParcaForm.parca_adi}
                  onChange={(e) =>
                    setYeniParcaForm((p) => ({ ...p, parca_adi: e.target.value }))
                  }
                  placeholder="Örn: Triger Kayışı Seti"
                  className="h-9 w-full rounded-lg border border-truss-border bg-truss-bg px-2.5 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-truss-muted">
                  Değişim {formBirim} (`degisim_km`) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={yeniParcaForm.degisim_km}
                  onChange={(e) => {
                    setFormSayacHata(null);
                    setYeniParcaForm((p) => ({ ...p, degisim_km: e.target.value }));
                  }}
                  placeholder="Örn: 120000"
                  {...sayacAria(formSayacHata, 'parca-degisim-hata')}
                  className={`h-9 w-full rounded-lg border bg-truss-bg px-2.5 font-mono text-xs tabular-nums text-truss-text placeholder:text-truss-muted focus:outline-none ${sayacInputSinifi(formSayacHata)}`}
                  required
                />
                <SayacHatasi id="parca-degisim-hata" hata={formSayacHata} />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-truss-muted">
                  Ömür Aralığı (`omur_km`)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={yeniParcaForm.omur_km}
                  onChange={(e) =>
                    setYeniParcaForm((p) => ({ ...p, omur_km: e.target.value }))
                  }
                  placeholder="Örn: 60000"
                  className="h-9 w-full rounded-lg border border-truss-border bg-truss-bg px-2.5 font-mono text-xs tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-truss-muted">
                  Parça Maliyeti (`maliyet` ₺)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={yeniParcaForm.maliyet}
                  onChange={(e) =>
                    setYeniParcaForm((p) => ({ ...p, maliyet: e.target.value }))
                  }
                  placeholder="Örn: 14500"
                  className="h-9 w-full rounded-lg border border-truss-border bg-truss-bg px-2.5 font-mono text-xs tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-truss-muted">
                  Son Değişim Tarihi *
                </label>
                <TrussDatePicker
                  name="son_degisim_tarihi"
                  value={yeniParcaForm.son_degisim_tarihi}
                  onChange={(e) =>
                    setYeniParcaForm((p) => ({ ...p, son_degisim_tarihi: e.target.value }))
                  }
                  placeholder="Değişim tarihi seçin"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                value={yeniParcaForm.notlar}
                onChange={(e) =>
                  setYeniParcaForm((p) => ({ ...p, notlar: e.target.value }))
                }
                placeholder="Parça markası, OEM kodu veya servis notu (Opsiyonel)…"
                className="h-9 flex-1 rounded-lg border border-truss-border bg-truss-bg px-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateExpanded(false)}
                  className="h-9 rounded-lg border-truss-border bg-truss-bg px-3 text-xs text-truss-muted hover:text-truss-text"
                >
                  Kapat
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-9 gap-1.5 rounded-lg bg-truss-purple px-4 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                >
                  <Check className="size-3.5" />
                  <span>{isSubmitting ? 'Kaydediliyor…' : 'Parçayı Matrise Kaydet'}</span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* 3. PARÇA ÖMÜR BARLARI MATRİSİ (KALAN KM / TOPLAM ÖMÜR & PROGRESSIVE DISCLOSURE) */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-truss-text">
            <Cog className="size-4 text-truss-purple" />
            PARÇA ÖMÜR BARLARI (KALAN SAYAÇ / TOPLAM ÖMÜR) ({gosterilenParcalar.length})
          </span>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-truss-muted" />
            <input
              type="search"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              placeholder="Plaka veya parça adı filtrele…"
              className="h-8 w-full rounded-lg border border-truss-border bg-truss-surface pl-8 pr-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl bg-truss-surface" />
            ))}
          </div>
        ) : gosterilenParcalar.length === 0 ? (
          <div className="rounded-xl border border-truss-border bg-truss-surface py-12 text-center">
            <Cog className="mx-auto mb-2 size-7 text-truss-muted" />
            <p className="text-xs font-medium text-truss-muted">
              Seçili kriterlere uygun parça kaydı bulunamadı.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {gosterilenParcalar.map((item) => {
              const { metrik } = item;
              const isExpanded = expandedId === item.parca_id;
              const birim = metrik.sayacBirim;

              return (
                <div
                  key={item.parca_id}
                  className={`rounded-xl border bg-truss-surface transition-all ${
                    metrik.kritikMi
                      ? 'border-destructive'
                      : 'border-truss-border hover:border-truss-purple'
                  }`}
                >
                  <div
                    onClick={() => handleToggleExpand(item)}
                    className="cursor-pointer p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="rounded-lg border border-truss-border bg-truss-bg px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-truss-text">
                          {item.plaka || `#${item.arac_id}`}
                        </span>
                        <span className="text-sm font-semibold text-truss-text">
                          {item.parca_adi}
                        </span>

                        {metrik.kritikMi ? (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="mr-1 size-3" />
                            {metrik.etiket}
                          </Badge>
                        ) : metrik.uyariMi ? (
                          <Badge
                            variant="outline"
                            className="border-truss-purple bg-truss-bg text-[10px] text-truss-purple"
                          >
                            <Clock className="mr-1 size-3" />
                            {metrik.etiket}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-truss-border bg-truss-bg text-[10px] text-truss-muted"
                          >
                            <CheckCircle2 className="mr-1 size-3 text-truss-purple" />
                            {metrik.etiket}
                          </Badge>
                        )}

                        {metrik.maliyet > 0 && (
                          <Badge
                            variant="outline"
                            className="border-truss-border bg-truss-bg font-mono text-[10px] tabular-nums text-truss-text"
                          >
                            {formatCurrency(metrik.maliyet)}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 tabular-nums">
                        {metrik.kalanKm !== null ? (
                          <span className="text-xs text-truss-muted">
                            Kalan:{' '}
                            <strong
                              className={`font-mono ${
                                metrik.kritikMi ? 'text-destructive' : 'text-truss-text'
                              }`}
                            >
                              {metrik.kalanKm <= 0
                                ? `${formatLocaleNumber(Math.abs(metrik.kalanKm), 0)} ${birim} Aşım`
                                : `${formatLocaleNumber(metrik.kalanKm, 0)} ${birim}`}
                            </strong>{' '}
                            / {formatLocaleNumber(metrik.aralikKm, 0)} {birim}
                          </span>
                        ) : (
                          <span className="text-xs text-truss-muted">Tarih Bazlı İzleme</span>
                        )}

                        <span
                          className={`font-mono text-sm font-bold ${
                            metrik.kritikMi ? 'text-destructive' : 'text-truss-purple'
                          }`}
                        >
                          %{metrik.kalanYuzde}
                        </span>

                        {isExpanded ? (
                          <ChevronUp className="size-4 text-truss-muted" />
                        ) : (
                          <ChevronDown className="size-4 text-truss-muted" />
                        )}
                      </div>
                    </div>

                    {/* ÖMÜR BARI (Kalan KM / Toplam Ömür) */}
                    <div className="h-2.5 w-full overflow-hidden rounded-full border border-truss-border bg-truss-bg">
                      <div
                        style={{ width: `${Math.max(4, metrik.kalanYuzde)}%` }}
                        className={`h-full transition-all ${
                          metrik.kritikMi ? 'bg-destructive' : 'bg-truss-purple'
                        }`}
                      />
                    </div>

                    {/* Alt Özet Bilgi Şeridi */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums text-truss-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Gauge className="size-3 text-truss-purple" />
                        Takıldığı Sayaç: {formatLocaleNumber(metrik.sonKm, 0)} {birim} • Güncel:{' '}
                        {formatLocaleNumber(metrik.guncelKm, 0)} {birim}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3 text-truss-purple" />
                        Son Değişim:{' '}
                        {item.son_degisim_tarihi
                          ? String(item.son_degisim_tarihi).slice(0, 10)
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Progressive Disclosure: Açılan Satır İçi Tam Veri Seti Kalibrasyonu */}
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="space-y-3 border-t border-truss-border bg-truss-bg px-4 py-3.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-truss-border pb-2 text-truss-muted">
                        <span className="font-bold uppercase tracking-wider text-truss-text">
                          SATIR İÇİ PARÇA & ÖMÜR KALİBRASYONU
                        </span>
                        <span className="font-mono text-[11px] text-truss-muted">
                          Kullanılan: {formatLocaleNumber(metrik.kullanilanKm, 0)} {birim}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <label className="mb-1 block text-[10px] font-medium text-truss-muted">
                            Parça Adı (`parca_adi`)
                          </label>
                          <input
                            type="text"
                            value={editFields.parca_adi}
                            onChange={(e) =>
                              setEditFields((p) => ({ ...p, parca_adi: e.target.value }))
                            }
                            placeholder="Parça Adı"
                            className="h-9 w-full rounded-lg border border-truss-border bg-truss-surface px-2.5 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-medium text-truss-muted">
                            Değişim Sayacı (`degisim_km`)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editFields.degisim_km}
                            onChange={(e) => {
                              setEditSayacHata(null);
                              setEditFields((p) => ({ ...p, degisim_km: e.target.value }));
                            }}
                            placeholder={`Son Değişim ${editBirim}`}
                            {...sayacAria(editSayacHata, 'parca-edit-degisim-hata')}
                            className={`h-9 w-full rounded-lg border bg-truss-surface px-2.5 font-mono text-xs tabular-nums text-truss-text focus:outline-none ${sayacInputSinifi(editSayacHata)}`}
                          />
                          <SayacHatasi id="parca-edit-degisim-hata" hata={editSayacHata} />
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-medium text-truss-muted">
                            Ömür Aralığı (`omur_km`)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editFields.omur_km}
                            onChange={(e) =>
                              setEditFields((p) => ({ ...p, omur_km: e.target.value }))
                            }
                            placeholder={`Ömür Aralığı ${editBirim}`}
                            className="h-9 w-full rounded-lg border border-truss-border bg-truss-surface px-2.5 font-mono text-xs tabular-nums text-truss-text focus:border-truss-purple focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-medium text-truss-muted">
                            Parça Maliyeti (`maliyet` ₺)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editFields.maliyet}
                            onChange={(e) =>
                              setEditFields((p) => ({ ...p, maliyet: e.target.value }))
                            }
                            placeholder="Maliyet (₺)"
                            className="h-9 w-full rounded-lg border border-truss-border bg-truss-surface px-2.5 font-mono text-xs tabular-nums text-truss-text focus:border-truss-purple focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-medium text-truss-muted">
                            Son Değişim Tarihi
                          </label>
                          <TrussDatePicker
                            name={`edit_tarih_${item.parca_id}`}
                            value={editFields.son_degisim_tarihi}
                            onChange={(e) =>
                              setEditFields((p) => ({
                                ...p,
                                son_degisim_tarihi: e.target.value,
                              }))
                            }
                            placeholder="Değişim tarihi"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                        <input
                          type="text"
                          value={editFields.notlar}
                          onChange={(e) =>
                            setEditFields((p) => ({ ...p, notlar: e.target.value }))
                          }
                          placeholder="Parça OEM kodu, tedarikçi veya servis notu…"
                          className="h-8 flex-1 rounded-lg border border-truss-border bg-truss-surface px-2.5 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                        />

                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteId(item.parca_id)}
                            className="h-8 gap-1 rounded-lg border-truss-border bg-truss-surface px-2.5 text-xs text-destructive hover:border-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            Parçayı Kaldır
                          </Button>

                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleInlineSave(item)}
                            className="h-8 gap-1 rounded-lg bg-truss-purple px-3.5 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                          >
                            <Check className="size-3.5" />
                            {isUpdating ? 'Kaydediliyor…' : 'Ömür Kalibrasyonunu Kaydet'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-truss-border bg-truss-surface text-truss-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-truss-text">Parça takibini sil?</AlertDialogTitle>
            <AlertDialogDescription className="text-truss-muted">
              Bu parça ömür matrisinden kalıcı olarak kaldırılacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-truss-border bg-truss-bg text-truss-text hover:bg-truss-surface">
              Vazgeç
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-truss-purple text-truss-text hover:bg-truss-purple-hover"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
