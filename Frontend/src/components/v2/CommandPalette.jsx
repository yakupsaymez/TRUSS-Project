import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Car,
  Cog,
  CornerDownLeft,
  Fuel,
  Plus,
  Search,
  Settings,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { getGuncelSayac, isSmhArac } from '@/utils/aracDurum';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate, parseLocaleNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

const PLATE_REGEX = /\b(\d{2}\s*[A-Za-zÇĞİÖŞÜçğıöşü]{1,3}\s*\d{2,5})\b/;
const LITRE_REGEX = /(\d+(?:[.,]\d+)?)\s*(?:l|lt|litre|kwh)\b/i;
const TUTAR_REGEX = /(\d+(?:[.,]\d+)*)\s*(?:tl|₺|try|lira)(?:\b|(?=\s|$))/i;
const KM_REGEX_GLOBAL = /(\d+(?:[.,]\d+)*)\s*(?:km|kilometre|smh|saat)\b/gi;
const KM_REGEX_SINGLE = /(\d+(?:[.,]\d+)*)\s*(?:km|kilometre|smh|saat)\b/i;
const FATURA_REGEX = /\b(?:fatura|fiş|fis|belge|no)[:\s#-]*([A-Za-z0-9_-]+)\b/i;
const BAKIM_KEYWORD_REGEX =
  /\b(bakim|bakım|servis|tamir|onarım|onarim|arıza|ariza|fren|balata|yag|yağ|triger|lastik|kaporta|boya|akü|aku|rot|balans|muayene)\b/i;

function resolveVehicleFromText(text, araclar, seciliAracId) {
  const plateMatch = text.match(PLATE_REGEX);
  const rawPlate = plateMatch ? plateMatch[1].toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim() : null;
  const compactPlate = rawPlate ? rawPlate.replace(/\s+/g, '') : '';

  const fallbackVehicle =
    (seciliAracId && seciliAracId !== 'tum'
      ? araclar.find((a) => String(a.arac_id) === String(seciliAracId))
      : null) ||
    araclar[0] ||
    null;

  const matchedByPlate = compactPlate
    ? araclar.find(
        (a) =>
          String(a.plaka || '')
            .toLocaleUpperCase('tr-TR')
            .replace(/\s+/g, '') === compactPlate
      ) || null
    : null;

  return {
    plateMatch,
    rawPlate,
    arac: matchedByPlate || fallbackVehicle,
    hasExplicitPlate: Boolean(plateMatch),
  };
}

export function parseLedgerNaturalInput(rawText, araclar = [], seciliAracId = 'tum') {
  const text = String(rawText || '').trim();
  if (text.length < 4) return null;

  const { plateMatch, rawPlate, arac } = resolveVehicleFromText(text, araclar, seciliAracId);

  let yakitTipi = 'Dizel';
  if (/\b(benzin|kurşunsuz|kursunsuz)\b/i.test(text)) {
    yakitTipi = 'Benzin';
  } else if (/\b(lpg|otogaz)\b/i.test(text)) {
    yakitTipi = 'LPG';
  } else if (/\b(elektrik|kwh|şarj|sarj)\b/i.test(text)) {
    yakitTipi = 'Elektrik';
  } else if (/\b(dizel|mazot|motorin)\b/i.test(text)) {
    yakitTipi = 'Dizel';
  }

  let bakimTipi = 'Periyodik Bakım';
  if (/\b(arıza|ariza|onarım|onarim|tamir|mekanik)\b/i.test(text)) {
    bakimTipi = 'Arıza & Mekanik Onarım';
  } else if (/\b(lastik|rot|balans|jant)\b/i.test(text)) {
    bakimTipi = 'Lastik & Rot Balans';
  } else if (/\b(kaporta|boya|göçük|gocuk|cam)\b/i.test(text)) {
    bakimTipi = 'Kaporta & Boya';
  } else if (/\b(fren|balata|disk)\b/i.test(text)) {
    bakimTipi = 'Fren Sistemi Bakımı';
  } else if (/\b(triger|ağır bakım|agir bakim|baskı balata|debriyaj)\b/i.test(text)) {
    bakimTipi = 'Triger & Ağır Bakım';
  } else if (/\b(yağ|yag|filtre)\b/i.test(text)) {
    bakimTipi = 'Yağ & Filtre Bakımı';
  } else if (/\b(akü|aku|alternatör|marş|mars)\b/i.test(text)) {
    bakimTipi = 'Akü & Elektrik';
  } else if (/\b(muayene|tüvtürk|tuvturk|egzoz)\b/i.test(text)) {
    bakimTipi = 'Muayene & Resmi Evrak';
  }

  const litreMatch = text.match(LITRE_REGEX);
  const litre = litreMatch ? parseLocaleNumber(litreMatch[1]) : null;
  const tutarMatch = text.match(TUTAR_REGEX);
  const tutar = tutarMatch ? parseLocaleNumber(tutarMatch[1]) : null;
  const kmMatch = text.match(KM_REGEX_SINGLE);
  const km = kmMatch ? parseLocaleNumber(kmMatch[1]) : null;
  const faturaMatch = text.match(FATURA_REGEX);
  const faturaBilgisi = faturaMatch ? faturaMatch[1].trim() : '';

  const isBakimKeyword = BAKIM_KEYWORD_REGEX.test(text);
  const initialTip = isBakimKeyword && !(litre > 0) ? 'BAKIM' : 'YAKIT';

  const isReady =
    initialTip === 'YAKIT'
      ? Boolean(litre && litre > 0 && tutar && tutar > 0)
      : Boolean(tutar && tutar > 0);

  if (!isReady) return null;

  let notlar = text;
  if (plateMatch) notlar = notlar.replace(plateMatch[0], '');
  if (litreMatch) notlar = notlar.replace(litreMatch[0], '');
  if (tutarMatch) notlar = notlar.replace(tutarMatch[0], '');
  if (kmMatch) notlar = notlar.replace(kmMatch[0], '');
  if (faturaMatch) notlar = notlar.replace(faturaMatch[0], '');
  notlar = notlar
    .replace(/\b(yakit|yakıt|dizel|mazot|motorin|benzin|lpg|otogaz|elektrik|bakım|bakim|servis)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const plateLabel = formatTurkishPlate(arac?.plaka || rawPlate || '') || 'Araç seçin';

  return {
    initialTip,
    plateLabel,
    litre,
    tutar,
    km,
    yakitTipi,
    bakimTipi,
    prefill: {
      arac_id: arac?.arac_id != null ? String(arac.arac_id) : '',
      yakit_tipi: yakitTipi,
      bakim_tipi: bakimTipi,
      litre: initialTip === 'YAKIT' ? litre : null,
      tutar,
      km,
      fatura_bilgisi: faturaBilgisi,
      notlar,
    },
  };
}

export function parsePartNaturalInput(rawText, araclar = [], seciliAracId = 'tum') {
  const text = String(rawText || '').trim();
  if (text.length < 4) return null;

  // Saf yakıt komutunda parça önerisi üretme
  if (LITRE_REGEX.test(text)) return null;

  const { plateMatch, rawPlate, arac, hasExplicitPlate } = resolveVehicleFromText(
    text,
    araclar,
    seciliAracId
  );

  const kmTokens = [...text.matchAll(KM_REGEX_GLOBAL)];
  const moneyMatch = text.match(TUTAR_REGEX);

  // Anlamlı bir parça komutu için plaka, sayaç veya tutar sinyalinden en az biri olmalı
  if (!hasExplicitPlate && kmTokens.length === 0 && !moneyMatch) return null;

  const degisimKm = kmTokens[0] ? parseLocaleNumber(kmTokens[0][1]) : null;
  const omurKm = kmTokens[1] ? parseLocaleNumber(kmTokens[1][1]) : null;
  const maliyet = moneyMatch ? parseLocaleNumber(moneyMatch[1]) : null;

  let parcaAdi = text;
  if (plateMatch) parcaAdi = parcaAdi.replace(plateMatch[0], '');
  kmTokens.forEach((m) => {
    parcaAdi = parcaAdi.replace(m[0], '');
  });
  if (moneyMatch) parcaAdi = parcaAdi.replace(moneyMatch[0], '');
  parcaAdi = parcaAdi
    .replace(/\b(son|ömür|omur|aralık|aralik|değişim|degisim|maliyet|tutar|parça|parca)[:\s]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (parcaAdi.length < 2) return null;

  const plateLabel = formatTurkishPlate(arac?.plaka || rawPlate || '') || 'Araç seçin';
  const birim = arac && isSmhArac(arac) ? 'saat' : 'km';
  const resolvedSayac =
    degisimKm !== null && Number.isFinite(degisimKm)
      ? degisimKm
      : arac
        ? getGuncelSayac(arac)
        : null;

  return {
    plateLabel,
    parcaAdi,
    birim,
    degisimKm: resolvedSayac,
    omurKm,
    maliyet,
    prefill: {
      arac_id: arac?.arac_id != null ? String(arac.arac_id) : '',
      parca_adi: parcaAdi,
      son_degisim_km: resolvedSayac,
      degisim_araligi_km: omurKm,
      maliyet: maliyet && maliyet > 0 ? maliyet : null,
      notlar: '',
    },
  };
}

export default function CommandPalette({
  open,
  onOpenChange,
  canManage = false,
  canAddFuel = true,
  canAddMaintenance = true,
  visibleNavItems = [],
  araclar = [],
  seciliAracId = 'tum',
  onNavigate,
  onSelectVehicle,
  onOpenMovementSheet,
  onOpenComponentSheet,
  onOpenVehicleSheet,
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(timer);
    }
    setQuery('');
    setActiveIndex(0);
    return undefined;
  }, [open]);

  const trimmedQuery = query.trim();
  const qLower = trimmedQuery.toLocaleLowerCase('tr-TR');
  const qCompact = qLower.replace(/\s+/g, '');

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');

  const groups = useMemo(() => {
    const builtGroups = [];

    // 1. Doğal Dil Hızlı Kayıt (>= 4 karakter)
    if (trimmedQuery.length >= 4) {
      const nlItems = [];
      const ledgerParsed = parseLedgerNaturalInput(trimmedQuery, araclar, seciliAracId);
      const isAllowedLedgerNl =
        ledgerParsed &&
        (ledgerParsed.initialTip === 'YAKIT' ? canAddFuel : canAddMaintenance);
      if (isAllowedLedgerNl) {
        const summaryParts = [ledgerParsed.plateLabel];
        if (ledgerParsed.initialTip === 'YAKIT') {
          summaryParts.push(`${formatLocaleNumber(ledgerParsed.litre, 2)} L`);
          summaryParts.push(formatCurrency(ledgerParsed.tutar, { maximumFractionDigits: 0 }));
        } else {
          summaryParts.push(ledgerParsed.bakimTipi);
          summaryParts.push(formatCurrency(ledgerParsed.tutar, { maximumFractionDigits: 0 }));
        }
        if (ledgerParsed.km !== null) {
          summaryParts.push(`${formatLocaleNumber(ledgerParsed.km, 0)} km`);
        }

        nlItems.push({
          id: `nl-ledger-${ledgerParsed.initialTip}`,
          icon: ledgerParsed.initialTip === 'YAKIT' ? Fuel : Wrench,
          label: `${ledgerParsed.initialTip === 'YAKIT' ? 'Yakıt' : 'Bakım'} Kaydı Aç: ${summaryParts.join(' · ')}`,
          subtitle: 'Önceden doldurulmuş Hareket Sheet’ini açar (otomatik kaydetmez)',
          badge: 'Doğal Dil',
          onSelect: () => {
            onOpenChange?.(false);
            onOpenMovementSheet?.({
              initialTip: ledgerParsed.initialTip,
              prefill: ledgerParsed.prefill,
            });
          },
        });
      }

      if (canManage) {
        const partParsed = parsePartNaturalInput(trimmedQuery, araclar, seciliAracId);
        if (partParsed) {
          const partParts = [partParsed.plateLabel, partParsed.parcaAdi];
          if (partParsed.degisimKm !== null) {
            partParts.push(`${formatLocaleNumber(partParsed.degisimKm, 0)} ${partParsed.birim}`);
          }
          if (partParsed.maliyet && partParsed.maliyet > 0) {
            partParts.push(formatCurrency(partParsed.maliyet, { maximumFractionDigits: 0 }));
          }

          nlItems.push({
            id: 'nl-part',
            icon: Cog,
            label: `Parça Sheet Aç: ${partParts.join(' · ')}`,
            subtitle: 'Önceden doldurulmuş Parça Sheet’ini açar (otomatik kaydetmez)',
            badge: 'Doğal Dil',
            onSelect: () => {
              onOpenChange?.(false);
              onOpenComponentSheet?.({ prefill: partParsed.prefill });
            },
          });
        }
      }

      if (nlItems.length > 0) {
        builtGroups.push({ id: 'natural', label: 'Doğal Dil Hızlı Kayıt', items: nlItems });
      }
    }

    // 2. Hızlı İşlemler (RBAC filtreli)
    const quickActions = [
      ...(canAddFuel
        ? [
            {
              id: 'action-fuel',
              icon: Fuel,
              label: 'Yakıt Ekle',
              subtitle: 'Yeni yakıt ikmali kaydı oluştur',
              keywords: 'yakıt yakit mazot benzin lpg litre ikmal',
              onSelect: () => {
                onOpenChange?.(false);
                onOpenMovementSheet?.({ initialTip: 'YAKIT', prefill: null });
              },
            },
          ]
        : []),
      ...(canAddMaintenance
        ? [
            {
              id: 'action-maintenance',
              icon: Wrench,
              label: 'Bakım Ekle',
              subtitle: 'Yeni servis veya onarım kaydı oluştur',
              keywords: 'bakım bakim servis tamir arıza ariza onarım',
              onSelect: () => {
                onOpenChange?.(false);
                onOpenMovementSheet?.({ initialTip: 'BAKIM', prefill: null });
              },
            },
          ]
        : []),
      ...(canManage
        ? [
            {
              id: 'action-part',
              icon: Cog,
              label: 'Parça Ekle',
              subtitle: 'Yeni bileşen ömür takibi ekle',
              keywords: 'parça parca bileşen triger balata ömür',
              onSelect: () => {
                onOpenChange?.(false);
                onOpenComponentSheet?.({ prefill: null });
              },
            },
            {
              id: 'action-vehicle',
              icon: Plus,
              label: 'Araç Ekle',
              subtitle: 'Filoya yeni araç kaydet',
              keywords: 'araç arac filo plaka yeni',
              onSelect: () => {
                onOpenChange?.(false);
                onOpenVehicleSheet?.();
              },
            },
          ]
        : []),
    ].filter((item) => {
      if (!qLower) return true;
      return (
        item.label.toLocaleLowerCase('tr-TR').includes(qLower) ||
        item.subtitle.toLocaleLowerCase('tr-TR').includes(qLower) ||
        item.keywords.includes(qLower)
      );
    });

    if (quickActions.length > 0) {
      builtGroups.push({ id: 'quick', label: 'Hızlı İşlemler', items: quickActions });
    }

    // 3. Sayfalar (Git)
    const pageCandidates = [
      ...visibleNavItems.map((nav) => ({
        id: `nav-${nav.path}`,
        icon: nav.icon,
        label: nav.label,
        subtitle: nav.path,
        path: nav.path,
      })),
      {
        id: 'nav-/app/ayarlar',
        icon: Settings,
        label: 'Ayarlar',
        subtitle: '/app/ayarlar',
        path: '/app/ayarlar',
      },
    ];

    const filteredPages = pageCandidates
      .filter((page) => {
        if (!qLower) return true;
        return (
          page.label.toLocaleLowerCase('tr-TR').includes(qLower) ||
          page.path.toLocaleLowerCase('tr-TR').includes(qLower)
        );
      })
      .map((page) => ({
        ...page,
        onSelect: () => {
          onOpenChange?.(false);
          onNavigate?.(page.path);
        },
      }));

    if (filteredPages.length > 0) {
      builtGroups.push({ id: 'pages', label: 'Git', items: filteredPages });
    }

    // 4. Araçlar
    const vehicleItems = [];
    if (
      isSingleVehicle &&
      (!qLower ||
        'tüm araçları göster'.includes(qLower) ||
        'tum araclari goster'.includes(qLower) ||
        'hepsi'.includes(qLower))
    ) {
      vehicleItems.push({
        id: 'vehicle-all',
        icon: Car,
        label: 'Tüm Araçları Göster',
        subtitle: `Global araç filtresini temizle (${formatLocaleNumber(araclar.length, 0)} araç)`,
        onSelect: () => {
          onOpenChange?.(false);
          onSelectVehicle?.('tum');
        },
      });
    }

    const matchedVehicles = araclar
      .filter((arac) => {
        if (!qLower) return true;
        const rawPlate = String(arac?.plaka || '').toLocaleLowerCase('tr-TR');
        const formattedPlate = formatTurkishPlate(arac?.plaka || '').toLocaleLowerCase('tr-TR');
        const compactPlate = rawPlate.replace(/\s+/g, '');
        const brandModel = `${arac?.marka || ''} ${arac?.model || ''}`.toLocaleLowerCase('tr-TR');
        return (
          rawPlate.includes(qLower) ||
          formattedPlate.includes(qLower) ||
          (qCompact && compactPlate.includes(qCompact)) ||
          brandModel.includes(qLower)
        );
      })
      .slice(0, 6);

    matchedVehicles.forEach((arac) => {
      const plate = formatTurkishPlate(arac?.plaka || '') || arac?.plaka || '—';
      const desc = [arac?.marka, arac?.model, arac?.yil].filter(Boolean).join(' ').trim();
      const isSelected = String(seciliAracId) === String(arac.arac_id);
      vehicleItems.push({
        id: `vehicle-${arac.arac_id}`,
        icon: Car,
        label: plate,
        subtitle: desc || 'Filo aracı',
        isMono: true,
        badge: isSelected ? 'Seçili' : undefined,
        onSelect: () => {
          onOpenChange?.(false);
          onSelectVehicle?.(String(arac.arac_id));
        },
      });
    });

    if (vehicleItems.length > 0) {
      builtGroups.push({ id: 'vehicles', label: 'Araçlar', items: vehicleItems });
    }

    return builtGroups;
  }, [
    trimmedQuery,
    qLower,
    qCompact,
    araclar,
    seciliAracId,
    isSingleVehicle,
    canManage,
    canAddFuel,
    canAddMaintenance,
    visibleNavItems,
    onOpenChange,
    onNavigate,
    onSelectVehicle,
    onOpenMovementSheet,
    onOpenComponentSheet,
    onOpenVehicleSheet,
  ]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery, flatItems.length]);

  useEffect(() => {
    const activeEl = itemRefs.current[activeIndex];
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flatItems.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flatItems.length === 0) return;
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === 'Enter') {
      if (flatItems.length === 0) return;
      event.preventDefault();
      const current = flatItems[activeIndex] || flatItems[0];
      current?.onSelect?.();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange?.(false);
    }
  };

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 overflow-hidden border border-border bg-popover p-0 shadow-xl sm:max-w-xl"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Komut Paleti</DialogTitle>

        {/* Arama Çubuğu (dashboard-dialog-19) */}
        <div className="flex h-12 items-center gap-2.5 border-b border-border px-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara veya hızlı komut yaz (ör. 34 ABC 123 45L 1950TL)..."
            aria-label="Komut paletinde ara"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Aramayı temizle"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <Kbd>Esc</Kbd>
        </div>

        {/* Kaydırılabilir Sonuç Listesi */}
        <div
          role="listbox"
          aria-label="Komut sonuçları"
          className="max-h-[60vh] overflow-y-auto divide-y divide-border"
        >
          {groups.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">Sonuç bulunamadı</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Farklı bir anahtar kelime deneyin veya doğal dil komutu girin (ör.{' '}
                <span className="font-mono text-foreground">34 ABC 123 45L 1950TL</span>).
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="p-2">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  {group.id === 'natural' && (
                    <Sparkles className="size-3 text-primary" aria-hidden="true" />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    runningIndex += 1;
                    const idx = runningIndex;
                    const isActive = idx === activeIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        ref={(el) => {
                          itemRefs.current[idx] = el;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => item.onSelect?.()}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none',
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground hover:bg-muted/60'
                        )}
                      >
                        <div
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card',
                            group.id === 'natural'
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'text-muted-foreground'
                          )}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'truncate text-sm font-medium text-foreground',
                              item.isMono && 'font-mono tabular-nums'
                            )}
                          >
                            {item.label}
                          </p>
                          {item.subtitle && (
                            <p className="truncate text-xs tabular-nums text-muted-foreground">
                              {item.subtitle}
                            </p>
                          )}
                        </div>

                        {item.badge && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'shrink-0 text-[10px]',
                              group.id === 'natural'
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground'
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Klavye İpucu Alt Şeridi (dashboard-dialog-19) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Kbd className="h-5 min-w-5 px-1">
                <ArrowUp className="size-3" aria-hidden="true" />
              </Kbd>
              <Kbd className="h-5 min-w-5 px-1">
                <ArrowDown className="size-3" aria-hidden="true" />
              </Kbd>
              <span>Gezin</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd className="h-5 min-w-5 px-1">
                <CornerDownLeft className="size-3" aria-hidden="true" />
              </Kbd>
              <span>Seç</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd className="h-5 px-1.5">Esc</Kbd>
              <span>Kapat</span>
            </span>
          </div>

          <span className="hidden text-[11px] sm:inline">
            Doğal dil: <span className="font-mono text-foreground">34 ABC 123 45L 1950TL</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
