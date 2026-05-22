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
  exchange_rate_at_invoice: number; // Tasa cambiaria registrada al momento de la factura
  status: 'pending' | 'paid'; // Estado de la cuenta por pagar
  created_at: string;
}

// Interfaz para la respuesta estándar de la API o servicios
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
