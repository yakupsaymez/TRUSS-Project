import { Car, Cog, Fuel, Plus, Settings, Wrench } from 'lucide-react';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { parseLedgerNaturalInput, parsePartNaturalInput } from './commandPaletteParsers';

export function buildCommandGroups({
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
}) {
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
}
