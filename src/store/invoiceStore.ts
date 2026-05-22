// dShopping Lite - Zustand Invoice Store
// Gestión del estado global para facturas y proveedores con filtros avanzados

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Invoice, Provider } from '../types';

interface InvoiceFilters {
  providerId: string;
  status: 'all' | 'pending' | 'paid';
  dueDateRange: 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'expired';
  searchTerm: string;
}

interface InvoiceState {
  invoices: Invoice[];
  providers: Provider[];
  filters: InvoiceFilters;
  loading: boolean;
  error: string | null;
  
  // Acciones
  setFilter: (key: keyof InvoiceFilters, value: string) => void;
  resetFilters: () => void;
  
  fetchProviders: (companyId: string) => Promise<void>;
  createProvider: (companyId: string, name: string, rif: string) => Promise<{ success: boolean; data?: Provider; error?: string }>;
  
  fetchInvoices: (companyId: string) => Promise<void>;
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'created_at' | 'sub_total' | 'iva_amount' | 'total_invoice' | 'due_date'>) => Promise<{ success: boolean; data?: Invoice; error?: string }>;
  updateInvoice: (invoiceId: string, invoiceData: Partial<Omit<Invoice, 'id' | 'created_at' | 'sub_total' | 'iva_amount' | 'total_invoice' | 'due_date' | 'provider_name'>>) => Promise<{ success: boolean; data?: Invoice; error?: string }>;
  updateInvoiceStatus: (invoiceId: string, status: 'pending' | 'paid') => Promise<boolean>;
  payInvoicesBatch: (invoiceIds: string[]) => Promise<boolean>;
  deleteInvoice: (invoiceId: string) => Promise<boolean>;
  
  // Selectores de facturas filtradas
  getFilteredInvoices: () => Invoice[];
  getTodayInvoices: () => Invoice[];
  getTomorrowInvoices: () => Invoice[];
}

