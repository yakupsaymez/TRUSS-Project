import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight, Cog, FileText, Info, Wallet, Wrench } from 'lucide-react';
import bildirimService from '@/services/bildirimService';
import { notifyApiError } from '@/utils/apiError';
import { formatTurkishPlate } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';

const SEVIYE_META = {
  kritik: { label: 'Kritik', badgeClass: 'border-destructive/30 bg-destructive/10 text-destructive' },
  uyari: { label: 'Uyarı', badgeClass: 'border-status-warning/30 bg-status-warning/10 text-status-warning' },
  bilgi: { label: 'Bilgi', badgeClass: 'border-status-info/30 bg-status-info/10 text-status-info' },
};

const KATEGORI_META = {
  belge: { label: 'Belge', icon: FileText },
  bakim: { label: 'Bakım', icon: Wrench },
  parca: { label: 'Parça', icon: Cog },
  maliyet_ozeti: { label: 'Bütçe', icon: Wallet },
  sistem: { label: 'Sistem', icon: Info },
};

const formatShortDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
};

const isSafeInternalPath = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [bildirimler, setBildirimler] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchBildirimler = useCallback(async ({ silent = false } = {}) => {
    const reqId = ++requestIdRef.current;
    if (!silent && mountedRef.current) setLoading(true);
    try {
      const data = await bildirimService.getBildirimler({ limit: 20 });
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
      setBildirimler(Array.isArray(data?.bildirimler) ? data.bildirimler : []);
      setUnreadCount(Math.max(0, Number(data?.okunmamis_sayisi) || 0));
    } catch {
      // Arka plan senkronizasyonunda global toast gösterilmez
    } finally {
      if (mountedRef.current && reqId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBildirimler();
    const onDataChanged = () => fetchBildirimler({ silent: true });
    window.addEventListener('truss:data-changed', onDataChanged);
    return () => window.removeEventListener('truss:data-changed', onDataChanged);
  }, [fetchBildirimler]);

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) fetchBildirimler({ silent: bildirimler.length > 0 });
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount <= 0) return;
    setMarkingAll(true);
    try {
      const data = await bildirimService.markTumunuOkundu();
      if (!mountedRef.current) return;
      setBildirimler((prev) => prev.map((item) => ({ ...item, okundu_mu: true })));
      setUnreadCount(Math.max(0, Number(data?.okunmamis_sayisi) || 0));
    } catch (err) {
      notifyApiError(err, 'Bildirimler okundu olarak işaretlenemedi.');
    } finally {
      if (mountedRef.current) setMarkingAll(false);
    }
  };

  const handleItemClick = (item) => {
    if (!item.okundu_mu && item.bildirim_id != null) {
      const prevItems = bildirimler;
      const prevUnread = unreadCount;
      setBildirimler((curr) => curr.map((row) => (row.bildirim_id === item.bildirim_id ? { ...row, okundu_mu: true } : row)));
      setUnreadCount((curr) => Math.max(0, curr - 1));
      bildirimService.markOkundu(item.bildirim_id)
        .then((res) => {
          if (mountedRef.current && typeof res?.okunmamis_sayisi === 'number') setUnreadCount(Math.max(0, res.okunmamis_sayisi));
        })
        .catch((err) => {
          if (!mountedRef.current) return;
          setBildirimler(prevItems);
          setUnreadCount(prevUnread);
          notifyApiError(err, 'Bildirim güncellenemedi.');
        });
    }
    setOpen(false);
    if (isSafeInternalPath(item.link_url)) navigate(item.link_url);
  };

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Bildirimler (${unreadCount} okunmamış)`}
          title={`Bildirimler (${unreadCount} okunmamış)`}
          className="relative size-8 rounded-lg border border-border bg-card text-foreground/80 hover:text-foreground"
        >
          <Bell className="size-3.5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[10px] leading-none font-semibold text-primary-foreground tabular-nums">
              {badgeLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 gap-0 p-0 sm:w-96">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Bildirimler</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">{unreadCount}</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button type="button" variant="ghost" size="sm" disabled={markingAll} onClick={handleMarkAllRead} className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary">
              <CheckCheck className="size-3.5" aria-hidden="true" />
              <span>Tümünü Okundu İşaretle</span>
            </Button>
          )}
        </div>

        {loading && bildirimler.length === 0 ? (
          <div className="space-y-2.5 p-3.5">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-1.5 rounded-lg border border-border/60 p-2.5">
                <div className="flex items-center justify-between gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : bildirimler.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
            <div className="mb-2.5 flex size-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
              <Bell className="size-4" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">Okunmamış bildirim yok</p>
            <p className="mt-1 text-xs text-muted-foreground">Belge vadesi, bakım veya bütçe uyarıları oluştuğunda burada listelenir.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <div className="divide-y divide-border">
              {bildirimler.map((item) => {
                const seviye = SEVIYE_META[item.seviye] || SEVIYE_META.bilgi;
                const kategori = KATEGORI_META[item.kategori] || KATEGORI_META.sistem;
                const KategoriIcon = kategori.icon;
                const tarih = formatShortDate(item.olusturma_tarihi || item.created_at);
                return (
                  <button
                    key={item.bildirim_id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={cn('flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/60', !item.okundu_mu && 'bg-primary/5')}
                  >
                    <span className={cn('mt-2 size-2 shrink-0 rounded-full', !item.okundu_mu ? 'bg-primary' : 'bg-transparent')} aria-hidden="true" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-medium', seviye.badgeClass)}>{seviye.label}</Badge>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <KategoriIcon className="size-3" aria-hidden="true" />
                            <span>{kategori.label}</span>
                          </span>
                          {item.plaka && (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground tabular-nums">
                              {formatTurkishPlate(item.plaka)}
                            </span>
                          )}
                        </div>
                        {tarih && <span className="text-[10px] text-muted-foreground tabular-nums">{tarih}</span>}
                      </div>
                      <p className="text-xs font-medium text-foreground">{item.baslik}</p>
                      {item.mesaj && <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{item.mesaj}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-border p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setOpen(false); navigate('/app/ayarlar'); }}
            className="h-8 w-full justify-between px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>Bildirim tercihleri</span>
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
