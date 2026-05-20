'use client';

import { useReducer } from 'react';
import type { BoQItemDraft, BoQProductDraft, BoQTemplate, BoQ, ProductCharges } from '@/types/api';

export interface CustomColumn { id: string; label: string; }

// ─── State ────────────────────────────────────────────────────────────────────

export interface BoQBuilderState {
  products: BoQProductDraft[];
  notes: string;
  customColumns: CustomColumn[];
}

const INITIAL_STATE: BoQBuilderState = {
  products: [],
  notes: '',
  customColumns: [],
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_PRODUCT_FROM_TEMPLATE'; template: BoQTemplate }
  | { type: 'ADD_BLANK_PRODUCT' }
  | { type: 'REMOVE_PRODUCT'; productLocalId: string }
  | { type: 'UPDATE_PRODUCT_NAME'; productLocalId: string; name: string }
  | { type: 'SET_PRODUCT_PRICE_MODE'; productLocalId: string; priceMode: 'component' | 'fixed' }
  | { type: 'UPDATE_PRODUCT_FIXED_PRICE'; productLocalId: string; fixedPrice: number }
  | { type: 'UPDATE_PRODUCT_CUSTOM_VALUE'; productLocalId: string; colId: string; value: string }
  | { type: 'UPDATE_PRODUCT_CHARGES'; productLocalId: string; patch: Partial<ProductCharges> }
  | { type: 'ADD_ITEM'; productLocalId: string }
  | { type: 'REMOVE_ITEM'; productLocalId: string; itemLocalId: string }
  | { type: 'UPDATE_ITEM'; productLocalId: string; itemLocalId: string; patch: Partial<BoQItemDraft> }
  | { type: 'TOGGLE_INCLUDED'; productLocalId: string; itemLocalId: string }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'ADD_COLUMN'; label: string }
  | { type: 'REMOVE_COLUMN'; colId: string }
  | { type: 'RENAME_COLUMN'; colId: string; label: string }
  | { type: 'RESET' }
  | { type: 'LOAD_EXISTING'; boq: BoQ };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function recomputePrice(item: BoQItemDraft): BoQItemDraft {
  return { ...item, totalPrice: item.quantity * item.unitRate };
}

function newBlankItem(sortOrder: number): BoQItemDraft {
  return {
    localId: crypto.randomUUID(),
    templateComponentId: null,
    name: '',
    description: '',
    size: '',
    quantity: 1,
    unitRate: 0,
    totalPrice: 0,
    remarks: '',
    sortOrder,
    isOptional: false,
    isIncluded: true,
  };
}

