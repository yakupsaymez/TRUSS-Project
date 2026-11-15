import React, { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import Sidebar, { MobileSidebar } from './Sidebar'
import SettingsModal from '@/components/SettingsModal'
import useAppStore from '@/store/useAppStore'
import useAuthStore from '@/store/useAuthStore'

const routeTitleMap = {
  '/dashboard': 'Dashboard',
  '/vehicles': 'Araçlar',
  '/yakit': 'Yakıt',
  '/yakitlar': 'Yakıt',
  '/bakim': 'Bakım',
  '/bakimlar': 'Bakım',
  '/parcalar': 'Parça Takibi',
  '/parts': 'Parça Takibi',
  '/raporlar': 'Raporlar',
  '/reports': 'Raporlar',
  '/ekip': 'Ekip Yönetimi',
  '/settings': 'Ayarlar',
}

export default function AppLayout({ children }) {
  const location = useLocation()

  const title = useMemo(() => {
    if (location.pathname.startsWith('/arac/') || location.pathname.startsWith('/vehicle/')) {
      return 'Araç Detay'
    }
    return routeTitleMap[location.pathname] || 'Dashboard'
  }, [location.pathname])

  const { syncPreferenceSummary, cleanupSettingsTimer } = useAppStore(
    useShallow(s => ({
      syncPreferenceSummary: s.syncPreferenceSummary,
      cleanupSettingsTimer: s.cleanupSettingsTimer,
    }))
  )

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    syncPreferenceSummary(isAuthenticated)
  }, [isAuthenticated, syncPreferenceSummary])

  useEffect(() => () => cleanupSettingsTimer(), [cleanupSettingsTimer])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main area — offset by sidebar width on md+ */}
      <div className="flex flex-1 flex-col md:ml-60">
        {/* Top header bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 sm:px-6">
          {/* Mobile hamburger */}
          <MobileSidebar />

          {/* Dynamic Title */}
          <h1 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h1>
        </header>

        {/* Page content */}
        <main
          key={location.pathname}
          className="flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>

      <SettingsModal />
    </div>
  )
}
