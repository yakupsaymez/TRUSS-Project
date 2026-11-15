import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, CheckCircle2, FileWarning, TrendingUp } from 'lucide-react'

const STATS = [
  {
    key: 'tehlike',
    label: 'Bakımı Geçen',
    icon: AlertTriangle,
    iconClass: 'text-destructive',
    valueClass: 'text-destructive',
    href: '/vehicles?filtre=tehlike',
  },
  {
    key: 'uyari',
    label: 'Bakımı Yaklaşan',
    icon: Clock,
    iconClass: 'text-orange-400',
    valueClass: 'text-foreground',
    href: '/parcalar',
  },
  {
    key: 'sorunsuz',
    label: 'Sorunsuz Araçlar',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    valueClass: 'text-foreground',
    href: '/vehicles',
  },
  {
    key: 'evrakSorunu',
    label: 'Evrak Sorunu',
    icon: FileWarning,
    iconClass: 'text-orange-500',
    valueClass: 'text-foreground',
    href: '/vehicles?filtre=evrak',
  },
  {
    key: 'gelecekAyTahmin',
    label: 'Tahmini Ay Gideri',
    icon: TrendingUp,
    iconClass: 'text-primary',
    valueClass: 'text-foreground',
    href: '/raporlar',
    isCurrency: true,
  },
]

const DashboardStats = ({ filoOzeti, formatTahminTL }) => {
  const navigate = useNavigate()

  return (
    <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
      {STATS.map(({ key, label, icon: Icon, iconClass, valueClass, href, isCurrency }) => {
        const raw = filoOzeti[key] ?? 0
        const display = isCurrency ? formatTahminTL(raw) : raw

        return (
          <div
            key={key}
            onClick={() => navigate(href)}
            className="cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all rounded-xl"
          >
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-primary/40">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <Icon className={`size-4 shrink-0 ${iconClass}`} />
                <p className={`ml-2 text-lg font-bold tabular-nums tracking-tight ${valueClass}`}>{display}</p>
            </div>
          </div>
        )
      })}
    </section>
  )
}

export default DashboardStats
