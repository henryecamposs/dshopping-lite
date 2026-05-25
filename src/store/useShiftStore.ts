// dShopping Lite - Store para Planificación de Turnos (Shift Store)
// Conexión y persistencia reactiva utilizando el servicio
// Refactorizado por @Dev_React bajo la metodología SDD

import { create } from 'zustand';
import { StaffShift } from '../types';
import { shiftService } from '../services/shiftService';

interface ShiftState {
  shifts: StaffShift[];
  loading: boolean;
  error: string | null;

  fetchShiftsForDateRange: (companyId: string, startDate: string, endDate: string) => Promise<void>;
  addShift: (companyId: string, shiftData: Omit<StaffShift, 'id' | 'company_id' | 'created_at'>) => Promise<boolean>;
  deleteShift: (id: string) => Promise<boolean>;
}

export const useShiftStore = create<ShiftState>((set) => ({
  shifts: [],
  loading: false,
  error: null,

  fetchShiftsForDateRange: async (companyId, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const data = await shiftService.fetchShiftsForDateRange(companyId, startDate, endDate);
      set({ shifts: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addShift: async (companyId, shiftData) => {
    set({ loading: true, error: null });
    try {
      const data = await shiftService.addShift(companyId, shiftData);
      set((state) => ({
        shifts: [...state.shifts, data],
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  deleteShift: async (id) => {
    set({ loading: true, error: null });
    try {
      await shiftService.deleteShift(id);
      set((state) => ({
        shifts: state.shifts.filter((s) => s.id !== id),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));

