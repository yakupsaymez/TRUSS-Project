import React from 'react';
import { CalendarDays, Cog, Fuel, MapPin, Truck, Wallet } from 'lucide-react';
import { MODULES } from './homeContent';

const MODULE_ICONS = {
  filo: Truck,
  hareketler: Fuel,
  parcalar: Cog,
  butce: Wallet,
  harita: MapPin,
  takvim: CalendarDays,
};

export default function HomeModulesSection() {
  return (
    <section id="moduller" className="scroll-mt-20 bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
            Modüller
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tek veri modelinde altı operasyon yüzeyi.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Araç envanterinden yakıt ve bakım defterine, parça ömür takibinden canlı konum
            bildirimine kadar tüm filo kayıtları aynı doğrulama kurallarıyla çalışır.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => {
            const Icon = MODULE_ICONS[mod.iconKey] || Truck;
            return (
              <div key={mod.title} className="bg-card p-7 lg:p-8">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-5 font-display text-base font-semibold tracking-tight text-foreground">
                  {mod.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {mod.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
