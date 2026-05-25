// dShopping Lite - Servicio de Facturas e Invoices
// Aislado por @Dev_Node bajo la metodología SDD

import { supabase } from '../lib/supabase';
import { Invoice, Provider } from '../types';

export const invoiceService = {
  // --- PROVEEDORES ---
  fetchProviders: async (companyId: string): Promise<Provider[]> => {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  createProvider: async (
    companyId: string,
    name: string,
    rif: string,
    isTaxpayer = false,
    ivaRetentionPercentage?: number
  ): Promise<Provider> => {
    const { data, error } = await supabase
      .from('providers')
      .insert({
        company_id: companyId,
        name,
        rif: rif.trim().toUpperCase(),
        is_taxpayer: isTaxpayer,
        iva_retention_percentage: ivaRetentionPercentage
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateProvider: async (
    providerId: string,
    name: string,
    rif: string,
    isTaxpayer = false,
    ivaRetentionPercentage?: number
  ): Promise<Provider> => {
    const { data, error } = await supabase
      .from('providers')
      .update({
        name,
        rif: rif.trim().toUpperCase(),
        is_taxpayer: isTaxpayer,
        iva_retention_percentage: ivaRetentionPercentage
      })
      .eq('id', providerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteProvider: async (providerId: string): Promise<void> => {
    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', providerId);

    if (error) throw error;
  },

  // --- FACTURAS ---
  fetchInvoices: async (companyId: string): Promise<Invoice[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        providers (
          name
        ),
        invoice_retentions (
          id,
          invoice_id,
          company_id,
          type,
          retention_percentage,
          retention_amount,
          correlative_number,
          islr_concept,
          created_at
        )
      `)
      .eq('company_id', companyId)
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || []).map((inv: any) => ({
      ...inv,
      provider_name: inv.providers?.name || 'Proveedor Desconocido',
      invoice_retentions: inv.invoice_retentions || []
    }));
  },

  createInvoice: async (payload: any): Promise<Invoice> => {
    const { data, error } = await supabase
      .from('invoices')
      .insert(payload)
      .select(`
        *,
        providers (
          name
        )
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      provider_name: data.providers?.name || 'Proveedor Desconocido'
    };
  },

  updateInvoice: async (invoiceId: string, payload: any): Promise<Invoice> => {
    const { data, error } = await supabase
      .from('invoices')
      .update(payload)
      .eq('id', invoiceId)
      .select(`
        *,
        providers (
          name
        )
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      provider_name: data.providers?.name || 'Proveedor Desconocido'
    };
  },

  updateInvoiceStatus: async (invoiceId: string, status: 'pending' | 'paid'): Promise<void> => {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId);

    if (error) throw error;
  },

  deleteInvoice: async (invoiceId: string): Promise<void> => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) throw error;
  },

  payInvoicesBatch: async (invoiceIds: string[]): Promise<void> => {
    const { error } = await supabase.rpc('pay_invoices_batch', {
      p_invoice_ids: invoiceIds
    });

    if (error) throw error;
  }
};

