// dShopping Lite - Servicio de Planificación de Turnos (Shift Service)
// Aislado por @Dev_Node bajo la metodología SDD

import { supabase } from '../lib/supabase';
import { StaffShift } from '../types';

export const shiftService = {
  fetchShiftsForDateRange: async (companyId: string, startDate: string, endDate: string): Promise<StaffShift[]> => {
    const { data, error } = await supabase
      .from('staff_shifts')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  addShift: async (companyId: string, shiftData: Omit<StaffShift, 'id' | 'company_id' | 'created_at'>): Promise<StaffShift> => {
    const { data, error } = await supabase
      .from('staff_shifts')
      .insert([{ ...shiftData, company_id: companyId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteShift: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('staff_shifts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

