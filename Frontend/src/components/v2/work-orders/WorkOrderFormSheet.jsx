import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatTurkishPlate } from '@/utils/formatters';
import AppSheet, { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import DocVaultMultiField from '@/components/v2/doc-vault/DocVaultMultiField';
import useDocVaultUpload from '@/components/v2/doc-vault/useDocVaultUpload';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import {
  buildInitialWorkOrderForm, buildWorkOrderDocItems, DURUM_META, isHourOdometer,
  KATEGORI_OPTIONS, ONCELIK_OPTIONS, validateAndBuildWorkOrderPayload, WORKORDER_MAX_DOCS,
} from './workOrderConstants';

export default function WorkOrderFormSheet({
  open, onOpenChange, mode = 'create', record = null, defaultDurum = null, prefill = null,
  araclar = [], defaultAracId = 'tum', canManage = false, currentUserId = null,
  submitting = false, onCreate, onUpdate, onDocsChanged,
}) {
  const [form, setForm] = useState(() => buildInitialWorkOrderForm({ mode, record, defaultDurum, prefill, araclar, defaultAracId }));
  const [initialJson, setInitialJson] = useState('');
  const [errors, setErrors] = useState({});
  const [draftDocs, setDraftDocs] = useState([]);
  const [boundDocs, setBoundDocs] = useState([]);

  const docUpload = useDocVaultUpload();
  const draftDocsRef = useRef([]);
  draftDocsRef.current = draftDocs;
  const isEdit = mode === 'edit' && Boolean(record);
  const isClosedWo = isEdit && (record?.durum === 'tamamlandi' || record?.durum === 'iptal');

  useEffect(() => {
    if (!open) {
      docUpload.abortUpload(); docUpload.clearError(); setDraftDocs([]); setBoundDocs([]);
      return;
    }
    const init = buildInitialWorkOrderForm({ mode, record, defaultDurum, prefill, araclar, defaultAracId });
    setForm(init); setInitialJson(JSON.stringify(init)); setErrors({});
    setDraftDocs([]);
    setBoundDocs(isEdit && Array.isArray(record?.belgeler) ? record.belgeler : []);
    docUpload.clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, record, defaultDurum, prefill, araclar, defaultAracId]);

  const selectedVehicle = useMemo(
    () => araclar.find((a) => String(a.arac_id) === String(form.arac_id)) || null,
    [araclar, form.arac_id]
  );
  const isHour = isHourOdometer(record?.sayac_tipi || selectedVehicle?.sayac_tipi);
  const isDirty = open && (JSON.stringify(form) !== initialJson || draftDocs.length > 0);
  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleVehicleChange = (nextAracId) => {
    if (!isEdit && (draftDocsRef.current.length > 0 || docUpload.uploading)) {
      docUpload.abortUpload(); docUpload.clearError();
      draftDocsRef.current.forEach((d) => { if (d.belge_id) docUpload.removeDraftOrDoc(d.belge_id, { silent: true }); });
      setDraftDocs([]);
    }
    setField('arac_id', nextAracId);
  };

  const handleSelectDoc = async (file) => {
    if (isClosedWo || (isEdit ? boundDocs.length : draftDocs.length) >= WORKORDER_MAX_DOCS) return;
    const uploaded = await docUpload.uploadFile({
      aracId: isEdit ? record.arac_id : form.arac_id, varlikTipi: 'is_emri',
      varlikId: isEdit ? record.is_emri_id : null, file, bindImmediately: isEdit,
    });
    if (!uploaded) return;
    if (isEdit) { setBoundDocs((prev) => [...prev, uploaded]); onDocsChanged?.(); }
    else setDraftDocs((prev) => [...prev, uploaded]);
  };

  const handleRemoveDoc = async (item) => {
    if (item.isDraft) {
      if (item.belge_id) await docUpload.removeDraftOrDoc(item.belge_id, { silent: true });
      setDraftDocs((prev) => prev.filter((d) => d.belge_id !== item.belge_id));
      return;
    }
    if (await docUpload.removeDraftOrDoc(item.belge_id)) {
      setBoundDocs((prev) => prev.filter((d) => d.belge_id !== item.belge_id));
      onDocsChanged?.();
    }
  };

  const docItems = useMemo(
    () => buildWorkOrderDocItems({ isEdit, draftDocs, boundDocs, isClosedWo, canManage, currentUserId, recordDurum: record?.durum }),
    [isEdit, draftDocs, boundDocs, isClosedWo, canManage, currentUserId, record?.durum]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || docUpload.uploading) return;
    const { errors: nextErr, payload } = validateAndBuildWorkOrderPayload({
      form, isEdit, canManage, record, draftKeys: draftDocs.map((d) => d.nesne_anahtari),
    });
    if (nextErr) { setErrors(nextErr); return; }
    if (!isEdit) {
      const ok = await onCreate(payload);
      if (ok) setDraftDocs([]);
      return;
    }
    await onUpdate(record.is_emri_id, payload);
  };

  return (
    <AppSheet
      open={open} onOpenChange={onOpenChange}
      title={isEdit ? 'İş Emrini Güncelle' : 'Yeni İş Emri Talebi'}
      description={isEdit ? 'Servis planlaması, durum ve maliyet bilgilerini güncelleyin.' : 'Arıza, bakım veya servis talebi oluşturun.'}
      badge={isEdit && record ? formatTurkishPlate(record.plaka || '') : undefined}
      submitLabel={isEdit ? 'Güncelle' : 'Talep Oluştur'} isSubmitting={submitting} submitDisabled={docUpload.uploading}
      isDirty={isDirty} onSubmit={handleSubmit}
    >
      <SheetFormSection title="Talep Bilgileri">
        <SheetField label="Araç" htmlFor="wo-arac" required={!isEdit} error={errors.arac_id}>
          {isEdit ? (
            <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 font-mono text-xs font-medium text-foreground tabular-nums">
              {formatTurkishPlate(record?.plaka || '')} · {[record?.marka, record?.model].filter(Boolean).join(' ')}
            </div>
          ) : (
            <Select value={form.arac_id} onValueChange={handleVehicleChange}>
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
                  <SelectContent><SelectItem value="acik">Açık</SelectItem><SelectItem value="serviste">Serviste</SelectItem></SelectContent>
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
        <DocVaultMultiField
          id="wo-belgeler" label="Arıza / Talep Belgeleri" maxFiles={WORKORDER_MAX_DOCS}
          items={docItems} uploading={docUpload.uploading} error={docUpload.error}
          disabled={!isEdit && !form.arac_id} readOnly={isClosedWo}
          onSelectFile={handleSelectDoc} onRemoveItem={handleRemoveDoc}
          onOpenItem={(item) => docUpload.openDocument({ belgeId: item.belge_id })}
        />
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
