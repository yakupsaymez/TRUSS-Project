import { LayoutDashboard, Truck, Receipt, Cog, Users } from 'lucide-react';

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
    label: 'Ekip',
    path: '/app/ekip',
    icon: Users,
    channel: 'crew',
  },
];

export default navConfig;
