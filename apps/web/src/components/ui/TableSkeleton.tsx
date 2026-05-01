import React from 'react';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Number of columns (controls width distribution) */
  cols?: number;
  className?: string;
}

/**
 * Animated skeleton placeholder for table-based list pages.
 * Replace raw "Loading..." text with this component while data is fetching.
 */
export function TableSkeleton({ rows = 8, cols = 6, className }: TableSkeletonProps) {
  // Pre-computed width patterns so rows look staggered
  const widthPatterns = [
    ['w-24', 'w-32', 'w-28', 'w-20', 'w-16', 'w-24'],
    ['w-28', 'w-24', 'w-36', 'w-16', 'w-20', 'w-20'],
    ['w-20', 'w-36', 'w-24', 'w-24', 'w-16', 'w-28'],
    ['w-32', 'w-20', 'w-28', 'w-20', 'w-24', 'w-16'],
  ];

  return (
    <div className={cn('w-full', className)} aria-busy="true" aria-label="Loading">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIdx) => {
            const pattern = widthPatterns[rowIdx % widthPatterns.length];
            return (
              <tr key={rowIdx} className="border-b border-border">
                {Array.from({ length: cols }).map((_, colIdx) => (
                  <td key={colIdx} className={colIdx === 0 ? 'px-6 py-3.5' : 'px-4 py-3.5'}>
                    <div
                      className={cn(
                        'h-3.5 rounded bg-muted animate-pulse',
                        pattern[colIdx % pattern.length],
                      )}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
