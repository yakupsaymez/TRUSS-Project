import React, { useEffect, useMemo, useState } from 'react';
import { formatTurkishPlate } from '@/utils/formatters';
import AppSheet, { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import { DURUM_META, isHourOdometer, KATEGORI_OPTIONS, ONCELIK_OPTIONS } from './workOrderConstants';

function buildInitialForm({ mode, record, defaultDurum, araclar, defaultAracId }) {
  if (mode === 'edit' && record) {
    const isHour = isHourOdometer(record.sayac_tipi);
    const hasSayac = record.bildirilen_sayac !== null && record.bildirilen_sayac !== undefined && record.bildirilen_sayac !== '';
    const hasCost = record.tahmini_maliyet !== null && record.tahmini_maliyet !== undefined && record.tahmini_maliyet !== '';
    return {
      arac_id: String(record.arac_id),
      baslik: record.baslik || '',
      kategori: record.kategori || 'ariza',
      oncelik: record.oncelik || 'normal',
      durum: defaultDurum || record.durum || 'acik',
      bildirilen_sayac: hasSayac ? String(isHour ? Number(record.bildirilen_sayac) : Math.round(Number(record.bildirilen_sayac))) : '',
      aciklama: record.aciklama || '',
      servis_adi: record.servis_adi || '',
      tahmini_maliyet: hasCost ? String(Number(record.tahmini_maliyet)) : '',
      planlanan_tarih: record.planlanan_tarih ? String(record.planlanan_tarih).slice(0, 10) : '',
    };
  }
  const initialAracId = defaultAracId && defaultAracId !== 'tum' ? String(defaultAracId) : (araclar[0]?.arac_id ? String(araclar[0].arac_id) : '');
  return {
    arac_id: initialAracId, baslik: '', kategori: 'ariza', oncelik: 'normal', durum: 'acik',
    bildirilen_sayac: '', aciklama: '', servis_adi: '', tahmini_maliyet: '', planlanan_tarih: '',
  };
}

export default function WorkOrderFormSheet({
  open, onOpenChange, mode = 'create', record = null, defaultDurum = null,
  araclar = [], defaultAracId = 'tum', canManage = false, submitting = false, onCreate, onUpdate,
}) {
  const [form, setForm] = useState(() => buildInitialForm({ mode, record, defaultDurum, araclar, defaultAracId }));
  const [initialJson, setInitialJson] = useState('');
  const [errors, setErrors] = useState({});
  const isEdit = mode === 'edit' && Boolean(record);

  useEffect(() => {
    if (!open) return;
    const init = buildInitialForm({ mode, record, defaultDurum, araclar, defaultAracId });
    setForm(init);
    setInitialJson(JSON.stringify(init));
    setErrors({});
  }, [open, mode, record, defaultDurum, araclar, defaultAracId]);

  const selectedVehicle = useMemo(
    () => araclar.find((a) => String(a.arac_id) === String(form.arac_id)) || null,
    [araclar, form.arac_id]
  );
  const isHour = isHourOdometer(record?.sayac_tipi || selectedVehicle?.sayac_tipi);
  const isDirty = open && JSON.stringify(form) !== initialJson;
  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErr = {};
    if (!isEdit && !form.arac_id) nextErr.arac_id = 'Araç seçimi zorunludur.';
    if (form.baslik.trim().length < 2) nextErr.baslik = 'Başlık en az 2 karakter olmalıdır.';
    const sayacRaw = String(form.bildirilen_sayac ?? '').trim();
    if (sayacRaw !== '') {
      const sNum = Number(sayacRaw);
      if (!Number.isFinite(sNum) || sNum < 0) nextErr.bildirilen_sayac = 'Geçerli bir sayaç değeri girin.';
    }
    const costRaw = String(form.tahmini_maliyet ?? '').trim();
    if (canManage && costRaw !== '') {
      const cNum = Number(costRaw);
      if (!Number.isFinite(cNum) || cNum < 0) nextErr.tahmini_maliyet = 'Geçerli bir maliyet tutarı girin.';
    }
    if (Object.keys(nextErr).length > 0) { setErrors(nextErr); return; }

    const trimmedAciklama = form.aciklama.trim();
    const trimmedServis = form.servis_adi.trim();
    if (!isEdit) {
      const payload = {
        arac_id: Number(form.arac_id), baslik: form.baslik.trim(), kategori: form.kategori, oncelik: form.oncelik,
        aciklama: trimmedAciklama || undefined,
        bildirilen_sayac: sayacRaw !== '' ? Number(sayacRaw) : undefined,
      };
      if (canManage) {
        payload.servis_adi = trimmedServis || undefined;
        payload.tahmini_maliyet = costRaw !== '' ? Number(costRaw) : undefined;
        payload.planlanan_tarih = form.planlanan_tarih || undefined;
      }
      await onCreate(payload);
      return;
    }

    const patchPayload = {
      baslik: form.baslik.trim(), kategori: form.kategori, oncelik: form.oncelik,
      aciklama: trimmedAciklama || null,
      bildirilen_sayac: sayacRaw !== '' ? Number(sayacRaw) : null,
      servis_adi: trimmedServis || null,
      tahmini_maliyet: costRaw !== '' ? Number(costRaw) : null,
      planlanan_tarih: form.planlanan_tarih || null,
    };
    if (record.durum === 'acik' && form.durum === 'serviste') patchPayload.durum = 'serviste';
    await onUpdate(record.is_emri_id, patchPayload);
  };

  return (
    <AppSheet
      open={open} onOpenChange={onOpenChange}
      title={isEdit ? 'İş Emrini Güncelle' : 'Yeni İş Emri Talebi'}
      description={isEdit ? 'Servis planlaması, durum ve maliyet bilgilerini güncelleyin.' : 'Arıza, bakım veya servis talebi oluşturun.'}
      badge={isEdit && record ? formatTurkishPlate(record.plaka || '') : undefined}
      submitLabel={isEdit ? 'Güncelle' : 'Talep Oluştur'} isSubmitting={submitting} isDirty={isDirty} onSubmit={handleSubmit}
    >
      <SheetFormSection title="Talep Bilgileri">
        <SheetField label="Araç" htmlFor="wo-arac" required={!isEdit} error={errors.arac_id}>
          {isEdit ? (
            <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 font-mono text-xs font-medium text-foreground tabular-nums">
              {formatTurkishPlate(record?.plaka || '')} · {[record?.marka, record?.model].filter(Boolean).join(' ')}
            </div>
          ) : (
            <Select value={form.arac_id} onValueChange={(v) => setField('arac_id', v)}>
              <SelectTrigger id="wo-arac" className="w-full"><SelectValue placeholder="Araç seçin" /></SelectTrigger>
              <SelectContent>
                {araclar.map((a) => <SelectItem key={a.arac_id} value={String(a.arac_id)}>{formatTurkishPlate(a.plaka)} — {a.marka} {a.model}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </SheetField>
        <SheetField label="Başlık" htmlFor="wo-baslik" required error={errors.baslik}>
          <Input id="wo-baslik" value={form.baslik} maxLength={160} onChange={(e) => setField('baslik', e.target.value)} placeholder="Örn: Ön fren balatasından ses geliyor" />
        </SheetField>
        <SheetFormGrid columns={2}>
          <SheetField label="Kategori" htmlFor="wo-kategori">
            <Select value={form.kategori} onValueChange={(v) => setField('kategori', v)}>
              <SelectTrigger id="wo-kategori" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{KATEGORI_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </SheetField>
          <SheetField label="Öncelik" htmlFor="wo-oncelik">
            <Select value={form.oncelik} onValueChange={(v) => setField('oncelik', v)}>
              <SelectTrigger id="wo-oncelik" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{ONCELIK_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </SheetField>
        </SheetFormGrid>
        <SheetFormGrid columns={isEdit && canManage ? 2 : 1}>
          <SheetField label={`Bildirilen Sayaç (${isHour ? 'SMH' : 'KM'})`} htmlFor="wo-sayac" error={errors.bildirilen_sayac}>
            <Input id="wo-sayac" type="number" min="0" step={isHour ? '0.1' : '1'} value={form.bildirilen_sayac} onChange={(e) => setField('bildirilen_sayac', e.target.value)} placeholder="Opsiyonel" className="font-mono tabular-nums" />
          </SheetField>
          {isEdit && canManage && (
            <SheetField label="Durum" htmlFor="wo-durum">
              {record?.durum === 'acik' ? (
                <Select value={form.durum} onValueChange={(v) => setField('durum', v)}>
                  <SelectTrigger id="wo-durum" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acik">Açık</SelectItem>
                    <SelectItem value="serviste">Serviste</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-9 items-center">
                  <Badge variant="outline" className={DURUM_META[record?.durum]?.className}>{DURUM_META[record?.durum]?.label || record?.durum}</Badge>
                </div>
              )}
            </SheetField>
          )}
        </SheetFormGrid>
        <SheetField label="Açıklama" htmlFor="wo-aciklama">
          <Textarea id="wo-aciklama" rows={3} maxLength={2000} value={form.aciklama} onChange={(e) => setField('aciklama', e.target.value)} placeholder="Arıza belirtisi, ses veya gözlem notları (opsiyonel)" className="resize-none" />
        </SheetField>
      </SheetFormSection>
      {canManage && (
        <SheetFormSection title="Servis & Planlama" description="Yönetici tarafından atanan servis ve bütçe alanları">
          <SheetField label="Servis Adı" htmlFor="wo-servis">
            <Input id="wo-servis" maxLength={120} value={form.servis_adi} onChange={(e) => setField('servis_adi', e.target.value)} placeholder="Örn: Yetkili Servis Anadolu" />
          </SheetField>
          <SheetFormGrid columns={2}>
            <SheetField label="Tahmini Maliyet (₺)" htmlFor="wo-maliyet" error={errors.tahmini_maliyet}>
              <Input id="wo-maliyet" type="number" min="0" step="0.01" value={form.tahmini_maliyet} onChange={(e) => setField('tahmini_maliyet', e.target.value)} placeholder="0.00" className="font-mono tabular-nums" />
            </SheetField>
            <SheetField label="Planlanan Tarih" htmlFor="wo-plan-tarih">
              <TrussDatePicker id="wo-plan-tarih" name="planlanan_tarih" value={form.planlanan_tarih} onChange={(e) => setField('planlanan_tarih', e?.target?.value ?? '')} placeholder="Tarih seçin" className="w-full" />
            </SheetField>
          </SheetFormGrid>
        </SheetFormSection>
      )}
    </AppSheet>
  );
}
