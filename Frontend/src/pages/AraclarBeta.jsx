import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVehicleStore from '@/store/useVehicleStore';
import { formatLocaleNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AddVehicleModal } from '@/components/dashboard';
import {
  Cpu,
  ShieldAlert,
  Wrench,
  Fuel,
  Gauge,
  ArrowLeft,
  Plus,
  Activity,
  FileWarning,
  CheckCircle2,
  Eye,
  Settings2,
} from 'lucide-react';

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

const FALLBACK_TWIN_FLEET = [
  {
    arac_id: 'twin-1',
    plaka: '34 TRS 001',
    marka: 'Mercedes-Benz',
    model: 'Actros 1848 LS',
    yil: 2024,
    guncel_km: 148200,
    son_bakim_km: 135000,
    onerilen_bakim_km: 15000,
    triger_degisim_km: 200000,
    muayene_tarihi: '2026-11-28',
  },
  {
    arac_id: 'twin-2',
    plaka: '06 FL 404',
    marka: 'Ford',
    model: 'Transit 350L',
    yil: 2023,
    guncel_km: 112400,
    son_bakim_km: 110000,
    onerilen_bakim_km: 15000,
    triger_degisim_km: 120000,
    muayene_tarihi: '2027-04-15',
  },
  {
    arac_id: 'twin-3',
    plaka: '35 EGE 88',
    marka: 'Renault',
    model: 'Clio 1.5 Blue dCi',
    yil: 2022,
    guncel_km: 89400,
    son_bakim_km: 74000,
    onerilen_bakim_km: 15000,
    triger_degisim_km: 90000,
    muayene_tarihi: '2026-11-20',
  },
];

function computeTelemetryTwin(arac) {
  const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
  const birim = isSmh ? 'SMH' : 'KM';
  const sayac = Number(
    arac.guncel_sayac ?? (isSmh ? arac.guncel_calisma_saati : arac.guncel_km) ?? 0
  );
  const periyot = Number(
    (isSmh ? arac.calisma_saati_bakim : arac.onerilen_bakim_km) ||
      arac.bakim_periyodu ||
      (isSmh ? 250 : 15000)
  );
  const sonBakim =
    arac.son_bakim_km !== null && arac.son_bakim_km !== undefined
      ? Number(arac.son_bakim_km)
      : Math.max(0, sayac - Math.round(periyot * 0.45));

  const katEdilen = Math.max(0, sayac - sonBakim);
  const motorYagOmru = Math.max(0, Math.min(100, Math.round(100 - (katEdilen / periyot) * 100)));

  const trigerLimit = Number(arac.triger_degisim_km) || 120000;
  const trigerKullanim = sayac % trigerLimit;
  const trigerOmru = isSmh
    ? 88
    : Math.max(8, Math.min(100, Math.round(100 - (trigerKullanim / trigerLimit) * 100)));

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  let enYakinEvrakGun = 180;
  [arac.muayene_tarihi, arac.sigorta_tarihi, arac.kasko_tarihi].forEach((t) => {
    if (!t) return;
    const hedef = new Date(t);
    hedef.setHours(0, 0, 0, 0);
    const fark = Math.ceil((hedef - bugun) / MILLISECONDS_IN_DAY);
    if (fark < enYakinEvrakGun) enYakinEvrakGun = fark;
  });

  const evrakSkoru = enYakinEvrakGun <= 0 ? 15 : enYakinEvrakGun <= 15 ? 45 : 96;
  const saglikSkoru = Math.round(motorYagOmru * 0.45 + trigerOmru * 0.35 + evrakSkoru * 0.2);

  return {
    birim,
    sayac,
    periyot,
    motorYagOmru,
    trigerOmru,
    enYakinEvrakGun,
    saglikSkoru,
    kritikMi: saglikSkoru < 50 || motorYagOmru <= 10 || enYakinEvrakGun <= 15,
  };
}

