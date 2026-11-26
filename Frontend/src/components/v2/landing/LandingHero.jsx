import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Lock, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PREVIEW_TABS = [
  {
    id: 'sayac', label: 'Filo & Sayaç (KM/SMH)', title: 'Kronolojik Sayaç & TCO Denetimi', badge: '422 Korumalı',
    metrics: [{ label: 'Sayaç Birimi', value: 'KM / SMH' }, { label: 'Kilitleme', value: 'FOR UPDATE' }, { label: 'Anomali Kuralı', value: 'Litre / KM' }],
    rows: [
      { code: '34 TRS 042', detail: '148.240 km — Kronoloji doğrulandı', tone: 'text-status-success' },
      { code: 'EX-210 SMH', detail: '4.120 smh — Periyodik bakım eşiği', tone: 'text-status-warning' },
      { code: 'CSV Dışa Aktar', detail: 'UTF-8 BOM + OWASP formül zırhı', tone: 'text-primary' },
    ],
  },
  {
    id: 'zimmet', label: 'Zimmet & İş Emri', title: 'Fotoğraflı Muayene & Tek-TX İş Emri', badge: 'Tek-TX Atomik',
    metrics: [{ label: 'Kanıt Limiti', value: '<= 4 Görsel' }, { label: 'Aktif Zimmet', value: '1 Sürücü / 1' }, { label: 'Arıza Akışı', value: 'Otomatik TX' }],
    rows: [
      { code: 'Zimmet No 108', detail: 'Teslim muayenesi — 3 görsel imzalı', tone: 'text-status-success' },
      { code: 'İş Emri No 419', detail: 'KRITIK bulgu -> öncelik: kritik', tone: 'text-status-danger' },
      { code: 'Tamamlama', detail: 'Bakım kaydı + sayaç senkronu', tone: 'text-primary' },
    ],
  },
  {
    id: 'kasa', label: 'Kiracı & Belge Kasası', title: 'Çoklu-Kiracı İzolasyonu & DocVault', badge: 'SigV4 / HMAC',
    metrics: [{ label: 'Kiracı Sınırı', value: 'org_id = $N' }, { label: 'Yetki İptali', value: 'token_version' }, { label: 'Takvim Dilimi', value: 'UTC+3 TR' }],
    rows: [
      { code: 'org_12/arac', detail: 'İmzalı URL — Süreli erişim anahtarı', tone: 'text-status-success' },
      { code: 'Rol Matrisi', detail: 'SYSTEM_ADMIN / FLEET / DRIVER', tone: 'text-primary' },
      { code: 'Uyumluluk', detail: 'Muayene & sigorta vade takibi', tone: 'text-status-warning' },
    ],
  },
];

const HERO_PILLARS = [
  { icon: Lock, tone: 'text-primary', title: 'org_id İzolasyon', desc: 'Kiracı sınırında katı RBAC' },
  { icon: CheckCircle2, tone: 'text-status-success', title: '422 Sayaç Kilidi', desc: 'Geriye dönük sapma engeli' },
  { icon: Wrench, tone: 'text-primary', title: 'Tek-TX İş Emri', desc: 'Muayeneden bakıma atomik akış' },
];

export default function LandingHero({ hasSession }) {
  const [activeTab, setActiveTab] = useState('sayac');
  const current = PREVIEW_TABS.find((t) => t.id === activeTab) || PREVIEW_TABS[0];

  return (
    <section className="relative border-b border-border/70 bg-background py-14 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
            <span>Çoklu-Kiracı Kurumsal Filo &amp; Varlık Operasyonu</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Filo, İş Makinesi ve Zimmet Operasyonunda{' '}
            <span className="text-primary">Denetlenebilir Kontrol</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            TRUSS; organizasyon bazlı veri izolasyonu, kronolojik KM/SMH sayaç koruması, fotoğraflı
            dijital zimmet muayenesi ve imzalı belge kasasını tek kurumsal kabukta birleştirir.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to={hasSession ? '/app' : '/login'}>
                <span>{hasSession ? 'Yönetim Paneline Dön' : 'Kurumsal Giriş'}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#yetenekler">Mimari Yetenekleri İncele</a>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-border pt-5 text-xs">
            {HERO_PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Icon className={`size-3.5 ${item.tone}`} aria-hidden="true" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap gap-1.5 border-b border-border bg-muted/40 p-2">
              {PREVIEW_TABS.map((tab) => {
                const isActive = tab.id === current.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={isActive}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-card-foreground">{current.title}</h2>
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {current.badge}
                </span>
              </div>
              <svg viewBox="0 0 360 72" className="h-18 w-full rounded-lg border border-border bg-background/60 p-2" aria-hidden="true">
                <rect x="8" y="14" width="96" height="44" rx="8" className="fill-card stroke-border" strokeWidth="1.2" />
                <rect x="132" y="14" width="96" height="44" rx="8" className="fill-primary/15 stroke-primary" strokeWidth="1.4" />
                <rect x="256" y="14" width="96" height="44" rx="8" className="fill-card stroke-border" strokeWidth="1.2" />
                <line x1="104" y1="36" x2="132" y2="36" className="stroke-primary" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="228" y1="36" x2="256" y2="36" className="stroke-primary" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="24" cy="36" r="5" className="fill-status-success" />
                <circle cx="148" cy="36" r="5" className="fill-primary" />
                <circle cx="272" cy="36" r="5" className="fill-status-success" />
                <rect x="36" y="32" width="52" height="8" rx="3" className="fill-primary/15" />
                <rect x="160" y="32" width="52" height="8" rx="3" className="fill-primary/15" />
                <rect x="284" y="32" width="52" height="8" rx="3" className="fill-primary/15" />
              </svg>
              <div className="grid grid-cols-3 gap-2">
                {current.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg border border-border bg-background/50 p-2.5">
                    <p className="text-[11px] text-muted-foreground">{m.label}</p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-foreground tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {current.rows.map((row) => (
                  <div key={row.code} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs">
                    <span className="font-mono font-medium text-foreground tabular-nums">{row.code}</span>
                    <span className={`truncate font-medium ${row.tone}`}>{row.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
