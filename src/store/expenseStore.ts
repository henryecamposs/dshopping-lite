// dShopping Lite - Store para Gastos Operativos (Expenses Store)
// Gestión del estado y persistencia reactiva en Supabase
// Desarrollado por @Dev_Node bajo la metodología SDD

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Expense, CreateExpenseInput } from '../types';

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  error: string | null;

  fetchExpenses: (companyId: string) => Promise<void>;
  addExpense: (companyId: string, input: CreateExpenseInput) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  loading: false,
  error: null,

  fetchExpenses: async (companyId) => {
    set({ loading: true, error: null });
    try {
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

      // Mapear los joins de Supabase a los campos aplanados de la interfaz Expense
      const formattedExpenses: Expense[] = (data || []).map((item: any) => ({
        ...item,
        exchange_rate_value: item.exchange_rates?.rate_value,
        payment_method_name: item.company_payment_methods?.name || 'Efectivo/Otro'
      }));

      set({ expenses: formattedExpenses, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addExpense: async (companyId, input) => {
    set({ loading: true, error: null });
    try {
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

      const formattedExpense: Expense = {
        ...data,
        exchange_rate_value: data.exchange_rates?.rate_value,
        payment_method_name: data.company_payment_methods?.name || 'Efectivo/Otro'
      };

      set((state) => ({
        expenses: [formattedExpense, ...state.expenses],
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  deleteExpense: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));
