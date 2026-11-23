import { LayoutDashboard, Truck, MapPin, Receipt, Cog, CalendarDays, Users } from 'lucide-react';

export const navConfig = [
  {
    label: 'Genel Bakış',
    path: '/app',
    icon: LayoutDashboard,
    channel: 'horizon',
  },
  {
    label: 'Filo',
    path: '/app/filo',
    icon: Truck,
    channel: 'horizon',
  },
  {
    label: 'Harita',
    path: '/app/harita',
    icon: MapPin,
    channel: 'horizon',
  },
  {
    label: 'Hareketler',
    path: '/app/hareketler',
    icon: Receipt,
    channel: 'ledger',
  },
  {
    label: 'Parçalar',
    path: '/app/parcalar',
    icon: Cog,
    channel: 'components',
  },
  {
    label: 'Takvim',
    path: '/app/takvim',
    icon: CalendarDays,
    channel: 'horizon',
  },
  {
    label: 'Ekip',
    path: '/app/ekip',
    icon: Users,
    channel: 'crew',
  },
];

export default navConfig;
