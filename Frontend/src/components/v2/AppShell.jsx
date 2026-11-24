import React, { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ContentFallback } from './app-shell/appShellHelpers';
import { useAppShellState } from './app-shell/useAppShellState';
import AppShellSidebar from './app-shell/AppShellSidebar';
import AppShellHeader from './app-shell/AppShellHeader';

const CommandPalette = lazy(() => import('@/components/v2/CommandPalette'));
const MovementSheet = lazy(() => import('@/components/v2/MovementSheet'));
const ComponentSheet = lazy(() => import('@/components/v2/ComponentSheet'));
const VehicleSheet = lazy(() => import('@/components/v2/VehicleSheet'));

export default function AppShell() {
  const {
    navigate,
    theme,
    setTheme,
    isDark,
    handleLogout,
    araclar,
    seciliAracId,
    setSeciliAracId,
    seciliArac,
    selectValue,
    role,
    canManage,
    canAddFuel,
    canAddMaintenance,
    paletteOpen,
    setPaletteOpen,
    vehicleSheetOpen,
    setVehicleSheetOpen,
    movementSheetState,
    setMovementSheetState,
    componentSheetState,
    setComponentSheetState,
    visibleNavItems,
    kritikAraclar,
    normalizedPath,
    currentRouteLabel,
    userName,
    userEmail,
    userInitials,
    handleVehicleSelectChange,
    handleKritikAracClick,
    notifyDataChanged,
    handlePaletteSelectVehicle,
    handleOpenMovementSheet,
    handleOpenComponentSheet,
    handleOpenVehicleSheet,
  } = useAppShellState();

  return (
    <TooltipProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <SidebarProvider>
          <AppShellSidebar
            visibleNavItems={visibleNavItems}
            normalizedPath={normalizedPath}
            kritikAraclar={kritikAraclar}
            onKritikAracClick={handleKritikAracClick}
            userName={userName}
            userEmail={userEmail}
            userInitials={userInitials}
            role={role}
            theme={theme}
            setTheme={setTheme}
            onNavigate={navigate}
            onLogout={handleLogout}
          />

          <SidebarInset className="flex min-w-0 flex-1 flex-col bg-background">
            <AppShellHeader
              seciliArac={seciliArac}
              normalizedPath={normalizedPath}
              currentRouteLabel={currentRouteLabel}
              onClearVehicle={() => setSeciliAracId(null)}
              selectValue={selectValue}
              onVehicleSelectChange={handleVehicleSelectChange}
              araclar={araclar}
              onOpenPalette={() => setPaletteOpen(true)}
              isDark={isDark}
              onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
              role={role}
            />

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <main className="flex-1 p-4 sm:p-6">
                <Suspense fallback={<ContentFallback />}>
                  <Outlet />
                </Suspense>
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>

      <Suspense fallback={null}>
        {paletteOpen && (
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            canManage={canManage}
            canAddFuel={canAddFuel}
            canAddMaintenance={canAddMaintenance}
            visibleNavItems={visibleNavItems}
            araclar={araclar}
            seciliAracId={seciliAracId}
            onNavigate={(path) => navigate(path)}
            onSelectVehicle={handlePaletteSelectVehicle}
            onOpenMovementSheet={handleOpenMovementSheet}
            onOpenComponentSheet={handleOpenComponentSheet}
            onOpenVehicleSheet={handleOpenVehicleSheet}
          />
        )}
        {movementSheetState.open && (
          <MovementSheet
            open={movementSheetState.open}
            onOpenChange={(nextOpen) =>
              setMovementSheetState((prev) =>
                nextOpen
                  ? { ...prev, open: true }
                  : { open: false, initialTip: 'YAKIT', prefill: null }
              )
            }
            mode="create"
            initialTip={movementSheetState.initialTip}
            record={null}
            prefill={movementSheetState.prefill}
            araclar={araclar}
            defaultAracId={seciliAracId}
            canAddFuel={canAddFuel}
            canAddMaintenance={canAddMaintenance}
            onSuccess={() => notifyDataChanged('movement')}
          />
        )}
        {canManage && vehicleSheetOpen && (
          <VehicleSheet
            open={vehicleSheetOpen}
            onOpenChange={setVehicleSheetOpen}
            arac={null}
            onSuccess={() => notifyDataChanged('vehicle')}
          />
        )}
        {canManage && componentSheetState.open && (
          <ComponentSheet
            open={componentSheetState.open}
            onOpenChange={(nextOpen) =>
              setComponentSheetState((prev) =>
                nextOpen ? { ...prev, open: true } : { open: false, prefill: null }
              )
            }
            mode="create"
            parca={null}
            prefill={componentSheetState.prefill}
            araclar={araclar}
            defaultAracId={seciliAracId}
            onSuccess={() => notifyDataChanged('component')}
          />
        )}
      </Suspense>
    </TooltipProvider>
  );
}
