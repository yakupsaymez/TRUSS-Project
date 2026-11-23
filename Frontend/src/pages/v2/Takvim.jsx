import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ExternalLink, Truck, X } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import bakimService from '@/services/bakimService';
import { canAccessChannel, resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { getTodayIso } from '@/utils/dateUtils';
import { formatTurkishPlate } from '@/utils/formatters';
import FleetCalendar, { getEventUrgencyMeta } from '@/components/v2/FleetCalendar';
import EmptyState from '@/components/v2/EmptyState';
import VehicleSheet from '@/components/v2/VehicleSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function normalizeIsoDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!ISO_DATE_RE.test(str)) return null;
  return str.slice(0, 10);
}

function formatTrDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return '—';
  return `${d}.${m}.${y}`;
}

export default function Takvim() {
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);
  const canViewLedger = canAccessChannel(user, 'ledger');

  const araclar = useVehicleStore((s) => s.araclar);
  const loadingVehicles = useVehicleStore((s) => s.loading);
  const hasLoadedVehicles = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [bakimlar, setBakimlar] = useState([]);
  const [loadingBakim, setLoadingBakim] = useState(false);

  // Yönetici için VehicleSheet durumu (yalnız canManage iken mount edilir)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // DRIVER (salt-okunur) etkinlik detay dialogu
  const [detailEvent, setDetailEvent] = useState(null);

  const vehicleFetchAttemptedRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedVehicles && !loadingVehicles && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [hasLoadedVehicles, loadingVehicles, fetchAraclar]);

  // RBAC: Bakım kayıtları YALNIZCA ledger kanalı yetkisi varsa çekilir
  useEffect(() => {
    if (!canViewLedger) {
      setBakimlar([]);
      setLoadingBakim(false);
      return;
    }

    let cancelled = false;
    setLoadingBakim(true);

    bakimService
      .getAllBakimlar()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : res?.bakimlar || [];
        setBakimlar(list);
      })
      .catch((err) => {
        if (cancelled) return;
        notifyApiError(err, 'Bakım takvim kayıtları yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoadingBakim(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewLedger]);

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');

  const filtreliAraclar = useMemo(
    () =>
      !isSingleVehicle
        ? araclar
        : araclar.filter((arac) => String(arac.arac_id) === String(seciliAracId)),
    [araclar, isSingleVehicle, seciliAracId]
  );

  const selectedVehicle = isSingleVehicle ? filtreliAraclar[0] || null : null;

  const aracById = useMemo(() => {
    const map = new Map();
    araclar.forEach((arac) => {
      map.set(String(arac.arac_id), arac);
    });
    return map;
  }, [araclar]);

  const events = useMemo(() => {
    const list = [];
    const scopedIds = new Set();

    filtreliAraclar.forEach((arac) => {
      const idStr = String(arac.arac_id);
      scopedIds.add(idStr);
      const plate = formatTurkishPlate(arac.plaka);
      const vehicleLabel = [arac.marka, arac.model, arac.yil].filter(Boolean).join(' ');

      const docSpecs = [
        { key: 'muayene', label: 'Muayene', raw: arac.muayene_tarihi },
        { key: 'sigorta', label: 'Sigorta', raw: arac.sigorta_tarihi },
        { key: 'kasko', label: 'Kasko', raw: arac.kasko_tarihi },
      ];

      docSpecs.forEach((doc) => {
        const iso = normalizeIsoDate(doc.raw);
        if (!iso) return;
        list.push({
          id: `${doc.key}-${idStr}-${iso}`,
          type: doc.key,
          typeLabel: doc.label,
          date: iso,
          aracId: idStr,
          plate,
          vehicleLabel,
          shortLabel: `${doc.label} · ${plate}`,
          title: `${doc.label} · ${plate}`,
          subtitle: '',
          description: '',
        });
      });
    });

    if (canViewLedger && bakimlar.length > 0) {
      bakimlar.forEach((bakim) => {
        const idStr = String(bakim.arac_id);
        if (!scopedIds.has(idStr)) return;
        const iso = normalizeIsoDate(bakim.bakim_tarihi || bakim.tarih);
        if (!iso) return;
        const arac = aracById.get(idStr);
        const plate = formatTurkishPlate(arac?.plaka || bakim.plaka || '');
        const vehicleLabel = [arac?.marka, arac?.model, arac?.yil].filter(Boolean).join(' ');
        const bakimTipi = bakim.bakim_tipi || '';

        list.push({
          id: `bakim-${bakim.bakim_id ?? `${idStr}-${iso}`}`,
          type: 'bakim',
          typeLabel: 'Bakım',
          date: iso,
          aracId: idStr,
          plate,
          vehicleLabel,
          shortLabel: `Bakım · ${plate}`,
          title: `Bakım · ${plate}${bakimTipi ? ` · ${bakimTipi}` : ''}`,
          subtitle: bakimTipi,
          description: bakim.notlar || bakim.aciklama || '',
        });
      });
    }

    return list;
  }, [filtreliAraclar, canViewLedger, bakimlar, aracById]);

  const handleEventSelect = useCallback(
    (event) => {
      if (!event) return;
      const matchedVehicle = aracById.get(String(event.aracId)) || null;

      if (canManage) {
        if (!matchedVehicle) return;
        setEditingVehicle(matchedVehicle);
        setSheetOpen(true);
        return;
      }

      setDetailEvent(event);
    },
    [aracById, canManage]
  );

  const handleCreateVehicle = () => {
    if (!canManage) return;
    setEditingVehicle(null);
    setSheetOpen(true);
  };

  const handleOpenInFleet = () => {
    if (!detailEvent?.aracId) return;
    setSeciliAracId(String(detailEvent.aracId));
    setDetailEvent(null);
    navigate('/app/filo');
  };

  const todayIso = useMemo(() => getTodayIso(), []);
  const detailUrgency = detailEvent ? getEventUrgencyMeta(detailEvent, todayIso) : null;

  const isFleetEmpty = hasLoadedVehicles && !loadingVehicles && araclar.length === 0;
  const isCalendarLoading = (loadingVehicles && !hasLoadedVehicles) || loadingBakim;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Takvim</h1>
            {!isFleetEmpty && (
              <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                {events.length} kayıt
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Muayene, sigorta, kasko vadeleri{canViewLedger ? ' ve bakım geçmişi' : ''} (salt-okunur)
          </p>
        </div>

        {isSingleVehicle && !isFleetEmpty && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
            <span className="tabular-nums">
              Tek araç görünümü
              {selectedVehicle?.plaka
                ? ` · ${formatTurkishPlate(selectedVehicle.plaka)}`
                : ''}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSeciliAracId('tum')}
              className="h-6 gap-1 rounded-full px-2 text-xs text-primary hover:bg-primary/15 hover:text-primary"
            >
              <span>Tümünü Göster</span>
              <X className="size-3" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {isFleetEmpty ? (
        canManage ? (
          <EmptyState
            icon={Truck}
            title="İlk aracınızı ekleyin"
            description="Filonuza araç eklediğinizde muayene, sigorta, kasko vadeleri ve bakım kayıtları takvimde otomatik görünür."
            actionLabel="Araç Ekle"
            onAction={handleCreateVehicle}
          />
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Henüz zimmetli aracınız yok"
            description="Filo yöneticiniz size bir araç zimmetlediğinde belge ve bakım takvimi burada görünecektir."
          />
        )
      ) : (
        <FleetCalendar
          events={events}
          loading={isCalendarLoading}
          showMaintenance={canViewLedger}
          onEventSelect={handleEventSelect}
        />
      )}

      {/* Yönetici: Etkinliğe tıklayınca veya 0 araçta Araç Ekle -> VehicleSheet */}
      {canManage && (
        <VehicleSheet
          open={sheetOpen}
          onOpenChange={(nextOpen) => {
            setSheetOpen(nextOpen);
            if (!nextOpen) setEditingVehicle(null);
          }}
          arac={editingVehicle}
        />
      )}

      {/* DRIVER: Salt-okunur etkinlik detay dialogu (düzenlenebilir Sheet YOK) */}
      {!canManage && (
        <Dialog
          open={detailEvent !== null}
          onOpenChange={(open) => {
            if (!open) setDetailEvent(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-mono text-base tabular-nums">
                <span>{detailEvent?.plate}</span>
                {detailUrgency && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 font-sans text-[11px] font-medium tabular-nums',
                      detailUrgency.chipClass
                    )}
                  >
                    {detailUrgency.badgeText}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {detailEvent?.vehicleLabel || 'Salt-okunur takvim etkinliği'}
              </DialogDescription>
            </DialogHeader>

            {detailEvent && (
              <div className="space-y-3 rounded-lg border border-border bg-background/60 p-3.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Etkinlik Türü</span>
                  <span className="font-medium text-foreground">
                    {detailEvent.typeLabel}
                    {detailEvent.subtitle ? ` · ${detailEvent.subtitle}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Tarih</span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {formatTrDate(detailEvent.date)}
                  </span>
                </div>
                {detailEvent.description ? (
                  <div className="space-y-1 border-t border-border pt-2.5">
                    <span className="text-xs text-muted-foreground">Açıklama</span>
                    <p className="text-xs leading-relaxed text-foreground">
                      {detailEvent.description}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailEvent(null)}>
                Kapat
              </Button>
              <Button type="button" size="sm" onClick={handleOpenInFleet} className="gap-1.5">
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span>Filoda Görüntüle</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
