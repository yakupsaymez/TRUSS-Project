import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Monitor, Sun, Car, TrendingDown, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';

const features = [
    {
        icon: Car,
        title: 'Akıllı Bakım Takvimi',
        description:
            'Bakım, muayene ve sigorta döngülerini tek panelde yönetin. Kritik tarihler için erken uyarı alın.'
    },
    {
        icon: TrendingDown,
        title: 'Anlık Maliyet Görünürlüğü',
        description:
            'Yakıt, bakım ve parça giderlerini anlık izleyin. Filonun km başına maliyetini net olarak görün.'
    },
    {
        icon: FileBarChart,
        title: 'Kurumsal Raporlama',
        description:
            'Özet metrikler ve gelişmiş analizlerle operasyon kararlarını hızlandırın.'
    }
];

const LandingPage = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            {/* ── HEADER ── */}
            <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/90">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link
                        to="/"
                        className="text-lg font-extrabold tracking-widest text-zinc-900 no-underline dark:text-zinc-100"
                    >
                        TRUSS
                    </Link>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full"
                                    aria-label="Tema seç"
                                >
                                    {theme === 'dark' && <Moon className="h-4 w-4" />}
                                    {theme === 'light' && <Sun className="h-4 w-4" />}
                                    {theme === 'system' && <Monitor className="h-4 w-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setTheme('light')}>
                                    <Sun className="mr-2 h-4 w-4" />
                                    Açık
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('dark')}>
                                    <Moon className="mr-2 h-4 w-4" />
                                    Koyu
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('system')}>
                                    <Monitor className="mr-2 h-4 w-4" />
                                    Sistem
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button asChild variant="outline">
                            <Link to="/login">Giriş Yap</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main>
                {/* ── HERO ── */}
                <section className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pt-28">
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="mb-5 inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            Enterprise Fleet SaaS
                        </span>

                        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-50">
                            Filonuz için{' '}
                            <span className="text-indigo-600 dark:text-indigo-400">
                                tek platform.
                            </span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-500 sm:text-lg dark:text-zinc-400">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">TRUSS</span>;
                            {' '}şeffaf ve güvenilir ustalara açılan dijital köprüdür.
                            Araçlarınızı tek panelde yönetin, riskleri erken tespit edin.
                        </p>

                        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Button
                                asChild
                                className="w-full bg-indigo-600 text-white hover:bg-indigo-500 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-400"
                            >
                                <Link to="/login">Giriş Yap</Link>
                            </Button>

                            <Button asChild variant="outline" className="w-full sm:w-auto">
                                <Link to="/register">Kayıt Ol</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        {features.map(({ icon: Icon, title, description }) => (
                            <Card
                                key={title}
                                className="border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <CardHeader className="pb-3">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
                                        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                        {title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                        {description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            </main>

            {/* ── FOOTER ── */}
            <footer className="border-t border-zinc-200 py-6 dark:border-zinc-800">
                <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
                    © {new Date().getFullYear()} TRUSS. Tüm hakları saklıdır.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
