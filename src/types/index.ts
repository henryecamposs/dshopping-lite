// dShopping Lite - Definiciones de Interfaces y Contratos de Datos (TypeScript)
// Desarrollado por @Dev_React de acuerdo al .spec.md

export interface Company {
  id: string;          // UUID generado por la base de datos
  name: string;        // Nombre o Razón Social
  rif: string;         // RIF (ej. J-31234567-0)
  serial_code: string; // Código serial único para vincular usuarios
  created_at: string;  // Timestamp de creación
}

export interface User {
  id: string;          // UUID enlazado a Supabase Auth
  company_id: string;  // ID de la empresa vinculada (Relación 1-N)
  full_name: string;   // Nombre completo del usuario
  email: string;       // Correo electrónico
  role: 'admin' | 'operator' | 'viewer'; // Roles de control de acceso
  is_active: boolean;  // Estado de activación en la plataforma
  created_at: string;
}

export interface Provider {
  id: string;
  company_id: string;
  name: string;        // Nombre comercial o Razón Social
  rif: string;         // RIF único por empresa (ej. J-00033800-0)
  is_taxpayer?: boolean;
  iva_retention_percentage?: 75 | 100;
  bank_accounts?: ProviderBankAccount[];
  created_at: string;
}

export interface ProviderBankAccount {
  id: string;
  provider_id: string;
  company_id: string;
  bank_name: string; // Ej: PROVINCIAL, BANESCO, MERCANTIL, VENEZUELA
  account_type: 'Corriente' | 'Ahorro' | 'Pago Móvil' | 'Zelle' | 'Efectivo' | 'Custodia';
  account_number?: string; // Nro de Cuenta (20 digits)
  phone_number?: string; // Teléfono
  email?: string; // Correo Electrónico
  account_holder?: string; // Titular de la cuenta
  document_id?: string; // RIF del Titular
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  company_id: string;
  rate_value: number;  // Tasa cambiaria (ej: 45.30 Bs/$)
  date: string;        // YYYY-MM-DD
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  provider_id: string;
  provider_name?: string; // Nombre del proveedor (obtenido mediante JOIN en Supabase)
  invoice_number: string; // Número físico de factura
  control_number: string; // Número de control del SENIAT
  invoice_date: string;   // Fecha de emisión de la factura (YYYY-MM-DD)
  credit_days: number;    // Días de crédito concedidos
  due_date: string;       // Fecha de vencimiento (calculada automáticamente)
  base_taxable: number;   // Base Imponible de IVA (USD)
  base_exempt: number;    // Base Exenta de IVA (USD)
  sub_total: number;      // base_taxable + base_exempt (USD)
  iva_percentage: number; // IVA % (por defecto 16.00%)
  iva_amount: number;     // IVA calculado (USD)
  total_invoice: number;  // sub_total + iva_amount (USD)
  net_payable?: number;   // Total a pagar neto (Total Factura - Retenciones)
  exchange_rate_at_invoice: number; // Tasa cambiaria registrada al momento de la factura
  status: 'pending' | 'paid'; // Estado de la cuenta por pagar
  observation?: string;   // Ej: DIVISA
  invoice_retentions?: InvoiceRetention[];
  created_at: string;
}

export interface InvoiceRetention {
  id: string;
  invoice_id: string;
  company_id: string;
  type: 'IVA' | 'ISLR';
  retention_percentage: number;
  retention_amount: number;
  correlative_number?: string; // Ej: 20260500000001
  islr_concept?: string;
  created_at: string;
  // Campos enriquecidos opcionalmente al consultar:
  provider_id?: string;
  provider_name?: string;
  provider_rif?: string;
  invoice_number?: string;
  invoice_date?: string;
  base_taxable?: number;
  total_invoice?: number;
  exchange_rate_at_invoice?: number;
}

export interface PaymentTransaction {
  id: string;
  company_id: string;
  provider_id: string;
  provider_name?: string;
  invoice_id?: string;
  invoice_number?: string;
  destination_account_id?: string;
  exchange_rate_id: string;
  amount_paid: number;
  currency: 'USD' | 'VES';
  payment_date: string;
  origin_bank?: string;
  payment_method: 'Transferencia' | 'Pago Móvil' | 'Efectivo' | 'Zelle';
  reference_number?: string;
  observation?: string;
  created_at: string;
  exchange_rate_value?: number;
}

export interface StaffShift {
  id: string;
  company_id: string;
  employee_name: string;
  date: string;
  shift_type: 'Mañana' | 'Tarde' | 'Integral' | 'Libre' | 'Guardia Nocturna';
  notes?: string;
  created_at: string;
}

// Interfaz para la respuesta estándar de la API o servicios
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CompanyPaymentMethod {
  id: string;
  company_id: string;
  name: string; // Ej: Banesco Corriente Empresa
  type: 'Transferencia' | 'Pago Móvil' | 'Efectivo' | 'Zelle';
  bank_name?: string;
  account_number?: string;
  phone_number?: string;
  email?: string;
  account_holder?: string;
  document_id?: string; // RIF/CI
  created_at: string;
}

export interface Expense {
  id: string;
  company_id: string;
  description: string;
  category: string;
  amount: number;
  currency: 'USD' | 'VES';
  exchange_rate_id: string;
  payment_method_id?: string;
  reference_number?: string;
  expense_date: string;
  created_at: string;
  // Campos enriquecidos opcionalmente al consultar:
  exchange_rate_value?: number;
  payment_method_name?: string;
}

export type CreateExpenseInput = Omit<Expense, 'id' | 'company_id' | 'created_at'>;

