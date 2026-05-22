// dShopping Lite - Payment Store
// Gestión de transacciones de pago

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { PaymentTransaction } from '../types';
import { useInvoiceStore } from './invoiceStore';

interface PaymentState {
  payments: PaymentTransaction[];
  loading: boolean;
  error: string | null;

  fetchAllPayments: (companyId: string) => Promise<void>;
  fetchPaymentsByProvider: (companyId: string, providerId: string) => Promise<void>;
  registerPayment: (paymentData: Omit<PaymentTransaction, 'id' | 'created_at'>) => Promise<boolean>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  payments: [],
  loading: false,
  error: null,

  fetchAllPayments: async (companyId) => {
    set({ loading: true, error: null });
    try {
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

      const formatted = (data || []).map((pay: any) => ({
        ...pay,
        provider_name: pay.providers?.name || 'Proveedor Desconocido',
        invoice_number: pay.invoices?.invoice_number || 'Sin Factura'
      }));

      set({ payments: formatted, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchPaymentsByProvider: async (companyId, providerId) => {
    set({ loading: true, error: null });
    try {
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

      const formatted = (data || []).map((pay: any) => ({
        ...pay,
        provider_name: pay.providers?.name || 'Proveedor Desconocido',
        invoice_number: pay.invoices?.invoice_number || 'Sin Factura'
      }));

      set({ payments: formatted, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  registerPayment: async (paymentData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;

      // Si el pago está asociado a una factura específica, actualizar el saldo/status de la factura (Simplificado)
      if (paymentData.invoice_id) {
         await supabase
            .from('invoices')
            .update({ status: 'paid' })
            .eq('id', paymentData.invoice_id);
            
         // Sincronizar el invoiceStore si está cargado
         useInvoiceStore.setState((state) => ({
             invoices: state.invoices.map((inv) => 
                inv.id === paymentData.invoice_id ? { ...inv, status: 'paid' } : inv
             )
         }));
      }

      // Obtener datos del proveedor y factura de manera local para enriquecer el objeto en memoria
      const provider = useInvoiceStore.getState().providers.find(p => p.id === paymentData.provider_id);
      const invoice = useInvoiceStore.getState().invoices.find(i => i.id === paymentData.invoice_id);

      const enrichedData = {
        ...data,
        provider_name: provider?.name || 'Proveedor Desconocido',
        invoice_number: invoice?.invoice_number || 'Sin Factura'
      };

      set((state) => ({
        payments: [enrichedData, ...state.payments],
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));
