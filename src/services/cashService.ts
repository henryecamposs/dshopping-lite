import { supabase } from '../lib/supabase';
import { 
  POSTerminal, 
  CreatePOSTerminalInput, 
  CashClosure, 
  CashVoucher, 
  CreateCashVoucherInput,
  CashRegister,
  CreateCashRegisterInput
} from '../types/cash';

export const cashService = {
  // =========================================================================
  // SERVICIOS PARA PUNTOS DE VENTA (POS)
  // =========================================================================

  fetchTerminals: async (companyId: string): Promise<POSTerminal[]> => {
    const { data, error } = await supabase
      .from('pos_terminals')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createTerminal: async (companyId: string, input: CreatePOSTerminalInput): Promise<POSTerminal> => {
    const { data, error } = await supabase
      .from('pos_terminals')
      .insert([{
        ...input,
        company_id: companyId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateTerminal: async (terminalId: string, input: Partial<CreatePOSTerminalInput>): Promise<POSTerminal> => {
    const { data, error } = await supabase
      .from('pos_terminals')
      .update(input)
      .eq('id', terminalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteTerminal: async (terminalId: string): Promise<void> => {
    const { error } = await supabase
      .from('pos_terminals')
      .delete()
      .eq('id', terminalId);

    if (error) throw error;
  },

  // =========================================================================
  // SERVICIOS PARA CAJAS REGISTRADORAS (PUNTOS DE VENTA FÍSICOS)
  // =========================================================================

  fetchCajas: async (companyId: string): Promise<CashRegister[]> => {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createCaja: async (companyId: string, input: CreateCashRegisterInput): Promise<CashRegister> => {
    const { data, error } = await supabase
      .from('cash_registers')
      .insert([{
        ...input,
        company_id: companyId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateCaja: async (cajaId: string, input: Partial<CreateCashRegisterInput>): Promise<CashRegister> => {
    const { data, error } = await supabase
      .from('cash_registers')
      .update(input)
      .eq('id', cajaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteCaja: async (cajaId: string): Promise<void> => {
    const { error } = await supabase
      .from('cash_registers')
      .delete()
      .eq('id', cajaId);

    if (error) throw error;
  },

  // =========================================================================
  // SERVICIOS PARA CONTROL DE CAJAS (CIERRES Y TURNOS)
  // =========================================================================

  fetchActiveClosure: async (companyId: string, userId: string): Promise<CashClosure | null> => {
    const { data, error } = await supabase
      .from('cash_closures')
      .select(`
        *,
        cash_registers:cash_register_id(name)
      `)
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('status', 'open')
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return {
        ...data,
        cash_register_name: data.cash_registers?.name || 'Sin Caja'
      };
    }
    return null;
  },

  fetchOpenClosures: async (companyId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('cash_closures')
      .select(`
        *,
        users:user_id(full_name),
        cash_registers:cash_register_id(name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  checkExistingOpenTurn: async (
    companyId: string, 
    userId: string, 
    cashRegisterId?: string
  ): Promise<boolean> => {
    if (cashRegisterId) {
      const { data } = await supabase
        .from('cash_closures')
        .select('id')
        .eq('company_id', companyId)
        .eq('cash_register_id', cashRegisterId)
        .eq('status', 'open')
        .maybeSingle();

      return !!data;
    } else {
      const { data } = await supabase
        .from('cash_closures')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .eq('status', 'open')
        .maybeSingle();

      return !!data;
    }
  },

  openRegister: async (
    companyId: string,
    userId: string,
    openingBalance: number,
    currentRate: number,
    cashRegisterId?: string
  ): Promise<CashClosure> => {
    const newClosure = {
      company_id: companyId,
      user_id: userId,
      cash_register_id: cashRegisterId || null,
      opening_balance_usd: openingBalance,
      exchange_rate_closure: currentRate,
      theoretical_total: openingBalance,
      discrepancy_amount: 0,
      status: 'open' as const
    };

    const { data, error } = await supabase
      .from('cash_closures')
      .insert([newClosure])
      .select(`
        *,
        cash_registers:cash_register_id(name)
      `)
      .single();

    if (error) throw error;
    return {
      ...data,
      cash_register_name: data.cash_registers?.name || 'Sin Caja'
    };
  },

  saveDraftClosure: async (closureId: string, draftData: any): Promise<CashClosure> => {
    const { data, error } = await supabase
      .from('cash_closures')
      .update({
        ...draftData
      })
      .eq('id', closureId)
      .select(`
        *,
        cash_registers:cash_register_id(name)
      `)
      .single();

    if (error) throw error;
    return {
      ...data,
      cash_register_name: data.cash_registers?.name || 'Sin Caja'
    };
  },

  processClosure: async (closureId: string, declaredData: any): Promise<CashClosure> => {
    const { data, error } = await supabase
      .from('cash_closures')
      .update({
        ...declaredData,
        status: 'closed' as const,
        closing_date: new Date().toISOString()
      })
      .eq('id', closureId)
      .select(`
        *,
        cash_registers:cash_register_id(name)
      `)
      .single();

    if (error) throw error;
    return {
      ...data,
      cash_register_name: data.cash_registers?.name || 'Sin Caja'
    };
  },

  fetchClosuresHistory: async (companyId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('cash_closures')
      .select(`
        *,
        users:user_id(full_name),
        cash_registers:cash_register_id(name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'closed')
      .order('closing_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // =========================================================================
  // SERVICIOS PARA VALES DE CAJA (EGRESOS)
  // =========================================================================

  fetchVouchers: async (companyId: string): Promise<CashVoucher[]> => {
    const { data, error } = await supabase
      .from('cash_vouchers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  addVoucher: async (companyId: string, input: CreateCashVoucherInput, activeClosureId?: string): Promise<CashVoucher> => {
    const { data, error } = await supabase
      .from('cash_vouchers')
      .insert([{
        ...input,
        company_id: companyId,
        cash_register_id: activeClosureId || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  recalculateVoucherSums: async (closureId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('cash_vouchers')
      .select('amount_usd')
      .eq('cash_register_id', closureId);

    if (error) throw error;
    return (data || []).reduce((sum, v) => sum + Number(v.amount_usd), 0);
  },

  updateClosureVoucherTotal: async (closureId: string, totalVouchers: number): Promise<CashClosure> => {
    const { data, error } = await supabase
      .from('cash_closures')
      .update({ total_vouchers_amount: totalVouchers })
      .eq('id', closureId)
      .select(`
        *,
        cash_registers:cash_register_id(name)
      `)
      .single();

    if (error) throw error;
    return {
      ...data,
      cash_register_name: data.cash_registers?.name || 'Sin Caja'
    };
  },

  consolidateVoucher: async (voucherId: string): Promise<CashVoucher> => {
    const { data, error } = await supabase
      .from('cash_vouchers')
      .update({ status: 'consolidated' as const })
      .eq('id', voucherId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

