'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tickets': 'Tickets',
  '/customers': 'Customers',
  '/design-specs': 'Design Specs',
  '/quotations': 'Quotations',
  '/orders': 'Orders',
  '/users': 'Users',
  '/settings': 'Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path),
  )?.[1] || 'Oxycure ERP';

  return (
    <header className="h-10 bg-background/80 backdrop-blur border-b border-border flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-2.5">
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        <span className="text-border">·</span>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-1">
        

        {/* ── Theme toggle ── */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`relative flex items-center w-20 h-7 rounded-full transition-all duration-300 overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-sky-400/60 ${
            isDark
              ? 'bg-zinc-800/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),inset_0_-1px_1px_rgba(255,255,255,0.04)]'
              : 'bg-slate-200/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),inset_0_-1px_2px_rgba(255,255,255,0.8)]'
          }`}
        >
          {/* Mode label */}
          <span className={`absolute text-[10px] font-semibold tracking-wide select-none transition-all duration-300 ${
            isDark ? 'left-2.5 text-slate-500' : 'right-2.5 text-slate-400'
          }`}>
            {isDark ? 'Dark' : 'Light'}
          </span>

          {/* Oversized glass thumb */}
          <span className={`absolute -top-0.5 left-0.5 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
            isDark
              ? 'translate-x-[44px] bg-white/10 border border-white/15 shadow-[0_0_16px_rgba(99,102,241,0.45),0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.3)]'
              : 'translate-x-0 bg-white/80 border border-white/95 shadow-[0_4px_14px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(0,0,0,0.06)]'
          }`}>
            {isDark
              ? <Moon className="w-3.5 h-3.5 text-sky-200 drop-shadow-[0_0_5px_rgba(186,230,253,1)]" />
              : <Sun className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]" />
            }
          </span>
        </button>

        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-600 flex items-center justify-center text-white text-[10px] font-bold">
            {user?.firstName?.[0]}
          </div>
          <span className="text-xs font-medium text-muted-foreground hidden sm:block">
            {user?.firstName}
          </span>
        </div>
      </div>
    </header>
  );
}
