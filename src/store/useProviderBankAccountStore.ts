// dShopping Lite - Provider Bank Accounts Store
// Gestión de cuentas bancarias asociadas a los proveedores en formato JSONB
// Refactorizado por @Dev_React bajo la metodología SDD

import { create } from 'zustand';
import { ProviderBankAccount } from '../types';
import { providerBankAccountService } from '../services/providerBankAccountService';

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
      const data = await providerBankAccountService.fetchAccounts(providerId);
      set({ accounts: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addAccount: async (accountData) => {
    set({ loading: true, error: null });
    try {
      const currentAccounts = await providerBankAccountService.fetchAccounts(accountData.provider_id);
      
      const newAccount: ProviderBankAccount = {
        id: crypto.randomUUID(),
        ...accountData,
        created_at: new Date().toISOString()
      };
      
      const updatedAccounts = [newAccount, ...currentAccounts];
      
      await providerBankAccountService.updateAccounts(accountData.provider_id, updatedAccounts);

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

      await providerBankAccountService.updateAccounts(providerId, updatedAccounts);

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
      const accountToDelete = get().accounts.find(a => a.id === accountId);
      if (!accountToDelete) {
        throw new Error("La cuenta seleccionada no existe en el estado local.");
      }
      
      const providerId = accountToDelete.provider_id;
      const updatedAccounts = get().accounts.filter((a) => a.id !== accountId);

      await providerBankAccountService.updateAccounts(providerId, updatedAccounts);

      set({ accounts: updatedAccounts, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));

