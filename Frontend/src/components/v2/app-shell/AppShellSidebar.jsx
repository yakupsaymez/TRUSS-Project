import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronsUpDown,
  LaptopMinimal,
  LogOut,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { hesaplaBakimDurumu } from '@/utils/aracDurum';
import { formatTurkishPlate } from '@/utils/formatters';
import SidebarEdgeToggle from '@/components/shadcn-studio/blocks/sidebar-edge-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/motion-toggle-group';
import { cn } from '@/lib/utils';
import { RoleBadge } from './appShellHelpers';

export default function AppShellSidebar({
  visibleNavItems,
  normalizedPath,
  kritikAraclar,
  onKritikAracClick,
  userName,
  userEmail,
  userInitials,
  role,
  theme,
  setTheme,
  onNavigate,
  onLogout,
}) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-background"
    >
      <SidebarHeader className="gap-3 border-b border-border bg-background px-3 py-3">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            to="/"
            title="TRUSS Ana Sayfa"
            className="inline-flex items-center text-lg font-bold tracking-tight select-none"
            aria-label="TRUSS Ana Sayfa"
          >
            <span className="group-data-[collapsible=icon]:hidden">
              <span className="text-foreground">TRU</span>
              <span className="text-primary">SS</span>
            </span>
            <span className="hidden text-base group-data-[collapsible=icon]:inline-flex">
              <span className="text-foreground">T</span>
              <span className="text-primary">S</span>
            </span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/app'
                    ? normalizedPath === '/app'
                    : normalizedPath.startsWith(item.path);

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="data-active:bg-card data-active:text-foreground data-active:shadow-xs"
                    >
                      <Link to={item.path}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {kritikAraclar.length > 0 && (
          <Collapsible defaultOpen className="group/kritik-araclar">
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex w-full cursor-pointer items-center justify-between">
                  <span>Kritik Araçlar</span>
                  <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=closed]/kritik-araclar:-rotate-90" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {kritikAraclar.map((arac) => {
                      const bakimTehlike = hesaplaBakimDurumu(arac).durum === 'tehlike';
                      const formattedPlaka = formatTurkishPlate(arac.plaka);
                      const label = `${formattedPlaka}${arac.marka ? ` · ${arac.marka}` : ''}`;

                      return (
                        <SidebarMenuItem key={arac.arac_id}>
                          <SidebarMenuButton
                            type="button"
                            tooltip={label}
                            onClick={() => onKritikAracClick(arac.arac_id)}
                          >
                            <span
                              className={cn(
                                'size-2.5 shrink-0 rounded-full border-2',
                                bakimTehlike ? 'border-destructive' : 'border-primary'
                              )}
                              aria-hidden="true"
                            />
                            <span className="truncate font-mono text-xs font-semibold tabular-nums">
                              {formattedPlaka}
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border bg-background p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-card data-[state=open]:text-foreground"
            >
              <Avatar className="size-8 rounded-lg border border-border">
                <AvatarFallback className="rounded-lg bg-card text-xs font-semibold text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-foreground">{userName}</span>
                <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64">
            <DropdownMenuLabel className="p-2 font-normal">
              <div className="flex items-center justify-between gap-2">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">{userName}</span>
                  <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                </div>
                <RoleBadge role={role} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => onNavigate('/app/ayarlar')}>
                <Settings className="size-4" />
                <span>Ayarlar</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 select-none">
              <span className="text-sm text-foreground">Tema</span>
              <ToggleGroup
                type="single"
                value={theme}
                onValueChange={(val) => val && setTheme(val)}
                className="overflow-hidden rounded-full bg-primary/10 p-0.5"
              >
                <ToggleGroupItem
                  value="light"
                  aria-label="Açık tema"
                  className="h-6 min-w-6 px-1!"
                  buttonProps={{
                    className:
                      'aria-[checked=true]:[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground [&_[data-slot=active-toggle-group-item]]:!rounded-full',
                  }}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="size-3.5 text-primary" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="dark"
                  aria-label="Koyu tema"
                  className="h-6 min-w-6 px-1!"
                  buttonProps={{
                    className:
                      'aria-[checked=true]:[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground [&_[data-slot=active-toggle-group-item]]:!rounded-full',
                  }}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="size-3.5 text-primary" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="system"
                  aria-label="Sistem teması"
                  className="h-6 min-w-6 px-1!"
                  buttonProps={{
                    className:
                      'aria-[checked=true]:[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground [&_[data-slot=active-toggle-group-item]]:!rounded-full',
                  }}
                  onClick={() => setTheme('system')}
                >
                  <LaptopMinimal className="size-3.5 text-primary" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onLogout(onNavigate)}
              >
                <LogOut className="size-4" />
                <span>Çıkış</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarEdgeToggle />
    </Sidebar>
  );
}
