import React from 'react';
import { Compass, MapPin, Navigation, ShieldAlert, Truck, Wrench } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CORRIDOR_PAIRS,
  LAT_MAX,
  LAT_MIN,
  LNG_MAX,
  LNG_MIN,
  SVG_HEIGHT,
  SVG_PAD_X,
  SVG_PAD_Y,
  SVG_WIDTH,
  TR_LOGISTICS_HUBS,
  projectToSvg,
} from './mapHelpers';

const LAT_LINES = [36, 37, 38, 39, 40, 41, 42];
const LNG_LINES = [26, 28, 30, 32, 34, 36, 38, 40, 42, 44];

export default function FleetMapCanvas({
  positionedVehicles,
  hubMap,
  outlinePolygonPoints,
  activeVehicle,
  counts,
  onSelectArac,
  onOpenCheckIn,
}) {
  return (
    <Card className="relative flex min-h-[540px] flex-col gap-0 overflow-hidden border border-border bg-card py-0 shadow-none lg:col-span-8">
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

      <CardContent className="relative flex flex-1 items-center justify-center overflow-hidden bg-muted/20 p-0">
        <div className="relative aspect-[1000/480] w-full">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="block size-full select-none"
            role="img"
            aria-label="Türkiye Filo Konum Haritası"
          >
            {LAT_LINES.map((latLine) => {
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

            {LNG_LINES.map((lngLine) => {
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

            <polygon
              points={outlinePolygonPoints}
              fill="var(--muted)"
              fillOpacity="0.35"
              stroke="var(--border)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

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
        </div>

        {positionedVehicles.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="pointer-events-auto max-w-sm rounded-xl border border-border bg-card/95 p-5 text-center shadow-sm backdrop-blur-xs">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full border border-border bg-muted text-primary">
                <MapPin className="size-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {counts.known > 0
                  ? 'Aktif filtrede konumlu araç yok'
                  : 'Henüz konum bildirimi yapılmadı'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {counts.known > 0
                  ? 'Arama metnini temizleyin veya "Tümü" / "Bilinen" sekmesine geçerek harita işaretçilerini görüntüleyin.'
                  : 'Filodaki araçlardan birini seçip “Konum Bildir (Check-In)” butonuyla lojistik merkez veya GPS koordinatı kaydedin.'}
              </p>
              {counts.known === 0 && activeVehicle && (
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
  );
}
