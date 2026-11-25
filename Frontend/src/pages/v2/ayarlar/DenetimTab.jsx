import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, History, RefreshCw, RotateCcw } from 'lucide-react';
import denetimService from '@/services/denetimService';
import { notifyApiError } from '@/utils/apiError';
import { formatLocaleNumber } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import {
  DENETIM_PAGE_SIZE,
  EYLEM_META,
  EYLEM_OPTIONS,
  formatAuditDateTime,
  VARLIK_TIPI_LABELS,
  VARLIK_TIPI_OPTIONS,
} from './denetimConstants';

function AuditRow({ row, isExpanded, onToggle }) {
  const meta = EYLEM_META[row.eylem] || { label: row.eylem, className: 'border-border bg-muted text-foreground' };
  const hasDetail = row.detay_json !== null && row.detay_json !== undefined;
  return (
    <div className="space-y-2 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-medium', meta.className)}>
            {meta.label}
          </Badge>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
            {VARLIK_TIPI_LABELS[row.varlik_tipi] || row.varlik_tipi}
          </Badge>
          {row.varlik_id != null && (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">{'#'}{row.varlik_id}</span>
          )}
        </div>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatAuditDateTime(row.olusturma_tarihi)}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-foreground">{row.ozet}</p>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-foreground">
            {row.kullanici_ad_soyad || row.kullanici_eposta || 'Sistem'}
          </span>
          {row.kullanici_ad_soyad && row.kullanici_eposta && <span>· {row.kullanici_eposta}</span>}
        </div>
        {hasDetail && (
          <Button type="button" variant="ghost" size="xs" onClick={onToggle} className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground">
            <span>{isExpanded ? 'Detayı Gizle' : 'Detay JSON'}</span>
            {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        )}
      </div>

      {hasDetail && isExpanded && (
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-2.5 font-mono text-xs text-foreground">
          {JSON.stringify(row.detay_json, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function DenetimTab() {
  const [eylem, setEylem] = useState('all');
  const [varlikTipi, setVarlikTipi] = useState('all');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [offset, setOffset] = useState(0);
  const [kayitlar, setKayitlar] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState({});
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const invalidDateRange = Boolean(baslangic && bitis && baslangic > bitis);

  const loadRecords = useCallback(async () => {
    if (invalidDateRange) {
      requestIdRef.current += 1;
      setLoading(false);
      return;
    }
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await denetimService.getDenetimKayitlari({
        eylem, varlik_tipi: varlikTipi, baslangic, bitis, limit: DENETIM_PAGE_SIZE, offset,
      });
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      setKayitlar(Array.isArray(res?.kayitlar) ? res.kayitlar : []);
      setToplam(Number(res?.toplam || 0));
    } catch (err) {
      if (mountedRef.current && reqId === requestIdRef.current) notifyApiError(err, 'Denetim kayıtları yüklenemedi.');
    } finally {
      if (mountedRef.current && reqId === requestIdRef.current) setLoading(false);
    }
  }, [eylem, varlikTipi, baslangic, bitis, offset, invalidDateRange]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const hasActiveFilters = eylem !== 'all' || varlikTipi !== 'all' || Boolean(baslangic) || Boolean(bitis);
  const handleClear = () => { setEylem('all'); setVarlikTipi('all'); setBaslangic(''); setBitis(''); setOffset(0); };
  const rangeStart = toplam === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + kayitlar.length, toplam);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">Değişmez Denetim İzi</h2>
            <Badge variant="secondary" className="font-mono text-xs tabular-nums">
              {formatLocaleNumber(toplam, 0)} kayıt
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Kritik araç, yakıt, bakım ve yetkilendirme işlemlerinin salt-okunur denetim günlüğü
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadRecords} disabled={loading || invalidDateRange} className="h-8 gap-1.5 text-xs">
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          <span>Yenile</span>
        </Button>
      </div>

      <Separator />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={eylem} onValueChange={(v) => { setEylem(v); setOffset(0); }}>
          <SelectTrigger aria-label="Eylem filtresi" className="h-9 w-44 rounded-lg border-border bg-background text-xs">
            <SelectValue placeholder="Eylem" />
          </SelectTrigger>
          <SelectContent>
            {EYLEM_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={varlikTipi} onValueChange={(v) => { setVarlikTipi(v); setOffset(0); }}>
          <SelectTrigger aria-label="Varlık tipi filtresi" className="h-9 w-36 rounded-lg border-border bg-background text-xs">
            <SelectValue placeholder="Varlık Tipi" />
          </SelectTrigger>
          <SelectContent>
            {VARLIK_TIPI_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="w-36 shrink-0">
          <TrussDatePicker id="denetim-baslangic" name="baslangic" value={baslangic} onChange={(e) => { setBaslangic(e?.target?.value ?? ''); setOffset(0); }} placeholder="Başlangıç tarihi" className="h-9 w-full text-xs" />
        </div>
        <div className="w-36 shrink-0">
          <TrussDatePicker id="denetim-bitis" name="bitis" value={bitis} onChange={(e) => { setBitis(e?.target?.value ?? ''); setOffset(0); }} placeholder="Bitiş tarihi" className="h-9 w-full text-xs" />
        </div>

        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="size-3.5" />
            <span>Temizle</span>
          </Button>
        )}
      </div>

      {invalidDateRange && (
        <p className="text-xs font-medium text-destructive">
          Başlangıç tarihi bitiş tarihinden sonra olamaz. Lütfen geçerli bir tarih aralığı seçin.
        </p>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, idx) => <Skeleton key={`audit-skel-${idx}`} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : kayitlar.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/50 px-4 py-10 text-center">
          <History className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Denetim kaydı bulunamadı</p>
          <p className="text-xs text-muted-foreground">Seçili filtrelere ait kaydedilmiş denetim olayı yok.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background/40">
          {kayitlar.map((row) => (
            <AuditRow
              key={row.denetim_id}
              row={row}
              isExpanded={Boolean(expandedIds[row.denetim_id])}
              onToggle={() => setExpandedIds((prev) => ({ ...prev, [row.denetim_id]: !prev[row.denetim_id] }))}
            />
          ))}
        </div>
      )}

      {toplam > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatLocaleNumber(rangeStart, 0)}–{formatLocaleNumber(rangeEnd, 0)} / {formatLocaleNumber(toplam, 0)}
          </span>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={loading || offset === 0} onClick={() => setOffset((prev) => Math.max(0, prev - DENETIM_PAGE_SIZE))} className="h-8 gap-1 px-2.5 text-xs">
              <ChevronLeft className="size-3.5" />
              <span>Önceki</span>
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={loading || offset + DENETIM_PAGE_SIZE >= toplam} onClick={() => setOffset((prev) => prev + DENETIM_PAGE_SIZE)} className="h-8 gap-1 px-2.5 text-xs">
              <span>Sonraki</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
