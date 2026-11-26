import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Lock, ShieldCheck } from 'lucide-react';
import CorporateContactCard from '@/components/v2/CorporateContactCard';
import LegalDocsModal from '@/components/v2/LegalDocsModal';
import { Button } from '@/components/ui/button';

const LEGAL_TRIGGERS = [
  { tab: 'kvkk', label: 'KVKK 6698 Aydınlatma', icon: ShieldCheck },
  { tab: 'gizlilik', label: 'Gizlilik & Veri Güvenliği', icon: Lock },
  { tab: 'kosullar', label: 'Hizmet & SLA Koşulları', icon: FileText },
];

export default function LandingFooterContact({ hasSession }) {
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('kvkk');

  const handleOpenLegal = (tab) => {
    setLegalTab(tab);
    setLegalOpen(true);
  };

  return (
    <footer id="iletisim" className="bg-background py-14 sm:py-16">
      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Kurumsal İletişim &amp; Uyumluluk
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Destek, Veri Sorumlusu ve Yasal Metinler
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Kurumsal iletişim kanallarına ve 6698 sayılı KVKK aydınlatma, veri güvenliği ile
              SLA dokümanlarına buradan doğrudan erişebilirsiniz.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" className="gap-1.5">
                <Link to={hasSession ? '/app' : '/login'}>
                  <span>{hasSession ? 'Yönetim Paneline Dön' : 'Kurumsal Giriş'}</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
              {!hasSession ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/register">Organizasyon Oluştur</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <CorporateContactCard />

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-xs font-semibold text-foreground">
                Yasal Metinler ve Platform Politikaları
              </p>
              <div className="flex flex-wrap gap-2">
                {LEGAL_TRIGGERS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.tab}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenLegal(item.tab)}
                      className="gap-1.5 text-xs"
                    >
                      <Icon className="size-3.5 text-primary" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 font-semibold">
            <span>
              <span className="text-foreground">TRU</span>
              <span className="text-primary">SS</span>
            </span>
            <span className="font-normal text-muted-foreground">
              Kurumsal Filo &amp; Varlık Yönetimi Platformu
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#yetenekler" className="transition-colors hover:text-foreground">
              Yetenekler
            </a>
            <a href="#mimari-guvenlik" className="transition-colors hover:text-foreground">
              Mimari &amp; Güvenlik
            </a>
            <Link to={hasSession ? '/app' : '/login'} className="transition-colors hover:text-foreground">
              {hasSession ? 'Panel' : 'Giriş'}
            </Link>
          </div>
        </div>
      </div>

      <LegalDocsModal
        key={legalTab}
        open={legalOpen}
        onOpenChange={setLegalOpen}
        defaultTab={legalTab}
      />
    </footer>
  );
}
