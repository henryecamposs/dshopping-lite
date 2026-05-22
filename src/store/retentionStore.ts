// dShopping Lite - Retention Store
// Gestión de retenciones de IVA e ISLR

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { InvoiceRetention } from '../types';

interface RetentionState {
  retentions: InvoiceRetention[];
  loading: boolean;
  error: string | null;

  fetchRetentionsByInvoice: (invoiceId: string) => Promise<void>;
  addRetention: (retentionData: Omit<InvoiceRetention, 'id' | 'created_at' | 'correlative_number'>) => Promise<boolean>;
}

export const useRetentionStore = create<RetentionState>((set) => ({
  retentions: [],
  loading: false,
  error: null,

  fetchRetentionsByInvoice: async (invoiceId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('invoice_retentions')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ retentions: data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addRetention: async (retentionData) => {
    set({ loading: true, error: null });
    try {
      // Si es retención de IVA, debemos generar el correlativo SENIAT llamando a la RPC
      let correlativeNumber = null;
      if (retentionData.type === 'IVA') {
        const { data: correlative, error: rpcError } = await supabase
          .rpc('generate_retention_correlative', { p_company_id: retentionData.company_id });
          
        if (rpcError) {
            console.error("Error al generar correlativo:", rpcError);
        } else {
            correlativeNumber = correlative;
        }
      }

      const payload: any = { ...retentionData };
      if (correlativeNumber) {
          payload.correlative_number = correlativeNumber;
      }

      const { data, error } = await supabase
        .from('invoice_retentions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

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
