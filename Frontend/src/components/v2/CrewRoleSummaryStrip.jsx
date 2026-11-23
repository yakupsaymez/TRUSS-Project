import React, { useMemo } from 'react';
import { ShieldCheck, Truck, UserCheck, Users } from 'lucide-react';
import { ROLES } from '@/components/v2/channelAccess';
import { formatLocaleNumber } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function CrewSummarySkeletonCard() {
  return (
    <Card className="border border-border bg-card py-4 shadow-none">
      <CardContent className="flex flex-col gap-3 px-4 py-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="size-9 shrink-0 rounded-lg" />
        </div>
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <Skeleton className="h-3.5 w-44" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function CrewRoleSummaryStrip({
  users = [],
  vehicles = [],
  loading = false,
  className,
}) {
  const stats = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : [];
    const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

    let adminCount = 0;
    let managerCount = 0;
    let driverCount = 0;
    let assignedDriverCount = 0;
    const assignedVehicleIds = new Set();

    safeUsers.forEach((member) => {
      const role = member?.role || ROLES.DRIVER;
      const assignments = Array.isArray(member?.zimmetli_araclar)
        ? member.zimmetli_araclar
        : [];

      assignments.forEach((item) => {
        const vid = item?.arac_id ?? item;
        if (vid != null && String(vid).trim() !== '') {
          assignedVehicleIds.add(String(vid));
        }
      });

      if (role === ROLES.SYSTEM_ADMIN) {
        adminCount += 1;
      } else if (role === ROLES.FLEET_MANAGER) {
        managerCount += 1;
      } else {
        driverCount += 1;
        if (assignments.length > 0) {
          assignedDriverCount += 1;
        }
      }
    });

    const unassignedDriverCount = Math.max(0, driverCount - assignedDriverCount);
    const uniqueAssignedVehicleCount = assignedVehicleIds.size;
    const totalVehicles = safeVehicles.length;
    const coveragePct =
      totalVehicles > 0
        ? Math.min(100, Math.round((uniqueAssignedVehicleCount / totalVehicles) * 100))
        : 0;

    return {
      totalUsers: safeUsers.length,
      adminCount,
      managerCount,
      managementCount: adminCount + managerCount,
      driverCount,
      assignedDriverCount,
      unassignedDriverCount,
      uniqueAssignedVehicleCount,
      totalVehicles,
      coveragePct,
    };
  }, [users, vehicles]);

  const gridClass = cn(
    'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
    className
  );

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 4 }).map((_, index) => (
          <CrewSummarySkeletonCard key={`crew-role-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      id: 'total-crew',
      title: 'Toplam Ekip',
      value: `${formatLocaleNumber(stats.totalUsers, 0)} üye`,
      subtitle: 'Aktif organizasyon kadrosu',
      icon: Users,
    },
    {
      id: 'management-crew',
      title: 'Yönetim Kadrosu',
      value: formatLocaleNumber(stats.managementCount, 0),
      subtitle: `${formatLocaleNumber(stats.adminCount, 0)} Sistem Admini · ${formatLocaleNumber(stats.managerCount, 0)} Filo Yöneticisi`,
      icon: ShieldCheck,
    },
    {
      id: 'driver-crew',
      title: 'Şoför Kadrosu',
      value: formatLocaleNumber(stats.driverCount, 0),
      subtitle: `${formatLocaleNumber(stats.assignedDriverCount, 0)} zimmetli · ${formatLocaleNumber(stats.unassignedDriverCount, 0)} boşta`,
      icon: UserCheck,
    },
    {
      id: 'active-vehicle-assignment',
      title: 'Aktif Araç Zimmeti',
      value: formatLocaleNumber(stats.uniqueAssignedVehicleCount, 0),
      subtitle: `Filonun %${formatLocaleNumber(stats.coveragePct, 0)} zimmetli (${formatLocaleNumber(stats.uniqueAssignedVehicleCount, 0)} / ${formatLocaleNumber(stats.totalVehicles, 0)} araç)`,
      icon: Truck,
    },
  ];

  return (
    <div className={gridClass}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            className="border border-border bg-card py-4 shadow-none"
          >
            <CardContent className="flex flex-col gap-3 px-4 py-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-medium leading-tight text-muted-foreground">
                    {card.title}
                  </h4>
                  <p className="mt-1 truncate font-mono text-2xl font-bold tracking-tight tabular-nums text-foreground">
                    {card.value}
                  </p>
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" aria-hidden="true" />
                </div>
              </div>

              <div className="flex items-center rounded-md bg-muted/50 px-3 py-2">
                <span
                  className="truncate font-mono text-xs tabular-nums text-muted-foreground"
                  title={card.subtitle}
                >
                  {card.subtitle}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
