import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Truck, Fuel, Wrench, BarChart3, Settings,
  Moon, Sun, Monitor, LogOut, Menu, ChevronDown, List, Car
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { useTheme } from '@/components/theme-provider'
import useAppStore from '@/store/useAppStore'
import { useShallow } from 'zustand/react/shallow'

const linkBase = 'relative flex items-center gap-3.5 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150'
const activeClass = 'border-primary bg-accent/50 text-foreground'
const inactiveClass = 'border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground'

function NavLink({ icon: Icon, label, href, exact = false, disabled = false, badge }) {
  const location = useLocation()
  const isActive = !disabled && (exact ? location.pathname === href : location.pathname.startsWith(href))

  return (
    <Link
      to={disabled ? '#' : href}
      onClick={e => disabled && e.preventDefault()}
      aria-current={isActive ? 'page' : undefined}
      className={cn(linkBase, isActive ? activeClass : inactiveClass, disabled && 'pointer-events-none opacity-40')}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
          {badge}
        </span>
      )}
    </Link>
  )
}

function AraclarGroup() {
  const location = useLocation()
  const isVehiclePage = location.pathname.startsWith('/arac/') || location.pathname.startsWith('/vehicle/')
  const isVehiclesList = location.pathname === '/vehicles'
  const isGroupActive = isVehiclesList || isVehiclePage

  const [open, setOpen] = useState(isGroupActive)

  useEffect(() => {
    if (isGroupActive) setOpen(true)
  }, [isGroupActive])

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          linkBase, 'w-full text-left',
          isGroupActive ? activeClass : inactiveClass
        )}
      >
        <Truck className="size-4 shrink-0" />
        <span className="flex-1">Araçlar</span>
        <ChevronDown className={cn('size-3.5 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 mt-0.5 mb-0.5 flex flex-col gap-0.5 border-l border-border/50 pl-3">
          <Link
            to="/vehicles"
            className={cn(
              'flex items-center gap-2.5 rounded-md border-l-2 px-2 py-1.5 text-xs font-medium transition-all duration-150',
              location.pathname === '/vehicles'
                ? 'border-primary bg-accent/50 text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground'
            )}
          >
            <List className="size-3.5 shrink-0" />
            <span>Araç Listesi</span>
          </Link>
          {isVehiclePage && (
            <span
              className="flex items-center gap-2.5 rounded-md border-l-2 border-primary bg-accent/50 px-2 py-1.5 text-xs font-medium text-foreground"
            >
              <Car className="size-3.5 shrink-0" />
              <span>Araç Detayı</span>
            </span>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

const bottomBtnBase = 'w-full justify-start gap-3 text-muted-foreground hover:bg-accent/40 hover:text-foreground'

function SidebarContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const { handleLogout } = useAppStore(
    useShallow(s => ({ handleLogout: s.handleLogout }))
  )
  const isAuthenticated = Boolean(localStorage.getItem('token'))
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const isSettings = location.pathname === '/settings'

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground shrink-0">
            T
          </div>
          <span className="text-sm font-bold tracking-widest text-gradient-accent">TRUSS</span>
        </Link>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          <NavLink icon={LayoutDashboard} label="Dashboard" href="/dashboard" exact />
          <AraclarGroup />
          <NavLink icon={Fuel}      label="Yakıt"    href="/yakit"    disabled badge="Yakında" />
          <NavLink icon={Wrench}    label="Bakım"    href="/bakim"    disabled badge="Yakında" />
          <NavLink icon={BarChart3} label="Raporlar" href="/raporlar" disabled badge="Yakında" />
        </nav>
      </ScrollArea>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-2 flex flex-col gap-0.5 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={bottomBtnBase}>
              <ThemeIcon className="size-4 shrink-0" />
              <span>Tema</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> Açık
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> Koyu
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" /> Sistem
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className={cn(
            bottomBtnBase,
            isSettings && 'text-foreground bg-accent/50'
          )}
        >
          <Settings className="size-4 shrink-0" />
          <span>Ayarlar</span>
        </Button>

        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLogout(navigate)}
            className="w-full justify-start gap-3 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Çıkış Yap</span>
          </Button>
        )}
      </div>
    </div>
  )
}

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menüyü aç</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 bg-sidebar border-sidebar-border" showCloseButton={false}>
        <SheetHeader className="sr-only">
          <SheetTitle>Navigasyon</SheetTitle>
        </SheetHeader>
        <SidebarContent />
      </SheetContent>
    </Sheet>
  )
}

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 md:z-30 border-r border-sidebar-border">
      <SidebarContent />
    </aside>
  )
}
