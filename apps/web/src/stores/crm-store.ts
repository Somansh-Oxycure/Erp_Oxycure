'use client';

import { create } from 'zustand';

export type CRMView = 'kanban' | 'list' | 'split';

export interface CRMFilters {
  search: string;
  dateRange: { from: string | null; to: string | null };
  productType: string;
}

interface CRMState {
  activeView: CRMView;
  selectedId: string | null;
  filters: CRMFilters;

  setActiveView: (view: CRMView) => void;
  setSelectedId: (id: string | null) => void;
  setSearch: (s: string) => void;
  setDateRange: (range: { from: string | null; to: string | null }) => void;
  setProductType: (p: string) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: CRMFilters = {
  search: '',
  dateRange: { from: null, to: null },
  productType: 'all',
};

export const useCRMStore = create<CRMState>((set) => ({
  activeView: 'kanban',
  selectedId: null,
  filters: DEFAULT_FILTERS,

  setActiveView: (view) => set({ activeView: view }),
  setSelectedId: (id) => set({ selectedId: id }),
  setSearch: (s) => set((state) => ({ filters: { ...state.filters, search: s } })),
  setDateRange: (range) => set((state) => ({ filters: { ...state.filters, dateRange: range } })),
  setProductType: (p) => set((state) => ({ filters: { ...state.filters, productType: p } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
