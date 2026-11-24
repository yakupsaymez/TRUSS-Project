import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HERO_CONTENT, HERO_SPECS, TRUST_STRIP_ITEMS } from './homeContent';
import HomePreviewShowcase from './HomePreviewShowcase';

export default function HomeHero({ hasSession }) {
  return (
    <section className="border-b border-border bg-background pt-14 pb-16 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="lg:col-span-5 lg:pt-2"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
              <span className="font-mono text-[11px] font-semibold tracking-wider text-primary uppercase">
                {HERO_CONTENT.eyebrow}
              </span>
            </div>

            <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
              {HERO_CONTENT.title}
            </h1>

            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {HERO_CONTENT.description}
            </p>

            <ul className="mt-6 space-y-2.5 border-l-2 border-primary/40 pl-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="tabular-nums">
                  <strong className="font-semibold text-foreground">HTTP 422 Sayaç Kilidi:</strong>{' '}
                  Geri sarma ve kronolojik tutarsızlık koruması
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="tabular-nums">
                  <strong className="font-semibold text-foreground">Çift Sayaç (KM &amp; SMH):</strong>{' '}
                  Ağır vasıta ve iş makinesi saat takibi
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="tabular-nums">
                  <strong className="font-semibold text-foreground">Çoklu Kiracı &amp; RBAC:</strong>{' '}
                  <code className="font-mono text-foreground">org_id</code> ve şoför zimmet izolasyonu
                </span>
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {hasSession ? (
                <>
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/app">
                      <span>Panele Git</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <a href="#moduller">Modülleri İncele</a>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/register">
                      <span>Hesap Oluştur</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/login">Giriş Yap</Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.05, ease: 'easeOut' }}
            className="lg:col-span-7"
          >
            <HomePreviewShowcase />
          </motion.div>
        </div>

        {/* 4'lü Ana Teknik Metrik Şeridi */}
        <div className="mt-14 overflow-hidden rounded-xl border border-border bg-card lg:mt-16">
          <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {HERO_SPECS.map((spec) => (
              <div
                key={spec.value}
                className="p-5 transition-colors hover:bg-muted/30 lg:p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-display text-lg font-bold tracking-tight text-foreground tabular-nums">
                    {spec.value}
                  </dt>
                  <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary tabular-nums">
                    {spec.metric}
                  </span>
                </div>
                <dd className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {spec.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Güven & Mimari İzolasyon Şeridi */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_STRIP_ITEMS.map((item) => (
            <div
              key={item.code}
              className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {item.code}
                </span>
                <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
                  {item.metric}
                </span>
              </div>
              <h3 className="mt-1.5 font-display text-sm font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
