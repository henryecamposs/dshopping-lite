// dShopping Lite - Zustand Exchange Rate Store
// Gestión de la tasa cambiaria diaria y operaciones de conversión monetaria
// Refactorizado por @Dev_React bajo la metodología SDD

import { create } from 'zustand';
import { ExchangeRate } from '../types';
import { exchangeService } from '../services/exchangeService';
import { useInvoiceStore } from './useInvoiceStore';

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
      const data = await exchangeService.fetchCurrentRate(companyId);
      if (data) {
        set({ currentRate: data, loading: false });
        return Number(data.rate_value);
      } else {
        const defaultRateVal = 45.00;
        set({ currentRate: null, loading: false });
        return defaultRateVal;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return 45.00;
    }
  },

  // Obtener historial de tasas
  fetchHistory: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await exchangeService.fetchHistory(companyId);
      set({ history: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // Registrar o actualizar la tasa cambiaria del día actual
  updateCurrentRate: async (companyId, rateValue) => {
    set({ loading: true, error: null });
    try {
      // 1. Guardar o actualizar la tasa cambiaria diaria en la BD
      const data = await exchangeService.updateCurrentRate(companyId, rateValue);

      // 2. Propagar la tasa a todas las facturas en la base de datos (Supabase)
      await exchangeService.propagateRateToInvoices(companyId, rateValue);

      // 3. Sincronizar reactivamente el store de facturas en caliente (Zustand)
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

  // Obtener la tasa cambiaria oficial en tiempo real
  fetchLiveBCVRate: async () => {
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!response.ok) {
        throw new Error('Error al consultar el tipo de cambio oficial del BCV.');
      }
      const data = await response.ok ? await response.json() : null;
      if (data && typeof data.promedio === 'number') {
        return { success: true, rate: data.promedio };
      }
      throw new Error('El formato de respuesta de la API no contiene la tasa promedio.');
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de red al consultar el BCV.' };
    }
  },

  // LÓGICA DE CONVERSIÓN CAMBIARIA (Requisito Financiero)
  convertToLocalCurrency: (amountInUSD) => {
    const rate = get().currentRate?.rate_value || 45.00;
    return Number((amountInUSD * rate).toFixed(2));
  },

  // Utilidad de formateo de moneda venezolana
  formatCurrencyLocal: (amountInBs) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInBs);
  },

  // Utilidad de formateo de moneda internacional
  formatCurrencyUSD: (amountInUSD) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInUSD);
  }
}));

