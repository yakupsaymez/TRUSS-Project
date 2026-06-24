import React from 'react'
import { AlertTriangle, Clock, CheckCircle2, FileWarning, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATS = [
  {
    key: 'tehlike',
    label: 'Bakımı Geçen',
    icon: AlertTriangle,
    iconClass: 'text-destructive',
    valueClass: 'text-destructive',
    filtre: 'tehlike',
    clickable: true,
  },
  {
    key: 'uyari',
    label: 'Bakımı Yaklaşan',
    icon: Clock,
    iconClass: 'text-orange-400',
    valueClass: 'text-foreground',
    filtre: null,
    clickable: false,
  },
  {
    key: 'sorunsuz',
    label: 'Sorunsuz Araçlar',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    valueClass: 'text-foreground',
    filtre: null,
    clickable: false,
  },
  {
    key: 'evrakSorunu',
    label: 'Evrak Sorunu',
    icon: FileWarning,
    iconClass: 'text-orange-500',
    valueClass: 'text-foreground',
    filtre: 'evrak',
    clickable: true,
  },
  {
    key: 'gelecekAyTahmin',
    label: 'Tahmini Ay Gideri',
    icon: TrendingUp,
    iconClass: 'text-primary',
    valueClass: 'text-foreground',
    filtre: null,
    clickable: false,
    isCurrency: true,
  },
]

const DashboardStats = ({ filoOzeti, setAktifFiltre, formatTahminTL }) => {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {STATS.map(({ key, label, icon: Icon, iconClass, valueClass, filtre, clickable, isCurrency }) => {
        const raw = filoOzeti[key] ?? 0
        const display = isCurrency ? formatTahminTL(raw) : raw

        const inner = (
          <>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`size-4 shrink-0 ${iconClass}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{display}</p>
            </CardContent>
          </>
        )

        return clickable ? (
          <button
            key={key}
            type="button"
            onClick={() => setAktifFiltre(filtre)}
            className="text-left"
          >
            <Card className="h-full transition-shadow hover:shadow-md hover:border-border cursor-pointer">
              {inner}
            </Card>
          </button>
        ) : (
          <Card key={key}>
            {inner}
          </Card>
        )
      })}
    </section>
  )
}

export default DashboardStats
