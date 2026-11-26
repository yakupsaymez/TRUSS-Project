import React from 'react';
import { BarChart3, ChevronDown, Download, Loader2, ReceiptText, Wrench } from 'lucide-react';
import { canAccessChannel } from '@/components/v2/channelAccess';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ExecExportMenu({
  user,
  donemGun = 90,
  isSingleVehicle = false,
  exportingKey = null,
  onExport,
}) {
  if (!canAccessChannel(user, 'analytics')) return null;

  const isExporting = Boolean(exportingKey);

  const items = [
    { key: 'filo-maliyet', label: 'Filo TCO & Maliyet CSV', hint: `Son ${donemGun} gün birim maliyet & skor`, icon: BarChart3 },
    { key: 'hareketler', label: 'Hareket Defteri CSV', hint: isSingleVehicle ? 'Seçili araç · tüm hareketler' : 'Tüm yakıt & bakım hareketleri', icon: ReceiptText },
    { key: 'is-emirleri', label: 'İş Emirleri CSV', hint: isSingleVehicle ? 'Seçili araç · tüm durumlar' : 'Tüm bakım & servis emirleri', icon: Wrench },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isExporting}
          className="h-8 gap-1.5 border-border bg-card text-xs text-foreground hover:bg-muted/50"
        >
          {isExporting ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : (
            <Download className="size-3.5 text-muted-foreground" aria-hidden="true" />
          )}
          <span>{isExporting ? 'Aktarılıyor...' : 'CSV Dışa Aktar'}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl border border-border bg-card p-1.5 text-foreground shadow-md"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
          Yönetici CSV Raporları
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = exportingKey === item.key;
          return (
            <DropdownMenuItem
              key={item.key}
              disabled={isExporting}
              onSelect={() => onExport?.(item.key)}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs text-foreground focus:bg-muted/60 focus:text-foreground"
            >
              {isActive ? (
                <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight text-foreground">{item.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground tabular-nums">
                  {item.hint}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
