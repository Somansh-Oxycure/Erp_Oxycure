'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual variant — "danger" renders the confirm button in red */
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  /** Disable the confirm button while a mutation is in flight */
  isPending?: boolean;
}

/**
 * Simple confirm modal for destructive / irreversible actions.
 * No external dependencies — Tailwind + React state only.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'default',
  onConfirm,
  onCancel,
  isPending    = false,
}: ConfirmDialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card border border-border shadow-2xl p-6"
      >
        <div className="flex items-start gap-4 mb-4">
          {variant === 'danger' && (
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          )}
          <div>
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold text-foreground leading-snug"
            >
              {title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-xl text-white transition-colors disabled:opacity-50',
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-sky-600 hover:bg-sky-500',
            )}
          >
            {isPending ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
