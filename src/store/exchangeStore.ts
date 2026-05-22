// dShopping Lite - Zustand Exchange Rate Store
// Gestión de la tasa cambiaria diaria y operaciones de conversión monetaria

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ExchangeRate } from '../types';
import { useInvoiceStore } from './invoiceStore';

interface ExchangeState {
  currentRate: ExchangeRate | null;
  history: ExchangeRate[];
  loading: boolean;
  error: string | null;
  
  fetchCurrentRate: (companyId: string) => Promise<number>;
  fetchHistory: (companyId: string) => Promise<void>;
  updateCurrentRate: (companyId: string, rateValue: number) => Promise<boolean>;
  fetchLiveBCVRate: () => Promise<{ success: boolean; rate?: number; error?: string }>;
  
  // Métodos de utilidad financiera para cálculos en tiempo real
  convertToLocalCurrency: (amountInUSD: number) => number;
  formatCurrencyLocal: (amountInBs: number) => string;
  formatCurrencyUSD: (amountInUSD: number) => string;
}

export const useExchangeStore = create<ExchangeState>((set, get) => ({
  currentRate: null,
  history: [],
  loading: false,
  error: null,

  // Obtener la tasa cambiaria más reciente para la empresa del usuario
  fetchCurrentRate: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        set({ currentRate: data[0], loading: false });
        return Number(data[0].rate_value);
      } else {
        // Tasa por defecto inicial si no hay ninguna registrada
        const defaultRateVal = 45.00;
        set({ currentRate: null, loading: false });
        return defaultRateVal;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return 45.00; // Tasa de respaldo ante errores
    }
  },

  // Obtener historial de tasas
  fetchHistory: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: false });

      if (error) throw error;
      set({ history: data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // Registrar o actualizar la tasa cambiaria del día actual en Supabase
  updateCurrentRate: async (companyId, rateValue) => {
    set({ loading: true, error: null });
    try {
      const todayStr = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      // Intentar insertar la nueva tasa. En caso de que ya exista para la fecha (gracias al UNIQUE constraint),
      // se realiza un upsert basado en company_id y date.
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

      // 1. Propagar la tasa a todas las facturas en la base de datos (Supabase)
      const { error: invoicesError } = await supabase
        .from('invoices')
        .update({ exchange_rate_at_invoice: rateValue })
        .eq('company_id', companyId);

      if (invoicesError) throw invoicesError;

      // 2. Sincronizar reactivamente el store de facturas en caliente (Zustand)
      useInvoiceStore.setState((state) => ({
        invoices: state.invoices.map((inv) => ({
          ...inv,
          exchange_rate_at_invoice: rateValue
        }))
      }));

      set({ currentRate: data, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Obtener la tasa cambiaria oficial en tiempo real desde la API pública de Venezuela (DolarAPI)
  fetchLiveBCVRate: async () => {
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!response.ok) {
        throw new Error('Error al consultar el tipo de cambio oficial del BCV.');
      }
      const data = await response.json();
      if (data && typeof data.promedio === 'number') {
        return { success: true, rate: data.promedio };
      }
      throw new Error('El formato de respuesta de la API no contiene la tasa promedio.');
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de red al consultar el BCV.' };
    }
  },

  // LÓGICA DE CONVERSIÓN CAMBIARIA (Requisito Financiero)
  // Multiplica cualquier monto en USD por la tasa configurada del día.
  convertToLocalCurrency: (amountInUSD) => {
    const rate = get().currentRate?.rate_value || 45.00;
    
    /* 
      CÁLCULO DE CONVERSIÓN FINANCIERA:
      Monto en Moneda Local (Bs) = Monto en USD * Tasa de Cambio (Bs/$)
      Ejemplo: 100 USD * 45 Bs/$ = 4500 Bs.
    */
    return Number((amountInUSD * rate).toFixed(2));
  },

  // Utilidad de formateo de moneda venezolana (Bolívares - Bs.)
  formatCurrencyLocal: (amountInBs) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInBs);
  },

  // Utilidad de formateo de moneda internacional (Dólares - USD)
  formatCurrencyUSD: (amountInUSD) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInUSD);
  }
}));
