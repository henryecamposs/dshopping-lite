// dShopping Lite - Payment Store
// Gestión de transacciones de pago
// Refactorizado por @Dev_React bajo la metodología SDD

import { create } from 'zustand';
import { PaymentTransaction } from '../types';
import { paymentService } from '../services/paymentService';
import { useInvoiceStore } from './useInvoiceStore';

interface PaymentState {
  payments: PaymentTransaction[];
  loading: boolean;
  error: string | null;

  fetchAllPayments: (companyId: string) => Promise<void>;
  fetchPaymentsByProvider: (companyId: string, providerId: string) => Promise<void>;
  registerPayment: (paymentData: Omit<PaymentTransaction, 'id' | 'created_at'>) => Promise<boolean>;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payments: [],
  loading: false,
  error: null,

  fetchAllPayments: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await paymentService.fetchAllPayments(companyId);
      set({ payments: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchPaymentsByProvider: async (companyId, providerId) => {
    set({ loading: true, error: null });
    try {
      const data = await paymentService.fetchPaymentsByProvider(companyId, providerId);
      set({ payments: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  registerPayment: async (paymentData) => {
    set({ loading: true, error: null });
    try {
      const data = await paymentService.registerPayment(paymentData);

      // Si el pago está asociado a una factura específica, actualizar el saldo/status de la factura
      if (paymentData.invoice_id) {
        await paymentService.updateInvoiceStatusToPaid(paymentData.invoice_id);
        
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

