import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Fuel, Wrench, BarChart3, Settings,
  Moon, Sun, Monitor, LogOut, Menu, Car, Cog, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/theme-provider'
import useAppStore from '@/store/useAppStore'
import useAuthStore from '@/store/useAuthStore'
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

const bottomBtnBase = 'w-full justify-start gap-3 text-muted-foreground hover:bg-accent/40 hover:text-foreground'

function SidebarContent({ onNavigate }) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { handleLogout, openSettingsModal, isSettingsOpen } = useAppStore(
    useShallow(s => ({
      handleLogout: s.handleLogout,
      openSettingsModal: s.openSettingsModal,
      isSettingsOpen: s.isSettingsOpen,
    }))
  )
  const { user, isAuthenticated } = useAuthStore(
    useShallow(s => ({
      user: s.user,
      isAuthenticated: s.isAuthenticated,
    }))
  )
  const userRole = user?.role || 'FLEET_MANAGER'
  const canAccessManagement = ['FLEET_MANAGER', 'SYSTEM_ADMIN'].includes(userRole)

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  const handleOpenSettings = () => {
    onNavigate?.()
    openSettingsModal(isAuthenticated)
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 shrink-0">
        <Link to="/" className="flex items-center no-underline font-display font-bold text-2xl tracking-tight select-none">
          <span className="text-truss-text">TRU</span>
          <span className="text-truss-purple">SS</span>
        </Link>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          <NavLink icon={LayoutDashboard} label="Dashboard"    href="/dashboard" exact />
          <NavLink icon={Car}             label="Araçlar"      href="/vehicles" />
          <NavLink icon={Fuel}      label="Yakıt"        href="/yakitlar" />
          <NavLink icon={Wrench}    label="Bakım"        href="/bakim" />
          <NavLink icon={Cog}       label="Parça Takibi" href="/parcalar" />
          {canAccessManagement && (
            <>
              <NavLink icon={BarChart3} label="Raporlar"      href="/raporlar" />
              <NavLink icon={Users}     label="Ekip Yönetimi" href="/ekip" />
            </>
          )}
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
          onClick={handleOpenSettings}
          aria-haspopup="dialog"
          aria-expanded={isSettingsOpen}
          className={cn(
            bottomBtnBase,
            isSettingsOpen && 'text-foreground bg-accent/50'
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
  const [open, setOpen] = React.useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
        <SidebarContent onNavigate={() => setOpen(false)} />
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
