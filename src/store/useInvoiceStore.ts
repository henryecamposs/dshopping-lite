// dShopping Lite - Zustand Invoice Store
// Gestión del estado global para facturas y proveedores con filtros avanzados
// Refactorizado por @Dev_React bajo la metodología SDD

import { create } from 'zustand';
import { Invoice, Provider } from '../types';
import { invoiceService } from '../services/invoiceService';

interface InvoiceFilters {
  providerId: string;
  status: 'all' | 'pending' | 'paid';
  dueDateRange: 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'expired' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
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
  createProvider: (companyId: string, name: string, rif: string, is_taxpayer?: boolean, iva_retention_percentage?: 75|100) => Promise<{ success: boolean; data?: Provider; error?: string }>;
  updateProvider: (providerId: string, name: string, rif: string, is_taxpayer?: boolean, iva_retention_percentage?: 75|100) => Promise<{ success: boolean; data?: Provider; error?: string }>;
  deleteProvider: (providerId: string) => Promise<{ success: boolean; error?: string }>;
  
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
  customStartDate: '',
  customEndDate: '',
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
      const data = await invoiceService.fetchProviders(companyId);
      set({ providers: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // 2. Crear Proveedor
  createProvider: async (companyId, name, rif, is_taxpayer = false, iva_retention_percentage) => {
    try {
      const data = await invoiceService.createProvider(companyId, name, rif, is_taxpayer, iva_retention_percentage);
      
      // Actualizar estado en memoria
      set((state) => ({
        providers: [...state.providers, data].sort((a, b) => a.name.localeCompare(b.name))
      }));
      
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // 2.5. Actualizar Proveedor
  updateProvider: async (providerId, name, rif, is_taxpayer = false, iva_retention_percentage) => {
    try {
      const data = await invoiceService.updateProvider(providerId, name, rif, is_taxpayer, iva_retention_percentage);
      
      // Actualizar estado en memoria
      set((state) => ({
        providers: state.providers.map((p) => p.id === providerId ? data : p).sort((a, b) => a.name.localeCompare(b.name)),
        invoices: state.invoices.map((inv) => inv.provider_id === providerId ? { ...inv, provider_name: data.name } : inv)
      }));
      
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // 2.6. Eliminar Proveedor
  deleteProvider: async (providerId) => {
    try {
      await invoiceService.deleteProvider(providerId);
      
      // Actualizar estado en memoria
      set((state) => ({
        providers: state.providers.filter((p) => p.id !== providerId),
      }));
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // 3. Obtener Facturas
  fetchInvoices: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await invoiceService.fetchInvoices(companyId);
      set({ invoices: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // 4. Crear Factura
  createInvoice: async (invoiceData) => {
    try {
      const invoiceDateObj = new Date(invoiceData.invoice_date);
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

      const data = await invoiceService.createInvoice(payload);

      // Actualizar estado en memoria
      set((state) => ({
        invoices: [...state.invoices, data].sort((a, b) => a.due_date.localeCompare(b.due_date))
      }));

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // 4.5. Actualizar Factura
  updateInvoice: async (invoiceId, invoiceData) => {
    try {
      const existingInvoice = get().invoices.find(inv => inv.id === invoiceId);
      if (!existingInvoice) {
        throw new Error('Factura no encontrada en el estado local.');
      }

      let calculatedDueDate = existingInvoice.due_date;
      if (invoiceData.invoice_date !== undefined || invoiceData.credit_days !== undefined) {
        const invDate = invoiceData.invoice_date ?? existingInvoice.invoice_date;
        const credDays = invoiceData.credit_days ?? existingInvoice.credit_days;
        const invoiceDateObj = new Date(invDate + 'T12:00:00');
        invoiceDateObj.setDate(invoiceDateObj.getDate() + Number(credDays));
        calculatedDueDate = invoiceDateObj.toISOString().split('T')[0];
      }

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

      const data = await invoiceService.updateInvoice(invoiceId, payload);

      // Actualizar estado en memoria
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? data : inv
        ).sort((a, b) => a.due_date.localeCompare(b.due_date))
      }));

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // 5. Actualizar Estado (Marcar como Pagada/Pendiente)
  updateInvoiceStatus: async (invoiceId, status) => {
    try {
      await invoiceService.updateInvoiceStatus(invoiceId, status);

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
      await invoiceService.deleteInvoice(invoiceId);

      set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== invoiceId)
      }));

      return true;
    } catch (err: any) {
      return false;
    }
  },

  // 7. Pagar Facturas en Lote
  payInvoicesBatch: async (invoiceIds) => {
    try {
      await invoiceService.payInvoicesBatch(invoiceIds);

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
      if (filters.providerId !== 'all' && inv.provider_id !== filters.providerId) {
        return false;
      }

      if (filters.status !== 'all' && inv.status !== filters.status) {
        return false;
      }

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
          case 'custom':
            if (filters.customStartDate && inv.due_date < filters.customStartDate) return false;
            if (filters.customEndDate && inv.due_date > filters.customEndDate) return false;
            break;
        }
      }

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

  getTodayInvoices: () => {
    const { invoices } = get();
    const todayStr = new Date().toISOString().split('T')[0];
    return invoices.filter((inv) => inv.due_date === todayStr && inv.status === 'pending');
  },

  getTomorrowInvoices: () => {
    const { invoices } = get();
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const tomorrowStr = today.toISOString().split('T')[0];
    return invoices.filter((inv) => inv.due_date === tomorrowStr && inv.status === 'pending');
  }
}));

