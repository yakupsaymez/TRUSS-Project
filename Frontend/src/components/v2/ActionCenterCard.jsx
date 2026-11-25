import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, ClipboardList, Cog, FileText, Info, RefreshCw, Wallet, Wrench } from 'lucide-react';
import bildirimService from '@/services/bildirimService';
import { notifyApiError } from '@/utils/apiError';
import { subscribeDataChanged } from '@/utils/dataEvents';
import { formatCurrency, formatTurkishPlate } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const COMPACT_LIMIT = 5;

const SEVIYE_STYLE = {
  kritik: { label: 'Kritik', dot: 'bg-destructive', badge: 'border-destructive/30 bg-destructive/10 text-destructive' },
  uyari: { label: 'Uyarı', dot: 'bg-status-warning', badge: 'border-status-warning/30 bg-status-warning/10 text-status-warning' },
  bilgi: { label: 'Bilgi', dot: 'bg-status-info', badge: 'border-status-info/30 bg-status-info/10 text-status-info' },
};

const KATEGORI_META = {
  belge: { label: 'Belge', icon: FileText },
  bakim: { label: 'Bakım', icon: Wrench },
  parca: { label: 'Parça', icon: Cog },
  is_emri: { label: 'İş Emri', icon: ClipboardList },
  maliyet_ozeti: { label: 'Bütçe', icon: Wallet },
};

const isSafeInternalPath = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');

