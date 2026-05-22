// dShopping Lite - Company Payment Methods Store
// Gestión del CRUD de métodos de pago propios de la empresa
// Desarrollado por @Dev_Node bajo la metodología SDD

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { CompanyPaymentMethod } from '../types';

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
      const { data, error } = await supabase
        .from('company_payment_methods')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ methods: data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addMethod: async (methodData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('company_payment_methods')
        .insert([methodData])
        .select()
        .single();

      if (error) throw error;

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
      const { error } = await supabase
        .from('company_payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;

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
