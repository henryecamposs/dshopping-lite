import { create } from 'zustand';
import { CashRegister, CreateCashRegisterInput } from '../types/cash';
import { cashService } from '../services/cashService';

interface CajaState {
  cajas: CashRegister[];
  loading: boolean;
  error: string | null;

  fetchCajas: (companyId: string) => Promise<void>;
  createCaja: (companyId: string, input: CreateCashRegisterInput) => Promise<boolean>;
  updateCaja: (cajaId: string, input: Partial<CreateCashRegisterInput>) => Promise<boolean>;
  deleteCaja: (cajaId: string) => Promise<boolean>;
}

export const useCajaStore = create<CajaState>((set, get) => ({
  cajas: [],
  loading: false,
  error: null,

  fetchCajas: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.fetchCajas(companyId);
      set({ cajas: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createCaja: async (companyId, input) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.createCaja(companyId, input);
      set((state) => ({
        cajas: [data, ...state.cajas],
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateCaja: async (cajaId, input) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.updateCaja(cajaId, input);
      set((state) => ({
        cajas: state.cajas.map((c) => c.id === cajaId ? data : c),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  deleteCaja: async (cajaId) => {
    set({ loading: true, error: null });
    try {
      await cashService.deleteCaja(cajaId);
      set((state) => ({
        cajas: state.cajas.filter((c) => c.id !== cajaId),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));

