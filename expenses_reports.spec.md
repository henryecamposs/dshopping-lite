# Especificación Técnica (SDD): Módulo de Gastos y Reportes Consolidados

Este documento define el diseño técnico, las reglas de negocio, los contratos de TypeScript y el plan de implementación para el nuevo **Módulo de Gastos Operativos** y el **Centro de Reportes Consolidados (Pagos y Retenciones)** en dShopping Lite.

---

## 1. Reglas de Negocio (Business Rules)

### Módulo de Gastos Operativos (Expenses)
1. **Definición**: Un gasto representa un egreso operativo directo de la empresa (ej: alquiler, nómina, servicios básicos, papelería) que no está asociado a una factura de proveedor del inventario o cuentas por pagar tradicionales.
2. **Multi-Empresa RLS**: Cada gasto registrado debe pertenecer estrictamente a una empresa (`company_id`) y solo puede ser visto/modificado por usuarios autenticados asociados a dicha empresa.
3. **Moneda e Historial Cambiario**: 
   - El gasto puede registrarse en **USD** o **VES**.
   - Si se registra en USD, se calculará su equivalente en VES usando la tasa de cambio vigente del día.
   - El registro almacenará la relación con la tasa de cambio (`exchange_rate_id`) para trazabilidad histórica.
4. **Forma de Pago**: Se vinculará con un canal de egreso corporativo registrado en `company_payment_methods` (o de forma libre si es en efectivo).
5. **Categorización**: Clasificación obligatoria (ej: Servicios Públicos, Alquileres, Nómina/Sueldos, Mantenimiento, Impuestos, Otros).

### Reporte de Pagos
1. **Origen de Datos**: Proviene de la tabla `payment_transactions` (pagos efectuados a proveedores por concepto de facturas).
2. **Campos Requeridos**: Fecha, Proveedor (RIF + Nombre), Factura Nro, Banco Origen, Método de Pago, Referencia, Monto Original (Moneda de pago), Tasa Cambiaria, Monto en Bs.
3. **Funcionalidades**: 
   - Filtros dinámicos por rango de fechas, proveedor y método de pago.
   - Exportación directa a formato CSV/Excel.
   - Vista de impresión optimizada (`@media print`) en formato vertical/horizontal para PDF.

### Reporte de Retenciones (IVA / ISLR)
1. **Origen de Datos**: Proviene de la tabla `invoice_retentions` unida con `invoices` y `providers`.
2. **Campos Requeridos**: Nro de Correlativo de Retención, Fecha de Retención, Proveedor (RIF + Nombre), Nro de Factura Afectada, Base Imponible, Tipo de Retención (IVA / ISLR), Porcentaje Aplicado (75%, 100%, o porcentajes ISLR), Monto Retenido (en Bs/USD).
3. **Funcionalidades**: 
   - Filtros por rango de fechas, tipo de retención (IVA o ISLR) y proveedor.
   - Exportación a CSV/Excel.
   - Generación de comprobante oficial de retención en PDF para impresión masiva o individual.

---

## 2. Estructura de Base de Datos (Supabase)

### Nueva Tabla: `public.expenses`
```sql
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- Servicios, Alquiler, Nomina, Impuestos, Mantenimiento, Suministros, Otros
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL CHECK (currency IN ('USD', 'VES')),
    exchange_rate_id UUID NOT NULL REFERENCES public.exchange_rates(id) ON DELETE RESTRICT,
    payment_method_id UUID REFERENCES public.company_payment_methods(id) ON DELETE SET NULL,
    reference_number VARCHAR(100),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento
CREATE POLICY "Aislamiento de gastos por empresa"
    ON public.expenses FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
```

---

## 3. Contratos de Datos (TypeScript)

### `src/types/expense.ts`
```typescript
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
```

---

## 4. Componentes Frontend y Manejo de Estado (React + Zustand)

### 1. Store Zustand para Gastos (`src/store/expenseStore.ts`)
- **Estado**:
  - `expenses: Expense[]`
  - `loading: boolean`
  - `error: string | null`
- **Acciones**:
  - `fetchExpenses(companyId: string): Promise<void>`
  - `addExpense(companyId: string, input: CreateExpenseInput): Promise<boolean>`
  - `deleteExpense(id: string): Promise<boolean>`

### 2. Vista de Gastos (`src/views/Expenses.tsx`)
- Tabla estilizada (glassmorphism) con paginación, filtros por fecha y categoría.
- Resumen en tarjetas superiores: Total del mes (USD y Bs), Categoría con mayor gasto.
- Modal premium de "Registrar Gasto" (altura ajustada, diseño premium) que permita:
  - Seleccionar Categoría.
  - Seleccionar Moneda (USD / VES).
  - Ingresar monto e indicar tasa del día automática.
  - Seleccionar Cuenta de Egreso de la empresa (de `company_payment_methods`).
  - Agregar referencia y observación.

### 3. Centro de Reportes Unificado (`src/views/Reports/ReportsCenter.tsx`)
- Ubicado en la barra lateral bajo la sección unificada **REPORTES**.
- Estructura de pestañas (Tabs):
  - **1. Reporte de Facturas**: Filtro, listado de facturas, base imponible, impuestos y saldos.
  - **2. Reporte de Pagos**: Historial detallado de transacciones de pago, conversión cambiaria e historial.
  - **3. Reporte de Retenciones**: Desglose de retenciones aplicadas con sus números correlativos SENIAT oficiales.

### 4. Estructura de Navegación (`src/components/Layout.tsx`)
- **Nueva categoría**: `REPORTES` (agrupada en un solo lugar destacado en el menú lateral):
  - `reports`: Centro de Reportes (Acceso unificado con pestañas).
  - `expenses`: Módulo de Gastos (ubicado en `FACTURACIÓN` junto a Facturas y Proveedores).

---

## 5. Cuestionario de Validación para el Usuario
Para pulir los detalles finales del `.spec.md`, solicitamos confirmar los siguientes puntos:
1. **Categorías de Gasto**: ¿La lista inicial de categorías (Servicios, Alquiler, Nómina, Impuestos, Mantenimiento, Suministros, Otros) es suficiente o deseas agregar alguna específica?
2. **Agrupación de Reportes en la Barra Lateral**: ¿Prefieres un único botón "Centro de Reportes" en el menú que contenga pestañas internas para Facturas, Pagos y Retenciones (recomendado para mantener una UI limpia y minimalista), o deseas que cada uno de los 3 reportes aparezca como un botón independiente en la barra lateral agrupados bajo un encabezado "REPORTES"?
3. **Comprobante de Retenciones**: ¿El reporte de retenciones debe permitir descargar e imprimir el formato oficial de retención de IVA e ISLR en PDF de forma individual (como un comprobante de retención del proveedor)?
