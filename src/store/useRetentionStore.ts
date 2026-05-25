// dShopping Lite - Retention Store
// Gestión de retenciones de IVA e ISLR
// Refactorizado por @Dev_React bajo la metodología SDD

import { create } from 'zustand';
import { InvoiceRetention } from '../types';
import { retentionService } from '../services/retentionService';

interface RetentionState {
  retentions: InvoiceRetention[];
  loading: boolean;
  error: string | null;

  fetchRetentionsByInvoice: (invoiceId: string) => Promise<void>;
  fetchAllRetentions: (companyId: string) => Promise<void>;
  addRetention: (retentionData: Omit<InvoiceRetention, 'id' | 'created_at' | 'correlative_number'>) => Promise<boolean>;
}

export const useRetentionStore = create<RetentionState>((set, get) => ({
  retentions: [],
  loading: false,
  error: null,

  fetchRetentionsByInvoice: async (invoiceId) => {
    set({ loading: true, error: null });
    try {
      const data = await retentionService.fetchRetentionsByInvoice(invoiceId);
      set({ retentions: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchAllRetentions: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await retentionService.fetchAllRetentions(companyId);
      set({ retentions: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addRetention: async (retentionData) => {
    set({ loading: true, error: null });
    try {
      let correlativeNumber = null;
      if (retentionData.type === 'IVA') {
        correlativeNumber = await retentionService.generateRetentionCorrelative(retentionData.company_id);
      }

      const payload: any = { ...retentionData };
      if (correlativeNumber) {
        payload.correlative_number = correlativeNumber;
      }

      const data = await retentionService.addRetention(payload);

      set((state) => ({
        retentions: [...state.retentions, data],
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));

