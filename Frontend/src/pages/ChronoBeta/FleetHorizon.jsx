import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useVehicleStore from '@/store/useVehicleStore';
import aracService from '@/services/aracService';
import { formatLocaleNumber, formatTurkishPlate, parseLocaleNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Cpu,
  Plus,
  ChevronDown,
  ChevronUp,
  Gauge,
  Check,
  Trash2,
  Activity,
  Calendar,
} from 'lucide-react';

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

const ARAC_TIPLERI = [
  'Otomobil',
  'Ticari / Hafif Ticari',
  'Ağır Vasıta / Çekici',
  'SUV / Pick-Up',
  'İş Makinesi',
  'Elektrikli Araç',
];

const BOS_ARAC_FORMU = {
  plaka: '',
  arac_tipi: 'Otomobil',
  sayac_tipi: 'KM',
  marka: '',
  model: '',
  yil: '2024',
  guncel_km: '0',
  onerilen_bakim_km: '15000',
  triger_degisim_km: '90000',
  muayene_tarihi: '',
  sigorta_tarihi: '',
  kasko_tarihi: '',
};

export default function FleetHorizon({ seciliAracId = 'tum', onFocusLedger }) {
  const araclar = useVehicleStore((s) => s.araclar);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const deleteVehicle = useVehicleStore((s) => s.deleteVehicle);

  // Modalsız Akordeon Yeni Araç Kayıt Kuşağı (Eksiksiz Veri Seti)
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState(BOS_ARAC_FORMU);
  const [isCreating, setIsCreating] = useState(false);

  // Progressive Disclosure Araç Satırı
  const [expandedAracId, setExpandedAracId] = useState(null);
  const [editState, setEditState] = useState({
    arac_tipi: 'Otomobil',
    sayac_tipi: 'KM',
    marka: '',
    model: '',
    yil: '',
    guncel_km: '',
    onerilen_bakim_km: '',
    triger_degisim_km: '',
    muayene_tarihi: '',
    sigorta_tarihi: '',
    kasko_tarihi: '',
  });
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const gosterilenAraclar = useMemo(() => {
    if (seciliAracId === 'tum') return araclar;
    return araclar.filter((a) => String(a.arac_id) === String(seciliAracId));
  }, [araclar, seciliAracId]);

  const handleSayacTipiChange = (nextSayacTipi) => {
    setNewVehicle((prev) => ({
      ...prev,
      sayac_tipi: nextSayacTipi,
      onerilen_bakim_km: nextSayacTipi === 'SMH' ? '250' : '15000',
    }));
  };

  const handleInlineCreate = async (e) => {
    e.preventDefault();
    if (!newVehicle.plaka || !newVehicle.marka || !newVehicle.model || !newVehicle.yil) {
      toast.error('Plaka, Marka, Model ve Yıl alanları zorunludur.');
      return;
    }

    const isSmh = newVehicle.sayac_tipi === 'SMH';
    const parsedGuncelSayac = parseLocaleNumber(newVehicle.guncel_km) ?? 0;
    const parsedBakimPeriyodu =
      parseLocaleNumber(newVehicle.onerilen_bakim_km) ?? (isSmh ? 250 : 15000);
    const parsedTrigerKm = String(newVehicle.triger_degisim_km || '').trim()
      ? parseLocaleNumber(newVehicle.triger_degisim_km)
      : null;

    setIsCreating(true);
    try {
      await aracService.aracEkle({
        plaka: formatTurkishPlate(newVehicle.plaka),
        kategori: newVehicle.arac_tipi || 'Otomobil',
        sayac_tipi: newVehicle.sayac_tipi,
        marka: newVehicle.marka.trim(),
        model: newVehicle.model.trim(),
        yil: Number(newVehicle.yil),
        guncel_km: isSmh ? 0 : Number(parsedGuncelSayac),
        guncel_calisma_saati: isSmh ? Number(parsedGuncelSayac) : 0,
        onerilen_bakim_km: isSmh ? null : Number(parsedBakimPeriyodu),
        calisma_saati_bakim: isSmh ? Number(parsedBakimPeriyodu) : null,
        triger_degisim_km: !isSmh && parsedTrigerKm ? Number(parsedTrigerKm) : null,
        muayene_tarihi: newVehicle.muayene_tarihi || null,
        sigorta_tarihi: newVehicle.sigorta_tarihi || null,
        kasko_tarihi: newVehicle.kasko_tarihi || null,
      });
      toast.success('Yeni araç tam veri setiyle Chrono-OS filosuna eklendi.');
      setNewVehicle(BOS_ARAC_FORMU);
      setIsAddStreamOpen(false);
      await fetchAraclar();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Araç eklenemedi.');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleVehicleAccordion = (arac) => {
    if (expandedAracId === arac.arac_id) {
      setExpandedAracId(null);
      return;
    }
    const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
    const mevcutSayac =
      arac.guncel_sayac ?? (isSmh ? arac.guncel_calisma_saati : arac.guncel_km) ?? 0;
    const mevcutPeriyot =
      (isSmh ? arac.calisma_saati_bakim : arac.onerilen_bakim_km) ||
      arac.bakim_periyodu ||
      (isSmh ? 250 : 15000);

    setExpandedAracId(arac.arac_id);
    setEditState({
      arac_tipi: arac.kategori || 'Otomobil',
      sayac_tipi: isSmh ? 'SMH' : 'KM',
      marka: arac.marka || '',
      model: arac.model || '',
      yil: String(arac.yil || '2024'),
      guncel_km: formatLocaleNumber(mevcutSayac, 0),
      onerilen_bakim_km: formatLocaleNumber(mevcutPeriyot, 0),
      triger_degisim_km: arac.triger_degisim_km
        ? formatLocaleNumber(arac.triger_degisim_km, 0)
        : '',
      muayene_tarihi: arac.muayene_tarihi ? String(arac.muayene_tarihi).slice(0, 10) : '',
      sigorta_tarihi: arac.sigorta_tarihi ? String(arac.sigorta_tarihi).slice(0, 10) : '',
      kasko_tarihi: arac.kasko_tarihi ? String(arac.kasko_tarihi).slice(0, 10) : '',
    });
  };

  const handleSaveHorizonDates = async (arac) => {
    setIsSavingDates(true);
    try {
      const isSmh = editState.sayac_tipi === 'SMH';
      const parsedSayac = parseLocaleNumber(editState.guncel_km) ?? 0;
      const parsedPeriyot =
        parseLocaleNumber(editState.onerilen_bakim_km) ?? (isSmh ? 250 : 15000);
      const parsedTriger = String(editState.triger_degisim_km || '').trim()
        ? parseLocaleNumber(editState.triger_degisim_km)
        : null;

      await aracService.aracGuncelle(arac.arac_id, {
        plaka: arac.plaka,
        kategori_id: arac.kategori_id || null,
        kategori: editState.arac_tipi || arac.kategori || 'Otomobil',
        sayac_tipi: editState.sayac_tipi,
        marka: editState.marka?.trim() || arac.marka,
        model: editState.model?.trim() || arac.model,
        yil: Number(editState.yil || arac.yil),
        varyant_id: arac.varyant_id || null,
        guncel_km: isSmh ? Number(arac.guncel_km || 0) : Number(parsedSayac),
        guncel_calisma_saati: isSmh ? Number(parsedSayac) : Number(arac.guncel_calisma_saati || 0),
        onerilen_bakim_km: isSmh ? null : Number(parsedPeriyot),
        calisma_saati_bakim: isSmh ? Number(parsedPeriyot) : null,
        triger_degisim_km: !isSmh && parsedTriger ? Number(parsedTriger) : null,
        muayene_tarihi: editState.muayene_tarihi || null,
        sigorta_tarihi: editState.sigorta_tarihi || null,
        kasko_tarihi: editState.kasko_tarihi || null,
      });
      toast.success(`${arac.plaka} teknik parametreleri ve evrak ufku güncellendi.`);
      setExpandedAracId(null);
      await fetchAraclar();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Araç verileri güncellenemedi.');
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId !== null) {
      await deleteVehicle(deleteId);
      setDeleteId(null);
      setExpandedAracId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* ÜST UFUK BAŞLIĞI & MODALSIZ TAM VERİ SETLİ ARAÇ EKLEME AKORDEONU */}
      <div className="rounded-2xl border border-truss-border bg-truss-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Cpu className="size-4 text-truss-purple" />
            <div>
              <h2 className="text-sm font-bold text-truss-text">
                FİLO YAŞAM DÖNGÜSÜ & EVRAK UFKU
              </h2>
              <p className="text-xs text-truss-muted">
                Araç tipi, KM/SMH sayaç kalibrasyonu, bakım periyotları ve resmi evrak vadeleri
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddStreamOpen((p) => !p)}
            className="h-8 gap-1.5 rounded-lg bg-truss-purple px-3 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
          >
            <Plus className="size-3.5" />
            {isAddStreamOpen ? 'Akordeonu Kapat' : 'Yeni Araç Akışı Aç'}
          </Button>
        </div>

        {/* Progressive Disclosure: Eksiksiz Veri Setli Satır İçi Araç Kaydı */}
        {isAddStreamOpen && (
          <form
            onSubmit={handleInlineCreate}
            className="mt-4 space-y-3 border-t border-truss-border pt-4"
          >
            {/* 1. Satır: Kimlik & Sınıflandırma (Plaka, Araç Tipi, Marka, Model, Yıl) */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">Plaka *</label>
                <input
                  type="text"
                  value={newVehicle.plaka}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, plaka: formatTurkishPlate(e.target.value) }))
                  }
                  placeholder="34 ABC 123"
                  required
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 font-mono text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">
                  Araç Tipi (Kategori)
                </label>
                <select
                  value={newVehicle.arac_tipi}
                  onChange={(e) =>
                    setNewVehicle((p) => ({
                      ...p,
                      arac_tipi: e.target.value,
                      sayac_tipi: e.target.value === 'İş Makinesi' ? 'SMH' : p.sayac_tipi,
                      onerilen_bakim_km:
                        e.target.value === 'İş Makinesi' ? '250' : p.onerilen_bakim_km,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                >
                  {ARAC_TIPLERI.map((tip) => (
                    <option key={tip} value={tip} className="bg-truss-surface text-truss-text">
                      {tip}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">Marka *</label>
                <input
                  type="text"
                  value={newVehicle.marka}
                  onChange={(e) => setNewVehicle((p) => ({ ...p, marka: e.target.value }))}
                  placeholder="Örn: Mercedes-Benz"
                  required
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">Model *</label>
                <input
                  type="text"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle((p) => ({ ...p, model: e.target.value }))}
                  placeholder="Örn: Actros 1848"
                  required
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">Model Yılı *</label>
                <input
                  type="number"
                  value={newVehicle.yil}
                  onChange={(e) => setNewVehicle((p) => ({ ...p, yil: e.target.value }))}
                  placeholder="2024"
                  required
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 font-mono text-xs tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Satır: Telemetri & Bakım Kalibrasyonu (Sayaç Tipi KM/SMH, Güncel KM, Önerilen Bakım KM, Triger KM) */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">
                  Sayaç Tipi (KM / SMH)
                </label>
                <select
                  value={newVehicle.sayac_tipi}
                  onChange={(e) => handleSayacTipiChange(e.target.value)}
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 font-mono text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                >
                  <option value="KM" className="bg-truss-surface text-truss-text">
                    KM (Kilometre Sayacı)
                  </option>
                  <option value="SMH" className="bg-truss-surface text-truss-text">
                    SMH (Çalışma Saati)
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">
                  Güncel {newVehicle.sayac_tipi === 'SMH' ? 'Çalışma Saati (SMH)' : 'Kilometre (KM)'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newVehicle.guncel_km}
                  onChange={(e) => setNewVehicle((p) => ({ ...p, guncel_km: e.target.value }))}
                  placeholder={newVehicle.sayac_tipi === 'SMH' ? 'Örn: 1.250' : 'Örn: 128.000'}
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 font-mono text-xs tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">
                  Önerilen Bakım Periyodu ({newVehicle.sayac_tipi})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newVehicle.onerilen_bakim_km}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, onerilen_bakim_km: e.target.value }))
                  }
                  placeholder={newVehicle.sayac_tipi === 'SMH' ? '250' : '15.000'}
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 font-mono text-xs tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">
                  Triger Değişim Aralığı (KM)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={newVehicle.sayac_tipi === 'SMH'}
                  value={newVehicle.triger_degisim_km}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, triger_degisim_km: e.target.value }))
                  }
                  placeholder="90.000"
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 font-mono text-xs tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* 3. Satır: TrussDatePicker ile Resmi Vize & Poliçe Ufku */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">Muayene Vadesi</label>
                <TrussDatePicker
                  name="muayene_tarihi"
                  value={newVehicle.muayene_tarihi}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, muayene_tarihi: e.target.value }))
                  }
                  placeholder="Muayene tarihi seçin"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">
                  Trafik Sigortası Vadesi
                </label>
                <TrussDatePicker
                  name="sigorta_tarihi"
                  value={newVehicle.sigorta_tarihi}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, sigorta_tarihi: e.target.value }))
                  }
                  placeholder="Sigorta tarihi seçin"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-truss-muted">Kasko Vadesi</label>
                <TrussDatePicker
                  name="kasko_tarihi"
                  value={newVehicle.kasko_tarihi}
                  onChange={(e) => setNewVehicle((p) => ({ ...p, kasko_tarihi: e.target.value }))}
                  placeholder="Kasko tarihi seçin"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 w-full gap-1.5 rounded-xl bg-truss-purple text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                >
                  <Check className="size-3.5" />
                  {isCreating ? 'Kaydediliyor…' : 'Filoya Mühürle'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ARAÇ ZAMAN ŞERİTLERİ (PROGRESSIVE DISCLOSURE HORIZON BARS) */}
      <div className="space-y-2.5">
        {gosterilenAraclar.map((arac) => {
          const acikMi = expandedAracId === arac.arac_id;
          const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
          const birim = isSmh ? 'SMH' : 'KM';
          const sayac = Number(
            arac.guncel_sayac ?? (isSmh ? arac.guncel_calisma_saati : arac.guncel_km) ?? 0
          );
          const periyot = Number(
            (isSmh ? arac.calisma_saati_bakim : arac.onerilen_bakim_km) ||
              arac.bakim_periyodu ||
              (isSmh ? 250 : 15000)
          );
          const sonBakim = Number(arac.son_bakim_km ?? 0);
          const saglikYuzdesi = Math.max(
            0,
            Math.min(100, Math.round(100 - ((sayac - sonBakim) / periyot) * 100))
          );

          const bugun = new Date();
          bugun.setHours(0, 0, 0, 0);
          const evrakDurumu = [arac.muayene_tarihi, arac.sigorta_tarihi, arac.kasko_tarihi]
            .filter(Boolean)
            .map((t) => Math.ceil((new Date(t) - bugun) / MILLISECONDS_IN_DAY));
          const minGun = evrakDurumu.length > 0 ? Math.min(...evrakDurumu) : null;

          return (
            <div
              key={arac.arac_id}
              className="rounded-xl border border-truss-border bg-truss-surface transition-all hover:border-truss-purple"
            >
              <div
                onClick={() => toggleVehicleAccordion(arac)}
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg border border-truss-border bg-truss-bg px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-truss-text">
                    {arac.plaka}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-truss-text">
                      {arac.marka} {arac.model}{' '}
                      <span className="text-xs font-normal text-truss-muted">({arac.yil})</span>
                    </p>
                    <span className="text-[11px] text-truss-muted">
                      {arac.kategori || 'Otomobil'} • Sayaç: {birim} • Periyot:{' '}
                      {formatLocaleNumber(periyot, 0)} {birim}
                    </span>
                  </div>
                </div>

                {/* Yatay Ömür Barı */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="hidden w-40 sm:block">
                    <div className="mb-1 flex justify-between text-[10px] text-truss-muted">
                      <span>Bakım Kondisyonu</span>
                      <span className="font-mono font-semibold text-truss-purple">
                        %{saglikYuzdesi}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-truss-bg">
                      <div
                        style={{ width: `${saglikYuzdesi}%` }}
                        className={`h-full ${
                          saglikYuzdesi <= 15 ? 'bg-destructive' : 'bg-truss-purple'
                        }`}
                      />
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      minGun !== null && minGun <= 15
                        ? 'border-destructive text-destructive text-[11px]'
                        : 'border-truss-border bg-truss-bg text-truss-muted text-[11px]'
                    }
                  >
                    <Activity className="mr-1 size-3 text-truss-purple" />
                    {minGun === null
                      ? 'Evrak Takvimi Boş'
                      : minGun < 0
                        ? `${Math.abs(minGun)}g Evrak Gecikmesi`
                        : `En Yakın Evrak: ${minGun}g`}
                  </Badge>

                  <span className="flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-truss-text">
                    <Gauge className="size-3.5 text-truss-purple" />
                    {formatLocaleNumber(sayac, 0)} {birim}
                  </span>

                  {acikMi ? (
                    <ChevronUp className="size-4 text-truss-muted" />
                  ) : (
                    <ChevronDown className="size-4 text-truss-muted" />
                  )}
                </div>
              </div>

              {/* Progressive Disclosure: Açılan Eksiksiz Teknik Parametreler & TrussDatePicker Evrak Kontrolleri */}
              {acikMi && (
                <div className="space-y-3 border-t border-truss-border bg-truss-bg px-4 py-4 text-xs">
                  {/* 1. Satır: Kimlik & Sınıflandırma (Araç Tipi, Marka, Model, Yıl) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                      <span className="mb-1 block text-[11px] font-medium text-truss-muted">
                        Araç Tipi (Kategori)
                      </span>
                      <select
                        value={editState.arac_tipi}
                        onChange={(e) =>
                          setEditState((p) => ({
                            ...p,
                            arac_tipi: e.target.value,
                            sayac_tipi: e.target.value === 'İş Makinesi' ? 'SMH' : p.sayac_tipi,
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                      >
                        {ARAC_TIPLERI.map((tip) => (
                          <option key={tip} value={tip} className="bg-truss-surface text-truss-text">
                            {tip}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="mb-1 block text-[11px] font-medium text-truss-muted">
                        Marka
                      </span>
                      <input
                        type="text"
                        value={editState.marka}
                        onChange={(e) => setEditState((p) => ({ ...p, marka: e.target.value }))}
                        className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="mb-1 block text-[11px] font-medium text-truss-muted">
                        Model
                      </span>
                      <input
                        type="text"
                        value={editState.model}
                        onChange={(e) => setEditState((p) => ({ ...p, model: e.target.value }))}
                        className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="mb-1 block text-[11px] font-medium text-truss-muted">
                        Model Yılı
                      </span>
                      <input
                        type="number"
                        value={editState.yil}
                        onChange={(e) => setEditState((p) => ({ ...p, yil: e.target.value }))}
                        className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs tabular-nums text-truss-text focus:border-truss-purple focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 2. Satır: Sayaç & Bakım Kalibrasyonu (Sayaç Tipi KM/SMH, Güncel Sayaç, Önerilen Bakım, Triger KM) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                      <span className="mb-1 block text-[11px] font-medium text-truss-muted">
                        Sayaç Tipi (KM / SMH)
                      </span>
                      <select
                        value={editState.sayac_tipi}
                        onChange={(e) =>
                          setEditState((p) => ({ ...p, sayac_tipi: e.target.value }))
                        }
                        className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                      >
                        <option value="KM" className="bg-truss-surface text-truss-text">
                          KM (Kilometre)
                        </option>
                        <option value="SMH" className="bg-truss-surface text-truss-text">
                          SMH (Çalışma Saati)
                        </option>
                      </select>
                    </div>

                    <div>
                      <span className="mb-1 block text-[11px] font-medium text-truss-muted">
                        Güncel Sayaç ({editState.sayac_tipi})
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editState.guncel_km}
                        onChange={(e) =>
                          setEditState((p) => ({ ...p, guncel_km: e.target.value }))
                        }
                        className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs tabular-nums text-truss-text focus:border-truss-purple focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="mb-1 block text-[11px] font-medium text-truss-muted">
                        Önerilen Bakım Periyodu ({editState.sayac_tipi})
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editState.onerilen_bakim_km}
                        onChange={(e) =>
                          setEditState((p) => ({ ...p, onerilen_bakim_km: e.target.value }))
                        }
                        className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs tabular-nums text-truss-text focus:border-truss-purple focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="mb-1 block text-[11px] font-medium text-truss-muted">
                        Triger Değişim Aralığı (KM)
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={editState.sayac_tipi === 'SMH'}
                        value={editState.triger_degisim_km}
                        onChange={(e) =>
                          setEditState((p) => ({ ...p, triger_degisim_km: e.target.value }))
                        }
                        placeholder="90.000"
                        className="h-10 w-full rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* 3. Satır: TrussDatePicker ile Tarih Kalibrasyonu */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-truss-muted">
                        <Calendar className="size-3 text-truss-purple" /> Muayene Tarihi
                      </span>
                      <TrussDatePicker
                        name="muayene_tarihi"
                        value={editState.muayene_tarihi}
                        onChange={(e) =>
                          setEditState((p) => ({ ...p, muayene_tarihi: e.target.value }))
                        }
                        placeholder="Muayene tarihi seçin"
                        className="bg-truss-surface"
                      />
                    </div>

                    <div>
                      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-truss-muted">
                        <Calendar className="size-3 text-truss-purple" /> Trafik Sigortası Tarihi
                      </span>
                      <TrussDatePicker
                        name="sigorta_tarihi"
                        value={editState.sigorta_tarihi}
                        onChange={(e) =>
                          setEditState((p) => ({ ...p, sigorta_tarihi: e.target.value }))
                        }
                        placeholder="Sigorta tarihi seçin"
                        className="bg-truss-surface"
                      />
                    </div>

                    <div>
                      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-truss-muted">
                        <Calendar className="size-3 text-truss-purple" /> Kasko Tarihi
                      </span>
                      <TrussDatePicker
                        name="kasko_tarihi"
                        value={editState.kasko_tarihi}
                        onChange={(e) =>
                          setEditState((p) => ({ ...p, kasko_tarihi: e.target.value }))
                        }
                        placeholder="Kasko tarihi seçin"
                        className="bg-truss-surface"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteId(arac.arac_id)}
                      className="h-8 gap-1 rounded-lg border-truss-border bg-truss-surface px-3 text-xs text-destructive hover:border-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      Aracı Sil
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onFocusLedger?.(String(arac.arac_id))}
                        className="h-8 rounded-lg border-truss-border bg-truss-surface px-3 text-xs text-truss-text hover:border-truss-purple"
                      >
                        Bu Aracın Zaman Tünelini Aç →
                      </Button>
                      <Button
                        size="sm"
                        disabled={isSavingDates}
                        onClick={() => handleSaveHorizonDates(arac)}
                        className="h-8 gap-1 rounded-lg bg-truss-purple px-3 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                      >
                        <Check className="size-3.5" />
                        {isSavingDates ? 'Güncelleniyor…' : 'Parametreleri & Tarihleri Kaydet'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SHADCN ALERTDIALOG */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-truss-border bg-truss-surface text-truss-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-truss-text">Aracı filodan kaldır?</AlertDialogTitle>
            <AlertDialogDescription className="text-truss-muted">
              Bu araç ve ilişkili tüm zaman akışı kayıtları silinecek. Bu işlem geri alınamaz.
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
