// dShopping Lite - Servicio de Transacciones de Pago
// Aislado por @Dev_Node bajo la metodología SDD

import { supabase } from '../lib/supabase';
import { PaymentTransaction } from '../types';

export const paymentService = {
  fetchAllPayments: async (companyId: string): Promise<PaymentTransaction[]> => {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        providers (
          name
        ),
        invoices (
          invoice_number
        )
      `)
      .eq('company_id', companyId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return (data || []).map((pay: any) => ({
      ...pay,
      provider_name: pay.providers?.name || 'Proveedor Desconocido',
      invoice_number: pay.invoices?.invoice_number || 'Sin Factura'
    }));
  },

  fetchPaymentsByProvider: async (companyId: string, providerId: string): Promise<PaymentTransaction[]> => {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        providers (
          name
        ),
        invoices (
          invoice_number
        )
      `)
      .eq('company_id', companyId)
      .eq('provider_id', providerId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return (data || []).map((pay: any) => ({
      ...pay,
      provider_name: pay.providers?.name || 'Proveedor Desconocido',
      invoice_number: pay.invoices?.invoice_number || 'Sin Factura'
    }));
  },

  registerPayment: async (paymentData: Omit<PaymentTransaction, 'id' | 'created_at'>): Promise<PaymentTransaction> => {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateInvoiceStatusToPaid: async (invoiceId: string): Promise<void> => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoiceId);

    if (error) throw error;
  }
};

