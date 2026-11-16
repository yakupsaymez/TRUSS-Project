import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useVehicleStore from '@/store/useVehicleStore';
import yakitService from '@/services/yakitService';
import { formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Terminal,
  Sparkles,
  CornerDownLeft,
  Car,
  Droplets,
  Banknote,
  Gauge,
  Fuel,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const FALLBACK_RECENT_STACK = [
  {
    yakit_id: 'mock-101',
    plaka: '34 ABC 123',
    marka: 'Mercedes-Benz',
    model: 'Sprinter',
    yakit_tipi: 'Dizel',
    litre: 45,
    tutar: 1500,
    km: 128400,
    tarih: new Date().toISOString().slice(0, 10),
  },
  {
    yakit_id: 'mock-102',
    plaka: '06 TR 990',
    marka: 'Ford',
    model: 'Transit',
    yakit_tipi: 'Dizel',
    litre: 62.5,
    tutar: 2680,
    km: 214900,
    tarih: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
  },
  {
    yakit_id: 'mock-103',
    plaka: '35 EGE 42',
    marka: 'Renault',
    model: 'Megane',
    yakit_tipi: 'Benzin',
    litre: 38.2,
    tutar: 1690,
    km: 74200,
    tarih: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
  },
];

// Doğal Dil Komut Ayrıştırıcı (Örn: "34 ABC 123 45L 1500TL 128000KM Dizel")
function parseFuelCommand(rawCommand, araclar) {
  const text = String(rawCommand || '').trim();
  if (!text) {
    return { plaka: null, arac: null, litre: null, tutar: null, km: null, yakitTipi: 'Dizel', birimFiyat: null };
  }

  // 1. Yakıt tipi yakala
  const tipMatch = text.match(/\b(dizel|motorin|benzin|lpg|elektrik)\b/i);
  let yakitTipi = 'Dizel';
  if (tipMatch) {
    const rawTip = tipMatch[1].toLowerCase();
    yakitTipi =
      rawTip === 'motorin' || rawTip === 'dizel'
        ? 'Dizel'
        : rawTip === 'benzin'
          ? 'Benzin'
          : rawTip === 'lpg'
            ? 'LPG'
            : 'Elektrik';
  }

  // 2. Litre yakala (45L, 45.5L, 45,5 lt vb.)
  const litreMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|litre)\b/i);
  const litre = litreMatch ? parseLocaleNumber(litreMatch[1]) : null;

  // 3. Tutar yakala (1500TL, 1.500,50 TL, 1500₺ vb.)
  const tutarMatch = text.match(/(\d+(?:[.,]\d+)*)\s*(?:tl|₺|lira)\b/i);
  const tutar = tutarMatch ? parseLocaleNumber(tutarMatch[1]) : null;

  // 4. KM yakala (128000KM, 128.000 km vb.)
  const kmMatch = text.match(/(\d+(?:[.,]\d+)*)\s*(?:km|kilometre)\b/i);
  const km = kmMatch ? parseLocaleNumber(kmMatch[1]) : null;

  // 5. Türk Plakası yakala (34 ABC 123 veya 34ABC123)
  const plateMatch = text.match(/\b(\d{2}\s*[A-Za-zÇĞİÖŞÜçğıöşü]{1,3}\s*\d{2,5})\b/);
  const rawPlate = plateMatch ? plateMatch[1].toUpperCase().replace(/\s+/g, ' ').trim() : null;
  const compactPlate = rawPlate ? rawPlate.replace(/\s+/g, '') : '';

  const eslesenArac =
    araclar.find(
      (a) =>
        String(a.plaka || '')
          .toUpperCase()
          .replace(/\s+/g, '') === compactPlate
    ) || null;

  const birimFiyat = litre && tutar && litre > 0 ? tutar / litre : null;

  return {
    plaka: eslesenArac?.plaka || rawPlate,
    arac: eslesenArac,
    litre,
    tutar,
    km,
    yakitTipi,
    birimFiyat,
  };
}

