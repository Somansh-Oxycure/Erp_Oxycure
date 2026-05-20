'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Ticket,
  TrendingUp,
  CalendarClock,
  AlertCircle,
  FileText,
  PackageCheck,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
import { KpiCard } from './KpiCard';

interface DashboardSummary {
  openTickets: number;
  pipelineValue: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  openQuotations: number;
  ordersInProgress: number;
  lowStockAlerts: number;
  pendingPurchaseOrders: number;
  trends: Record<string, { value: number; direction: 'up' | 'down' }>;
}

const FINANCIAL_ROLES = ['admin', 'manager', 'finance', 'salesperson'];
const STOCK_ROLES = ['admin', 'manager', 'installer'];
const PO_ROLES = ['admin', 'manager', 'finance'];

export function KpiStrip() {
  const role = useRole();

  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const showFinancial = role && FINANCIAL_ROLES.includes(role);
  const showStock = role && STOCK_ROLES.includes(role);
  const showPO = role && PO_ROLES.includes(role);

  type KpiConfig = {
    id: string;
    label: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    href: string;
    visible: boolean;
  };

  const kpis: KpiConfig[] = [
    {
      id: 'openTickets',
      label: 'Open Tickets',
      value: isLoading ? '—' : (data?.openTickets ?? '—'),
      icon: Ticket,
      iconColor: 'bg-sky-50 text-sky-600',
      href: '/tickets',
      visible: true,
    },
    {
      id: 'pipelineValue',
      label: 'Pipeline Value',
      value: isLoading ? '—' : formatCurrency(data?.pipelineValue ?? 0),
      icon: TrendingUp,
      iconColor: 'bg-emerald-50 text-emerald-600',
      href: '/tickets',
      visible: !!showFinancial,
    },
    {
      id: 'todayFollowUps',
      label: "Today's Follow-ups",
      value: isLoading ? '—' : (data?.todayFollowUps ?? '—'),
      icon: CalendarClock,
      iconColor: 'bg-amber-50 text-amber-600',
      href: '/tickets',
      visible: true,
    },
    {
      id: 'overdueFollowUps',
      label: 'Overdue Follow-ups',
      value: isLoading ? '—' : (data?.overdueFollowUps ?? '—'),
      icon: AlertCircle,
      iconColor: 'bg-rose-50 text-rose-600',
      href: '/tickets',
      visible: true,
    },
    {
      id: 'openQuotations',
      label: 'Open Quotations',
      value: isLoading ? '—' : (data?.openQuotations ?? '—'),
      icon: FileText,
      iconColor: 'bg-sky-50 text-sky-600',
      href: '/quotations',
      visible: true,
    },
    {
      id: 'ordersInProgress',
      label: 'Orders In Progress',
      value: isLoading ? '—' : (data?.ordersInProgress ?? '—'),
      icon: PackageCheck,
      iconColor: 'bg-emerald-50 text-emerald-600',
      href: '/orders',
      visible: true,
    },
    {
      id: 'lowStockAlerts',
      label: 'Low Stock Alerts',
      value: isLoading ? '—' : (data?.lowStockAlerts ?? '—'),
      icon: AlertTriangle,
      iconColor: 'bg-amber-50 text-amber-600',
      href: '/stock/alerts',
      visible: !!showStock,
    },
    {
      id: 'pendingPurchaseOrders',
      label: 'Pending Purchase Orders',
      value: isLoading ? '—' : (data?.pendingPurchaseOrders ?? '—'),
      icon: ShoppingCart,
      iconColor: 'bg-slate-100 text-slate-600',
      href: '/stock/purchase-orders',
      visible: !!showPO,
    },
  ];

  const visible = kpis.filter((k) => k.visible);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {visible.map((kpi, i) => (
        <KpiCard
          key={kpi.id}
          index={i}
          label={kpi.label}
          value={kpi.value}
          icon={kpi.icon as Parameters<typeof KpiCard>[0]['icon']}
          iconColor={kpi.iconColor}
          href={kpi.href}
          trend={data?.trends?.[kpi.id]}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
