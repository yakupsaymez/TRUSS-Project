import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const chartConfig = {
  toplam_yakit: { label: 'Yakıt (TL)', color: 'var(--chart-1)' },
  toplam_bakim: { label: 'Bakım (TL)', color: 'var(--chart-2)' },
}

const AY_ETIKET = {
  '01': 'Oca', '02': 'Şub', '03': 'Mar', '04': 'Nis',
  '05': 'May', '06': 'Haz', '07': 'Tem', '08': 'Ağu',
  '09': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
}

function formatAy(ayStr) {
  if (!ayStr) return ''
  const [, mm] = ayStr.split('-')
  return AY_ETIKET[mm] ?? ayStr
}

export function ChartAreaInteractive({ data = [] }) {
  const [aralik, setAralik] = React.useState('6ay')

  const filtered = React.useMemo(() => {
    if (!data.length) return []
    const sorted = [...data].sort((a, b) => a.ay.localeCompare(b.ay))
    if (aralik === '3ay') return sorted.slice(-3)
    if (aralik === '1ay') return sorted.slice(-1)
    return sorted
  }, [data, aralik])

  const chartRows = filtered.map(r => ({
    ay: formatAy(r.ay),
    toplam_yakit: Math.round(Number(r.toplam_yakit) || 0),
    toplam_bakim: Math.round(Number(r.toplam_bakim) || 0),
  }))

  const hasData = chartRows.some(r => r.toplam_yakit > 0 || r.toplam_bakim > 0)

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Aylık Gider Trendi</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Yakıt ve bakım giderlerinin aylık dağılımı</CardDescription>
        </div>
        <Select value={aralik} onValueChange={setAralik}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6ay">Son 6 ay</SelectItem>
            <SelectItem value="3ay">Son 3 ay</SelectItem>
            <SelectItem value="1ay">Bu ay</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasData ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            Bu dönem için henüz gider kaydı bulunmuyor.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <AreaChart data={chartRows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="yakitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="bakimGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
              <XAxis dataKey="ay" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="toplam_yakit" stroke="var(--chart-1)" strokeWidth={2} fill="url(#yakitGrad)" dot={false} />
              <Area type="monotone" dataKey="toplam_bakim" stroke="var(--chart-2)" strokeWidth={2} fill="url(#bakimGrad)" dot={false} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
