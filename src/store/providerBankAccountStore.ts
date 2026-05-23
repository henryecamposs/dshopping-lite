// dShopping Lite - Provider Bank Accounts Store
// Gestión de cuentas bancarias asociadas a los proveedores en formato JSONB
// Desarrollado por @Dev_Node bajo la metodología SDD

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ProviderBankAccount } from '../types';

interface ProviderBankAccountState {
  accounts: ProviderBankAccount[];
  loading: boolean;
  error: string | null;

  fetchAccounts: (companyId: string, providerId: string) => Promise<void>;
  addAccount: (accountData: Omit<ProviderBankAccount, 'id' | 'created_at'>) => Promise<boolean>;
  updateAccount: (providerId: string, accountId: string, updatedData: Partial<ProviderBankAccount>) => Promise<boolean>;
  deleteAccount: (accountId: string) => Promise<boolean>;
}

export const useProviderBankAccountStore = create<ProviderBankAccountState>((set, get) => ({
  accounts: [],
  loading: false,
  error: null,

  fetchAccounts: async (companyId, providerId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('bank_accounts')
        .eq('id', providerId)
        .single();

      if (error) throw error;
      set({ accounts: data?.bank_accounts || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addAccount: async (accountData) => {
    set({ loading: true, error: null });
    try {
      // 1. Obtener cuentas actuales de la base de datos
      const { data: providerData, error: fetchError } = await supabase
        .from('providers')
        .select('bank_accounts')
        .eq('id', accountData.provider_id)
        .single();
        
      if (fetchError) throw fetchError;
      
      const currentAccounts = providerData?.bank_accounts || [];
      
      // 2. Crear nueva cuenta bancaria
      const newAccount: ProviderBankAccount = {
        id: crypto.randomUUID(),
        ...accountData,
        created_at: new Date().toISOString()
      };
      
      const updatedAccounts = [newAccount, ...currentAccounts];

      // 3. Guardar en la columna JSONB
      const { error: updateError } = await supabase
        .from('providers')
        .update({ bank_accounts: updatedAccounts })
        .eq('id', accountData.provider_id);

      if (updateError) throw updateError;

      set({ accounts: updatedAccounts, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateAccount: async (providerId, accountId, updatedData) => {
    set({ loading: true, error: null });
    try {
      const updatedAccounts = get().accounts.map((acc) =>
        acc.id === accountId ? { ...acc, ...updatedData } : acc
      );

      const { error: updateError } = await supabase
        .from('providers')
        .update({ bank_accounts: updatedAccounts })
        .eq('id', providerId);

      if (updateError) throw updateError;

      set({ accounts: updatedAccounts, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  deleteAccount: async (accountId) => {
    set({ loading: true, error: null });
    try {
      // 1. Encontrar la cuenta a eliminar de la lista en memoria
      const accountToDelete = get().accounts.find(a => a.id === accountId);
      if (!accountToDelete) {
         throw new Error("La cuenta seleccionada no existe en el estado local.");
      }
      
      const providerId = accountToDelete.provider_id;
      const updatedAccounts = get().accounts.filter((a) => a.id !== accountId);

      // 2. Actualizar la columna JSONB
      const { error: updateError } = await supabase
        .from('providers')
        .update({ bank_accounts: updatedAccounts })
        .eq('id', providerId);

      if (updateError) throw updateError;

      set({ accounts: updatedAccounts, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));
