import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatFollowUpDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'dd MMM yyyy');
}

export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  return isPast(new Date(date));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';

  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

export function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0]?.toUpperCase() || '';
  const l = lastName?.[0]?.toUpperCase() || '';
  return f + l || '??';
}

export function getAvatarColor(name: string): string {
  const colors = [
    'bg-violet-500', 'bg-sky-500', 'bg-blue-500', 'bg-cyan-500',
    'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-pink-500',
    'bg-orange-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const STATUS_CONFIG = {
  new: {
    label: 'New',
    color: 'bg-blue-100 text-blue-700 border border-blue-200',
    dot: 'bg-blue-500',
  },
  contacted: {
    label: 'Contacted',
    color: 'bg-amber-100 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
  },
  qualified: {
    label: 'Qualified',
    color: 'bg-violet-100 text-violet-700 border border-violet-200',
    dot: 'bg-violet-500',
  },
  quoted: {
    label: 'Quoted',
    color: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
    dot: 'bg-cyan-500',
  },
  won: {
    label: 'Won',
    color: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
  },
  lost: {
    label: 'Lost',
    color: 'bg-red-100 text-red-700 border border-red-200',
    dot: 'bg-red-500',
  },
} as const;

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-slate-500', ring: 'ring-slate-300' },
  medium: { label: 'Medium', color: 'text-blue-600', ring: 'ring-blue-300' },
  high: { label: 'High', color: 'text-amber-600', ring: 'ring-amber-300' },
  urgent: { label: 'Urgent', color: 'text-red-600', ring: 'ring-red-300' },
} as const;

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  air_purifier: 'Air Purifier',
  moscure: 'Moscure',
  industrial_solution: 'Industrial Solution',
  hvac: 'HVAC',
  other: 'Other',
};

export const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  referral: 'Referral',
  walk_in: 'Walk-in',
  cold_call: 'Cold Call',
  social_media: 'Social Media',
  exhibition: 'Exhibition',
  partner: 'Partner',
  other: 'Other',
};
