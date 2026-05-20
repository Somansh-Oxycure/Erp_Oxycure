'use client';

import { useQuery } from '@tanstack/react-query';
import { boqApi } from '@/lib/api';
import type { BoQ } from '@/types/api';

/** Fetch a single BoQ by ID with all items. */
export function useBoQ(id: string | null | undefined) {
  return useQuery<BoQ>({
    queryKey: ['boq', id],
    queryFn: async () => {
      const res = await boqApi.findOne(id!);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });
}