function newBlankProduct(): BoQProductDraft {
  return {
    localId: crypto.randomUUID(),
    templateId: null,
    name: 'Custom Product',
    description: '',
    priceMode: 'component',
    fixedPrice: 0,
    customValues: {},
    charges: { mode: 'combined' },
    items: [newBlankItem(0)],
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function boqBuilderReducer(state: BoQBuilderState, action: Action): BoQBuilderState {
  switch (action.type) {
    case 'ADD_PRODUCT_FROM_TEMPLATE': {
      const items: BoQItemDraft[] = (action.template.components ?? []).map((comp) => ({
        localId: crypto.randomUUID(),
        templateComponentId: comp.id,
        name: comp.name,
        description: comp.description ?? '',
        size: comp.size ?? '',
        quantity: Number(comp.defaultQty),
        unitRate: Number(comp.defaultUnitRate ?? 0),
        totalPrice: Number(comp.defaultQty) * Number(comp.defaultUnitRate ?? 0),
        remarks: '',
        sortOrder: comp.sortOrder,
        isOptional: comp.isOptional,
        isIncluded: true,
        }));
      const newProduct: BoQProductDraft = {
        localId: crypto.randomUUID(),
        templateId: action.template.id,
        name: action.template.name,
        description: action.template.description ?? '',
        priceMode: 'component',
        fixedPrice: 0,
        customValues: {},
        charges: { mode: 'combined' },
        items,
      };
      return { ...state, products: [...state.products, newProduct] };
    }

    case 'ADD_BLANK_PRODUCT': {
      return { ...state, products: [...state.products, newBlankProduct()] };
    }

    case 'REMOVE_PRODUCT': {
      return {
        ...state,
        products: state.products.filter((p) => p.localId !== action.productLocalId),
      };
    }

    case 'UPDATE_PRODUCT_NAME': {
      return {
        ...state,
        products: state.products.map((p) =>
          p.localId === action.productLocalId ? { ...p, name: action.name } : p,
        ),
      };
    }

    case 'SET_PRODUCT_PRICE_MODE': {
      return {
        ...state,
        products: state.products.map((p) =>
          p.localId === action.productLocalId ? { ...p, priceMode: action.priceMode } : p,
        ),
      };
    }

    case 'UPDATE_PRODUCT_FIXED_PRICE': {
      return {
        ...state,
        products: state.products.map((p) =>
          p.localId === action.productLocalId ? { ...p, fixedPrice: action.fixedPrice } : p,
        ),
      };
    }

    case 'ADD_ITEM': {
      return {
        ...state,
        products: state.products.map((p) => {
          if (p.localId !== action.productLocalId) return p;
          return { ...p, items: [...p.items, newBlankItem(p.items.length)] };
        }),
      };
    }

    case 'REMOVE_ITEM': {
      return {
        ...state,
        products: state.products.map((p) => {
          if (p.localId !== action.productLocalId) return p;
          return {
            ...p,
            items: p.items
              .filter((i) => i.localId !== action.itemLocalId)
              .map((i, idx) => ({ ...i, sortOrder: idx })),
          };
        }),
      };
    }

    case 'UPDATE_ITEM': {
      return {
        ...state,
        products: state.products.map((p) => {
          if (p.localId !== action.productLocalId) return p;
          return {
            ...p,
            items: p.items.map((i) =>
              i.localId === action.itemLocalId
                ? recomputePrice({ ...i, ...action.patch })
                : i,
            ),
          };
        }),
      };
    }

    case 'UPDATE_PRODUCT_CUSTOM_VALUE': {
      return {
        ...state,
        products: state.products.map((p) =>
          p.localId === action.productLocalId
            ? { ...p, customValues: { ...p.customValues, [action.colId]: action.value } }
            : p,
        ),
      };
    }

    case 'UPDATE_PRODUCT_CHARGES': {
      return {
        ...state,
        products: state.products.map((p) =>
          p.localId === action.productLocalId
            ? { ...p, charges: { ...p.charges, ...action.patch } }
            : p,
        ),
      };
    }

    case 'TOGGLE_INCLUDED': {
      return {
        ...state,
        products: state.products.map((p) => {
          if (p.localId !== action.productLocalId) return p;
          return {
            ...p,
            items: p.items.map((i) =>
              i.localId === action.itemLocalId ? { ...i, isIncluded: !i.isIncluded } : i,
            ),
          };
        }),
      };
    }

    case 'SET_NOTES': {
      return { ...state, notes: action.notes };
    }

    case 'ADD_COLUMN': {
      const newCol: CustomColumn = { id: crypto.randomUUID(), label: action.label };
      return { ...state, customColumns: [...state.customColumns, newCol] };
    }

    case 'REMOVE_COLUMN': {
      // Strip value from all products
      const updatedProducts = state.products.map((p) => {
        const { [action.colId]: _removed, ...rest } = p.customValues;
        return { ...p, customValues: rest };
      });
      return {
        ...state,
        customColumns: state.customColumns.filter((c) => c.id !== action.colId),
        products: updatedProducts,
      };
    }

    case 'RENAME_COLUMN': {
      return {
        ...state,
        customColumns: state.customColumns.map((c) =>
          c.id === action.colId ? { ...c, label: action.label } : c,
        ),
      };
    }

    case 'RESET': {
      return INITIAL_STATE;
    }

    case 'LOAD_EXISTING': {
      const customColumns: CustomColumn[] = Array.isArray(action.boq.customColumns)
        ? (action.boq.customColumns as CustomColumn[])
        : [];
      const products: BoQProductDraft[] = action.boq.products.map((prod) => ({
        localId: crypto.randomUUID(),
        templateId: prod.templateId ?? null,
        name: prod.name,
        description: prod.description ?? '',
        priceMode: (prod.priceMode as 'component' | 'fixed') ?? 'component',
        fixedPrice: Number(prod.fixedPrice ?? 0),
        customValues: (prod.customValues as Record<string, string>) ?? {},
        charges: (prod.charges as ProductCharges | null) ?? { mode: 'combined' },
        items: prod.items.map((item) => ({
          localId: crypto.randomUUID(),
          templateComponentId: item.templateComponentId ?? null,
          name: item.name,
          description: item.description ?? '',
          size: item.size ?? '',
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          totalPrice: Number(item.totalPrice),
          remarks: item.remarks ?? '',
          sortOrder: item.sortOrder,
          isOptional: item.isOptional,
          isIncluded: item.isIncluded,
        })),
      }));
      return { products, notes: action.boq.notes ?? '', customColumns };
    }

    default:
      return state;
  }
}

export function useBoQReducer() {
  return useReducer(boqBuilderReducer, INITIAL_STATE);
}
