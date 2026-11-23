import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LocateFixed, Loader2, MapPin, Navigation, Truck, X } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import aracService from '@/services/aracService';
import { resolveRole, ROLES } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { formatTurkishPlate } from '@/utils/formatters';
import FleetLiveMap, {
  hasValidCoordinates,
  TR_LOGISTICS_HUBS,
} from '@/components/v2/FleetLiveMap';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Harita() {
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);

  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const hasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [activeMapAracId, setActiveMapAracId] = useState(null);
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);

  // Check-In Dialog State
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInAracId, setCheckInAracId] = useState('');
  const [selectedHubId, setSelectedHubId] = useState('');
  const [enlemInput, setEnlemInput] = useState('');
  const [boylamInput, setBoylamInput] = useState('');
  const [konumAdiInput, setKonumAdiInput] = useState('');
  const [locatingGps, setLocatingGps] = useState(false);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  const vehicleFetchAttemptedRef = useRef(false);

  useEffect(() => {
    if (!hasLoaded && !loading && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [hasLoaded, loading, fetchAraclar]);

  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');

  const filtreliAraclar = useMemo(
    () =>
      !isSingleVehicle
        ? araclar
        : araclar.filter((arac) => String(arac.arac_id) === String(seciliAracId)),
    [araclar, isSingleVehicle, seciliAracId]
  );

  const selectedGlobalVehicle = isSingleVehicle ? filtreliAraclar[0] || null : null;

  useEffect(() => {
    if (isSingleVehicle && seciliAracId) {
      setActiveMapAracId(String(seciliAracId));
      return;
    }
    if (
      activeMapAracId &&
      filtreliAraclar.some((arac) => String(arac.arac_id) === String(activeMapAracId))
    ) {
      return;
    }
    const firstWithCoords = filtreliAraclar.find((arac) => hasValidCoordinates(arac));
    const fallback = firstWithCoords || filtreliAraclar[0] || null;
    setActiveMapAracId(fallback ? String(fallback.arac_id) : null);
  }, [activeMapAracId, filtreliAraclar, isSingleVehicle, seciliAracId]);

  const populateCheckInFields = useCallback((arac) => {
    if (!arac) return;
    setCheckInAracId(String(arac.arac_id));
    setSelectedHubId('');
    if (hasValidCoordinates(arac)) {
      setEnlemInput(String(Number(arac.son_enlem)));
      setBoylamInput(String(Number(arac.son_boylam)));
      setKonumAdiInput(arac.son_konum_adi || '');
    } else {
      setEnlemInput('');
      setBoylamInput('');
      setKonumAdiInput('');
    }
  }, []);

  const handleOpenCheckIn = useCallback(
    (targetArac = null) => {
      const candidate =
        targetArac ||
        filtreliAraclar.find((a) => String(a.arac_id) === String(activeMapAracId)) ||
        filtreliAraclar[0] ||
        araclar[0] ||
        null;

      if (!candidate) return;
      populateCheckInFields(candidate);
      setCheckInOpen(true);
    },
    [activeMapAracId, araclar, filtreliAraclar, populateCheckInFields]
  );

  const handleCheckInVehicleChange = (nextAracId) => {
    setCheckInAracId(nextAracId);
    const matched = araclar.find((a) => String(a.arac_id) === String(nextAracId));
    if (matched) {
      populateCheckInFields(matched);
    }
  };

  const handleSelectHub = (hubId) => {
    setSelectedHubId(hubId);
    const hub = TR_LOGISTICS_HUBS.find((h) => h.id === hubId);
    if (!hub) return;
    setEnlemInput(String(hub.lat));
    setBoylamInput(String(hub.lng));
    setKonumAdiInput(hub.name);
  };

  const handleUseDeviceGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Tarayıcınız GPS konum servisini desteklemiyor.');
      return;
    }

    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocatingGps(false);
        const lat = Number(position.coords.latitude).toFixed(5);
        const lng = Number(position.coords.longitude).toFixed(5);
        setSelectedHubId('');
        setEnlemInput(String(lat));
        setBoylamInput(String(lng));
        if (!konumAdiInput.trim()) {
          setKonumAdiInput('Saha GPS Check-In');
        }
        toast.success('Cihaz GPS koordinatları alındı.');
      },
      (geoError) => {
        setLocatingGps(false);
        if (geoError?.code === 1) {
          toast.error('Konum izni reddedildi. Lütfen hızlı lojistik merkez seçin veya koordinat girin.');
        } else {
          toast.error('Cihaz GPS konumu alınamadı. Lütfen listeden bir merkez seçin.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  };

  const handleSubmitCheckIn = async (event) => {
    event.preventDefault();
    if (!checkInAracId || submittingCheckIn) return;

    const rawEnlem = String(enlemInput ?? '').trim();
    const rawBoylam = String(boylamInput ?? '').trim();
    const trimmedKonum = konumAdiInput.trim();

    if (rawEnlem === '' || rawBoylam === '') {
      toast.error('Enlem ve boylam alanları boş bırakılamaz.');
      return;
    }

    const enlem = Number(rawEnlem);
    const boylam = Number(rawBoylam);

    if (!Number.isFinite(enlem) || enlem < -90 || enlem > 90) {
      toast.error('Enlem -90 ile 90 derece arasında geçerli bir sayı olmalıdır.');
      return;
    }

    if (!Number.isFinite(boylam) || boylam < -180 || boylam > 180) {
      toast.error('Boylam -180 ile 180 derece arasında geçerli bir sayı olmalıdır.');
      return;
    }

    setSubmittingCheckIn(true);
    try {
      await aracService.aracKonumGuncelle(checkInAracId, {
        enlem,
        boylam,
        konum_adi: trimmedKonum ? trimmedKonum.slice(0, 160) : null,
      });
      await fetchAraclar();
      setActiveMapAracId(String(checkInAracId));
      setCheckInOpen(false);
      toast.success('Araç konumu güncellendi.');
    } catch (err) {
      notifyApiError(err, 'Araç konumu güncellenemedi.');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleOpenInFleet = useCallback(
    (arac) => {
      if (!arac?.arac_id) return;
      setSeciliAracId(String(arac.arac_id));
      navigate('/app/filo');
    },
    [navigate, setSeciliAracId]
  );

  const isFleetEmpty = hasLoaded && !loading && araclar.length === 0;
  const knownLocationCount = useMemo(
    () => filtreliAraclar.filter((a) => hasValidCoordinates(a)).length,
    [filtreliAraclar]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Harita</h1>
            {!isFleetEmpty && (
              <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                {knownLocationCount}/{filtreliAraclar.length} konum aktif
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Canlı filo konum takibi, Türkiye lojistik koridoru ve saha check-in bildirimleri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSingleVehicle && !isFleetEmpty && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
              <span className="tabular-nums">
                Tek araç görünümü
                {selectedGlobalVehicle?.plaka
                  ? ` · ${formatTurkishPlate(selectedGlobalVehicle.plaka)}`
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

          {!isFleetEmpty && (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => handleOpenCheckIn()}
            >
              <Navigation className="size-3.5" aria-hidden="true" />
              <span>Konum Bildir (Check-In)</span>
            </Button>
          )}
        </div>
      </div>

      {isFleetEmpty ? (
        canManage ? (
          <EmptyState
            icon={Truck}
            title="İlk aracınızı ekleyin"
            description="Filonuza ilk aracınızı ekleyerek Türkiye lojistik haritasında canlı konum ve saha check-in takibine başlayın."
            actionLabel="Araç Ekle"
            onAction={() => setVehicleSheetOpen(true)}
          />
        ) : (
          <EmptyState
            icon={MapPin}
            title="Henüz zimmetli aracınız yok"
            description="Filo yöneticiniz size bir araç zimmetlediğinde konum bildirimi ve harita görünümü burada açılacaktır."
          />
        )
      ) : (
        <FleetLiveMap
          araclar={filtreliAraclar}
          selectedAracId={activeMapAracId}
          onSelectArac={(id) => setActiveMapAracId(String(id))}
          onOpenCheckIn={handleOpenCheckIn}
          onOpenInFleet={handleOpenInFleet}
          loading={loading && !hasLoaded}
        />
      )}

      {/* Konum Bildir (Check-In) Dialogu */}
      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              <span>Konum Bildir (Check-In)</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Hızlı lojistik merkez seçin, cihaz GPS konumunuzu alın veya manuel koordinat girin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCheckIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="checkin-vehicle-select" className="text-xs">
                Araç Seçimi
              </Label>
              <Select value={checkInAracId} onValueChange={handleCheckInVehicleChange}>
                <SelectTrigger id="checkin-vehicle-select" className="h-9 text-xs">
                  <SelectValue placeholder="Araç seçin" />
                </SelectTrigger>
                <SelectContent>
                  {araclar.map((arac) => (
                    <SelectItem key={arac.arac_id} value={String(arac.arac_id)}>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatTurkishPlate(arac.plaka)}
                      </span>
                      <span className="ml-1.5 text-muted-foreground">
                        · {[arac.marka, arac.model].filter(Boolean).join(' ')}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="checkin-hub-select" className="text-xs">
                  Hızlı Lojistik Merkez Seçici (16 Merkez)
                </Label>
                <Select value={selectedHubId} onValueChange={handleSelectHub}>
                  <SelectTrigger id="checkin-hub-select" className="h-9 text-xs">
                    <SelectValue placeholder="Şehir / Lojistik Üs Seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TR_LOGISTICS_HUBS.map((hub) => (
                      <SelectItem key={hub.id} value={hub.id}>
                        <span>{hub.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={handleUseDeviceGps}
                disabled={locatingGps}
              >
                {locatingGps ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <LocateFixed className="size-3.5 text-primary" aria-hidden="true" />
                )}
                <span>Cihaz GPS Konumumu Al</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="checkin-lat-input" className="text-xs">
                  Enlem (-90 .. 90)
                </Label>
                <Input
                  id="checkin-lat-input"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  placeholder="Örn: 41.0082"
                  value={enlemInput}
                  onChange={(e) => setEnlemInput(e.target.value)}
                  className="h-9 font-mono text-xs tabular-nums"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkin-lng-input" className="text-xs">
                  Boylam (-180 .. 180)
                </Label>
                <Input
                  id="checkin-lng-input"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  placeholder="Örn: 28.9784"
                  value={boylamInput}
                  onChange={(e) => setBoylamInput(e.target.value)}
                  className="h-9 font-mono text-xs tabular-nums"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="checkin-location-name" className="text-xs">
                  Konum / Terminal Adı
                </Label>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {konumAdiInput.length}/160
                </span>
              </div>
              <Input
                id="checkin-location-name"
                type="text"
                maxLength={160}
                placeholder="Örn: Gebze Dilovası Lojistik Terminali - Peron 4"
                value={konumAdiInput}
                onChange={(e) => setKonumAdiInput(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCheckInOpen(false)}
                disabled={submittingCheckIn}
              >
                İptal
              </Button>
              <Button type="submit" size="sm" className="gap-1.5" disabled={submittingCheckIn}>
                {submittingCheckIn && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                <span>Konumu Kaydet</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {canManage && (
        <VehicleSheet
          open={vehicleSheetOpen}
          onOpenChange={setVehicleSheetOpen}
          arac={null}
        />
      )}
    </div>
  );
}
