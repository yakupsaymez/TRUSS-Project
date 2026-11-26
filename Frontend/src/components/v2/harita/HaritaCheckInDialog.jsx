import React from 'react';
import { Loader2, LocateFixed, MapPin } from 'lucide-react';
import { formatTurkishPlate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TR_LOGISTICS_HUBS } from './haritaUtils';

export default function HaritaCheckInDialog({
  open, onOpenChange, activeVehicles = [], checkInForm, onFieldChange,
  onVehicleChange, onSelectHub, locatingGps, onUseDeviceGps, isSubmitting, onSubmit,
}) {
  const blockWhileSubmitting = (event) => { if (isSubmitting) event.preventDefault(); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={blockWhileSubmitting} onEscapeKeyDown={blockWhileSubmitting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            <span>Konum Bildir (Check-In)</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Hızlı lojistik merkez seçin, cihaz GPS konumunuzu alın veya manuel koordinat girin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="checkin-vehicle-select" className="text-xs">Araç Seçimi</Label>
            <Select value={checkInForm.aracId} onValueChange={onVehicleChange} disabled={isSubmitting}>
              <SelectTrigger id="checkin-vehicle-select" className="h-9 text-xs">
                <SelectValue placeholder="Araç seçin" />
              </SelectTrigger>
              <SelectContent>
                {activeVehicles.map((arac) => (
                  <SelectItem key={arac.arac_id} value={String(arac.arac_id)}>
                    <span className="font-mono font-semibold tabular-nums">{formatTurkishPlate(arac.plaka)}</span>
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
              <Label htmlFor="checkin-hub-select" className="text-xs">Hızlı Lojistik Merkez Seçici (16 Merkez)</Label>
              <Select value={checkInForm.hubId} onValueChange={onSelectHub} disabled={isSubmitting}>
                <SelectTrigger id="checkin-hub-select" className="h-9 text-xs">
                  <SelectValue placeholder="Şehir / Lojistik Üs Seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {TR_LOGISTICS_HUBS.map((hub) => (
                    <SelectItem key={hub.id} value={hub.id}><span>{hub.name}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={onUseDeviceGps} disabled={locatingGps || isSubmitting}>
              {locatingGps ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <LocateFixed className="size-3.5 text-primary" aria-hidden="true" />}
              <span>Cihaz GPS Konumumu Al</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="checkin-lat-input" className="text-xs">Enlem (-90 .. 90)</Label>
              <Input
                id="checkin-lat-input" type="number" step="any" min={-90} max={90} placeholder="Örn: 41.0082"
                value={checkInForm.enlem} onChange={(e) => onFieldChange('enlem', e.target.value)}
                className="h-9 font-mono text-xs tabular-nums" disabled={isSubmitting} required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="checkin-lng-input" className="text-xs">Boylam (-180 .. 180)</Label>
              <Input
                id="checkin-lng-input" type="number" step="any" min={-180} max={180} placeholder="Örn: 28.9784"
                value={checkInForm.boylam} onChange={(e) => onFieldChange('boylam', e.target.value)}
                className="h-9 font-mono text-xs tabular-nums" disabled={isSubmitting} required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="checkin-location-name" className="text-xs">Konum / Terminal Adı</Label>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{checkInForm.konumAdi.length}/160</span>
            </div>
            <Input
              id="checkin-location-name" type="text" maxLength={160} placeholder="Örn: Gebze Dilovası Lojistik Terminali - Peron 4"
              value={checkInForm.konumAdi} onChange={(e) => onFieldChange('konumAdi', e.target.value)}
              className="h-9 text-xs" disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              İptal
            </Button>
            <Button type="submit" size="sm" className="gap-1.5" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              <span>Konumu Kaydet</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
