import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSayacBirimEtiketi, isSmhArac, sayacAria } from '@/utils/sayacHatasi';
import { SheetField, SheetFormGrid } from '@/components/v2/AppSheet';
import SayacFieldError from '@/components/v2/SayacFieldError';
import DocVaultMultiField from '@/components/v2/doc-vault/DocVaultMultiField';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import {
  CHECKLIST_ITEMS,
  deriveOverallResult,
  HANDOVER_ACCEPT_ATTR,
  HANDOVER_MAX_PHOTOS,
  ITEM_STATUS_OPTIONS,
  OVERALL_RESULT_META,
} from './handoverConstants';

export default function HandoverChecklistFields({
  idPrefix = 'handover',
  arac = null,
  muayeneTarihi = '',
  onDateChange,
  dateError = null,
  sayacDegeri = '',
  onSayacChange,
  sayacFieldError = null,
  sayacLocalError = null,
  checklist = {},
  onChecklistChange,
  genelSonuc = 'TEMIZ',
  onGenelSonucChange,
  notlar = '',
  onNotlarChange,
  photoItems = [],
  photoUploading = false,
  photoError = null,
  photoDisabled = false,
  readOnly = false,
  onSelectPhoto,
  onRemovePhoto,
  onOpenPhoto,
  disabled = false,
}) {
  const isHour = isSmhArac(arac);
  const sayacBirim = getSayacBirimEtiketi(arac);
  const sayacErrorId = `${idPrefix}-sayac-error`;
  const hasSayacError = Boolean(sayacFieldError || sayacLocalError);
  const derivedResult = deriveOverallResult(checklist);
  const effectiveResult =
    derivedResult === 'KRITIK'
      ? 'KRITIK'
      : derivedResult === 'KUSURLU' && genelSonuc === 'TEMIZ'
        ? 'KUSURLU'
        : genelSonuc || derivedResult;
  const resultMeta = OVERALL_RESULT_META[effectiveResult] || OVERALL_RESULT_META.TEMIZ;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-3.5">
      <SheetFormGrid columns={2}>
        <SheetField label="Muayene Tarihi" htmlFor={`${idPrefix}-date`} required error={dateError}>
          <TrussDatePicker
            id={`${idPrefix}-date`}
            name="muayene_tarihi"
            value={muayeneTarihi}
            onChange={(e) => onDateChange?.(e?.target?.value ?? '')}
            disabled={disabled || readOnly}
          />
        </SheetField>

        <SheetField label={`Sayaç (${sayacBirim})`} htmlFor={`${idPrefix}-sayac`} required>
          <Input
            id={`${idPrefix}-sayac`}
            type="number"
            min="0"
            step={isHour ? '0.1' : '1'}
            value={sayacDegeri}
            disabled={disabled || readOnly}
            onChange={(e) => onSayacChange?.(e.target.value)}
            placeholder={isHour ? 'Örn: 1240.5' : 'Örn: 48500'}
            aria-invalid={hasSayacError || undefined}
            {...sayacAria(sayacFieldError, sayacErrorId)}
            className={cn('font-mono tabular-nums', hasSayacError && 'border-destructive focus-visible:border-destructive')}
          />
          {sayacLocalError && !sayacFieldError && (
            <p role="alert" className="text-xs font-medium text-destructive">{sayacLocalError}</p>
          )}
          <SayacFieldError id={sayacErrorId} hata={sayacFieldError} />
        </SheetField>
      </SheetFormGrid>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">8 Kalem Kontrol Listesi</span>
          <Badge variant="outline" className={cn('text-[11px]', resultMeta.badgeClass)}>
            Sonuç: {resultMeta.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CHECKLIST_ITEMS.map((item) => {
            const current = checklist[item.key] || 'OK';
            return (
              <div key={item.key} className="space-y-1.5 rounded-lg border border-border bg-card px-2.5 py-2">
                <span className="block truncate text-xs font-medium text-foreground">{item.label}</span>
                <div className="grid grid-cols-3 gap-1" role="group" aria-label={item.label}>
                  {ITEM_STATUS_OPTIONS.map((opt) => {
                    const active = current === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={disabled || readOnly}
                        onClick={() => onChecklistChange?.(item.key, opt.value)}
                        className={cn(
                          'rounded-md border px-1.5 py-1 text-[11px] font-medium transition-colors',
                          active
                            ? opt.activeClass
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SheetField label="Genel Sonuç" htmlFor={`${idPrefix}-sonuc`}>
        <Select
          value={effectiveResult}
          disabled={disabled || readOnly || derivedResult === 'KRITIK'}
          onValueChange={(v) => onGenelSonucChange?.(v)}
        >
          <SelectTrigger id={`${idPrefix}-sonuc`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TEMIZ" disabled={derivedResult !== 'TEMIZ'}>Temiz</SelectItem>
            <SelectItem value="KUSURLU">Kusurlu (İş Emri Açar)</SelectItem>
            <SelectItem value="KRITIK">Kritik (Kritik İş Emri Açar)</SelectItem>
          </SelectContent>
        </Select>
      </SheetField>

      {effectiveResult !== 'TEMIZ' && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-[11px] text-foreground">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-status-warning" aria-hidden="true" />
          <span>Kusurlu veya kritik sonuç kaydedildiğinde otomatik olarak arıza iş emri oluşturulur.</span>
        </div>
      )}

      <SheetField label="Muayene Notları" htmlFor={`${idPrefix}-notlar`}>
        <Textarea
          id={`${idPrefix}-notlar`}
          rows={2}
          maxLength={2000}
          disabled={disabled || readOnly}
          value={notlar}
          onChange={(e) => onNotlarChange?.(e.target.value)}
          placeholder="Gözlemler, hasar/eksik detayları (opsiyonel)"
          className="resize-none"
        />
      </SheetField>

      <DocVaultMultiField
        id={`${idPrefix}-photos`}
        label="Muayene Görselleri"
        hint="En fazla 4 görsel · JPG, PNG veya WebP (maks. 10 MB)"
        accept={HANDOVER_ACCEPT_ATTR}
        maxFiles={HANDOVER_MAX_PHOTOS}
        items={photoItems}
        uploading={photoUploading}
        error={photoError}
        disabled={disabled || photoDisabled}
        readOnly={readOnly}
        onSelectFile={onSelectPhoto}
        onRemoveItem={onRemovePhoto}
        onOpenItem={onOpenPhoto}
      />
    </div>
  );
}
