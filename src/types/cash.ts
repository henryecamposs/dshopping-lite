export interface CashClosure {
  id: string;
  company_id: string;
  user_id: string;
  pos_terminal_id?: string; // Terminal POS asociado al turno (deprecated/opcional)
  cash_register_id?: string; // Caja física donde se opera
  opening_balance_usd: number;
  closing_date?: string; // Puede ser undefined si está en borrador/abierta
  declared_usd_cash: number;
  declared_ves_cash: number;
  declared_pos_total: number;
  declared_pagomovil: number;
  declared_transfer: number;
  sales_system_usd: number; // Ventas de sistema registradas
  total_vouchers_amount: number;
  theoretical_total: number;
  discrepancy_amount: number;
  exchange_rate_closure: number;
  observations?: string;
  status: 'open' | 'closed';
  created_at: string;
  declared_pos_details?: POSDeclaredDetail[]; // Desglose instantáneo de montos por POS en el arqueo
  cash_count_details?: any; // Billetes contados de borrador
  digital_wallets_details?: any; // Billeteras de borrador
  // Campos del cajero (enriquecido opcionalmente)
  user_full_name?: string;
  pos_terminal_name?: string; // Nombre formateado de la máquina POS asociada
  cash_register_name?: string; // Nombre formateado de la caja registradora asociada
}

export interface CashRegister {
  id: string;
  company_id: string;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export type CreateCashRegisterInput = Omit<CashRegister, 'id' | 'company_id' | 'created_at'>;

export interface POSTerminal {
  id: string;
  company_id: string;
  bank_name: string;
  terminal_name: string;
  serial_number?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export type CreatePOSTerminalInput = Omit<POSTerminal, 'id' | 'company_id' | 'created_at'>;

export interface POSDeclaredDetail {
  terminal_id: string;
  bank_name: string;
  terminal_name: string;
  usd: number;
  ves: number;
}

export interface CashVoucher {
  id: string;
  company_id: string;
  cash_register_id?: string;
  employee_name: string;
  amount_usd: number;
  amount_ves: number;
  exchange_rate: number;
  concept: string;
  status: 'pending' | 'consolidated';
  created_at: string;
}

export type CreateCashVoucherInput = Omit<CashVoucher, 'id' | 'company_id' | 'created_at'>;
export type CreateCashClosureInput = Omit<CashClosure, 'id' | 'company_id' | 'created_at' | 'user_id' | 'status'>;

