import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import yakitService from '@/services/yakitService';
import { formatCurrency, formatLocaleNumber } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import AppSheet from '@/components/v2/AppSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FuelImportPreviewTable from './fuel-import/FuelImportPreviewTable';
import { decodeCsvFile, downloadSampleFuelCsv } from './fuel-import/fuelImportHelpers';

const extractImportError = (err, fallback) => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if ((status === 400 || status === 413) && data?.message) {
    const missing = Array.isArray(data.eksik_basliklar) && data.eksik_basliklar.length > 0
      ? ` Eksik başlıklar: ${data.eksik_basliklar.join(', ')}`
      : '';
    return `${data.message}${missing}`;
  }
  return data?.message || err?.message || fallback;
};

function SummaryStat({ label, value, toneClass = 'text-foreground' }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 font-mono text-sm font-semibold tabular-nums', toneClass)}>{value}</p>
    </div>
  );
}

export default function FuelImportSheet({ open, onOpenChange, onImported }) {
  const [csvText, setCsvText] = useState('');
  const [fileMeta, setFileMeta] = useState(null);
  const [preview, setPreview] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef(null);
  const previewReqIdRef = useRef(0);
  const mountedRef = useRef(true);
  const committingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const resetWizard = useCallback(() => {
    previewReqIdRef.current += 1;
    committingRef.current = false;
    setCsvText('');
    setFileMeta(null);
    setPreview(null);
    setCommitResult(null);
    setErrorMsg('');
    setPreviewing(false);
    setCommitting(false);
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!open) resetWizard();
  }, [open, resetWizard]);

  const processFile = useCallback(async (file) => {
    if (!file || committingRef.current) return;
    const reqId = ++previewReqIdRef.current;
    setErrorMsg('');
    setCommitResult(null);
    setPreview(null);
    setCsvText('');
    setFileMeta(null);
    setPreviewing(true);

    try {
      const { text, encoding } = await decodeCsvFile(file);
      if (!mountedRef.current || reqId !== previewReqIdRef.current) return;
      setCsvText(text);
      setFileMeta({ name: file.name, size: file.size, encoding });
      const res = await yakitService.previewYakitCsv(text);
      if (!mountedRef.current || reqId !== previewReqIdRef.current) return;
      setPreview(res);
    } catch (err) {
      if (!mountedRef.current || reqId !== previewReqIdRef.current) return;
      setErrorMsg(extractImportError(err, 'CSV dosyası önizlenemedi.'));
    } finally {
      if (mountedRef.current && reqId === previewReqIdRef.current) setPreviewing(false);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) processFile(file);
  };

  const handleCommit = async (e) => {
    if (e) e.preventDefault();
    if (committingRef.current || commitResult !== null || !csvText || previewing) return;
    if (Number(preview?.ozet?.gecerli || 0) === 0) return;

    committingRef.current = true;
    setCommitting(true);
    setErrorMsg('');
    try {
      const res = await yakitService.commitYakitCsv(csvText);
      if (!mountedRef.current) return;
      setCommitResult(res);
      if (Number(res?.ozet?.eklenen || 0) > 0) await onImported?.(res);
    } catch (err) {
      if (mountedRef.current) setErrorMsg(extractImportError(err, 'Yakıt kayıtları aktarılamadı.'));
    } finally {
      committingRef.current = false;
      if (mountedRef.current) setCommitting(false);
    }
  };

  const ozet = commitResult?.ozet || preview?.ozet || null;
  const rows = commitResult?.satirlar || preview?.satirlar || [];
  const validCount = Number(preview?.ozet?.gecerli || 0);

  const footerContent = commitResult !== null ? (
    <>
      <Button type="button" variant="outline" onClick={resetWizard}>Yeni Dosya Seç</Button>
      <Button type="button" onClick={() => onOpenChange?.(false)}>Kapat</Button>
    </>
  ) : (
    <>
      <Button type="button" variant="outline" disabled={committing} onClick={() => onOpenChange?.(false)}>İptal</Button>
      <Button type="submit" disabled={!preview || validCount === 0 || previewing || committing}>
        {committing && <Loader2 className="size-4 animate-spin" />}
        <span>Aktarımı Onayla</span>
      </Button>
    </>
  );

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Yakıt Ekstresi İçe Aktar (CSV)"
      description="Akaryakıt istasyonu veya filo kartı ekstresini önizleyip doğrulayarak toplu yakıt kaydı oluşturun."
      badge={fileMeta?.encoding ? <Badge variant="outline" className="text-[11px]">{fileMeta.encoding}</Badge> : null}
      onSubmit={handleCommit}
      isSubmitting={committing}
      isDirty={false}
      footer={footerContent}
      className="sm:max-w-3xl data-[side=right]:sm:max-w-3xl"
    >
      <div className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); if (!previewing && !committing) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!previewing && !committing && e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border bg-background/40'
          )}
        >
          <input ref={fileInputRef} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={handleFileChange} className="sr-only" />
          <FileSpreadsheet className="size-7 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">
              {fileMeta?.name ? `Seçilen dosya: ${fileMeta.name}` : 'CSV veya TXT ekstre dosyasını buraya sürükleyin'}
            </p>
            <p className="text-[11px] text-muted-foreground">UTF-8 veya Windows-1254, en fazla 1 MB (.csv / .txt)</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" disabled={previewing || committing} onClick={() => fileInputRef.current?.click()} className="h-8 gap-1.5 text-xs">
              {previewing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              <span>{previewing ? 'Önizleniyor...' : 'Dosya Seç'}</span>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={downloadSampleFuelCsv} className="h-8 gap-1.5 text-xs">
              <Download className="size-3.5" />
              <span>Örnek CSV Şablonu</span>
            </Button>
          </div>
        </div>

        {errorMsg && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="leading-relaxed font-medium">{errorMsg}</span>
          </div>
        )}

        {commitResult !== null && (
          <div className="space-y-2 rounded-lg border border-status-success/30 bg-status-success/10 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-status-success">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span>Toplu yakıt aktarımı tamamlandı</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SummaryStat label="Eklenen" value={formatLocaleNumber(commitResult.ozet?.eklenen ?? 0, 0)} toneClass="text-status-success" />
              <SummaryStat label="Mükerrer" value={formatLocaleNumber(commitResult.ozet?.mukerrer ?? 0, 0)} toneClass="text-status-warning" />
              <SummaryStat label="Hatalı" value={formatLocaleNumber(commitResult.ozet?.hatali ?? 0, 0)} toneClass="text-destructive" />
              <SummaryStat label="Yeni Anomali" value={formatLocaleNumber(commitResult.ozet?.yeni_anomali ?? 0, 0)} toneClass="text-foreground" />
            </div>
          </div>
        )}

        {ozet && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryStat label="Toplam" value={formatLocaleNumber(ozet.toplam ?? 0, 0)} />
            <SummaryStat label="Geçerli" value={formatLocaleNumber(ozet.gecerli ?? commitResult?.ozet?.eklenen ?? 0, 0)} toneClass="text-status-success" />
            <SummaryStat label="Mükerrer" value={formatLocaleNumber(ozet.mukerrer ?? 0, 0)} toneClass="text-status-warning" />
            <SummaryStat label="Hatalı" value={formatLocaleNumber(ozet.hatali ?? 0, 0)} toneClass="text-destructive" />
            <SummaryStat label="Toplam Litre" value={`${formatLocaleNumber(ozet.toplam_litre ?? 0, 2)} L`} />
            <SummaryStat label="Toplam Tutar" value={formatCurrency(ozet.toplam_tutar ?? 0, { maximumFractionDigits: 2 })} />
          </div>
        )}

        {(preview || commitResult) && <FuelImportPreviewTable rows={rows} ozet={ozet} />}
      </div>
    </AppSheet>
  );
}
