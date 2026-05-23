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
  fetchAllRetentions: (companyId: string) => Promise<void>;
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

  fetchAllRetentions: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('invoice_retentions')
        .select(`
          *,
          invoices!inner (
            invoice_number,
            invoice_date,
            base_taxable,
            total_invoice,
            provider_id,
            exchange_rate_at_invoice,
            providers:provider_id (
              name,
              rif
            )
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((ret: any) => ({
        ...ret,
        provider_id: ret.invoices?.provider_id,
        invoice_number: ret.invoices?.invoice_number || 'S/N',
        invoice_date: ret.invoices?.invoice_date || '',
        base_taxable: ret.invoices?.base_taxable || 0,
        total_invoice: ret.invoices?.total_invoice || 0,
        exchange_rate_at_invoice: ret.invoices?.exchange_rate_at_invoice || 45.0,
        provider_name: ret.invoices?.providers?.name || 'Desconocido',
        provider_rif: ret.invoices?.providers?.rif || 'S/R'
      }));

      set({ retentions: formatted, loading: false });
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
