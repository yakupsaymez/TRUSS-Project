import React from 'react';
import { Check } from 'lucide-react';
import { ARCHITECTURE_GUARANTEES, WORKFLOW_STEPS } from './homeContent';

export default function HomeArchitectureSection() {
  return (
    <section
      id="nasil-calisir"
      className="scroll-mt-20 border-t border-border bg-background py-20 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
              Nasıl Çalışır
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
              Kurulumdan günlük saha kontrolüne dört adım.
            </h2>

            <ol className="mt-10 space-y-8 border-l border-border pl-6">
              {WORKFLOW_STEPS.map((item) => (
                <li key={item.step}>
                  <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                    {item.step}
                  </span>
                  <h3 className="mt-1.5 font-display text-base font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div id="mimari" className="scroll-mt-24 lg:col-span-6">
            <p className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
              Mimari & Güvenlik
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
              Veri tutarlılığı arayüze değil, sunucuya emanettir.
            </h2>

            <ul className="mt-10 divide-y divide-border border-y border-border">
              {ARCHITECTURE_GUARANTEES.map((item) => (
                <li key={item.title} className="flex items-start gap-3.5 py-5">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
