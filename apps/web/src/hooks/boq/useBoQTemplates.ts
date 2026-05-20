'use client';

import { useQuery } from '@tanstack/react-query';
import { boqTemplatesApi } from '@/lib/api';
import type { BoQTemplate } from '@/types/api';

/** Fetch all active BoQ product templates. Cached for 5 min — templates rarely change. */
export function useBoQTemplates(all = false) {
  return useQuery<BoQTemplate[]>({
    queryKey: ['boq-templates', { all }],
    queryFn: async () => {
      const res = await boqTemplatesApi.findAll(all);
      return res.data?.data ?? res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
