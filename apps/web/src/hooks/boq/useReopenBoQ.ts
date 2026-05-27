'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boqApi } from '@/lib/api';

/** Reopen a finalized BoQ (final → draft). Admin/manager only. */
export function useReopenBoQ(boqId: string, proposalId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => boqApi.updateStatus(boqId, 'draft'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq', boqId] });
      qc.invalidateQueries({ queryKey: ['boqs', { proposalId }] });
      qc.invalidateQueries({ queryKey: ['proposal', proposalId] });
    },
  });
}
