'use client';

import { create } from 'zustand';

export interface CRMFilters {
  search: string;
  dateRange: { from: string | null; to: string | null };
  productType: string;
  status: string;
}

interface CRMState {
  selectedId: string | null;
  filters: CRMFilters;

  setSelectedId: (id: string | null) => void;
  setSearch: (s: string) => void;
  setDateRange: (range: { from: string | null; to: string | null }) => void;
  setProductType: (p: string) => void;
  setStatus: (s: string) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: CRMFilters = {
  search: '',
  dateRange: { from: null, to: null },
  productType: 'all',
  status: '',
};

export const useCRMStore = create<CRMState>((set) => ({
  selectedId: null,
  filters: DEFAULT_FILTERS,

  setSelectedId: (id) => set({ selectedId: id }),
  setSearch: (s) => set((state) => ({ filters: { ...state.filters, search: s } })),
  setDateRange: (range) => set((state) => ({ filters: { ...state.filters, dateRange: range } })),
  setProductType: (p) => set((state) => ({ filters: { ...state.filters, productType: p } })),
  setStatus: (s) => set((state) => ({ filters: { ...state.filters, status: s } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
