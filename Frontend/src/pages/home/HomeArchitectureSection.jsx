import React from 'react';
import { motion } from 'motion/react';
import { Check, ShieldCheck } from 'lucide-react';
import { ARCHITECTURE_GUARANTEES, WORKFLOW_STEPS } from './homeContent';

export default function HomeArchitectureSection() {
  return (
    <section
      id="nasil-calisir"
      className="scroll-mt-20 border-t border-border bg-background py-20 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <p className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
              Nasıl Çalışır
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
              Kurulumdan günlük saha kontrolüne dört adım.
            </h2>

            <ol className="mt-8 space-y-4">
              {WORKFLOW_STEPS.map((item, idx) => (
                <motion.li
                  key={item.step}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.2, delay: idx * 0.04, ease: 'easeOut' }}
                  className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                      ADIM {item.step}
                    </span>
                    <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground tabular-nums">
                      {item.metric}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-base font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </motion.li>
              ))}
            </ol>
          </div>

          <div id="mimari" className="scroll-mt-24 lg:col-span-6">
            <p className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
              Mimari &amp; Güvenlik
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
              Veri tutarlılığı arayüze değil, sunucuya emanettir.
            </h2>

            <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                  <span className="font-mono text-xs font-semibold text-foreground">
                    SUNUCU DOĞRULAMA GARANTİLERİ
                  </span>
                </div>
                <span className="font-mono text-[11px] text-primary tabular-nums">
                  PostgreSQL · Raw SQL TX
                </span>
              </div>

              <ul className="divide-y divide-border">
                {ARCHITECTURE_GUARANTEES.map((item) => (
                  <li
                    key={item.title}
                    className="flex items-start gap-3.5 p-5 transition-colors hover:bg-muted/20"
                  >
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
                      <Check className="size-3.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
                          {item.title}
                        </h3>
                        <span className="font-mono text-[10px] font-medium text-muted-foreground tabular-nums">
                          {item.code}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
