import React from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Cog, Fuel, MapPin, Truck, Wallet } from 'lucide-react';
import { BENTO_MODULES } from './homeContent';

const MODULE_ICONS = {
  filo: Truck,
  hareketler: Fuel,
  parcalar: Cog,
  butce: Wallet,
  harita: MapPin,
  takvim: CalendarDays,
};

function ModuleDataSnippet({ type }) {
  if (type === 'filo') {
    return (
      <div className="mt-5 space-y-2 rounded-lg border border-border bg-background p-3 font-mono text-xs tabular-nums">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">34 TRS 418</span>
          <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            142.850 KM
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span>41 KCL 074 · CAT 320</span>
          <span className="font-semibold text-foreground">4.820 SMH</span>
        </div>
      </div>
    );
  }

  if (type === 'hareketler') {
    return (
      <div className="mt-5 space-y-2 rounded-lg border border-border bg-background p-3 font-mono text-xs tabular-nums">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">18.11.2026 · 380,00 L</span>
          <span className="font-semibold text-foreground">141.920 KM · ₺16.720</span>
        </div>
        <div className="flex items-center justify-between rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          <span>Giriş: 141.400 KM</span>
          <span className="font-semibold">HTTP 422 Bloke</span>
        </div>
      </div>
    );
  }

  if (type === 'parcalar') {
    return (
      <div className="mt-5 space-y-2 rounded-lg border border-border bg-background p-3 font-mono text-xs tabular-nums">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-foreground">Ön Fren Balata · 35 EGE 511</span>
          <span className="font-semibold text-destructive">%3 kaldı</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[94%] rounded-full bg-destructive" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>58.400 / 60.000 KM</span>
          <span>Maliyet: ₺18.400</span>
        </div>
      </div>
    );
  }

  if (type === 'butce') {
    return (
      <div className="mt-5 space-y-2 rounded-lg border border-border bg-background p-3 font-mono text-xs tabular-nums">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Kasım Yakıt &amp; Bakım</span>
          <span className="font-semibold text-primary">%83,8 kullanım</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[84%] rounded-full bg-primary" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Gerçekleşen: ₺419.200</span>
          <span>Bütçe: ₺500.000</span>
        </div>
      </div>
    );
  }

  if (type === 'harita') {
    return (
      <div className="mt-5 space-y-2 rounded-lg border border-border bg-background p-3 font-mono text-xs tabular-nums">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-foreground">Kocaeli · Gebze Liman</span>
          <span className="text-primary">14:20 UTC+3</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-1.5 text-[10px] text-muted-foreground">
          <span>40.7654° K · 29.9408° D</span>
          <span>16 Lojistik Üs</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-2 rounded-lg border border-border bg-background p-3 font-mono text-xs tabular-nums">
      <div className="flex items-center justify-between text-[11px]">
        <span className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-primary">
          ⌘K Doğal Dil
        </span>
        <span className="text-muted-foreground">Muayene: 12g kaldı</span>
      </div>
      <div className="truncate text-[11px] text-foreground">
        &ldquo;34 TRS 418 380L 16720TL 141920KM&rdquo;
      </div>
    </div>
  );
}

export default function HomeModulesSection() {
  return (
    <section id="moduller" className="scroll-mt-20 bg-background py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
              Modüller &amp; Veri Yüzeyleri
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Tek veri modelinde altı operasyon yüzeyi.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Araç envanterinden yakıt ve bakım defterine, parça ömür takibinden canlı konum
              bildirimine kadar tüm filo kayıtları aynı doğrulama kurallarıyla çalışır.
            </p>
          </div>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            12 PostgreSQL Tablosu · Atomik TX
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BENTO_MODULES.map((mod, idx) => {
            const Icon = MODULE_ICONS[mod.iconKey] || Truck;
            return (
              <motion.article
                key={mod.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.22, delay: idx * 0.03, ease: 'easeOut' }}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
                      {mod.code}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-base font-semibold tracking-tight text-foreground">
                    {mod.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {mod.description}
                  </p>
                </div>

                <ModuleDataSnippet type={mod.snippetType} />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
