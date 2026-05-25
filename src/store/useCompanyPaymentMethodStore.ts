// dShopping Lite - Company Payment Methods Store
// Gestión del CRUD de métodos de pago propios de la empresa
// Refactorizado por @Dev_React bajo la metodología SDD

import { create } from 'zustand';
import { CompanyPaymentMethod } from '../types';
import { companyPaymentMethodService } from '../services/companyPaymentMethodService';

interface CompanyPaymentMethodState {
  methods: CompanyPaymentMethod[];
  loading: boolean;
  error: string | null;

  fetchMethods: (companyId: string) => Promise<void>;
  addMethod: (methodData: Omit<CompanyPaymentMethod, 'id' | 'created_at'>) => Promise<boolean>;
  deleteMethod: (methodId: string) => Promise<boolean>;
}

export const useCompanyPaymentMethodStore = create<CompanyPaymentMethodState>((set) => ({
  methods: [],
  loading: false,
  error: null,

  fetchMethods: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await companyPaymentMethodService.fetchMethods(companyId);
      set({ methods: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addMethod: async (methodData) => {
    set({ loading: true, error: null });
    try {
      const data = await companyPaymentMethodService.addMethod(methodData);
      set((state) => ({
        methods: [data, ...state.methods],
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  deleteMethod: async (methodId) => {
    set({ loading: true, error: null });
    try {
      await companyPaymentMethodService.deleteMethod(methodId);
      set((state) => ({
        methods: state.methods.filter((m) => m.id !== methodId),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));

