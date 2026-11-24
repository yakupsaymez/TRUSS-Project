import React from 'react';
import { useTheme } from '@/components/theme-provider';
import { Badge } from '@/components/ui/badge';
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

export default function GenelTab() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Genel Tercihler</h2>
        <p className="text-xs text-muted-foreground">
          Çoklu dil, para birimi ve mil desteği yakında eklenecektir. Aktif standart: TR / TRY (₺) / KM.
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="settings-dil">Dil</Label>
            <Badge variant="secondary">Yakında</Badge>
          </div>
          <Select value="TR" disabled>
            <SelectTrigger id="settings-dil" className="w-full">
              <SelectValue placeholder="Dil seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TR">Türkçe (TR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="settings-para-birimi">Para Birimi</Label>
            <Badge variant="secondary">Yakında</Badge>
          </div>
          <Select value="TRY" disabled>
            <SelectTrigger id="settings-para-birimi" className="w-full">
              <SelectValue placeholder="Para birimi seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="settings-olcu-birimi">Ölçü Birimi</Label>
            <Badge variant="secondary">Yakında</Badge>
          </div>
          <Select value="KM" disabled>
            <SelectTrigger id="settings-olcu-birimi" className="w-full">
              <SelectValue placeholder="Ölçü birimi seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KM">Kilometre (KM)</SelectItem>
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
    </div>
  );
}
