'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stockTransfersApi } from '@/lib/api';
import { toast } from 'sonner';
import { XCircle, X } from 'lucide-react';

interface Props {
  transferId: string;
  transferNumber: string;
  onClose: () => void;
}

export default function CancelTransferModal({ transferId, transferNumber, onClose }: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const mutation = useMutation({
    mutationFn: () => stockTransfersApi.cancel(transferId),
    onSuccess: () => {
      toast.success(`Transfer ${transferNumber} cancelled`);
      qc.invalidateQueries({ queryKey: ['stock-transfers'] });
      qc.invalidateQueries({ queryKey: ['stock-transfer', transferId] });
      qc.invalidateQueries({ queryKey: ['stock-transfer-stats'] });
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to cancel transfer');
    },
  });

  const handleCancel = () => {
    setLoading(true);
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Cancel Transfer
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-2">
          You are about to cancel transfer <span className="font-mono font-semibold text-foreground">{transferNumber}</span>.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          No stock will be moved. This transfer will be permanently marked as cancelled.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Cancel Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
