// dShopping Lite - Servicio cambiario y de tasas diarias
// Aislado por @Dev_Node bajo la metodología SDD

import { supabase } from '../lib/supabase';
import { ExchangeRate } from '../types';

export const exchangeService = {
  fetchCurrentRate: async (companyId: string): Promise<ExchangeRate | null> => {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  fetchHistory: async (companyId: string): Promise<ExchangeRate[]> => {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  updateCurrentRate: async (companyId: string, rateValue: number): Promise<ExchangeRate> => {
    const todayStr = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('exchange_rates')
      .upsert({
        company_id: companyId,
        rate_value: rateValue,
        date: todayStr
      }, {
        onConflict: 'company_id,date'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  propagateRateToInvoices: async (companyId: string, rateValue: number): Promise<void> => {
    const { error } = await supabase
      .from('invoices')
      .update({ exchange_rate_at_invoice: rateValue })
      .eq('company_id', companyId);

    if (error) throw error;
  }
};

