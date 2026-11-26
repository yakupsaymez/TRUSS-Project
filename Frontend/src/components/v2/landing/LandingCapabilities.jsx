import React from 'react';
import { CalendarClock, ClipboardCheck, Gauge, Shield } from 'lucide-react';

const CAPABILITY_COLUMNS = [
  {
    id: 'rbac',
    icon: Shield,
    tag: 'Kiracı & Kimlik Zırhı',
    title: 'Çoklu-Kiracı İzolasyonu & Anlık Yetki İptali',
    description:
      'Her kurum org_id sınırında ayrıştırılır; 3 katmanlı rol modeli ve finans yetki anahtarıyla hassas maliyet verileri korunur.',
    bullets: [
      'SYSTEM_ADMIN, FLEET_MANAGER, DRIVER + finans yetkisi',
      'token_version ve aktif_mi ile anlık oturum sonlandırma',
      '403 ACCOUNT_DISABLED ve çapraz-kiracı erişim engeli',
    ],
  },
  {
    id: 'sayac',
    icon: Gauge,
    tag: 'Kronoloji & Analitik',
    title: 'KM / SMH Sayaç Kilidi, TCO & Anomali Motoru',
    description:
      'Binek araçlarda KM, iş makinelerinde SMH sayacı FOR UPDATE kilidiyle korunur; geriye dönük tutarsız kayıt 422 ile engellenir.',
    bullets: [
      '422 SAYAC_KRONOLOJI_IHLALI satır içi doğrulama',
      'TCO analizi, yakıt anomali tespiti ve parça kalan_km takibi',
      'UTF-8 BOM ve OWASP formül enjeksiyon korumalı CSV dışa aktarım',
    ],
  },
  {
    id: 'zimmet',
    icon: ClipboardCheck,
    tag: 'Saha & Bakım Döngüsü',
    title: 'Fotoğraflı Dijital Zimmet & Tek-TX İş Emri',
    description:
      'Sürücüye tek aktif zimmet kuralıyla araç teslim edilir; muayene kusurları aynı veritabanı işleminde arıza iş emrine dönüşür.',
    bullets: [
      'En fazla 4 görselli dijital teslim/iade muayene tutanağı',
      'KRITIK ve KUSURLU bulgulardan otomatik arıza iş emri',
      'İş emri kapanışında atomik bakım kaydı ve sayaç senkronu',
    ],
  },
  {
    id: 'kasa',
    icon: CalendarClock,
    tag: 'Belge & Uyumluluk',
    title: 'SigV4 / HMAC Belge Kasası & UTC+3 Takvim',
    description:
      'Fatura, ruhsat ve muayene belgeleri kiracı yolunda saklanır; muayene ve sigorta vadeleri UTC+3 takviminde izlenir.',
    bullets: [
      'AWS SigV4 ve yerel HMAC imzalı süreli belge erişimi (docVault)',
      'UTC+3 Türkiye saatine sabitlenmiş vade ve aciliyet takvimi',
      'X-Request-Id izleme ve değiştirilemez denetim kaydı (audit log)',
    ],
  },
];

export default function LandingCapabilities() {
  return (
    <section id="yetenekler" className="border-b border-border/70 bg-muted/20 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
        <div className="max-w-2xl space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Çekirdek Platform Yetenekleri
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Sahadan Finans Raporlamasına Uçtan Uca Mimari
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Her modül, üretim ortamında doğrulanan veritabanı kısıtları ve kiracı izolasyonu
            standartları üzerine kuruludur.
          </p>
        </div>

        <div id="mimari-guvenlik" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITY_COLUMNS.map((col) => {
            const Icon = col.icon;
            return (
              <article
                key={col.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">{col.tag}</span>
                  </div>

                  <h3 className="text-base font-semibold leading-snug text-card-foreground">
                    {col.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{col.description}</p>
                </div>

                <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs text-foreground">
                  {col.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <span className="leading-relaxed text-muted-foreground">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
