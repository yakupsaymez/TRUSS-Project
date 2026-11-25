import { LayoutDashboard, Truck, MapPin, Receipt, Cog, ClipboardList, CalendarDays, Users } from 'lucide-react';

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
    label: 'İş Emirleri',
    path: '/app/is-emirleri',
    icon: ClipboardList,
    channel: 'horizon',
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
