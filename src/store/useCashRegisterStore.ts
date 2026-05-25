import { create } from 'zustand';
import { CashClosure, CashVoucher, CreateCashVoucherInput } from '../types/cash';
import { cashService } from '../services/cashService';

interface CashRegisterState {
  activeClosure: CashClosure | null;
  closures: CashClosure[];
  openClosures: CashClosure[];
  vouchers: CashVoucher[];
  loading: boolean;
  error: string | null;

  setActiveClosure: (closure: CashClosure | null) => void;
  checkActiveClosure: (companyId: string, userId: string) => Promise<void>;
  fetchOpenClosures: (companyId: string) => Promise<void>;
  openRegister: (companyId: string, userId: string, openingBalance: number, currentRate: number, cashRegisterId?: string) => Promise<boolean>;
  fetchVouchers: (companyId: string) => Promise<void>;
  addVoucher: (companyId: string, input: CreateCashVoucherInput) => Promise<boolean>;
  consolidateVoucher: (voucherId: string) => Promise<boolean>;
  saveDraftClosure: (
    closureId: string,
    draftData: {
      declared_usd_cash: number;
      declared_ves_cash: number;
      declared_pos_total: number;
      declared_pagomovil: number;
      declared_transfer: number;
      sales_system_usd: number;
      theoretical_total: number;
      discrepancy_amount: number;
      total_vouchers_amount: number;
      declared_pos_details: any[];
      cash_count_details: any;
      digital_wallets_details: any;
      observations?: string;
    }
  ) => Promise<boolean>;
  processClosure: (
    closureId: string, 
    declaredData: {
      declared_usd_cash: number;
      declared_ves_cash: number;
      declared_pos_total: number;
      declared_pagomovil: number;
      declared_transfer: number;
      sales_system_usd: number;
      theoretical_total: number;
      discrepancy_amount: number;
      total_vouchers_amount: number;
      declared_pos_details: any[];
      cash_count_details: any;
      digital_wallets_details: any;
      observations?: string;
    }
  ) => Promise<boolean>;
  fetchClosuresHistory: (companyId: string) => Promise<void>;
}

export const useCashRegisterStore = create<CashRegisterState>((set, get) => ({
  activeClosure: null,
  closures: [],
  openClosures: [],
  vouchers: [],
  loading: false,
  error: null,

  setActiveClosure: (closure) => {
    set({ activeClosure: closure });
  },

  checkActiveClosure: async (companyId, userId) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.fetchActiveClosure(companyId, userId);
      set({ activeClosure: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchOpenClosures: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.fetchOpenClosures(companyId);
      const formatted = (data || []).map((c: any) => ({
        ...c,
        user_full_name: c.users?.full_name || 'Cajero',
        cash_register_name: c.cash_registers?.name || 'Sin Caja'
      }));
      set({ openClosures: formatted, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  openRegister: async (companyId, userId, openingBalance, currentRate, cashRegisterId) => {
    set({ loading: true, error: null });
    try {
      const exists = await cashService.checkExistingOpenTurn(companyId, userId, cashRegisterId);
      if (exists) {
        if (cashRegisterId) {
          throw new Error('Esa caja registradora ya posee una caja activa y abierta.');
        } else {
          throw new Error('Ya tienes un turno de caja abierto en este momento.');
        }
      }

      const data = await cashService.openRegister(companyId, userId, openingBalance, currentRate, cashRegisterId);
      set({ activeClosure: data, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  fetchVouchers: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.fetchVouchers(companyId);
      set({ vouchers: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addVoucher: async (companyId, input) => {
    set({ loading: true, error: null });
    try {
      const activeClosure = get().activeClosure;
      const data = await cashService.addVoucher(companyId, input, activeClosure?.id);

      if (activeClosure) {
        const totalVouchers = await cashService.recalculateVoucherSums(activeClosure.id);
        const updatedClosure = await cashService.updateClosureVoucherTotal(activeClosure.id, totalVouchers);

        set({ 
          vouchers: [data, ...get().vouchers],
          activeClosure: updatedClosure,
          loading: false 
        });
      } else {
        set({ 
          vouchers: [data, ...get().vouchers],
          loading: false 
        });
      }

      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  consolidateVoucher: async (voucherId) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.consolidateVoucher(voucherId);
      set((state) => ({
        vouchers: state.vouchers.map((v) => v.id === voucherId ? data : v),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  saveDraftClosure: async (closureId, draftData) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.saveDraftClosure(closureId, draftData);
      set({ activeClosure: data, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  processClosure: async (closureId, declaredData) => {
    set({ loading: true, error: null });
    try {
      await cashService.processClosure(closureId, declaredData);
      set({ activeClosure: null, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  fetchClosuresHistory: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.fetchClosuresHistory(companyId);
      const formatted = (data || []).map((c: any) => ({
        ...c,
        user_full_name: c.users?.full_name || 'Cajero',
        cash_register_name: c.cash_registers?.name || 'Sin Caja'
      }));

      set({ closures: formatted, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  }
}));

