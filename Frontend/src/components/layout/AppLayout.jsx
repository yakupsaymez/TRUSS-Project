import React, { useEffect, useMemo } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import Sidebar, { MobileSidebar } from './Sidebar'
import SettingsModal from '@/components/SettingsModal'
import useAppStore from '@/store/useAppStore'

const breadcrumbMap = {
  '/dashboard': 'Dashboard',
  '/arac':      'Araç Detay',
}

function Breadcrumb() {
  const location = useLocation()

  const crumbs = useMemo(() => {
    const list = [{ label: 'TRUSS', href: '/' }]
    if (location.pathname.startsWith('/arac/') || location.pathname.startsWith('/vehicle/')) {
      list.push({ label: 'Dashboard', href: '/dashboard' })
      list.push({ label: 'Araç Detay', href: null })
    } else if (location.pathname.startsWith('/settings')) {
      list.push({ label: 'Ayarlar', href: null })
    } else if (location.pathname.startsWith('/vehicles')) {
      list.push({ label: 'Araç Listesi', href: null })
    } else if (location.pathname.startsWith('/dashboard')) {
      list.push({ label: 'Dashboard', href: null })
    }
    return list
  }, [location.pathname])

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb.label}>
          {i > 0 && <span className="select-none text-border">•</span>}
          {crumb.href
            ? <Link to={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</Link>
            : <span className="font-medium text-foreground">{crumb.label}</span>
          }
        </React.Fragment>
      ))}
    </nav>
  )
}

export default function AppLayout({ children }) {
  const location = useLocation()

  const { syncPreferenceSummary, cleanupSettingsTimer } = useAppStore(
    useShallow(s => ({
      syncPreferenceSummary: s.syncPreferenceSummary,
      cleanupSettingsTimer: s.cleanupSettingsTimer,
    }))
  )

  const isAuthenticated = Boolean(localStorage.getItem('token'))

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

          {/* Breadcrumb */}
          <Breadcrumb />
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
