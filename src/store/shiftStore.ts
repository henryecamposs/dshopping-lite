// dShopping Lite - Store para Planificación de Turnos (Shift Store)
// Conexión y persistencia reactiva con la tabla public.staff_shifts en Supabase
// Desarrollado por @Dev_Node bajo la metodología SDD

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { StaffShift } from '../types';

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
      const { data, error } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('company_id', companyId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ shifts: data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addShift: async (companyId, shiftData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('staff_shifts')
        .insert([{ ...shiftData, company_id: companyId }])
        .select()
        .single();

      if (error) throw error;

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
      const { error } = await supabase
        .from('staff_shifts')
        .delete()
        .eq('id', id);

      if (error) throw error;

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
