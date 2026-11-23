import React, { useEffect, useMemo, useState } from 'react';
import {
  Compass,
  ExternalLink,
  Gauge,
  MapPin,
  Navigation,
  Search,
  ShieldAlert,
  Truck,
  Wrench,
} from 'lucide-react';
import { evrakRiskliMi, getGuncelSayac, getSayacBirimi, hesaplaBakimDurumu } from '@/utils/aracDurum';
import { formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import EmptyState from '@/components/v2/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export const LAT_MIN = 35.8;
export const LAT_MAX = 42.2;
export const LNG_MIN = 25.8;
export const LNG_MAX = 44.9;

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 480;
const SVG_PAD_X = 48;
const SVG_PAD_Y = 36;

export const TR_LOGISTICS_HUBS = [
  { id: 'istanbul', name: 'İstanbul (Marmara Lojistik Üssü)', shortName: 'İstanbul', lat: 41.0082, lng: 28.9784 },
  { id: 'ankara', name: 'Ankara (İç Anadolu Merkez)', shortName: 'Ankara', lat: 39.9334, lng: 32.8597 },
  { id: 'izmir', name: 'İzmir (Alsancak Liman & Ege)', shortName: 'İzmir', lat: 38.4237, lng: 27.1428 },
  { id: 'bursa', name: 'Bursa (Nilüfer OSB)', shortName: 'Bursa', lat: 40.1885, lng: 29.061 },
  { id: 'kocaeli', name: 'Kocaeli (Gebze / Dilovası Liman)', shortName: 'Kocaeli', lat: 40.7654, lng: 29.9408 },
  { id: 'adana', name: 'Adana (Çukurova Aktarma)', shortName: 'Adana', lat: 37.0, lng: 35.3213 },
  { id: 'mersin', name: 'Mersin (Uluslararası Liman)', shortName: 'Mersin', lat: 36.8121, lng: 34.6415 },
  { id: 'gaziantep', name: 'Gaziantep (Başpınar OSB)', shortName: 'Gaziantep', lat: 37.0662, lng: 37.3833 },
  { id: 'konya', name: 'Konya (Organize Sanayi)', shortName: 'Konya', lat: 37.8746, lng: 32.4932 },
  { id: 'antalya', name: 'Antalya (Akdeniz Dağıtım)', shortName: 'Antalya', lat: 36.8969, lng: 30.7133 },
  { id: 'kayseri', name: 'Kayseri (Serbest Bölge)', shortName: 'Kayseri', lat: 38.7312, lng: 35.4787 },
  { id: 'samsun', name: 'Samsun (Karadeniz Liman)', shortName: 'Samsun', lat: 41.2867, lng: 36.33 },
  { id: 'trabzon', name: 'Trabzon (Doğu Karadeniz Liman)', shortName: 'Trabzon', lat: 41.0027, lng: 39.7168 },
  { id: 'erzurum', name: 'Erzurum (Doğu Anadolu Geçiş)', shortName: 'Erzurum', lat: 39.9055, lng: 41.2658 },
  { id: 'diyarbakir', name: 'Diyarbakır (Güneydoğu Dağıtım)', shortName: 'Diyarbakır', lat: 37.9144, lng: 40.2306 },
  { id: 'eskisehir', name: 'Eskişehir (Demiryolu & OSB)', shortName: 'Eskişehir', lat: 39.7667, lng: 30.5256 },
];

const CORRIDOR_PAIRS = [
  ['istanbul', 'kocaeli'],
  ['kocaeli', 'bursa'],
  ['bursa', 'izmir'],
  ['kocaeli', 'eskisehir'],
  ['eskisehir', 'ankara'],
  ['ankara', 'konya'],
  ['konya', 'antalya'],
  ['ankara', 'kayseri'],
  ['kayseri', 'adana'],
  ['adana', 'mersin'],
  ['adana', 'gaziantep'],
  ['gaziantep', 'diyarbakir'],
  ['ankara', 'samsun'],
  ['samsun', 'trabzon'],
  ['trabzon', 'erzurum'],
  ['kayseri', 'erzurum'],
];

const TURKEY_OUTLINE_POINTS = [
  [41.8, 26.2],
  [41.3, 28.9],
  [41.6, 32.2],
  [42.0, 35.1],
  [41.3, 36.5],
  [41.1, 39.8],
  [41.5, 41.6],
  [41.1, 43.4],
  [39.7, 44.7],
  [37.3, 44.6],
  [37.1, 42.3],
  [36.8, 38.9],
  [36.7, 36.6],
  [35.9, 36.0],
  [36.1, 33.0],
  [36.9, 30.7],
  [36.3, 29.4],
  [36.7, 27.4],
  [38.4, 26.3],
  [39.9, 26.1],
  [40.7, 26.0],
];

export function hasValidCoordinates(arac) {
  const lat = Number(arac?.son_enlem);
  const lng = Number(arac?.son_boylam);
  return (
    arac?.son_enlem !== null &&
    arac?.son_enlem !== undefined &&
    arac?.son_enlem !== '' &&
    arac?.son_boylam !== null &&
    arac?.son_boylam !== undefined &&
    arac?.son_boylam !== '' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function projectToSvg(lat, lng) {
  const clampedLat = Math.min(LAT_MAX, Math.max(LAT_MIN, Number(lat) || LAT_MIN));
  const clampedLng = Math.min(LNG_MAX, Math.max(LNG_MIN, Number(lng) || LNG_MIN));
  const innerW = SVG_WIDTH - SVG_PAD_X * 2;
  const innerH = SVG_HEIGHT - SVG_PAD_Y * 2;
  const x = SVG_PAD_X + ((clampedLng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * innerW;
  const y = SVG_PAD_Y + ((LAT_MAX - clampedLat) / (LAT_MAX - LAT_MIN)) * innerH;
  return { x, y };
}

export function resolveVehicleHealthMeta(arac) {
  const bakim = hesaplaBakimDurumu(arac);
  const docRisk = evrakRiskliMi(arac);

  if (bakim.durum === 'tehlike') {
    return {
      tone: 'critical',
      label: 'Bakım Gecikti',
      dotClass: 'bg-destructive',
      ringClass: 'ring-destructive/35',
      badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive',
      bakim,
      docRisk,
    };
  }

  if (bakim.durum === 'uyari' || docRisk) {
    return {
      tone: 'warning',
      label: bakim.durum === 'uyari' ? 'Bakım Yaklaşıyor' : 'Evrak Uyarısı',
      dotClass: 'bg-status-warning',
      ringClass: 'ring-status-warning/35',
      badgeClass: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
      bakim,
      docRisk,
    };
  }

  return {
    tone: 'healthy',
    label: 'Operasyonda',
    dotClass: 'bg-primary',
    ringClass: 'ring-primary/35',
    badgeClass: 'border-primary/40 bg-primary/10 text-primary',
    bakim,
    docRisk,
  };
}

function formatDateTimeTr(raw) {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCoord(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toFixed(4);
}

export default function FleetLiveMap({
  araclar = [],
  selectedAracId = null,
  onSelectArac,
  onOpenCheckIn,
  onOpenInFleet,
  loading = false,
  className,
}) {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');

  const counts = useMemo(() => {
    let known = 0;
    let pending = 0;
    araclar.forEach((arac) => {
      if (hasValidCoordinates(arac)) known += 1;
      else pending += 1;
    });
    return {
      all: araclar.length,
      known,
      pending,
    };
  }, [araclar]);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return araclar.filter((arac) => {
      const hasCoord = hasValidCoordinates(arac);
      if (filterTab === 'known' && !hasCoord) return false;
      if (filterTab === 'pending' && hasCoord) return false;
      if (!q) return true;

      const haystack = [
        arac?.plaka,
        formatTurkishPlate(arac?.plaka || ''),
        arac?.marka,
        arac?.model,
        arac?.son_konum_adi,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return haystack.includes(q);
    });
  }, [araclar, filterTab, search]);

  const activeVehicle = useMemo(() => {
    if (selectedAracId && selectedAracId !== 'tum') {
      const matched = araclar.find((a) => String(a.arac_id) === String(selectedAracId));
      if (matched) return matched;
    }
    const firstWithCoord = filteredVehicles.find((a) => hasValidCoordinates(a));
    return firstWithCoord || filteredVehicles[0] || araclar[0] || null;
  }, [araclar, filteredVehicles, selectedAracId]);

  useEffect(() => {
    if (!selectedAracId && activeVehicle?.arac_id && onSelectArac) {
      onSelectArac(String(activeVehicle.arac_id));
    }
  }, [activeVehicle, onSelectArac, selectedAracId]);

  const positionedVehicles = useMemo(() => {
    return araclar
      .filter((arac) => hasValidCoordinates(arac))
      .map((arac, index) => {
        const lat = Number(arac.son_enlem);
        const lng = Number(arac.son_boylam);
        const base = projectToSvg(lat, lng);
        return {
          arac,
          lat,
          lng,
          x: base.x + ((index % 3) - 1) * 3,
          y: base.y + ((Math.floor(index / 3) % 3) - 1) * 3,
          health: resolveVehicleHealthMeta(arac),
        };
      });
  }, [araclar]);

  const hubMap = useMemo(() => {
    const map = new Map();
    TR_LOGISTICS_HUBS.forEach((hub) => {
      map.set(hub.id, {
        ...hub,
        ...projectToSvg(hub.lat, hub.lng),
      });
    });
    return map;
  }, []);

  const outlinePolygonPoints = useMemo(
    () =>
      TURKEY_OUTLINE_POINTS.map(([lat, lng]) => {
        const { x, y } = projectToSvg(lat, lng);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' '),
    []
  );

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="h-[520px] rounded-xl lg:col-span-4" />
          <Skeleton className="h-[520px] rounded-xl lg:col-span-8" />
        </div>
      </div>
    );
  }

  const activeHealth = activeVehicle ? resolveVehicleHealthMeta(activeVehicle) : null;
  const activeHasCoords = activeVehicle ? hasValidCoordinates(activeVehicle) : false;
  const activeSayac = activeVehicle ? getGuncelSayac(activeVehicle) : 0;
  const activeBirim = activeVehicle ? getSayacBirimi(activeVehicle) : 'km';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Seçili Araç Telemetri Üst Çubuğu (map-blocks-02 VehicleDetailBar karşılığı) */}
      {activeVehicle && (
        <Card className="gap-0 border border-border bg-card p-4 shadow-none">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground">
                <Truck className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-bold tracking-tight tabular-nums text-foreground">
                    {formatTurkishPlate(activeVehicle.plaka)}
                  </span>
                  {activeHealth && (
                    <Badge variant="outline" className={cn('text-xs', activeHealth.badgeClass)}>
                      {activeHealth.label}
                    </Badge>
                  )}
                  {!activeHasCoords && (
                    <Badge variant="secondary" className="text-xs text-muted-foreground">
                      Konum bildirilmedi
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {[activeVehicle.marka, activeVehicle.model, activeVehicle.yil]
                    .filter(Boolean)
                    .join(' ') || 'Filo Aracı'}
                </p>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 border-y border-border py-3 sm:grid-cols-4 xl:border-x xl:border-y-0 xl:px-6 xl:py-0">
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Son Konum / Terminal</span>
                <p className="truncate text-xs font-semibold text-foreground">
                  {activeHasCoords
                    ? activeVehicle.son_konum_adi || 'Koordinat Kayıtlı'
                    : 'Konum bildirilmedi'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Koordinatlar (Enlem / Boylam)</span>
                <p className="font-mono text-xs font-semibold tabular-nums text-foreground">
                  {activeHasCoords
                    ? `${formatCoord(activeVehicle.son_enlem)}° K, ${formatCoord(activeVehicle.son_boylam)}° D`
                    : '—'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Güncel Sayaç &amp; Bakım</span>
                <p className="font-mono text-xs font-semibold tabular-nums text-foreground">
                  {formatLocaleNumber(activeSayac)} {activeBirim}
                  {activeHealth?.bakim?.kalan !== null && activeHealth?.bakim?.kalan !== undefined && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({activeHealth.bakim.kalan > 0 ? `${formatLocaleNumber(activeHealth.bakim.kalan)} kaldı` : 'Gecikti'})
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Son Güncelleme</span>
                <p className="font-mono text-xs font-semibold tabular-nums text-foreground">
                  {activeHasCoords ? formatDateTimeTr(activeVehicle.son_konum_zamani) : '—'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => onOpenCheckIn?.(activeVehicle)}
              >
                <MapPin className="size-3.5" aria-hidden="true" />
                <span>Konum Bildir (Check-In)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => onOpenInFleet?.(activeVehicle)}
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span>Filoda Aç</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Ana İki Sütunlu map-blocks-02 Düzeni: Sol Araç Listesi + Sağ Harita Kanvası */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Sol Panel: Filtrelenebilir Araç Listesi */}
        <Card className="flex h-[540px] flex-col gap-0 overflow-hidden border border-border bg-card py-0 shadow-none lg:col-span-4">
          <CardHeader className="space-y-3 border-b border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold text-foreground">Filo Konum Listesi</CardTitle>
              <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                {counts.known}/{counts.all} aktif konum
              </Badge>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Plaka, marka veya konum ara..."
                className="h-8 pl-8 text-xs"
                aria-label="Plaka, marka veya konum ara"
              />
            </div>

            <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full">
              <TabsList className="grid h-8 w-full grid-cols-3">
                <TabsTrigger value="all" className="px-2 text-[11px]">
                  Tümü ({counts.all})
                </TabsTrigger>
                <TabsTrigger value="known" className="px-2 text-[11px]">
                  Konumu Bilinen ({counts.known})
                </TabsTrigger>
                <TabsTrigger value="pending" className="px-2 text-[11px]">
                  Konum Bekleyen ({counts.pending})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <ScrollArea className="min-h-0 flex-1">
              {filteredVehicles.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    variant="card"
                    icon={MapPin}
                    title="Eşleşen araç bulunamadı"
                    description="Arama veya konum filtresini değiştirerek tekrar deneyin."
                  />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredVehicles.map((arac) => {
                    const isSelected =
                      activeVehicle && String(arac.arac_id) === String(activeVehicle.arac_id);
                    const hasCoord = hasValidCoordinates(arac);
                    const health = resolveVehicleHealthMeta(arac);
                    const sayac = getGuncelSayac(arac);
                    const birim = getSayacBirimi(arac);

                    return (
                      <div
                        key={arac.arac_id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectArac?.(String(arac.arac_id))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectArac?.(String(arac.arac_id));
                          }
                        }}
                        className={cn(
                          'group relative flex cursor-pointer flex-col gap-2 p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected
                            ? 'border-l-4 border-l-primary bg-muted/60 pl-3'
                            : 'hover:bg-muted/40'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn('size-2 shrink-0 rounded-full', health.dotClass)}
                                aria-hidden="true"
                              />
                              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                                {formatTurkishPlate(arac.plaka)}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {[arac.marka, arac.model, arac.yil].filter(Boolean).join(' ')}
                            </p>
                          </div>

                          {hasCoord ? (
                            <Badge
                              variant="outline"
                              className={cn('shrink-0 text-[11px]', health.badgeClass)}
                            >
                              {health.label}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-[11px] text-muted-foreground"
                            >
                              Konum bildirilmedi
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                            <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                            <span className="truncate">
                              {hasCoord
                                ? arac.son_konum_adi ||
                                  `${formatCoord(arac.son_enlem)}° K, ${formatCoord(arac.son_boylam)}° D`
                                : 'Henüz check-in yapılmadı'}
                            </span>
                          </span>

                          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] tabular-nums">
                            <Gauge className="size-3 text-muted-foreground" aria-hidden="true" />
                            {formatLocaleNumber(sayac)} {birim}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            {hasCoord ? formatDateTimeTr(arac.son_konum_zamani) : '—'}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-[11px] text-primary hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCheckIn?.(arac);
                            }}
                          >
                            <Navigation className="size-3" aria-hidden="true" />
                            <span>Check-In</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Sağ Panel: Türkiye Koordinat Projeksiyonlu Canlı Harita Kanvası */}
        <Card className="relative flex h-[540px] flex-col gap-0 overflow-hidden border border-border bg-card py-0 shadow-none lg:col-span-8">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="space-y-0.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Compass className="size-4 text-primary" aria-hidden="true" />
                <span>Türkiye Lojistik Koridoru &amp; Canlı Check-In Haritası</span>
              </CardTitle>
              <CardDescription className="font-mono text-[11px] tabular-nums text-muted-foreground">
                Projeksiyon: {LAT_MIN}°–{LAT_MAX}° K · {LNG_MIN}°–{LNG_MAX}° D · 16 Ana Lojistik Üs
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
                <span>Operasyonda</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 rounded-full bg-status-warning" aria-hidden="true" />
                <span>Bakım / Evrak Uyarısı</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 rounded-full bg-destructive" aria-hidden="true" />
                <span>Bakım Gecikti</span>
              </span>
            </div>
          </CardHeader>

          <CardContent className="relative flex-1 overflow-hidden bg-muted/20 p-0">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="size-full select-none"
              role="img"
              aria-label="Türkiye Filo Konum Haritası"
            >
              {/* Enlem / Boylam Izgara Çizgileri */}
              {[36, 37, 38, 39, 40, 41, 42].map((latLine) => {
                const { y } = projectToSvg(latLine, LNG_MIN);
                return (
                  <g key={`lat-${latLine}`}>
                    <line
                      x1={SVG_PAD_X}
                      y1={y}
                      x2={SVG_WIDTH - SVG_PAD_X}
                      y2={y}
                      stroke="var(--border)"
                      strokeDasharray="3 5"
                      strokeWidth="1"
                    />
                    <text
                      x={10}
                      y={y + 3}
                      fill="var(--muted-foreground)"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                    >
                      {latLine}°K
                    </text>
                  </g>
                );
              })}

              {[26, 28, 30, 32, 34, 36, 38, 40, 42, 44].map((lngLine) => {
                const { x } = projectToSvg(LAT_MIN, lngLine);
                return (
                  <g key={`lng-${lngLine}`}>
                    <line
                      x1={x}
                      y1={SVG_PAD_Y}
                      x2={x}
                      y2={SVG_HEIGHT - SVG_PAD_Y}
                      stroke="var(--border)"
                      strokeDasharray="3 5"
                      strokeWidth="1"
                    />
                    <text
                      x={x - 12}
                      y={SVG_HEIGHT - 10}
                      fill="var(--muted-foreground)"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                    >
                      {lngLine}°D
                    </text>
                  </g>
                );
              })}

              {/* Türkiye Sınır Silüeti */}
              <polygon
                points={outlinePolygonPoints}
                fill="var(--muted)"
                fillOpacity="0.35"
                stroke="var(--border)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* Ana Lojistik Koridor Rota Çizgileri */}
              {CORRIDOR_PAIRS.map(([fromId, toId]) => {
                const fromHub = hubMap.get(fromId);
                const toHub = hubMap.get(toId);
                if (!fromHub || !toHub) return null;
                return (
                  <line
                    key={`${fromId}-${toId}`}
                    x1={fromHub.x}
                    y1={fromHub.y}
                    x2={toHub.x}
                    y2={toHub.y}
                    stroke="var(--border)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* 16 Ana Lojistik Merkez Noktası */}
              {TR_LOGISTICS_HUBS.map((hub) => {
                const projected = hubMap.get(hub.id);
                if (!projected) return null;
                return (
                  <g key={hub.id} transform={`translate(${projected.x}, ${projected.y})`}>
                    <circle
                      r="4"
                      fill="var(--card)"
                      stroke="var(--muted-foreground)"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="15"
                      textAnchor="middle"
                      fill="var(--muted-foreground)"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {hub.shortName}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Gerçek Koordinatlı Araç İşaretçileri (HTML Katmanı) */}
            <div className="pointer-events-none absolute inset-0">
              {positionedVehicles.map(({ arac, x, y, health }) => {
                const isSelected =
                  activeVehicle && String(arac.arac_id) === String(activeVehicle.arac_id);
                const leftPct = (x / SVG_WIDTH) * 100;
                const topPct = (y / SVG_HEIGHT) * 100;
                const plate = formatTurkishPlate(arac.plaka);

                return (
                  <button
                    key={arac.arac_id}
                    type="button"
                    onClick={() => onSelectArac?.(String(arac.arac_id))}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                    }}
                    className={cn(
                      'pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 transition-transform focus-visible:outline-none',
                      isSelected ? 'z-30 scale-110' : 'z-20 hover:z-30 hover:scale-105'
                    )}
                    title={`${plate} · ${arac.son_konum_adi || 'Konum Kayıtlı'}`}
                  >
                    <span className="relative flex flex-col items-center">
                      {(isSelected || positionedVehicles.length <= 12) && (
                        <span
                          className={cn(
                            'mb-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums shadow-xs',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card/95 text-foreground'
                          )}
                        >
                          {plate}
                        </span>
                      )}

                      <span
                        className={cn(
                          'flex items-center justify-center rounded-full border-2 border-background text-primary-foreground shadow-sm transition-all',
                          health.dotClass,
                          isSelected ? cn('size-8 ring-4', health.ringClass) : 'size-6'
                        )}
                      >
                        <Truck className={cn(isSelected ? 'size-4' : 'size-3')} aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Harita üzerinde hiç konum bildirilmiş araç yoksa bilgilendirme katmanı */}
            {positionedVehicles.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div className="pointer-events-auto max-w-sm rounded-xl border border-border bg-card/95 p-5 text-center shadow-sm backdrop-blur-xs">
                  <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full border border-border bg-muted text-primary">
                    <MapPin className="size-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Henüz konum bildirimi yapılmadı
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Filodaki araçlardan birini seçip &ldquo;Konum Bildir (Check-In)&rdquo; butonuyla
                    lojistik merkez veya GPS koordinatı kaydedin.
                  </p>
                  {activeVehicle && (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 h-8 gap-1.5 text-xs"
                      onClick={() => onOpenCheckIn?.(activeVehicle)}
                    >
                      <Navigation className="size-3.5" aria-hidden="true" />
                      <span>İlk Konumu Bildir</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Sağ Alt Durum Özeti Kutusu */}
            <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-lg border border-border bg-card/95 px-3 py-2 text-[11px] shadow-xs backdrop-blur-xs sm:flex sm:items-center sm:gap-4">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Wrench className="size-3.5 text-primary" aria-hidden="true" />
                <span>Aktif İşaretçi:</span>
                <strong className="font-mono tabular-nums text-foreground">
                  {positionedVehicles.length}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <ShieldAlert className="size-3.5 text-status-warning" aria-hidden="true" />
                <span>Konum Bekleyen:</span>
                <strong className="font-mono tabular-nums text-foreground">
                  {counts.pending}
                </strong>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
