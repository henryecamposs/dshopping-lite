// dShopping Lite - Servicio de Cuentas Bancarias de Proveedores
// Aislado por @Dev_Node bajo la metodología SDD

import { supabase } from '../lib/supabase';
import { ProviderBankAccount } from '../types';

export const providerBankAccountService = {
  fetchAccounts: async (providerId: string): Promise<ProviderBankAccount[]> => {
    const { data, error } = await supabase
      .from('providers')
      .select('bank_accounts')
      .eq('id', providerId)
      .single();

    if (error) throw error;
    return data?.bank_accounts || [];
  },

  updateAccounts: async (providerId: string, accounts: ProviderBankAccount[]): Promise<void> => {
    const { error } = await supabase
      .from('providers')
      .update({ bank_accounts: accounts })
      .eq('id', providerId);

    if (error) throw error;
  }
};

