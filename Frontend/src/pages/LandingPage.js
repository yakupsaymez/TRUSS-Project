import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import useAppStore from '@/store/useAppStore';

const features = [
  {
    title: 'Akilli Bakim Takvimi',
    description: 'Bakim, muayene ve sigorta dongulerini tek panelde yonetin. Kritik tarihler icin erken uyari alin.'
  },
  {
    title: 'Anlik Maliyet Gorunurlugu',
    description: 'Yakit, bakim ve parca giderlerini anlik izleyin. Filonun km basina maliyetini net olarak gorun.'
  },
  {
    title: 'Kurumsal Raporlama',
    description: 'CSV/PDF export ve ozet metriklerle operasyon kararlarini hizlandirin.'
  }
];

const LandingPage = () => {
  const { theme, toggleTheme } = useAppStore(useShallow((state) => ({
    theme: state.theme,
    toggleTheme: state.toggleTheme
  })));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/85">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-bold tracking-wide text-slate-900 dark:text-slate-100">
            TRUSS
          </Link>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              title={theme === 'dark' ? 'Acik Moda Gec' : 'Koyu Moda Gec'}
              aria-label={theme === 'dark' ? 'Acik Moda Gec' : 'Koyu Moda Gec'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">
              <Link to="/login">Giris Yap</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Enterprise Fleet SaaS
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
              ARACINIZ ICIN YAPAY ZEKA GUVENCESI.
            </h1>
            <p className="mt-5 text-base text-slate-600 sm:text-lg dark:text-slate-400">
              TRUSS, seffaf ve guvenilir ustalara acilan otonom dijital koprudur.
              Filonuzu tek panelde yonetin, riskleri erken tespit edin.
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Button asChild className="bg-[#2563EB] text-white hover:bg-[#1D4ED8]">
                <Link to="/dashboard">Ucretsiz Basla</Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">
                <Link to="/login">Demo Gor</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 pb-16 sm:px-6 md:grid-cols-3 lg:px-8">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800"
            >
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{feature.description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default LandingPage;