export default function AraclarBeta({ onRevert }) {
  const navigate = useNavigate();
  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const openModal = useVehicleStore((s) => s.openModal);
  const openEditModal = useVehicleStore((s) => s.openEditModal);

  const [seciliFiltre, setSeciliFiltre] = useState('TUMU'); // TUMU | KRITIK | OPTIMAL

  useEffect(() => {
    fetchAraclar();
  }, [fetchAraclar]);

  const filoKaynagi = araclar.length > 0 ? araclar : FALLBACK_TWIN_FLEET;

  const twinKartlar = useMemo(() => {
    const mapped = filoKaynagi.map((arac) => ({
      arac,
      telemetri: computeTelemetryTwin(arac),
    }));

    if (seciliFiltre === 'KRITIK') {
      return mapped.filter((x) => x.telemetri.kritikMi);
    }
    if (seciliFiltre === 'OPTIMAL') {
      return mapped.filter((x) => !x.telemetri.kritikMi);
    }
    return mapped;
  }, [filoKaynagi, seciliFiltre]);

  return (
    <div className="min-h-full space-y-4 bg-truss-bg text-truss-text">
      {/* ÜST GARAJ KONTROL BAR'I */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-truss-border bg-truss-surface p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg border border-truss-purple/40 bg-truss-purple/15 text-truss-purple">
            <Cpu className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-truss-text">
                DIGITAL TWIN GARAGE
              </span>
              <Badge
                variant="outline"
                className="border-truss-purple/40 bg-truss-purple/10 text-[10px] font-semibold text-truss-purple"
              >
                EVREN 2 • BENTO TELEMETRİ PODLARI
              </Badge>
            </div>
            <p className="text-xs text-truss-muted">
              Şematik şasi diyagramları, canlı motor/triger ömür çubukları ve sağlık skoru matrisi
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-truss-border bg-truss-bg p-0.5">
            {[
              { key: 'TUMU', label: 'Tüm Garaj' },
              { key: 'KRITIK', label: 'Pit-Stop Bekleyen' },
              { key: 'OPTIMAL', label: 'Optimal Kondisyon' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setSeciliFiltre(f.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  seciliFiltre === f.key
                    ? 'bg-truss-purple text-truss-text'
                    : 'text-truss-muted hover:text-truss-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={openModal}
            className="h-8 gap-1.5 rounded-lg bg-truss-purple px-3 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
          >
            <Plus className="size-3.5" />
            Yeni Dijital İkiz
          </Button>

          {onRevert && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRevert}
              className="h-8 gap-1.5 rounded-lg border-truss-border bg-truss-bg px-3 text-xs text-truss-muted hover:border-truss-purple hover:text-truss-text"
            >
              <ArrowLeft className="size-3.5" />
              Tablo Görünümüne Dön
            </Button>
          )}
        </div>
      </div>

      {/* 3 BOYUTLU GÖRSEL TELEMETRİ KARTLARI (BENTO PODS) */}
      {loading && araclar.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-2xl bg-truss-surface" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {twinKartlar.map(({ arac, telemetri }) => {
            const isRealId = typeof arac.arac_id === 'number';
            return (
              <div
                key={arac.arac_id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-truss-surface p-4 shadow-xl transition-all hover:-translate-y-0.5 ${
                  telemetri.kritikMi
                    ? 'border-destructive/60 hover:border-destructive'
                    : 'border-truss-border hover:border-truss-purple'
                }`}
              >
                {/* ÜST BAŞLIK: Plaka + Model + Canlı Sağlık Skoru */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-truss-border bg-truss-bg px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-truss-text">
                        {arac.plaka}
                      </span>
                      <span className="text-xs font-medium tabular-nums text-truss-muted">
                        {arac.yil || '2024'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-truss-text">
                      {arac.marka} {arac.model}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-truss-muted">
                      Sağlık Skoru
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <Activity
                        className={`size-3.5 ${
                          telemetri.kritikMi ? 'text-destructive' : 'text-truss-purple'
                        }`}
                      />
                      <span
                        className={`font-mono text-lg font-bold tabular-nums ${
                          telemetri.kritikMi ? 'text-destructive' : 'text-truss-purple'
                        }`}
                      >
                        %{telemetri.saglikSkoru}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SAĞLIK SKORU BAR'I */}
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full border border-truss-border bg-truss-bg">
                    <div
                      style={{ width: `${telemetri.saglikSkoru}%` }}
                      className={`h-full transition-all ${
                        telemetri.kritikMi ? 'bg-destructive' : 'bg-truss-purple'
                      }`}
                    />
                  </div>
                </div>

                {/* BLUEPRINT ŞEMATİK ŞASİ & KRİTİK PARÇA NODLARI */}
                <div className="my-4 rounded-xl border border-dashed border-truss-border bg-truss-bg p-3">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-truss-muted">
                    <span>CHASSIS TELEMETRY BLUEPRINT</span>
                    <span className="font-mono tabular-nums text-truss-text">
                      {formatLocaleNumber(telemetri.sayac)} {telemetri.birim}
                    </span>
                  </div>

                  {/* Şematik İskelet Hattı */}
                  <div className="relative my-2 flex items-center justify-between px-2 py-3 before:absolute before:left-4 before:right-4 before:top-1/2 before:h-px before:-translate-y-1/2 before:border-t before:border-dashed before:border-truss-border">
                    {/* Node 1: Motor & Yağ */}
                    <div className="relative z-10 flex flex-col items-center gap-1 rounded-lg border border-truss-border bg-truss-surface px-2.5 py-1.5">
                      <span className="text-[10px] text-truss-muted">Motor / Yağ</span>
                      <span
                        className={`font-mono text-xs font-bold tabular-nums ${
                          telemetri.motorYagOmru <= 15 ? 'text-destructive' : 'text-truss-purple'
                        }`}
                      >
                        %{telemetri.motorYagOmru}
                      </span>
                    </div>

                    {/* Node 2: Triger / Tahrik */}
                    <div className="relative z-10 flex flex-col items-center gap-1 rounded-lg border border-truss-border bg-truss-surface px-2.5 py-1.5">
                      <span className="text-[10px] text-truss-muted">Triger Hattı</span>
                      <span
                        className={`font-mono text-xs font-bold tabular-nums ${
                          telemetri.trigerOmru <= 20 ? 'text-destructive' : 'text-truss-text'
                        }`}
                      >
                        %{telemetri.trigerOmru}
                      </span>
                    </div>

                    {/* Node 3: Resmi Evrak & Muayene */}
                    <div className="relative z-10 flex flex-col items-center gap-1 rounded-lg border border-truss-border bg-truss-surface px-2.5 py-1.5">
                      <span className="text-[10px] text-truss-muted">Evrak / Vize</span>
                      <span
                        className={`font-mono text-xs font-bold tabular-nums ${
                          telemetri.enYakinEvrakGun <= 15 ? 'text-destructive' : 'text-truss-text'
                        }`}
                      >
                        {telemetri.enYakinEvrakGun <= 0
                          ? 'Süre Doldu'
                          : telemetri.enYakinEvrakGun >= 180
                            ? 'Güncel'
                            : `${telemetri.enYakinEvrakGun} Gün`}
                      </span>
                    </div>
                  </div>

                  {/* Alt Uyarı Özeti */}
                  <div className="mt-1 flex items-center justify-between border-t border-truss-border pt-2 text-[11px]">
                    {telemetri.kritikMi ? (
                      <span className="flex items-center gap-1 font-medium text-destructive">
                        <ShieldAlert className="size-3.5" />
                        Pit-Stop müdahalesi öneriliyor
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-medium text-truss-muted">
                        <CheckCircle2 className="size-3.5 text-truss-purple" />
                        Tüm telemetri sensörleri nominal
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono text-truss-muted">
                      <Gauge className="size-3" />
                      Periyot: {formatLocaleNumber(telemetri.periyot)}
                    </span>
                  </div>
                </div>

                {/* HIZLI PIT-STOP AKSİYON BAR'I */}
                <div className="flex items-center justify-between gap-2 border-t border-truss-border pt-3">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/yakitlar')}
                      className="h-7 gap-1 rounded-lg border-truss-border bg-truss-bg px-2.5 text-xs text-truss-muted hover:border-truss-purple hover:text-truss-text"
                    >
                      <Fuel className="size-3 text-truss-purple" />
                      Yakıt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/bakimlar')}
                      className="h-7 gap-1 rounded-lg border-truss-border bg-truss-bg px-2.5 text-xs text-truss-muted hover:border-truss-purple hover:text-truss-text"
                    >
                      <Wrench className="size-3 text-truss-purple" />
                      Servis
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isRealId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(arac)}
                        className="h-7 px-2 text-xs text-truss-muted hover:bg-truss-bg hover:text-truss-text"
                      >
                        <Settings2 className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        isRealId ? navigate(`/arac/${arac.arac_id}`) : navigate('/bakimlar')
                      }
                      className="h-7 gap-1 rounded-lg bg-truss-purple px-2.5 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                    >
                      <Eye className="size-3" />
                      Kokpit
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddVehicleModal />
    </div>
  );
}
