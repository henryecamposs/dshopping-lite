# Fase 2 - Adaptación SENIAT, Banca Venezolana y Módulos Operativos

## A. Reglas de Negocio

### 1. Módulo SENIAT (Retenciones)
- **Registro por Totales:** Se ingresa: **Base Imponible**, Base Exenta, **Monto IVA** (16%), y **Total Compra Incluyendo IVA**.
- **Retención de IVA:**
  - El proveedor indica si es contribuyente y su % de retención (75% o 100%).
  - Cálculo: `Monto IVA * % Retención`.
  - Correlativo: Año + Mes + 8 dígitos (ej. `20260500000001`).
- **Retención de ISLR:**
  - Selector de conceptos (ej. Servicios, Fletes, Honorarios).
  - Cálculo: Aplicado directamente sobre la **Base Imponible** de la factura.
- **Monto a Pagar (Neto):**
  - Fórmula reflejada en los reportes: `Total Compra Incluyendo IVA - Monto IVA Retenido - Monto ISLR Retenido`.
- **Impresión:** Comprobantes con `@media print`, membrete, RIF, números de control y correlativos.

### 2. Cuentas de Proveedores y Sistema Bancario
- **Cuentas Bancarias (`provider_bank_accounts`):**
  - Múltiples cuentas por proveedor.
  - Datos extraídos de la matriz: **Banco** (Ej. PROVINCIAL, BANESCO, MERCANTIL, VENEZUELA), **Tipo de Cuenta** (Corriente/Ahorro), **Nro de Cuenta** (20 dígitos).
  - **Cuentas a Terceros / Zelle:** Correo Electrónico, **Titular de la cuenta** y **RIF del Titular**.
- **Cuenta Corriente:**
  - Consolidado de deudas (USD y Bs).
  - Historial detallado: Facturas (+), Retenciones (-), Pagos (-).
- **Registro de Pagos:**
  - Al abonar se registra: Fecha, Banco Origen, Cuenta Destino, Método, Referencia y **Observación** (Ej. "DIVISA").

### 3. Histórico de Tasas de Cambio
- **Log Histórico (`exchange_rates`):**
  - Registro estructurado (`id`, `company_id`, `rate_value`, `effective_date`).
  - Uso de la tasa de cambio en el momento de crear la factura/pago (tasa congelada por operación).
- **Auditoría:** Vista en tabla o gráfico.

### 4. Habladores de Productos
- **Formulario (Sin persistencia en DB):** Descripción, SKU, Precio USD.
- **Conversión:** Precio USD * Tasa BCV activa.
- **Impresión:** Layout cuadriculado (4 a 8 por página), estilos `@media print`.

### 5. Turnos y Guardias
- **Planificación (`staff_shifts`):**
  - Campos: id, company_id, employee_name, date, shift_type (Mañana, Tarde, Integral, Libre, Guardia Nocturna), notes.
- **Vista:** Calendario en Tailwind.

## B. Contratos de Datos en TypeScript

```typescript
// Tipos Base de Datos / Supabase

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
}

export interface PaymentTransaction {
  id: string;
  invoice_id?: string; 
  provider_id: string;
  company_id: string;
  amount_paid: number; // Monto pagado
  currency: 'USD' | 'VES';
  exchange_rate_at_payment: number; // Tasa usada congelada en el pago
  payment_date: string;
  origin_bank: string;
  destination_account_id: string; // FK to ProviderBankAccount
  payment_method: 'transferencia' | 'pago_movil' | 'efectivo' | 'zelle';
  reference_number: string;
  created_at: string;
}

export interface ExchangeRateLog {
  id: string;
  company_id: string;
  rate_value: number;
  effective_date: string;
  created_at: string;
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

// Extensión de interfaces existentes
export interface ProviderExtension {
  is_taxpayer?: boolean;
  iva_retention_percentage?: 75 | 100;
}

export interface InvoiceExtension {
  base_imponible: number;
  base_exenta: number;
  monto_iva: number;
  total_compra_con_iva: number; // Total Factura
  monto_a_pagar?: number; // Total Factura - IVA Retenido - ISLR Retenido
  exchange_rate_at_creation?: number; // Tasa congelada al registrar factura
  observacion?: string; // Ej: DIVISA
}
```

## C. Endpoints del Backend Esperados (Supabase/RLS)

- **Cuentas Bancarias:** CRUD en `provider_bank_accounts` (RLS por `company_id`).
- **Retenciones:** CRUD en `invoice_retentions`.
- **Correlativos (RPC):** Función SQL `generate_retention_correlative(company_id)` para asignar números de retención de manera atómica (evitando colisiones) con formato YYYYMM + secuencia.
- **Pagos:** CRUD en `payment_transactions`.
- **Tasas Históricas:** CRUD en `exchange_rates`.
- **Turnos:** CRUD en `staff_shifts`.

## D. Componentes del Frontend y su Estado

### Store (Zustand)
- `useExchangeRateStore.ts` (Modificado):
  - Añadir log y obtención de tasas históricas de DB.
  - Almacenar la tasa activa para uso instantáneo.

### Vistas y Componentes React
1. **Retenciones (`components/retentions/`)**
   - `RetentionForm.tsx`: UI integrada en creación de factura para calcular IVA/ISLR.
   - `IVARetentionPrint.tsx`: Plantilla de comprobante SENIAT oculta/visible con `@media print`.
   - `ISLRRetentionPrint.tsx`: Plantilla ISLR SENIAT.

2. **Cuentas y Pagos (`views/Providers/`)**
   - `ProviderBankAccountsList.tsx`: Módulo para que un proveedor tenga múltiples cuentas (Zelle, Pago Móvil, Bancos).
   - `ProviderStatement.tsx`: Vista de estado de cuenta (Facturas vs Pagos/Retenciones).
   - `PaymentForm.tsx`: Componente para abonar pagos seleccionando cuenta destino, registrando referencia y tasa.

3. **Habladores (`components/printing/`)**
   - `PriceTagGenerator.tsx`: Creador rápido de habladores, multiplicación auto por BCV.
   - `PriceTagGrid.tsx`: Grilla para imprimir 4/8 habladores.

4. **Turnos (`views/Shifts/`)**
   - `ShiftCalendar.tsx`: Grilla mensual/semanal tipo calendario (Tailwind).
   - `ShiftForm.tsx`: Formulario de alta/modificación de turnos por empleado.
