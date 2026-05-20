'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boqApi } from '@/lib/api';
import type { BoQItemDraft, BoQProductDraft } from '@/types/api';

interface UpdateBoQItemPayload extends Omit<BoQItemDraft, 'localId' | 'totalPrice'> {}

interface UpdateBoQProductPayload {
  templateId?: string | null;
  name: string;
  description?: string;
  sortOrder?: number;
  priceMode?: string;
  fixedPrice?: number;
  customValues?: Record<string, string>;
  items: UpdateBoQItemPayload[];
}

interface UpdateBoQPayload {
  notes?: string;
  customColumns?: { id: string; label: string }[];
  products?: UpdateBoQProductPayload[];
}

/** Update a draft BoQ's items and notes. Invalidates boq and proposal queries on success. */
export function useUpdateBoQ(boqId: string, proposalId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateBoQPayload) => boqApi.update(boqId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq', boqId] });
      qc.invalidateQueries({ queryKey: ['boqs', { proposalId }] });
      qc.invalidateQueries({ queryKey: ['proposal', proposalId] });
    },
  });
}
