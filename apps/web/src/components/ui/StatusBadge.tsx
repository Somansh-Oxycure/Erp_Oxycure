import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'gray' | 'blue' | 'yellow' | 'purple' | 'orange' | 'green' | 'red';

const VARIANT_CLASSES: Record<Variant, string> = {
  gray:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const TICKET_STATUS_VARIANTS: Record<string, Variant> = {
  new:             'gray',
  contacted:       'blue',
  site_inspection: 'yellow',
  design_review:   'purple',
  quoted:          'orange',
  won:             'green',
  lost:            'red',
};

const PROPOSAL_STATUS_VARIANTS: Record<string, Variant> = {
  draft:    'gray',
  sent:     'blue',
  accepted: 'green',
  rejected: 'red',
  expired:  'yellow',
};

const BOQ_STATUS_VARIANTS: Record<string, Variant> = {
  final:    'green',
  archived: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  new:             'New',
  contacted:       'Contacted',
  site_inspection: 'Site Inspection',
  design_review:   'Design Review',
  quoted:          'Quoted',
  won:             'Won',
  lost:            'Lost',
  draft:           'Draft',
  sent:            'Sent',
  accepted:        'Accepted',
  rejected:        'Rejected',
  expired:         'Expired',
  final:           'Final',
  archived:        'Archived',
};

/** Merged variant lookup */
const ALL_VARIANTS: Record<string, Variant> = {
  ...PROPOSAL_STATUS_VARIANTS,
  ...BOQ_STATUS_VARIANTS,
  ...TICKET_STATUS_VARIANTS,
};

interface StatusBadgeProps {
  status: string;
  /** Override the display label (defaults to a capitalised version of the status key) */
  label?: string;
  className?: string;
}

/**
 * Single reusable pill badge for ticket and proposal statuses.
 * Accepts any status string and falls back to gray if unknown.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = ALL_VARIANTS[status] ?? 'gray';
  const display = label ?? STATUS_LABELS[status] ?? (status ? status.replace(/_/g, ' ') : '');

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {display}
    </span>
  );
}
