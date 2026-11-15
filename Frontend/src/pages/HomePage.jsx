import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import {
  Target, Shield, Eye, Truck, ArrowRight,
  Moon, Sun, Monitor, TrendingDown, FileBarChart
} from "lucide-react"

const visionCards = [
  {
    icon: Target,
    title: "Misyon",
    description:
      "Filo operasyonlarını dijitalleştirerek yakıt, bakım ve maliyet yönetimini tek platformda şeffaf hale getirmek."
  },
  {
    icon: Shield,
    title: "Güven",
    description:
      "Araç ve sürücü verilerinizi güvenli, şifreli altyapımızla koruyoruz. KVKK uyumlu veri işleme politikamız."
  },
  {
    icon: Eye,
    title: "Vizyon",
    description:
      "Türkiye'nin en güvenilir filo yönetim platformu olmak; küçük filolardan kurumsal yapılara tek çözüm sunmak."
  }
]

const featureCards = [
  {
    icon: Truck,
    title: "Akıllı Bakım Takvimi",
    description: "Bakım, muayene ve sigorta döngülerini tek panelde yönetin. Kritik tarihler için erken uyarı alın."
  },
  {
    icon: TrendingDown,
    title: "Anlık Maliyet Görünürlüğü",
    description: "Yakıt, bakım ve parça giderlerini anlık izleyin. Filonun km başına maliyetini net olarak görün."
  },
  {
    icon: FileBarChart,
    title: "Kurumsal Raporlama",
    description: "PDF ve Excel formatında dönemsel raporlar alın. Yönetim sunumlarınız için hazır grafikler."
  }
]

export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center no-underline font-display font-bold text-2xl tracking-tight select-none">
            <span className="text-truss-text">TRU</span>
            <span className="text-truss-purple">SS</span>
          </Link>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Tema seç">
                  {theme === "dark" && <Moon size={16} />}
                  {theme === "light" && <Sun size={16} />}
                  {theme === "system" && <Monitor size={16} />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" /> Açık
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" /> Koyu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="mr-2 h-4 w-4" /> Sistem
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/login">
              <Button variant="ghost" size="sm">Giriş Yap</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Kayıt Ol</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/4 h-[600px] w-[600px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center gap-5">
              <Skeleton className="h-6 w-48 rounded-full" />
              <Skeleton className="h-14 w-3/4 rounded-2xl" />
              <Skeleton className="h-14 w-1/2 rounded-2xl" />
              <Skeleton className="h-6 w-2/3 rounded-xl" />
              <Skeleton className="h-5 w-1/2 rounded-xl" />
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-11 w-36 rounded-xl" />
                <Skeleton className="h-11 w-28 rounded-xl" />
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Yeni nesil filo yönetimi
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Filo yönetimi için{" "}
                <span className="text-gradient-accent">tek platform</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                TRUSS ile araçlarınızı, yakıt giderlerinizi ve bakım süreçlerinizi tek panelden
                yönetin. Veriye dayalı kararlarla filonuzun maliyetini düşürün.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Ücretsiz Başla
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Giriş Yap
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Vizyon / Misyon / Güven ── */}
      <section className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-9 w-40 rounded-xl" />
                <Skeleton className="h-5 w-72 rounded-lg" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Neden TRUSS?</h2>
                <p className="mt-3 text-muted-foreground">Misyonumuz, vizyonumuz ve değerlerimiz.</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="mb-4 h-10 w-10 rounded-xl" />
                    <Skeleton className="mb-3 h-6 w-28 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md mb-2" />
                    <Skeleton className="h-4 w-5/6 rounded-md mb-2" />
                    <Skeleton className="h-4 w-4/6 rounded-md" />
                  </Card>
                ))
              : visionCards.map(({ icon: Icon, title, description }) => (
                  <Card
                    key={title}
                    className="transition-all duration-240 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </div>
      </section>

      {/* ── Özellikler ── */}
      <section className="border-t border-border/50 py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-9 w-52 rounded-xl" />
                <Skeleton className="h-5 w-64 rounded-lg" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Temel Özellikler</h2>
                <p className="mt-3 text-muted-foreground">Filonuzu yönetmek için ihtiyacınız olan her şey.</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="mb-4 h-10 w-10 rounded-xl" />
                    <Skeleton className="mb-3 h-6 w-36 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md mb-2" />
                    <Skeleton className="h-4 w-5/6 rounded-md" />
                  </Card>
                ))
              : featureCards.map(({ icon: Icon, title, description }) => (
                  <Card
                    key={title}
                    className="transition-all duration-240 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      {!loading && (
        <section className="border-t border-border/50 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Filonuzu bugün dijitalleştirin
            </h2>
            <p className="mt-4 text-muted-foreground">
              Ücretsiz hesap oluşturun, ilk aracınızı ekleyin ve farkı görün.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Hemen Başla
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Zaten hesabım var
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          © {new Date().getFullYear()} TRUSS Inc. · Filo Yönetim Platformu
        </div>
      </footer>
    </div>
  )
}
