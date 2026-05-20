'use client';

import Link from 'next/link';
import { Plus, FilePlus, PackagePlus, ShoppingBag, UserPlus } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

const ACTIONS = [
  {
    label: 'New Ticket',
    icon: Plus,
    href: '/tickets?create=1',
    roles: ['admin', 'manager', 'salesperson', 'installer', 'service_engineer', 'design_engineer', 'finance'],
  },
  {
    label: 'New Quotation',
    icon: FilePlus,
    href: '/quotations',
    roles: ['salesperson', 'manager', 'admin'],
  },
  {
    label: 'New Order',
    icon: PackagePlus,
    href: '/orders',
    roles: ['manager', 'admin'],
  },
  {
    label: 'Raise PO',
    icon: ShoppingBag,
    href: '/stock/purchase-orders',
    roles: ['manager', 'admin', 'finance'],
  },
  {
    label: 'Add Customer',
    icon: UserPlus,
    href: '/customers',
    roles: ['salesperson', 'manager', 'admin'],
  },
];

export function QuickActions() {
  const role = useRole();
  const visible = ACTIONS.filter((a) => role && a.roles.includes(role));

  if (visible.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5">
      <h3 className="font-semibold text-slate-900 text-sm mb-3">Quick Actions</h3>
      <div className="flex flex-wrap gap-2">
        {visible.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <Icon className="w-4 h-4 text-slate-500" />
                {action.label}
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
