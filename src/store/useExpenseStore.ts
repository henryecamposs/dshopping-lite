// dShopping Lite - Store para Gastos Operativos (Expenses Store)
// Gestión del estado y persistencia reactiva utilizando el servicio
// Refactorizado por @Dev_React bajo la metodología SDD

import { create } from 'zustand';
import { Expense, CreateExpenseInput } from '../types';
import { expenseService } from '../services/expenseService';

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
      const data = await expenseService.fetchExpenses(companyId);
      set({ expenses: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addExpense: async (companyId, input) => {
    set({ loading: true, error: null });
    try {
      const data = await expenseService.addExpense(companyId, input);
      set((state) => ({
        expenses: [data, ...state.expenses],
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
      await expenseService.deleteExpense(id);
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

