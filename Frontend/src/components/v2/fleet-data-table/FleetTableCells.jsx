import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Loader2,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { EVRAK_UYARI_GUN } from '@/utils/aracDurum';
import { formatLocaleNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function SortableHeader({ column, label, align = 'left' }) {
  const sorted = column.getIsSorted();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'h-8 gap-1.5 px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground',
        align === 'right' && 'ml-auto flex-row-reverse'
      )}
    >
      <span>{label}</span>
      {sorted === 'asc' ? (
        <ArrowUp className="size-3.5 text-primary" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3.5 text-primary" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-60" />
      )}
    </Button>
  );
}

export function FleetDocumentCell({ docSummary }) {
  const { items, nearest } = docSummary;

  let badgeEl;
  if (!nearest) {
    badgeEl = (
      <Badge variant="outline" className="text-muted-foreground">
        Evrak Yok
      </Badge>
    );
  } else if (nearest.gun < 0) {
    badgeEl = (
      <Badge variant="destructive" className="tabular-nums">
        {Math.abs(nearest.gun)}g gecikti · {nearest.ad}
      </Badge>
    );
  } else if (nearest.gun <= EVRAK_UYARI_GUN) {
    badgeEl = (
      <Badge
        variant="outline"
        className="border-status-warning/40 bg-status-warning/10 text-status-warning tabular-nums"
      >
        {nearest.gun}g kaldı · {nearest.ad}
      </Badge>
    );
  } else {
    badgeEl = (
      <Badge variant="secondary" className="text-muted-foreground tabular-nums">
        {nearest.gun}g kaldı · {nearest.ad}
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex cursor-default flex-col items-start gap-1">
          {badgeEl}
          <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
            {items.map((doc) => (
              <span key={doc.key}>
                {doc.short}: {doc.formatted}
              </span>
            ))}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex-col items-stretch space-y-1 text-xs">
        {items.map((doc) => (
          <div
            key={doc.key}
            className="flex items-center justify-between gap-4 tabular-nums"
          >
            <span className="font-medium">{doc.ad}:</span>
            <span>
              {doc.formatted}
              {doc.gun !== null
                ? doc.gun < 0
                  ? ` (${Math.abs(doc.gun)}g gecikti)`
                  : ` (${doc.gun}g kaldı)`
                : ''}
            </span>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

export function FleetMaintenanceCell({ bakim, periyot }) {
  const { durum, kalan, birim } = bakim;

  if (durum === 'bilinmiyor' || kalan === null) {
    return (
      <div className="flex w-44 flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Bakım kaydı yok</span>
        </div>
        <Progress value={0} className="h-1.5 bg-muted" />
        <span className="text-[11px] tabular-nums text-muted-foreground">
          Periyot: {formatLocaleNumber(periyot, 0)} {birim}
        </span>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, Math.round((kalan / periyot) * 100)));
  const isTehlike = durum === 'tehlike';
  const isUyari = durum === 'uyari';

  return (
    <div className="flex w-44 flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
        <span
          className={cn(
            'font-medium',
            isTehlike
              ? 'text-destructive'
              : isUyari
                ? 'text-primary'
                : 'text-foreground'
          )}
        >
          {isTehlike
            ? `${formatLocaleNumber(Math.abs(kalan), 0)} ${birim} aşıldı`
            : `${formatLocaleNumber(kalan, 0)} ${birim} kaldı`}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          %{pct}
        </span>
      </div>
      <Progress
        value={isTehlike ? 100 : pct}
        className={cn(
          'h-1.5 bg-muted',
          isTehlike
            ? '[&_[data-slot=progress-indicator]]:bg-destructive'
            : '[&_[data-slot=progress-indicator]]:bg-primary'
        )}
      />
      <span className="text-[11px] tabular-nums text-muted-foreground">
        Periyot: {formatLocaleNumber(periyot, 0)} {birim}
      </span>
    </div>
  );
}

export function FleetRowActions({
  arac,
  formattedPlaka,
  canManage,
  isArchivedView = false,
  restoringId = null,
  onDetail,
  onEditClick,
  onDeleteRequest,
  onRestoreClick,
}) {
  if (isArchivedView) {
    if (!canManage) {
      return <span className="block text-right text-xs text-muted-foreground">—</span>;
    }
    const isRestoring = restoringId !== null && String(restoringId) === String(arac.arac_id);
    return (
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={restoringId !== null}
          onClick={() => onRestoreClick?.(arac)}
          className="h-8 gap-1.5 px-2.5 text-xs"
        >
          {isRestoring ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          <span>Geri Yükle</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onDetail?.(arac)}
        className="h-8 gap-1 px-2 text-xs"
      >
        <span>Detay</span>
        <ExternalLink className="size-3.5" />
      </Button>

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${formattedPlaka} işlemleri`}
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => onEditClick?.(arac)}>
                <Pencil className="size-4" />
                <span>Düzenle</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDeleteRequest?.(arac)}
              >
                <Trash2 className="size-4" />
                <span>Arşivle / Sil</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
