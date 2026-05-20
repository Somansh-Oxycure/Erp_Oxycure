'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { stockTransfersApi } from '@/lib/api';
import { StockTransfer } from '@/types/api';
import { useRole } from '@/hooks/useRole';
import { ArrowLeft, Printer, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import TransferStatusBadge from '@/components/stock-transfers/TransferStatusBadge';
import TransferDetailView from '@/components/stock-transfers/TransferDetailView';
import ConfirmTransferModal from '@/components/stock-transfers/ConfirmTransferModal';
import CancelTransferModal from '@/components/stock-transfers/CancelTransferModal';

export default function StockTransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['stock-transfer', id],
    queryFn: () => stockTransfersApi.findOne(id).then((r) => r.data.data as StockTransfer),
    staleTime: 10000,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Transfer not found.{' '}
        <Link href="/stock-transfers" className="text-primary hover:underline">Go back</Link>
      </div>
    );
  }

  const transfer = data;

  return (
    <div className="p-6 space-y-6 print:p-0 print:space-y-0">
      {/* Top bar — hidden when printing */}
      <div className="flex items-center gap-4 print:hidden">
        <Link
          href="/stock-transfers"
          className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xl font-bold font-mono text-foreground">{transfer.transferNumber}</span>
          <TransferStatusBadge status={transfer.status} />
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrManager && transfer.status === 'DRAFT' && (
            <>
              <button
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm
              </button>
              <button
                onClick={() => setCancelOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Document */}
      <TransferDetailView transfer={transfer} />

      {/* Modals */}
      {confirmOpen && (
        <ConfirmTransferModal
          transferId={transfer.id}
          transferNumber={transfer.transferNumber}
          onClose={() => setConfirmOpen(false)}
        />
      )}
      {cancelOpen && (
        <CancelTransferModal
          transferId={transfer.id}
          transferNumber={transfer.transferNumber}
          onClose={() => setCancelOpen(false)}
        />
      )}
    </div>
  );
}