export default function ActionCenterCard({ seciliAracId = 'tum', canViewAnalytics = false, className }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('tum');
  const [expanded, setExpanded] = useState(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAksiyonMerkezi = useCallback(async ({ manual = false } = {}) => {
    const reqId = ++requestIdRef.current;
    if (manual && mountedRef.current) setRefreshing(true);
    try {
      const res = await bildirimService.getAksiyonMerkezi();
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      setData(res || null);
    } catch (err) {
      if (manual && mountedRef.current) notifyApiError(err, 'Aksiyon merkezi yenilenemedi.');
    } finally {
      if (mountedRef.current && reqId === requestIdRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    fetchAksiyonMerkezi();
    return subscribeDataChanged(null, () => fetchAksiyonMerkezi());
  }, [fetchAksiyonMerkezi, canViewAnalytics]);

  const showFinance = Boolean(canViewAnalytics && data?.finans_yetkisi === true);
  const isSingleVehicle = Boolean(seciliAracId && seciliAracId !== 'tum');

  useEffect(() => {
    if (activeCategory === 'maliyet_ozeti' && (!showFinance || isSingleVehicle)) setActiveCategory('tum');
  }, [activeCategory, showFinance, isSingleVehicle]);

  useEffect(() => { setExpanded(false); }, [seciliAracId, activeCategory]);

  const visibleItems = useMemo(() => {
    const raw = Array.isArray(data?.ogeler) ? data.ogeler : [];
    return raw.filter((item) => {
      if (!showFinance && item.kategori === 'maliyet_ozeti') return false;
      return isSingleVehicle ? String(item.arac_id) === String(seciliAracId) : true;
    });
  }, [data, showFinance, isSingleVehicle, seciliAracId]);

  const counts = useMemo(() => {
    const acc = { tum: visibleItems.length, belge: 0, bakim: 0, parca: 0, is_emri: 0, maliyet_ozeti: 0, kritik: 0, uyari: 0 };
    for (const item of visibleItems) {
      if (item.kategori in acc) acc[item.kategori] += 1;
      if (item.seviye === 'kritik') acc.kritik += 1;
      else if (item.seviye === 'uyari') acc.uyari += 1;
    }
    return acc;
  }, [visibleItems]);

  const showIsEmriTab = counts.is_emri > 0 || Number(data?.ozet?.is_emri_sayisi || 0) > 0;
  useEffect(() => {
    if (activeCategory === 'is_emri' && !showIsEmriTab) setActiveCategory('tum');
  }, [activeCategory, showIsEmriTab]);

  const categoryTabs = useMemo(() => {
    const tabs = [
      { id: 'tum', label: 'Tümü', count: counts.tum },
      { id: 'belge', label: 'Belge', count: counts.belge },
      { id: 'bakim', label: 'Bakım', count: counts.bakim },
      { id: 'parca', label: 'Parça', count: counts.parca },
    ];
    if (showIsEmriTab) tabs.push({ id: 'is_emri', label: 'İş Emri', count: counts.is_emri });
    if (showFinance && !isSingleVehicle) tabs.push({ id: 'maliyet_ozeti', label: 'Bütçe', count: counts.maliyet_ozeti });
    return tabs;
  }, [counts, showIsEmriTab, showFinance, isSingleVehicle]);

  const filteredItems = useMemo(
    () => (activeCategory === 'tum' ? visibleItems : visibleItems.filter((item) => item.kategori === activeCategory)),
    [visibleItems, activeCategory]
  );

  const displayedItems = expanded ? filteredItems : filteredItems.slice(0, COMPACT_LIMIT);
  const hiddenCount = Math.max(0, filteredItems.length - COMPACT_LIMIT);
  const butceRow = showFinance && !isSingleVehicle && Array.isArray(data?.butce) ? data.butce[0] : null;
  const butceBadgeClass = butceRow?.durum === 'ASIM'
    ? 'border-destructive/30 bg-destructive/10 text-destructive'
    : butceRow?.durum === 'RISK'
      ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
      : 'border-status-success/30 bg-status-success/10 text-status-success';

  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <AlertTriangle className="size-4 text-status-warning" aria-hidden="true" />
            <span>Aksiyon Merkezi</span>
          </CardTitle>
          {!loading && counts.kritik > 0 && (
            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[11px] font-medium text-destructive tabular-nums">{counts.kritik} Kritik</Badge>
          )}
          {!loading && counts.uyari > 0 && (
            <Badge variant="outline" className="border-status-warning/30 bg-status-warning/10 text-[11px] font-medium text-status-warning tabular-nums">{counts.uyari} Uyarı</Badge>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading || refreshing} onClick={() => fetchAksiyonMerkezi({ manual: true })} aria-label="Aksiyon merkezini yenile" className="h-7 gap-1.5 px-2.5 text-xs">
          <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} aria-hidden="true" />
          <span>Yenile</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2.5">
            <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}</div>
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : (
          <>
            {butceRow && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Wallet className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium text-foreground tabular-nums">{butceRow.ay} Bütçe Kullanımı:</span>
                  <span className="text-muted-foreground tabular-nums">{formatCurrency(butceRow.toplam_gerceklesen)} / {formatCurrency(butceRow.toplam_butce)}</span>
                </div>
                <Badge variant="outline" className={cn('font-mono text-[11px] tabular-nums', butceBadgeClass)}>%{butceRow.kullanim_yuzdesi}</Badge>
              </div>
            )}

            {visibleItems.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-4">
                <CheckCircle2 className="size-5 shrink-0 text-status-success" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">Acil aksiyon gerektiren kayıt yok — tüm filo güncel</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  {categoryTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCategory(tab.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        activeCategory === tab.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span>{tab.label}</span>
                      <span className="font-mono text-[11px] tabular-nums">{tab.count}</span>
                    </button>
                  ))}
                </div>

                {filteredItems.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3.5 py-4 text-xs text-muted-foreground">
                    <Info className="size-4 shrink-0" aria-hidden="true" />
                    <span>Bu kategoride bekleyen aksiyon yok.</span>
                  </div>
                ) : (
                  <div className={cn('divide-y divide-border overflow-hidden rounded-lg border border-border', expanded && 'max-h-96 overflow-y-auto')}>
                    {displayedItems.map((item, idx) => {
                      const seviye = SEVIYE_STYLE[item.seviye] || SEVIYE_STYLE.bilgi;
                      const kategori = KATEGORI_META[item.kategori] || { label: item.kategori || 'Sistem', icon: Info };
                      const KategoriIcon = kategori.icon;
                      const clickable = isSafeInternalPath(item.link_url);
                      return (
                        <button
                          key={`${item.kategori}-${item.arac_id ?? 'org'}-${item.meta?.is_emri_id ?? idx}`}
                          type="button"
                          disabled={!clickable}
                          onClick={() => clickable && navigate(item.link_url)}
                          className="flex w-full items-center justify-between gap-3 bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-card"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', seviye.dot)} aria-hidden="true" />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-medium', seviye.badge)}>{seviye.label}</Badge>
                                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                                  <KategoriIcon className="size-3" aria-hidden="true" />
                                  <span>{kategori.label}</span>
                                </Badge>
                                {item.plaka && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground tabular-nums">
                                    {formatTurkishPlate(item.plaka)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-foreground">{item.baslik}</p>
                              {item.detay && <p className="text-[11px] leading-relaxed text-muted-foreground">{item.detay}</p>}
                            </div>
                          </div>
                          {clickable && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {hiddenCount > 0 && (
                  <div className="flex justify-center pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded((prev) => !prev)} className="h-7 gap-1 px-3 text-xs text-primary hover:text-primary">
                      {expanded ? (<><span>Daralt</span><ChevronUp className="size-3.5" aria-hidden="true" /></>) : (<><span>Tümünü Göster (+{hiddenCount})</span><ChevronDown className="size-3.5" aria-hidden="true" /></>)}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
