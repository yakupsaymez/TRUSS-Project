import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Cog, Lock, ShieldCheck, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PREVIEW_TABS } from './homeContent';

const TAB_ICONS = {
  filo: Truck,
  odometer: AlertTriangle,
  parca: Cog,
  rbac: ShieldCheck,
};

function FiloTabBody({ rows }) {
  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div
          key={row.plate}
          className="flex flex-col justify-between gap-2.5 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
                {row.plate}
              </span>
              <span className="truncate text-xs text-muted-foreground">{row.model}</span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
              {row.docStatus} · {row.nextService}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs font-semibold text-foreground tabular-nums">
              {row.meter}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'font-mono text-[11px] tabular-nums',
                row.tone === 'destructive'
                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                  : row.tone === 'primary'
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
              )}
            >
              {row.statusText}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function OdometerTabBody({ guardCase }) {
  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted-foreground">ÖNCEKİ DOĞRULANMIŞ KAYIT</span>
            <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-sm font-semibold text-foreground tabular-nums">
            {guardCase.prevRecord.km}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
            {guardCase.prevRecord.date} · {guardCase.prevRecord.type}
          </p>
        </div>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-destructive">
              REDDEDİLEN GİRİŞ
            </span>
            <AlertTriangle className="size-3.5 text-destructive" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-sm font-semibold text-destructive tabular-nums">
            {guardCase.attemptedRecord.km}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
            {guardCase.attemptedRecord.date} · Alt Sınır: {guardCase.nextFloor}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-destructive/40 bg-card p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-destructive tabular-nums">
            {guardCase.errorCode}
          </span>
          <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
            TX :: ROLLBACK
          </span>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-foreground">{guardCase.errorTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground tabular-nums">
          {guardCase.errorDetail}
        </p>
      </div>
    </div>
  );
}

function ParcaTabBody({ parts }) {
  return (
    <div className="divide-y divide-border">
      {parts.map((part) => (
        <div key={`${part.plate}-${part.name}`} className="space-y-2 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground tabular-nums">
                {part.plate}
              </span>
              <span className="text-xs font-medium text-foreground">{part.name}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
              <span className="text-muted-foreground">{part.cost}</span>
              <span
                className={cn(
                  'font-semibold',
                  part.tone === 'destructive' ? 'text-destructive' : 'text-primary'
                )}
              >
                %{part.remainingPct} ömür
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                style={{ width: `${Math.max(6, part.remainingPct)}%` }}
                className={cn(
                  'h-full rounded-full transition-all',
                  part.tone === 'destructive' ? 'bg-destructive' : 'bg-primary'
                )}
              />
            </div>
            <span className="w-36 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
              {part.usage}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RbacTabBody({ roles }) {
  return (
    <div className="divide-y divide-border">
      {roles.map((item) => (
        <div key={item.role} className="space-y-2 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock className="size-3.5 text-primary" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold text-foreground">{item.role}</span>
              <span className="text-xs text-muted-foreground">({item.label})</span>
            </div>
            <span className="font-mono text-[11px] text-primary tabular-nums">org_id = 1042</span>
          </div>
          <p className="text-xs text-muted-foreground">{item.scope}</p>
          <div className="flex flex-wrap gap-1.5">
            {item.perms.map((perm) => (
              <span
                key={perm}
                className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground tabular-nums"
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePreviewShowcase() {
  const [activeTabId, setActiveTabId] = useState(PREVIEW_TABS[0].id);
  const activeTab = PREVIEW_TABS.find((t) => t.id === activeTabId) || PREVIEW_TABS[0];

  return (
    <div
      id="onizleme"
      className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center">
        <div
          role="tablist"
          aria-label="Canlı ürün yüzeyi önizlemesi"
          className="flex flex-wrap items-center gap-1.5"
        >
          {PREVIEW_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id] || Truck;
            const isSelected = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  isSelected
                    ? 'border-primary/40 bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {activeTab.endpoint}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">
            {activeTab.summary.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {activeTab.summary.subtitle}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-right">
          <span className="block text-[10px] font-medium text-muted-foreground uppercase">
            {activeTab.summary.kpiLabel}
          </span>
          <span className="font-mono text-xs font-semibold text-primary tabular-nums">
            {activeTab.summary.kpiValue}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {activeTab.id === 'filo' && <FiloTabBody rows={activeTab.rows} />}
          {activeTab.id === 'odometer' && <OdometerTabBody guardCase={activeTab.guardCase} />}
          {activeTab.id === 'parca' && <ParcaTabBody parts={activeTab.parts} />}
          {activeTab.id === 'rbac' && <RbacTabBody roles={activeTab.roles} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
