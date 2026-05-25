// dShopping Lite - Servicio de Métodos de Pago de la Empresa
// Aislado por @Dev_Node bajo la metodología SDD

import { supabase } from '../lib/supabase';
import { CompanyPaymentMethod } from '../types';

export const companyPaymentMethodService = {
  fetchMethods: async (companyId: string): Promise<CompanyPaymentMethod[]> => {
    const { data, error } = await supabase
      .from('company_payment_methods')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  addMethod: async (methodData: Omit<CompanyPaymentMethod, 'id' | 'created_at'>): Promise<CompanyPaymentMethod> => {
    const { data, error } = await supabase
      .from('company_payment_methods')
      .insert([methodData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteMethod: async (methodId: string): Promise<void> => {
    const { error } = await supabase
      .from('company_payment_methods')
      .delete()
      .eq('id', methodId);

    if (error) throw error;
  }
};

