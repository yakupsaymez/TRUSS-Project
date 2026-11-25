import React from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Pencil, Wrench, XCircle } from 'lucide-react';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/v2/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DURUM_META, formatWoDate, isHourOdometer, KATEGORI_LABELS, ONCELIK_META, WORK_ORDER_PAGE_SIZE } from './workOrderConstants';

function RowActions({ row, canManage, currentUserId, onTakeToService, onEdit, onComplete, onCancel }) {
  const isOpen = row.durum === 'acik';
  const isService = row.durum === 'serviste';
  const isOwner = Number(row.acan_user_id) === Number(currentUserId);

  if (canManage && (isOpen || isService)) {
    return (
      <div className="flex flex-wrap justify-end gap-1">
        {isOpen ? (
          <Button type="button" variant="outline" size="xs" onClick={() => onTakeToService(row)} className="h-7 gap-1 px-2 text-[11px]">
            <Wrench className="size-3" /><span>Servise Al</span>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="xs" onClick={() => onEdit(row)} className="h-7 gap-1 px-2 text-[11px]">
            <Pencil className="size-3" /><span>Düzenle</span>
          </Button>
        )}
        <Button type="button" variant="default" size="xs" onClick={() => onComplete(row)} className="h-7 gap-1 px-2 text-[11px]">
          <CheckCircle2 className="size-3" /><span>Tamamla</span>
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={() => onCancel(row)} className="h-7 gap-1 px-2 text-[11px] text-destructive hover:text-destructive">
          <XCircle className="size-3" /><span>İptal Et</span>
        </Button>
      </div>
    );
  }
  if (!canManage && isOpen && isOwner) {
    return (
      <Button type="button" variant="ghost" size="xs" onClick={() => onCancel(row)} className="h-7 gap-1 px-2 text-[11px] text-destructive hover:text-destructive">
        <XCircle className="size-3" /><span>İptal Et</span>
      </Button>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

export default function WorkOrderTable({
  rows, toplam, offset, loading, hasLoaded, hasActiveFilters,
  canManage, canViewFinance, canCreate, currentUserId,
  onClearFilters, onCreateClick, onTakeToService, onEdit, onComplete, onCancel, onPageChange,
}) {
  const rangeStart = toplam === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + rows.length, toplam);

  if (loading && (!hasLoaded || rows.length === 0)) {
    return (
      <Card className="space-y-3 border-border bg-card p-4">
        {Array.from({ length: 5 }).map((_, idx) => <Skeleton key={`wo-skel-${idx}`} className="h-12 w-full rounded-lg" />)}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border bg-card">
      {rows.length === 0 ? (
        <EmptyState
          variant="table" icon={ClipboardList}
          title={hasActiveFilters ? 'Filtreye uygun iş emri bulunamadı' : 'Henüz iş emri kaydı yok'}
          description={hasActiveFilters
            ? 'Seçili durum, öncelik veya kategori filtrelerini temizleyerek tüm kayıtları görebilirsiniz.'
            : 'Araç arızaları veya planlı bakım talepleri için yeni bir iş emri oluşturabilirsiniz.'}
          actionLabel={!hasActiveFilters && canCreate ? 'Yeni Talep' : undefined}
          onAction={!hasActiveFilters && canCreate ? onCreateClick : undefined}
          secondaryActionLabel={hasActiveFilters ? 'Filtreleri Temizle' : undefined}
          onSecondaryAction={hasActiveFilters ? onClearFilters : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs font-semibold text-muted-foreground">Araç</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">İş Emri</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Kategori / Öncelik</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Durum</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Sayaç / Servis</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Plan / Açan</TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const durumMeta = DURUM_META[row.durum] || { label: row.durum, className: 'border-border bg-muted text-foreground' };
              const oncelikMeta = ONCELIK_META[row.oncelik] || { label: row.oncelik, className: 'border-border bg-muted text-foreground' };
              const isHour = isHourOdometer(row.sayac_tipi);
              const maliyetVal = row.gerceklesen_maliyet ?? row.tahmini_maliyet;
              return (
                <TableRow key={row.is_emri_id}>
                  <TableCell className="align-top">
                    <div className="font-mono text-xs font-semibold text-foreground tabular-nums">{formatTurkishPlate(row.plaka || '')}</div>
                    <div className="text-[11px] text-muted-foreground">{[row.marka, row.model].filter(Boolean).join(' ') || '—'}</div>
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal align-top">
                    <div className="text-xs font-medium text-foreground">{row.baslik}</div>
                    {row.aciklama && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{row.aciklama}</p>}
                    {row.durum === 'tamamlandi' && row.olusulan_bakim_id && (
                      <span className="mt-1 inline-block font-mono text-[11px] text-status-success tabular-nums">Bakım #{row.olusulan_bakim_id}</span>
                    )}
                    {row.durum === 'iptal' && row.red_iptal_nedeni && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Neden: {row.red_iptal_nedeni}</p>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">{KATEGORI_LABELS[row.kategori] || row.kategori}</Badge>
                      <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-medium', oncelikMeta.className)}>{oncelikMeta.label}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline" className={cn('h-5 px-2 text-[11px] font-medium', durumMeta.className)}>{durumMeta.label}</Badge>
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    {row.bildirilen_sayac != null && row.bildirilen_sayac !== '' ? (
                      <div className="font-mono text-foreground tabular-nums">{formatLocaleNumber(row.bildirilen_sayac, isHour ? 1 : 0)} {isHour ? 'SMH' : 'KM'}</div>
                    ) : <span className="text-muted-foreground">—</span>}
                    {row.servis_adi && <div className="text-[11px] text-muted-foreground">{row.servis_adi}</div>}
                    {canViewFinance && maliyetVal != null && maliyetVal !== '' && (
                      <div className="font-mono text-[11px] font-medium text-foreground tabular-nums">{formatCurrency(maliyetVal, { maximumFractionDigits: 2 })}</div>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-[11px] text-muted-foreground">
                    <div className="font-mono text-foreground tabular-nums">{formatWoDate(row.planlanan_tarih)}</div>
                    <div>{row.acan_ad_soyad || '—'}</div>
                    <div className="font-mono tabular-nums">{formatWoDate(row.olusturma_tarihi)}</div>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <RowActions
                      row={row} canManage={canManage} currentUserId={currentUserId}
                      onTakeToService={onTakeToService} onEdit={onEdit} onComplete={onComplete} onCancel={onCancel}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {toplam > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatLocaleNumber(rangeStart, 0)}–{formatLocaleNumber(rangeEnd, 0)} / {formatLocaleNumber(toplam, 0)}
          </span>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={loading || offset === 0} onClick={() => onPageChange(Math.max(0, offset - WORK_ORDER_PAGE_SIZE))} className="h-8 gap-1 px-2.5 text-xs">
              <ChevronLeft className="size-3.5" /><span>Önceki</span>
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={loading || offset + WORK_ORDER_PAGE_SIZE >= toplam} onClick={() => onPageChange(offset + WORK_ORDER_PAGE_SIZE)} className="h-8 gap-1 px-2.5 text-xs">
              <span>Sonraki</span><ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
