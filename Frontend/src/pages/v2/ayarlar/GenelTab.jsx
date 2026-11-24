import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save } from 'lucide-react';
import api from '@/services/api';
import useAppStore from '@/store/useAppStore';
import { notifyApiError } from '@/utils/apiError';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { THEME_OPTIONS } from './ayarlarConstants';

export default function GenelTab({
  dil,
  setDil,
  paraBirimi,
  setParaBirimi,
  olcuBirimi,
  setOlcuBirimi,
}) {
  const { theme, setTheme } = useTheme();
  const [savingPreferences, setSavingPreferences] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    if (savingPreferences) return;
    setSavingPreferences(true);
    try {
      await api.put('/users/settings/preferences', {
        dil,
        para_birimi: paraBirimi,
        olcu_birimi: olcuBirimi,
      });
      await useAppStore.getState().syncPreferenceSummary(true);
      toast.success('Tercihler güncellendi.');
    } catch (err) {
      notifyApiError(err, 'Tercihler güncellenemedi.');
    } finally {
      if (mountedRef.current) setSavingPreferences(false);
    }
  };

  return (
    <form onSubmit={handleSavePreferences} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Genel Tercihler</h2>
        <p className="text-xs text-muted-foreground">
          Dil, para birimi, ölçü birimi ve arayüz temasını yapılandırın.
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="settings-dil">Dil</Label>
          <Select value={dil} onValueChange={setDil} disabled={savingPreferences}>
            <SelectTrigger id="settings-dil" className="w-full">
              <SelectValue placeholder="Dil seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TR">Türkçe (TR)</SelectItem>
              <SelectItem value="EN">İngilizce (EN)</SelectItem>
              <SelectItem value="RU">Rusça (RU)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="settings-para-birimi">Para Birimi</Label>
          <Select value={paraBirimi} onValueChange={setParaBirimi} disabled={savingPreferences}>
            <SelectTrigger id="settings-para-birimi" className="w-full">
              <SelectValue placeholder="Para birimi seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
              <SelectItem value="USD">ABD Doları ($)</SelectItem>
              <SelectItem value="EUR">Euro (€)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="settings-olcu-birimi">Ölçü Birimi</Label>
          <Select value={olcuBirimi} onValueChange={setOlcuBirimi} disabled={savingPreferences}>
            <SelectTrigger id="settings-olcu-birimi" className="w-full">
              <SelectValue placeholder="Ölçü birimi seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KM">Kilometre (KM)</SelectItem>
              <SelectItem value="MI">Mil (MI)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-2.5">
        <div className="space-y-0.5">
          <Label>Arayüz Teması</Label>
          <p className="text-xs text-muted-foreground">
            Tema seçimi tarayıcınızda anında uygulanır.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:max-w-md">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            return (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                onClick={() => setTheme(option.value)}
                aria-pressed={isSelected}
                className={cn(
                  'h-10 gap-2 text-xs font-medium',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{option.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" size="sm" disabled={savingPreferences} className="gap-2">
          {savingPreferences ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          <span>Tercihleri Kaydet</span>
        </Button>
      </div>
    </form>
  );
}
