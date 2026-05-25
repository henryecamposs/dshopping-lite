// dShopping Lite - Servicio de Retenciones de IVA e ISLR
// Aislado por @Dev_Node bajo la metodología SDD

import { supabase } from '../lib/supabase';
import { InvoiceRetention } from '../types';

export const retentionService = {
  fetchRetentionsByInvoice: async (invoiceId: string): Promise<InvoiceRetention[]> => {
    const { data, error } = await supabase
      .from('invoice_retentions')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  fetchAllRetentions: async (companyId: string): Promise<any[]> => {
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

    return (data || []).map((ret: any) => ({
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
  },

  generateRetentionCorrelative: async (companyId: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc('generate_retention_correlative', {
      p_company_id: companyId
    });

    if (error) {
      console.error("Error al generar correlativo:", error);
      return null;
    }
    return data;
  },

  addRetention: async (payload: any): Promise<InvoiceRetention> => {
    const { data, error } = await supabase
      .from('invoice_retentions')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