const initialFilters: InvoiceFilters = {
  providerId: 'all',
  status: 'all',
  dueDateRange: 'all',
  searchTerm: ''
};

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  providers: [],
  filters: initialFilters,
  loading: false,
  error: null,

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value }
    }));
  },

  resetFilters: () => set({ filters: initialFilters }),

  // 1. Obtener Proveedores
  fetchProviders: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) throw error;
      set({ providers: data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // 2. Crear Proveedor
  createProvider: async (companyId, name, rif) => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .insert({ company_id: companyId, name, rif: rif.trim().toUpperCase() })
        .select()
        .single();

      if (error) throw error;
      
      // Actualizar estado en memoria
      set((state) => ({
        providers: [...state.providers, data].sort((a, b) => a.name.localeCompare(b.name))
      }));
      
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // 3. Obtener Facturas (con JOIN para obtener el nombre del proveedor)
  fetchInvoices: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          providers (
            name
          )
        `)
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Transformar para aplanar el nombre del proveedor
      const formattedInvoices: Invoice[] = (data || []).map((inv: any) => ({
        ...inv,
        provider_name: inv.providers?.name || 'Proveedor Desconocido'
      }));

      set({ invoices: formattedInvoices, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // 4. Crear Factura
  // Los cálculos financieros y de fecha de vencimiento ocurren automáticamente en el trigger de PostgreSQL,
  // pero los calculamos también en frontend en tiempo real para visualización previa del usuario.
  createInvoice: async (invoiceData) => {
    try {
      // Nota: dejaremos que el trigger de Supabase haga los cálculos exactos y genere due_date,
      // pero para la inserción calculamos los valores correspondientes en el frontend.
      const invoiceDateObj = new Date(invoiceData.invoice_date);
      // Auto-cálculo de fecha de vencimiento: sumando días a la fecha de la factura
      const calculatedDueDate = new Date(invoiceDateObj.getTime() + invoiceData.credit_days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const subTotal = invoiceData.base_taxable + invoiceData.base_exempt;
      const ivaAmount = Math.round((invoiceData.base_taxable * (invoiceData.iva_percentage / 100.00)) * 100) / 100;
      const totalInvoice = subTotal + ivaAmount;

      const payload = {
        ...invoiceData,
        due_date: calculatedDueDate,
        sub_total: subTotal,
        iva_amount: ivaAmount,
        total_invoice: totalInvoice
      };

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

      const formattedNewInvoice: Invoice = {
        ...data,
        provider_name: data.providers?.name || 'Proveedor Desconocido'
      };

      // Actualizar estado en memoria
      set((state) => ({
        invoices: [...state.invoices, formattedNewInvoice].sort((a, b) => a.due_date.localeCompare(b.due_date))
      }));

      return { success: true, data: formattedNewInvoice };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // 4.5. Actualizar Factura
  updateInvoice: async (invoiceId, invoiceData) => {
    try {
      // 1. Obtener la factura existente en memoria para recuperar los valores actuales
      const existingInvoice = get().invoices.find(inv => inv.id === invoiceId);
      if (!existingInvoice) {
        throw new Error('Factura no encontrada en el estado local.');
      }

      // 2. Calcular la fecha de vencimiento si cambió la fecha de factura o los días de crédito
      let calculatedDueDate = existingInvoice.due_date;
      if (invoiceData.invoice_date !== undefined || invoiceData.credit_days !== undefined) {
        const invDate = invoiceData.invoice_date ?? existingInvoice.invoice_date;
        const credDays = invoiceData.credit_days ?? existingInvoice.credit_days;
        const invoiceDateObj = new Date(invDate + 'T12:00:00'); // Evitar desfase UTC
        invoiceDateObj.setDate(invoiceDateObj.getDate() + Number(credDays));
        calculatedDueDate = invoiceDateObj.toISOString().split('T')[0];
      }

      // 3. Recalcular importes financieros si cambió base_taxable, base_exempt o iva_percentage
      let subTotal = existingInvoice.sub_total;
      let ivaAmount = existingInvoice.iva_amount;
      let totalInvoice = existingInvoice.total_invoice;

      if (
        invoiceData.base_taxable !== undefined ||
        invoiceData.base_exempt !== undefined ||
        invoiceData.iva_percentage !== undefined
      ) {
        const taxable = invoiceData.base_taxable !== undefined ? parseFloat(invoiceData.base_taxable as any) || 0 : existingInvoice.base_taxable;
        const exempt = invoiceData.base_exempt !== undefined ? parseFloat(invoiceData.base_exempt as any) || 0 : existingInvoice.base_exempt;
        const ivaPct = invoiceData.iva_percentage !== undefined ? Number(invoiceData.iva_percentage) : existingInvoice.iva_percentage;

        subTotal = taxable + exempt;
        ivaAmount = Math.round((taxable * (ivaPct / 100.00)) * 100) / 100;
        totalInvoice = subTotal + ivaAmount;
      }

      const payload = {
        ...invoiceData,
        due_date: calculatedDueDate,
        sub_total: subTotal,
        iva_amount: ivaAmount,
        total_invoice: totalInvoice
      };

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

      const formattedUpdatedInvoice: Invoice = {
        ...data,
        provider_name: data.providers?.name || 'Proveedor Desconocido'
      };

      // Actualizar estado en memoria
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? formattedUpdatedInvoice : inv
        ).sort((a, b) => a.due_date.localeCompare(b.due_date))
      }));

      return { success: true, data: formattedUpdatedInvoice };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // 5. Actualizar Estado (Marcar como Pagada/Pendiente)
  updateInvoiceStatus: async (invoiceId, status) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId);

      if (error) throw error;

      // Actualizar en memoria
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? { ...inv, status } : inv
        )
      }));

      return true;
    } catch (err: any) {
      return false;
    }
  },

  // 6. Eliminar Factura
  deleteInvoice: async (invoiceId) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== invoiceId)
      }));

      return true;
    } catch (err: any) {
      return false;
    }
  },

  // 7. Pagar Facturas en Lote (RPC)
  payInvoicesBatch: async (invoiceIds) => {
    try {
      const { error } = await supabase.rpc('pay_invoices_batch', {
        p_invoice_ids: invoiceIds
      });

      if (error) throw error;

      // Actualizar estado en memoria
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          invoiceIds.includes(inv.id) ? { ...inv, status: 'paid' } : inv
        )
      }));

      return true;
    } catch (err: any) {
      return false;
    }
  },

  // Selectores Avanzados de Filtrado
  getFilteredInvoices: () => {
    const { invoices, filters } = get();
    const todayStr = new Date().toISOString().split('T')[0];

    return invoices.filter((inv) => {
      // Filtro por proveedor
      if (filters.providerId !== 'all' && inv.provider_id !== filters.providerId) {
        return false;
      }

      // Filtro por estado de pago
      if (filters.status !== 'all' && inv.status !== filters.status) {
        return false;
      }

      // Filtro por rango de fecha de vencimiento
      if (filters.dueDateRange !== 'all') {
        const invDate = new Date(inv.due_date);
        const today = new Date(todayStr);

        switch (filters.dueDateRange) {
          case 'today':
            if (inv.due_date !== todayStr) return false;
            break;
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            if (inv.due_date !== tomorrowStr) return false;
            break;
          case 'week':
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            if (invDate < today || invDate > nextWeek) return false;
            break;
          case 'month':
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);
            if (invDate < today || invDate > nextMonth) return false;
            break;
          case 'expired':
            if (invDate >= today || inv.status === 'paid') return false;
            break;
        }
      }

      // Filtro de búsqueda global (Número de factura, control o proveedor)
      if (filters.searchTerm.trim() !== '') {
        const search = filters.searchTerm.toLowerCase();
        const numMatch = inv.invoice_number.toLowerCase().includes(search);
        const ctrlMatch = inv.control_number.toLowerCase().includes(search);
        const provMatch = inv.provider_name?.toLowerCase().includes(search);
        return numMatch || ctrlMatch || provMatch;
      }

      return true;
    });
  },

  // Dashboard Selector: Facturas que vencen Hoy
  getTodayInvoices: () => {
    const { invoices } = get();
    const todayStr = new Date().toISOString().split('T')[0];
    return invoices.filter((inv) => inv.due_date === todayStr && inv.status === 'pending');
  },

  // Dashboard Selector: Facturas que vencen Mañana
  getTomorrowInvoices: () => {
    const { invoices } = get();
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const tomorrowStr = today.toISOString().split('T')[0];
    return invoices.filter((inv) => inv.due_date === tomorrowStr && inv.status === 'pending');
  }
}));
