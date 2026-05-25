// dShopping Lite - Servicio de Gastos Operativos (Expenses Service)
// Aislado por @Dev_Node bajo la metodología SDD

import { supabase } from '../lib/supabase';
import { Expense, CreateExpenseInput } from '../types';

export const expenseService = {
  fetchExpenses: async (companyId: string): Promise<Expense[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        exchange_rates:exchange_rate_id(rate_value),
        company_payment_methods:payment_method_id(name)
      `)
      .eq('company_id', companyId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item,
      exchange_rate_value: item.exchange_rates?.rate_value,
      payment_method_name: item.company_payment_methods?.name || 'Efectivo/Otro'
    }));
  },

  addExpense: async (companyId: string, input: CreateExpenseInput): Promise<Expense> => {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...input, company_id: companyId }])
      .select(`
        *,
        exchange_rates:exchange_rate_id(rate_value),
        company_payment_methods:payment_method_id(name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      exchange_rate_value: data.exchange_rates?.rate_value,
      payment_method_name: data.company_payment_methods?.name || 'Efectivo/Otro'
    };
  },

  deleteExpense: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

