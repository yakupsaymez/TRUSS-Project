import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HERO_CONTENT, HERO_SPECS } from './homeContent';

export default function HomeHero({ hasSession }) {
  return (
    <section className="bg-background pt-20 pb-16 lg:pt-28 lg:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
            {HERO_CONTENT.eyebrow}
          </p>

          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            {HERO_CONTENT.title}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {HERO_CONTENT.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
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
        </div>

        <div className="mt-16 border-y border-border lg:mt-20">
          <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {HERO_SPECS.map((spec) => (
              <div key={spec.value} className="px-4 py-6 lg:px-6 lg:py-7">
                <dt className="font-display text-lg font-semibold tracking-tight text-foreground tabular-nums">
                  {spec.value}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {spec.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
