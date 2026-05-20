'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boqApi } from '@/lib/api';
import type { ProductCharges } from '@/types/api';

interface CreateBoQItemPayload {
  templateComponentId?: string;
  name: string;
  unit?: string;
  quantity: number;
  unitRate: number;
  description?: string;
  size?: string;
  remarks?: string;
  sortOrder?: number;
  isOptional?: boolean;
  isIncluded?: boolean;
}

interface CreateBoQProductPayload {
  templateId?: string;
  name: string;
  description?: string;
  sortOrder?: number;
  priceMode?: string;
  fixedPrice?: number;
  customValues?: Record<string, string>;
  charges?: ProductCharges | null;
  items?: CreateBoQItemPayload[];
}

interface CreateBoQPayload {
  proposalId: string;
  notes?: string;
  customColumns?: { id: string; label: string }[];
  products: CreateBoQProductPayload[];
}

/** Create a new BoQ for a proposal. Invalidates proposal and boq queries on success. */
export function useCreateBoQ(proposalId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBoQPayload) => boqApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boqs', { proposalId }] });
      qc.invalidateQueries({ queryKey: ['proposal', proposalId] });
    },
  });
}
