import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ScanSearch } from 'lucide-react';
import yakitService from '@/services/yakitService';
import { notifyApiError } from '@/utils/apiError';
import { DATA_SCOPES, subscribeDataChanged } from '@/utils/dataEvents';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import FuelAnomalyRow from './fuel-anomaly/FuelAnomalyRow';

const COMPACT_LIMIT = 5;

const DURUM_TABS = [
  { id: 'acik', label: 'Açık' },
  { id: 'incelendi', label: 'İncelendi' },
  { id: 'yoksayildi', label: 'Yoksayıldı' },
];

const EMPTY_OZET = { acik: 0, kritik: 0, uyari: 0, incelendi: 0, yoksayildi: 0 };

export default function FuelAnomalyPanel({ seciliAracId = null, canManage = false, className }) {
  const [activeDurum, setActiveDurum] = useState('acik');
  const [anomaliler, setAnomaliler] = useState([]);
  const [ozet, setOzet] = useState(EMPTY_OZET);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isVehicleScoped = Boolean(seciliAracId && seciliAracId !== 'tum');

  const fetchAnomaliler = useCallback(
    async ({ silent = false } = {}) => {
      const reqId = ++requestIdRef.current;
      if (!silent && mountedRef.current) setLoading(true);
      try {
        const res = await yakitService.getYakitAnomalileri({
          durum: activeDurum,
          ...(isVehicleScoped ? { arac_id: Number(seciliAracId) } : {}),
          limit: 50,
        });
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        setAnomaliler(Array.isArray(res?.anomaliler) ? res.anomaliler : []);
        setOzet(res?.ozet || EMPTY_OZET);
      } catch (err) {
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        if (!silent) notifyApiError(err, 'Yakıt anomalileri yüklenemedi.');
      } finally {
        if (mountedRef.current && reqId === requestIdRef.current) setLoading(false);
      }
    },
    [activeDurum, isVehicleScoped, seciliAracId]
  );

  useEffect(() => {
    setExpanded(false);
    fetchAnomaliler();
  }, [fetchAnomaliler]);

  useEffect(() => {
    return subscribeDataChanged(
      [DATA_SCOPES.MOVEMENT, DATA_SCOPES.FUEL_ANOMALY, DATA_SCOPES.VEHICLE],
      () => fetchAnomaliler({ silent: true })
    );
  }, [fetchAnomaliler]);

  const handleScan = async () => {
    if (!canManage || scanning) return;
    setScanning(true);
    try {
      const res = await yakitService.taraYakitAnomalileri();
      if (!mountedRef.current) return;
      const taranan = Number(res?.taranan_kayit || 0);
      const yeni = Number(res?.yeni_anomali || 0);
      toast.success(`${taranan} kayıt tarandı, ${yeni} yeni anomali bulundu.`);
      await fetchAnomaliler({ silent: true });
    } catch (err) {
      if (mountedRef.current) notifyApiError(err, 'Yakıt anomali taraması başarısız.');
    } finally {
      if (mountedRef.current) setScanning(false);
    }
  };

  const handleResolve = async (id, durum, not) => {
    if (!canManage || busyId !== null) return;
    setBusyId(id);
    try {
      await yakitService.updateYakitAnomali(id, {
        durum,
        inceleme_notu: String(not ?? '').trim() || null,
      });
      if (!mountedRef.current) return;
      toast.success(durum === 'incelendi' ? 'Anomali incelendi olarak işaretlendi.' : 'Anomali yoksayıldı.');
      await fetchAnomaliler({ silent: true });
    } catch (err) {
      if (mountedRef.current) notifyApiError(err, 'Anomali durumu güncellenemedi.');
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  };

  const displayedItems = expanded ? anomaliler : anomaliler.slice(0, COMPACT_LIMIT);
  const hiddenCount = Math.max(0, anomaliler.length - COMPACT_LIMIT);
  const emptyMessage =
    activeDurum === 'acik'
      ? 'Açık yakıt anomalisi bulunmuyor'
      : activeDurum === 'incelendi'
        ? 'İncelenmiş yakıt anomalisi bulunmuyor'
        : 'Yoksayılan yakıt anomalisi bulunmuyor';

  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="size-4 text-status-warning" aria-hidden="true" />
            <span>Yakıt Anomali İnceleme</span>
          </CardTitle>
          {!loading && ozet.kritik > 0 && (
            <Badge
              variant="outline"
              className="border-destructive/30 bg-destructive/10 text-[11px] font-medium text-destructive tabular-nums"
            >
              {ozet.kritik} Kritik
            </Badge>
          )}
          {!loading && ozet.uyari > 0 && (
            <Badge
              variant="outline"
              className="border-status-warning/30 bg-status-warning/10 text-[11px] font-medium text-status-warning tabular-nums"
            >
              {ozet.uyari} Uyarı
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {DURUM_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled={scanning || busyId !== null}
                onClick={() => setActiveDurum(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  activeDurum === tab.id
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[11px] tabular-nums">({ozet[tab.id] ?? 0})</span>
              </button>
            ))}
          </div>

          {canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={scanning || loading}
              onClick={handleScan}
              className="h-7 gap-1.5 px-2.5 text-xs"
            >
              <ScanSearch className={cn('size-3.5', scanning && 'animate-pulse')} aria-hidden="true" />
              <span>{scanning ? 'Taranıyor...' : 'Son 90 Günü Tara'}</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-0">
        {loading ? (
          <Skeleton className="h-12 w-full rounded-lg" />
        ) : anomaliler.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
            <CheckCircle2 className="size-4 shrink-0 text-status-success" aria-hidden="true" />
            <span className="font-medium text-foreground">{emptyMessage}</span>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'divide-y divide-border overflow-hidden rounded-lg border border-border',
                expanded && 'max-h-96 overflow-y-auto'
              )}
            >
              {displayedItems.map((item) => (
                <FuelAnomalyRow
                  key={item.anomali_id}
                  item={item}
                  canManage={canManage}
                  submitting={busyId === item.anomali_id}
                  onResolve={handleResolve}
                />
              ))}
            </div>

            {hiddenCount > 0 && (
              <div className="flex justify-center pt-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="h-7 gap-1 px-3 text-xs text-primary hover:text-primary"
                >
                  {expanded ? (
                    <><span>Daralt</span><ChevronUp className="size-3.5" aria-hidden="true" /></>
                  ) : (
                    <><span>Tümünü Göster (+{hiddenCount})</span><ChevronDown className="size-3.5" aria-hidden="true" /></>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
