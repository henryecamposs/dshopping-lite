import { create } from 'zustand';
import { POSTerminal, CreatePOSTerminalInput } from '../types/cash';
import { cashService } from '../services/cashService';

interface POSTerminalState {
  terminals: POSTerminal[];
  loading: boolean;
  error: string | null;

  fetchTerminals: (companyId: string) => Promise<void>;
  createTerminal: (companyId: string, input: CreatePOSTerminalInput) => Promise<boolean>;
  updateTerminal: (terminalId: string, input: Partial<CreatePOSTerminalInput>) => Promise<boolean>;
  deleteTerminal: (terminalId: string) => Promise<boolean>;
}

export const usePOSTerminalStore = create<POSTerminalState>((set, get) => ({
  terminals: [],
  loading: false,
  error: null,

  fetchTerminals: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.fetchTerminals(companyId);
      set({ terminals: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createTerminal: async (companyId, input) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.createTerminal(companyId, input);
      set((state) => ({
        terminals: [data, ...state.terminals],
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateTerminal: async (terminalId, input) => {
    set({ loading: true, error: null });
    try {
      const data = await cashService.updateTerminal(terminalId, input);
      set((state) => ({
        terminals: state.terminals.map((t) => t.id === terminalId ? data : t),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  deleteTerminal: async (terminalId) => {
    set({ loading: true, error: null });
    try {
      await cashService.deleteTerminal(terminalId);
      set((state) => ({
        terminals: state.terminals.filter((t) => t.id !== terminalId),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));

