import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Fuel, Plus, Wrench } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useVehicleStore from '@/store/useVehicleStore';
import yakitService from '@/services/yakitService';
import bakimService from '@/services/bakimService';
import { resolveRole, ROLES } from '@/pages/ChronoBeta/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { toLocalIsoDate } from '@/utils/dateUtils';
import { formatCurrency, formatLocaleNumber, formatTurkishPlate } from '@/utils/formatters';
import LedgerDataTable from '@/components/v2/LedgerDataTable';
import ConfirmDialog from '@/components/v2/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function cozumleNotVeFatura(rawNotlar, rawFatura) {
  const ham = String(rawNotlar || '').trim();
  if (rawFatura) {
    return { fatura_bilgisi: String(rawFatura).trim(), notlar: ham };
  }
  const match = ham.match(/^\[Fatura:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return { fatura_bilgisi: match[1].trim(), notlar: match[2].trim() };
  }
  return { fatura_bilgisi: '', notlar: ham };
}

function parseRecordDate(raw) {
  if (!raw) return { tarih: '', timestamp: 0 };
  const str = String(raw).trim();
  const pureDateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDateMatch) {
    const [, y, m, d] = pureDateMatch;
    return {
      tarih: `${y}-${m}-${d}`,
      timestamp: new Date(Number(y), Number(m) - 1, Number(d)).getTime(),
    };
  }
  const dateObj = new Date(str);
  if (Number.isNaN(dateObj.getTime())) {
    return { tarih: '', timestamp: 0 };
  }
  const iso = toLocalIsoDate(dateObj);
  const [y, m, d] = iso.split('-').map(Number);
  return {
    tarih: iso,
    timestamp: new Date(y, m - 1, d).getTime(),
  };
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatTrDateShort(isoDate) {
  if (!isoDate) return '—';
  const parts = String(isoDate).slice(0, 10).split('-');
  if (parts.length !== 3) return '—';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export default function Hareketler() {
  const user = useAuthStore((s) => s.user);

  const araclar = useVehicleStore((s) => s.araclar);
  const vehiclesLoading = useVehicleStore((s) => s.loading);
  const vehiclesHasLoaded = useVehicleStore((s) => s.hasLoaded);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  const [yakitlar, setYakitlar] = useState([]);
  const [bakimlar, setBakimlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const vehicleFetchAttemptedRef = useRef(false);
  const mountedRef = useRef(true);

  const role = resolveRole(user);
  const canManage = [ROLES.SYSTEM_ADMIN, ROLES.FLEET_MANAGER].includes(role);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!vehiclesHasLoaded && !vehiclesLoading && !vehicleFetchAttemptedRef.current) {
      vehicleFetchAttemptedRef.current = true;
      fetchAraclar();
    }
  }, [vehiclesHasLoaded, vehiclesLoading, fetchAraclar]);

  const verileriYukle = useCallback(async () => {
    setLoading(true);
    try {
      const [yRes, bRes] = await Promise.all([
        yakitService.getAllYakitlar(),
        bakimService.getAllBakimlar(),
      ]);
      if (!mountedRef.current) return;
      setYakitlar(Array.isArray(yRes) ? yRes : yRes?.yakitlar || []);
      setBakimlar(Array.isArray(bRes) ? bRes : bRes?.bakimlar || []);
    } catch (err) {
      if (!mountedRef.current) return;
      notifyApiError(err, 'Hareket kayıtları yüklenemedi.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    verileriYukle();
  }, [verileriYukle]);

  const aracMap = useMemo(() => {
    const map = new Map();
    araclar.forEach((a) => {
      map.set(String(a.arac_id), a);
    });
    return map;
  }, [araclar]);

  const rows = useMemo(() => {
    const unified = [];

    yakitlar.forEach((y) => {
      const matchedArac = aracMap.get(String(y.arac_id)) || null;
      const { tarih, timestamp } = parseRecordDate(y.tarih);
      const litre = Number(y.litre || 0);
      const tutar = Number(y.tutar || 0);
      const birimFiyat = litre > 0 ? tutar / litre : null;
      const { fatura_bilgisi, notlar } = cozumleNotVeFatura(
        y.notlar,
        y.fatura_no || y.fatura_bilgisi
      );
      const isSmh =
        (y.sayac_tipi || matchedArac?.sayac_tipi) === 'SMH' ||
        Number(matchedArac?.calisma_saati_bakim) > 0;

      unified.push({
        id: `yakit-${y.yakit_id}`,
        rawId: Number(y.yakit_id),
        tip: 'YAKIT',
        arac_id: y.arac_id,
        plaka: y.plaka || matchedArac?.plaka || `#${y.arac_id}`,
        marka: y.marka || matchedArac?.marka || '',
        model: y.model || matchedArac?.model || '',
        sayac_tipi: isSmh ? 'SMH' : 'KM',
        tarih,
        timestamp,
        km: parseNullableNumber(y.km),
        tutar,
        litre,
        birimFiyat,
        altTur: y.yakit_tipi || 'Dizel',
        fatura_bilgisi,
        notlar,
        raw: y,
      });
    });

    bakimlar.forEach((b) => {
      const matchedArac = aracMap.get(String(b.arac_id)) || null;
      const { tarih, timestamp } = parseRecordDate(b.tarih);
      const tutar = Number(b.maliyet ?? b.tutar ?? 0);
      const { fatura_bilgisi, notlar } = cozumleNotVeFatura(
        b.notlar || b.aciklama,
        b.fatura_no || b.fatura_bilgisi
      );
      const isSmh =
        (b.sayac_tipi || matchedArac?.sayac_tipi) === 'SMH' ||
        Number(matchedArac?.calisma_saati_bakim) > 0;

      unified.push({
        id: `bakim-${b.bakim_id}`,
        rawId: Number(b.bakim_id),
        tip: 'BAKIM',
        arac_id: b.arac_id,
        plaka: b.plaka || matchedArac?.plaka || `#${b.arac_id}`,
        marka: b.marka || matchedArac?.marka || '',
        model: b.model || matchedArac?.model || '',
        sayac_tipi: isSmh ? 'SMH' : 'KM',
        tarih,
        timestamp,
        km: parseNullableNumber(b.km),
        tutar,
        litre: null,
        birimFiyat: null,
        altTur: b.bakim_tipi || b.islem_turu || b.bakim_turu || 'Periyodik Bakım',
        fatura_bilgisi,
        notlar,
        raw: b,
      });
    });

    unified.sort((a, b) => {
      if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
      return (b.rawId || 0) - (a.rawId || 0);
    });

    return unified;
  }, [yakitlar, bakimlar, aracMap]);

  const handleDeleteRequest = useCallback(
    (row) => {
      if (!canManage) return;
      setDeleteTarget(row);
    },
    [canManage]
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !canManage) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.tip === 'YAKIT') {
        await yakitService.yakitSil(deleteTarget.rawId);
      } else {
        await bakimService.bakimSil(deleteTarget.rawId);
      }
      toast.success(
        deleteTarget.tip === 'YAKIT' ? 'Yakıt kaydı silindi.' : 'Bakım kaydı silindi.'
      );
      setDeleteTarget(null);
      await Promise.all([verileriYukle(), fetchAraclar()]);
    } catch (err) {
      notifyApiError(err, 'Kayıt silinemedi.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Hareketler</h1>
            <Badge variant="secondary" className="tabular-nums">
              {formatLocaleNumber(rows.length, 0)} kayıt
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Yakıt ikmalleri ve servis/bakım harcamalarının birleşik defteri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span title="S6'da etkinleştirilecek" className="inline-flex cursor-not-allowed">
            <Button type="button" size="sm" disabled className="gap-1.5">
              <Plus className="size-4" />
              <Fuel className="size-3.5" />
              <span>Yeni Yakıt</span>
            </Button>
          </span>
          <span title="S6'da etkinleştirilecek" className="inline-flex cursor-not-allowed">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="gap-1.5"
            >
              <Plus className="size-4" />
              <Wrench className="size-3.5" />
              <span>Yeni Bakım</span>
            </Button>
          </span>
        </div>
      </div>

      <LedgerDataTable
        rows={rows}
        araclar={araclar}
        seciliAracId={seciliAracId}
        onVehicleChange={setSeciliAracId}
        loading={loading}
        hasLoaded={hasLoaded}
        canManage={canManage}
        onDeleteRequest={handleDeleteRequest}
      />

      {canManage && (
        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteTarget(null);
          }}
          title={
            deleteTarget?.tip === 'YAKIT'
              ? 'Yakıt kaydını sil?'
              : 'Bakım kaydını sil?'
          }
          description={
            deleteTarget
              ? `${formatTurkishPlate(deleteTarget.plaka)} • ${formatTrDateShort(deleteTarget.tarih)} • ${deleteTarget.altTur} (${formatCurrency(deleteTarget.tutar, { maximumFractionDigits: 2 })}) kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.`
              : ''
          }
          confirmLabel="Sil"
          cancelLabel="Vazgeç"
          variant="destructive"
          loading={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
