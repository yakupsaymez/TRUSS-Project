import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { getTodayIso } from '@/utils/dateUtils';
import { formatTurkishPlate } from '@/utils/formatters';
import { sayacAria } from '@/utils/sayacHatasi';
import { cn } from '@/lib/utils';
import SayacFieldError from '@/components/v2/SayacFieldError';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { isHourOdometer } from './workOrderConstants';

function buildCompleteForm(record, arac) {
  if (!record) {
    return { tarih: getTodayIso(), sayac_degeri: '', tutar: '', servis_adi: '', islem_tipi: '', fatura_no: '', sifirla_parcalar: false, notlar: '' };
  }
  const isHour = isHourOdometer(record.sayac_tipi || arac?.sayac_tipi);
  const rawSayac = record.bildirilen_sayac ?? arac?.guncel_sayac ?? (isHour ? arac?.guncel_calisma_saati : arac?.guncel_km) ?? '';
  let sayacStr = '';
  if (rawSayac !== '' && rawSayac !== null && rawSayac !== undefined) {
    const n = Number(rawSayac);
    if (Number.isFinite(n)) sayacStr = String(isHour ? n : Math.round(n));
  }
  const hasCost = record.tahmini_maliyet !== null && record.tahmini_maliyet !== undefined && record.tahmini_maliyet !== '';
  return {
    tarih: getTodayIso(), sayac_degeri: sayacStr,
    tutar: hasCost ? String(Number(record.tahmini_maliyet)) : '',
    servis_adi: record.servis_adi || '',
    islem_tipi: record.kategori === 'periyodik_bakim' ? 'Periyodik Bakım' : (record.baslik || '').slice(0, 150),
    fatura_no: '', sifirla_parcalar: false, notlar: '',
  };
}

