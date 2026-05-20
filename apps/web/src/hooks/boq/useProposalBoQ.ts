'use client';

import { useQuery } from '@tanstack/react-query';
import { boqApi } from '@/lib/api';
import type { BoQ } from '@/types/api';

/** Fetch the BoQ linked to a specific proposal (returns null if none exists). */
export function useProposalBoQ(proposalId: string | null | undefined) {
  return useQuery<BoQ | null>({
    queryKey: ['boqs', { proposalId }],
    queryFn: async () => {
      const res = await boqApi.findByProposal(proposalId!);
      // API returns { success: true, data: BoQ[] } — one proposal has at most one BoQ
      const items: BoQ[] = res.data?.data ?? [];
      return items.length > 0 ? items[0] : null;
    },
    enabled: !!proposalId,
  });
}
