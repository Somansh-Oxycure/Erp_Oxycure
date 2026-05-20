'use client';

import { useQuery } from '@tanstack/react-query';
import { boqTemplatesApi } from '@/lib/api';
import type { BoQTemplate } from '@/types/api';

/** Fetch a single BoQ template with its full component list. */
export function useBoQTemplate(id: string | null | undefined) {
  return useQuery<BoQTemplate>({
    queryKey: ['boq-template', id],
    queryFn: async () => {
      const res = await boqTemplatesApi.findOne(id!);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
