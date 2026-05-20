'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Wind,
  LayoutDashboard,
  Users2,
  Target,
  FileText,
  ShoppingBag,
  Settings,
  LogOut,
  Briefcase,
  Kanban,
  LayoutGrid,
  FileCode,
  Package,
  Boxes,
  Truck,
  FileCheck,
  Bell,
  ArrowLeftRight,
} from 'lucide-react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type NavItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  allowedRoles?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  {
    label: 'Tickets',
    icon: LayoutGrid,
    href: '/tickets',
    allowedRoles: ['admin', 'manager', 'salesperson', 'installer', 'service_engineer', 'finance'],
  },
  {
    label: 'Proposals',
    icon: FileText,
    href: '/proposals',
    allowedRoles: ['admin', 'manager', 'salesperson', 'service_engineer', 'design_engineer', 'finance'],
  },
  {
    label: 'Customers',
    icon: Users2,
    href: '/customers',
    allowedRoles: ['admin', 'manager', 'salesperson', 'finance'],
  },
  {
    label: 'Quotations',
    icon: Target,
    href: '/quotations',
    allowedRoles: ['admin', 'manager', 'salesperson', 'design_engineer', 'finance'],
  },
  {
    label: 'Orders',
    icon: ShoppingBag,
    href: '/orders',
    allowedRoles: ['admin', 'manager', 'salesperson', 'installer', 'service_engineer', 'finance'],
  },
  { label: 'Product Catalog', icon: Package, href: '/catalog' },
  {
    label: 'Stock',
    icon: Boxes,
    href: '/stock',
    allowedRoles: ['admin', 'manager', 'installer', 'finance'],
  },
  {
    label: 'Transfers',
    icon: ArrowLeftRight,
    href: '/stock-transfers',
    allowedRoles: ['admin', 'manager', 'finance'],
  },
  {
    label: 'Suppliers',
    icon: Truck,
    href: '/stock/suppliers',
    allowedRoles: ['admin', 'manager', 'finance'],
  },
  {
    label: 'Purchase Orders',
    icon: FileCheck,
    href: '/stock/purchase-orders',
    allowedRoles: ['admin', 'manager', 'finance'],
  },
  {
    label: 'Stock Alerts',
    icon: Bell,
    href: '/stock/alerts',
    allowedRoles: ['admin', 'manager', 'installer', 'finance'],
  },
  {
    label: 'Users',
    icon: Briefcase,
    href: '/users',
    allowedRoles: ['admin', 'manager'],
  },
  {
    label: 'BoQ Templates',
    icon: FileCode,
    href: '/settings/boq-templates',
    allowedRoles: ['admin'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const avatarColor = user ? getAvatarColor(user.firstName) : 'bg-sky-500';
  const initials = user ? getInitials(user.firstName, user.lastName) : '??';

  return (
    <aside
      className={cn(
        'fixed left-3 top-3 bottom-3 z-40 flex flex-col rounded-2xl bg-gradient-sidebar border border-white/[0.07] shadow-2xl shadow-black/40 transition-all duration-300 ease-in-out overflow-hidden',
        expanded ? 'w-52' : 'w-14',
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* ── Logo ── */}
      <div className="flex items-center h-14 px-3 border-b border-white/[0.07] shrink-0">
        <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/40 shrink-0">
          <Wind className="w-4 h-4 text-white" />
        </div>
        <div
          className={cn(
            'ml-3 overflow-hidden transition-all duration-300',
            expanded ? 'opacity-100 w-32' : 'opacity-0 w-0',
          )}
        >
          <p className="text-white font-bold text-sm tracking-tight leading-none whitespace-nowrap">Oxycure ERP</p>
          <p className="text-slate-500 text-[9px] font-medium mt-0.5 tracking-widest uppercase whitespace-nowrap">Phase 1</p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden px-2">
        {NAV_ITEMS.map((item) => {
          if (item.allowedRoles && (!user?.role || !item.allowedRoles.includes(user.role))) return null;

          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-sky-500/20 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
                )}
              >
                <item.icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300',
                  )}
                />
                <span
                  className={cn(
                    'whitespace-nowrap transition-all duration-300 overflow-hidden',
                    expanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0',
                  )}
                >
                  {item.label}
                </span>
                {isActive && expanded && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="border-t border-white/[0.07] py-3 px-2 space-y-1">
        {user?.role === 'admin' && (
        <Link href="/settings">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all duration-200 group">
            <Settings className="w-5 h-5 shrink-0 text-slate-500 group-hover:text-slate-300" />
            <span
              className={cn(
                'whitespace-nowrap transition-all duration-300 overflow-hidden',
                expanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0',
              )}
            >
              Settings
            </span>
          </div>
        </Link>
        )}

        {/* ── User profile ── */}
        <div className="flex items-center gap-3 px-2 py-2 mt-1">
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0',
              avatarColor,
            )}
          >
            {initials}
          </div>
          <div
            className={cn(
              'flex-1 min-w-0 transition-all duration-300 overflow-hidden',
              expanded ? 'opacity-100 max-w-[80px]' : 'opacity-0 max-w-0',
            )}
          >
            <p className="text-white text-xs font-semibold truncate whitespace-nowrap">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-slate-500 text-[10px] capitalize truncate whitespace-nowrap">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              'p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 shrink-0',
              expanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