export default function YakitlarBeta({ onRevert }) {
  const araclar = useVehicleStore((s) => s.araclar);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);

  const [command, setCommand] = useState('34 ABC 123 45L 1500TL 128400KM Dizel');
  const [recentStack, setRecentStack] = useState(FALLBACK_RECENT_STACK);
  const [isSaving, setIsSaving] = useState(false);
  const [justSavedPulse, setJustSavedPulse] = useState(false);
  const omnibarRef = useRef(null);

  useEffect(() => {
    fetchAraclar();
    yakitService
      .getAllYakitlar()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.yakitlar || [];
        if (list.length > 0) {
          setRecentStack(list.slice(0, 3));
        }
      })
      .catch(() => {});
  }, [fetchAraclar]);

  useEffect(() => {
    if (araclar.length > 0 && command.startsWith('34 ABC 123')) {
      const ilkPlaka = araclar[0].plaka;
      if (ilkPlaka) {
        setCommand(`${ilkPlaka} 45L 1500TL 128400KM Dizel`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [araclar]);

  const parsed = useMemo(() => parseFuelCommand(command, araclar), [command, araclar]);
  const isCommandReady = Boolean(parsed.plaka && parsed.litre > 0 && parsed.tutar !== null);

  const handleExecuteCommand = async () => {
    if (!isCommandReady || isSaving) {
      toast.error('Komut eksik: Örn. "34 ABC 123 45L 1500TL" formatında yazın.');
      return;
    }

    setIsSaving(true);
    const targetArac = parsed.arac || araclar[0];

    try {
      if (targetArac?.arac_id) {
        await yakitService.yakitEkle({
          arac_id: Number(targetArac.arac_id),
          yakit_tipi: parsed.yakitTipi || 'Dizel',
          tarih: new Date().toISOString().slice(0, 10),
          litre: Number(parsed.litre),
          tutar: Number(parsed.tutar),
          km: parsed.km !== null ? Number(parsed.km) : null,
          notlar: 'Command OS (Omnibar) ile kaydedildi',
        });
        await fetchAraclar();
      }

      const yeniKayit = {
        yakit_id: `cmd-${Date.now()}`,
        plaka: parsed.plaka,
        marka: targetArac?.marka || 'Filo',
        model: targetArac?.model || 'Aracı',
        yakit_tipi: parsed.yakitTipi,
        litre: parsed.litre,
        tutar: parsed.tutar,
        km: parsed.km,
        tarih: new Date().toISOString().slice(0, 10),
      };

      setRecentStack((prev) => [yeniKayit, ...prev.slice(0, 2)]);
      setJustSavedPulse(true);
      setTimeout(() => setJustSavedPulse(false), 900);
      setCommand('');
      toast.success(`${parsed.plaka} için ${formatLocaleNumber(parsed.litre, 2)} L yakıt işlendi.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Komut işlenirken hata oluştu.');
    } finally {
      setIsSaving(false);
      omnibarRef.current?.focus();
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col justify-between bg-truss-bg text-truss-text">
      {/* ÜST MİNİMAL DURUM ÇUBUĞU */}
      <div className="flex items-center justify-between border-b border-truss-border pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-truss-purple" />
          <span className="text-xs font-bold tracking-wider text-truss-text">
            THE COMMAND OS
          </span>
          <Badge
            variant="outline"
            className="border-truss-purple/40 bg-truss-purple/15 text-[10px] font-semibold text-truss-purple"
          >
            EVREN 1 • SIFIR-UI OMNIBAR
          </Badge>
        </div>

        {onRevert && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRevert}
            className="h-8 gap-1.5 rounded-lg border-truss-border bg-truss-surface px-3 text-xs text-truss-muted hover:border-truss-purple hover:text-truss-text"
          >
            <ArrowLeft className="size-3.5" />
            Klasik Görünüme Dön
          </Button>
        )}
      </div>

      {/* MERKEZ: PARLAYAN OMNIBAR & CANLI TOKEN AYRIŞTIRICI */}
      <div className="mx-auto my-auto w-full max-w-3xl space-y-5 py-8">
        <div className="text-center space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-truss-purple/40 bg-truss-purple/15 px-3 py-1 text-xs font-medium text-truss-purple">
            <Sparkles className="size-3.5" />
            Doğal Dil Telemetri Motoru Aktif
          </span>
          <h2 className="text-xl font-bold tracking-tight text-truss-text sm:text-2xl">
            Form doldurmayın. Komut verin.
          </h2>
          <p className="text-xs text-truss-muted">
            Plaka, Litre, Tutar ve KM bilgisini tek satırda yazıp <strong className="text-truss-text">Enter</strong> tuşuna basın.
          </p>
        </div>

        {/* OMNIBAR KAPSÜLÜ */}
        <div
          className={`rounded-2xl border bg-truss-surface p-4 shadow-2xl transition-all ${
            justSavedPulse
              ? 'border-truss-purple ring-4 ring-truss-purple/30'
              : 'border-truss-purple/60 ring-2 ring-truss-purple/15'
          }`}
        >
          <div className="flex items-center gap-3">
            <Terminal className="size-5 shrink-0 text-truss-purple animate-pulse" />
            <input
              ref={omnibarRef}
              type="text"
              autoFocus
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExecuteCommand();
                }
              }}
              placeholder="Örn: 34 ABC 123 45L 1500TL 128000KM"
              className="w-full bg-transparent font-mono text-base font-semibold tracking-tight text-truss-text placeholder:text-truss-muted focus:outline-none sm:text-lg"
            />
            <button
              type="button"
              onClick={handleExecuteCommand}
              disabled={!isCommandReady || isSaving}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                isCommandReady
                  ? 'bg-truss-purple text-truss-text hover:bg-truss-purple-hover animate-pulse'
                  : 'border border-truss-border bg-truss-bg text-truss-muted opacity-60'
              }`}
            >
              <span>{isSaving ? 'İşleniyor' : 'Enter ile Kaydet'}</span>
              <CornerDownLeft className="size-3.5" />
            </button>
          </div>

          {/* CANLI NLP TOKEN ROZETLERİ */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-truss-border pt-3">
            <span className="text-[11px] font-medium text-truss-muted">Canlı Ayrıştırma:</span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums ${
                parsed.plaka
                  ? 'border-truss-purple/40 bg-truss-purple/15 text-truss-purple'
                  : 'border-truss-border bg-truss-bg text-truss-muted'
              }`}
            >
              <Car className="size-3.5" />
              Plaka: {parsed.plaka || 'Bekleniyor…'}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums ${
                parsed.litre
                  ? 'border-truss-purple/40 bg-truss-purple/15 text-truss-purple'
                  : 'border-truss-border bg-truss-bg text-truss-muted'
              }`}
            >
              <Droplets className="size-3.5" />
              Hacim: {parsed.litre ? `${formatLocaleNumber(parsed.litre, 2)} L` : 'Bekleniyor…'}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums ${
                parsed.tutar !== null
                  ? 'border-truss-purple/40 bg-truss-purple/15 text-truss-purple'
                  : 'border-truss-border bg-truss-bg text-truss-muted'
              }`}
            >
              <Banknote className="size-3.5" />
              Tutar: {parsed.tutar !== null ? `${formatLocaleNumber(parsed.tutar, 2)} ₺` : 'Bekleniyor…'}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums ${
                parsed.km !== null
                  ? 'border-truss-purple/40 bg-truss-purple/15 text-truss-purple'
                  : 'border-truss-border bg-truss-bg text-truss-muted'
              }`}
            >
              <Gauge className="size-3.5" />
              Sayaç: {parsed.km !== null ? `${formatLocaleNumber(parsed.km, 0)} KM` : 'Opsiyonel'}
            </span>

            {parsed.birimFiyat !== null && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-lg border border-truss-purple/40 bg-truss-purple/15 px-2.5 py-1 text-xs font-bold tabular-nums text-truss-purple">
                <Fuel className="size-3.5" />
                {formatLocaleNumber(parsed.birimFiyat, 2)} ₺/L
              </span>
            )}
          </div>
        </div>

        {/* HIZLI ŞABLON ÖNERİLERİ */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-[11px] text-truss-muted">Tek Tıkla Dene:</span>
          {[
            `${araclar[0]?.plaka || '34 ABC 123'} 45L 1500TL 128400KM Dizel`,
            `${araclar[1]?.plaka || '06 TR 990'} 60,5L 2540TL 215000KM Dizel`,
            `${araclar[2]?.plaka || '35 EGE 42'} 38L 1680TL Benzin`,
          ].map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCommand(preset);
                omnibarRef.current?.focus();
              }}
              className="rounded-lg border border-truss-border bg-truss-surface px-2.5 py-1 font-mono text-[11px] text-truss-muted transition-colors hover:border-truss-purple hover:text-truss-text"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* ALT BÖLÜM: SON 3 İŞLEM ODAK KARTLARI (FOCUS STACK) */}
      <div className="space-y-2.5 border-t border-truss-border pt-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-truss-muted">
            <Clock className="size-3.5 text-truss-purple" />
            FOCUS STACK • SON 3 TELEMETRİ İŞLEMİ
          </span>
          <span className="text-[11px] text-truss-muted">
            Sıfır-Tablo Mimarisi • Canlı Akış
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {recentStack.slice(0, 3).map((item, idx) => {
            const litre = Number(item.litre) || 0;
            const tutar = Number(item.tutar) || 0;
            const birim = litre > 0 ? tutar / litre : 0;

            return (
              <div
                key={item.yakit_id || idx}
                className="flex flex-col justify-between rounded-xl border border-truss-border bg-truss-surface p-3.5 transition-all hover:border-truss-purple/60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tabular-nums text-truss-text">
                      {item.plaka}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-truss-purple/40 bg-truss-purple/15 text-[10px] font-semibold text-truss-purple"
                    >
                      {item.yakit_tipi || 'Dizel'}
                    </Badge>
                  </div>
                  <CheckCircle2 className="size-4 text-truss-purple" />
                </div>

                <div className="my-3 flex items-baseline justify-between border-y border-truss-border py-2.5 tabular-nums">
                  <div>
                    <p className="text-[11px] text-truss-muted">Alınan Hacim</p>
                    <p className="text-base font-bold text-truss-text">
                      {formatLocaleNumber(litre, 2)} L
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-truss-muted">Toplam Tutar</p>
                    <p className="text-base font-bold text-truss-purple">
                      {formatLocaleNumber(tutar, 2)} ₺
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] tabular-nums text-truss-muted">
                  <span>
                    {item.km ? `${formatLocaleNumber(item.km, 0)} KM` : 'Sayaç girilmedi'}
                  </span>
                  <span>{formatLocaleNumber(birim, 2)} ₺/L</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