export default function WorkOrderCompleteDialog({ record, araclar = [], submitting = false, onOpenChange, onComplete }) {
  const arac = useMemo(() => araclar.find((a) => String(a.arac_id) === String(record?.arac_id)) || null, [araclar, record?.arac_id]);
  const isHour = isHourOdometer(record?.sayac_tipi || arac?.sayac_tipi);

  const [form, setForm] = useState(() => buildCompleteForm(record, arac));
  const [sayacHatasi, setSayacHatasi] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!record) return;
    setForm(buildCompleteForm(record, arac));
    setSayacHatasi(null);
    setErrors({});
  }, [record, arac]);

  const updateField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    if (key === 'tarih' || key === 'sayac_degeri') setSayacHatasi(null);
  };

  const handleOpenChange = (nextOpen) => {
    if (submitting && !nextOpen) return;
    if (!nextOpen) onOpenChange?.(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!record || submitting) return;

    const nextErr = {};
    if (!form.tarih) nextErr.tarih = 'Tamamlama tarihi zorunludur.';
    const sayacRaw = String(form.sayac_degeri ?? '').trim();
    const sayacNum = Number(sayacRaw);
    if (sayacRaw === '' || !Number.isFinite(sayacNum) || sayacNum < 0) nextErr.sayac_degeri = 'Geçerli bir sayaç değeri girin.';
    else if (!isHour && !Number.isInteger(sayacNum)) nextErr.sayac_degeri = 'KM sayaçlı araçlarda sayaç tam sayı olmalıdır.';

    const tutarRaw = String(form.tutar ?? '').trim();
    const tutarNum = Number(tutarRaw);
    if (tutarRaw === '' || !Number.isFinite(tutarNum) || tutarNum < 0) nextErr.tutar = 'Geçerli bir tutar girin (0 veya pozitif).';
    if (Object.keys(nextErr).length > 0) { setErrors(nextErr); return; }

    const res = await onComplete(record.is_emri_id, {
      tarih: form.tarih, sayac_degeri: sayacNum, tutar: tutarNum,
      islem_tipi: form.islem_tipi.trim() || undefined,
      servis_adi: form.servis_adi.trim() || undefined,
      fatura_no: form.fatura_no.trim() || undefined,
      notlar: form.notlar.trim() || undefined,
      sifirla_parcalar: Boolean(form.sifirla_parcalar),
    });
    if (res && !res.ok && res.sayacHatasi) setSayacHatasi(res.sayacHatasi);
  };

  const hasSayacErr = Boolean(sayacHatasi || errors.sayac_degeri);

  return (
    <Dialog open={Boolean(record)} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!submitting}
        onPointerDownOutside={(e) => submitting && e.preventDefault()}
        onInteractOutside={(e) => submitting && e.preventDefault()}
        onEscapeKeyDown={(e) => submitting && e.preventDefault()}
        className="max-h-[90dvh] overflow-y-auto border-border bg-card sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CheckCircle2 className="size-4 text-status-success" aria-hidden="true" />
            <span>İş Emrini Tamamla & Bakıma Dönüştür</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {record ? (
              <>
                <span className="font-mono font-medium text-foreground tabular-nums">{formatTurkishPlate(record.plaka || '')}</span> · {record.baslik}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wo-complete-tarih" className="text-xs font-medium text-foreground">Bakım Tarihi <span className="text-destructive">*</span></Label>
              <TrussDatePicker id="wo-complete-tarih" name="tarih" value={form.tarih} onChange={(e) => updateField('tarih', e?.target?.value ?? '')} placeholder="Tarih seçin" className="w-full" />
              {errors.tarih && <p role="alert" className="text-xs font-medium text-destructive">{errors.tarih}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-complete-sayac" className="text-xs font-medium text-foreground">Sayaç ({isHour ? 'SMH' : 'KM'}) <span className="text-destructive">*</span></Label>
              <Input
                id="wo-complete-sayac" type="number" min="0" step={isHour ? '0.1' : '1'}
                value={form.sayac_degeri} onChange={(e) => updateField('sayac_degeri', e.target.value)}
                aria-invalid={hasSayacErr || undefined} {...sayacAria(sayacHatasi, 'wo-complete-sayac-error')}
                className={cn('font-mono tabular-nums', hasSayacErr && 'border-destructive focus-visible:border-destructive')}
              />
              {errors.sayac_degeri && !sayacHatasi && <p role="alert" className="text-xs font-medium text-destructive">{errors.sayac_degeri}</p>}
              <SayacFieldError id="wo-complete-sayac-error" hata={sayacHatasi} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wo-complete-tutar" className="text-xs font-medium text-foreground">Gerçekleşen Tutar (₺) <span className="text-destructive">*</span></Label>
              <Input id="wo-complete-tutar" type="number" min="0" step="0.01" value={form.tutar} onChange={(e) => updateField('tutar', e.target.value)} placeholder="0.00" className="font-mono tabular-nums" />
              {errors.tutar && <p role="alert" className="text-xs font-medium text-destructive">{errors.tutar}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-complete-servis" className="text-xs font-medium text-foreground">Servis Adı</Label>
              <Input id="wo-complete-servis" maxLength={120} value={form.servis_adi} onChange={(e) => updateField('servis_adi', e.target.value)} placeholder="Opsiyonel" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wo-complete-tip" className="text-xs font-medium text-foreground">Bakım İşlem Tipi</Label>
              <Input id="wo-complete-tip" maxLength={150} value={form.islem_tipi} onChange={(e) => updateField('islem_tipi', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-complete-fatura" className="text-xs font-medium text-foreground">Fatura No</Label>
              <Input id="wo-complete-fatura" maxLength={80} value={form.fatura_no} onChange={(e) => updateField('fatura_no', e.target.value)} placeholder="Opsiyonel" className="font-mono tabular-nums" />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs">
            <Checkbox checked={form.sifirla_parcalar} onCheckedChange={(checked) => updateField('sifirla_parcalar', Boolean(checked))} />
            <span className="font-medium text-foreground">Kritik/yaklaşan parça sayaçlarını bu bakım kilometresine sıfırla</span>
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="wo-complete-notlar" className="text-xs font-medium text-foreground">Servis Notları</Label>
            <Textarea id="wo-complete-notlar" rows={2} maxLength={2000} value={form.notlar} onChange={(e) => updateField('notlar', e.target.value)} placeholder="Yapılan işlemler, değişen parçalar (opsiyonel)" className="resize-none" />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => handleOpenChange(false)}>Vazgeç</Button>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="size-4 animate-spin" />}<span>Tamamla ve Kaydet</span></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
