'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Target, Users2, FileText, ShoppingBag, TrendingUp, ArrowRight } from 'lucide-react';
import { ticketsApi, customersApi, quotationsApi, ordersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: ticketStats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: () => ticketsApi.stats(),
  });

  const stats = ticketStats?.data?.data ?? ticketStats?.data;

  const cards = [
    {
      label: 'Total Tickets',
      value: stats?.total ?? '—',
      sub: `${stats?.newThisWeek ?? 0} new this week`,
      icon: Target,
      color: 'bg-sky-50 text-sky-600',
      href: '/tickets',
    },
    {
      label: 'Pipeline Value',
      value: stats ? formatCurrency(stats.pipelineValue) : '—',
      sub: `Active pipeline`,
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600',
      href: '/tickets',
    },
    {
      label: "Today's Follow-ups",
      value: stats?.todayFollowUps ?? '—',
      sub: stats?.overdueFollowUps ? `${stats.overdueFollowUps} overdue` : 'All on track',
      icon: FileText,
      color: 'bg-amber-50 text-amber-600',
      href: '/tickets',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="text-sky-600">{user?.firstName}</span> 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Here's what's happening across your pipeline today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={card.href}>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all duration-300 group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">{card.value}</p>
                <p className="text-xs font-medium text-slate-400 mt-1">{card.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-3">Quick Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { href: '/tickets', icon: Target, label: 'Tickets', color: 'text-sky-600 bg-sky-50' },
            { href: '/customers', icon: Users2, label: 'Customers', color: 'text-blue-600 bg-blue-50' },
            { href: '/quotations', icon: FileText, label: 'Quotations', color: 'text-amber-600 bg-amber-50' },
            { href: '/orders', icon: ShoppingBag, label: 'Orders', color: 'text-emerald-600 bg-emerald-50' },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
