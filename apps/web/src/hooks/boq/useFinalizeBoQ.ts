'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boqApi } from '@/lib/api';

/** Finalize a BoQ (draft → final). Invalidates boq and proposal queries on success. */
export function useFinalizeBoQ(boqId: string, proposalId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => boqApi.updateStatus(boqId, 'final'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq', boqId] });
      qc.invalidateQueries({ queryKey: ['boqs', { proposalId }] });
      qc.invalidateQueries({ queryKey: ['proposal', proposalId] });
    },
  });
}
