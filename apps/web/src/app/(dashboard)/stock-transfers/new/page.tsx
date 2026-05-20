'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import TransferForm from '@/components/stock-transfers/TransferForm';

function NewTransferContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') === 'TRANSFER_IN' ? 'TRANSFER_IN' : 'TRANSFER_OUT';
  const isOut = type === 'TRANSFER_OUT';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/stock-transfers"
          className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          {isOut ? (
            <ArrowUpCircle className="w-6 h-6 text-red-500" />
          ) : (
            <ArrowDownCircle className="w-6 h-6 text-emerald-500" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isOut ? 'New Stock Transfer — Outward' : 'New Stock Transfer — Inward'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isOut
                ? 'Dispatch stock from your warehouse to a party / location'
                : 'Receive stock into your warehouse from a party / supplier'}
            </p>
          </div>
        </div>
      </div>

      <TransferForm transferType={type} />
    </div>
  );
}

export default function NewTransferPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <NewTransferContent />
    </Suspense>
  );
}
