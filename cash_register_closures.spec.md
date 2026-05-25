# Especificación Técnica (SDD): Módulo de Operaciones de Caja, Control de Vales y Arqueo Diario Multimoneda

Este documento define el diseño técnico, las reglas de negocio, los contratos de TypeScript, el modelado SQL de Supabase y el plan de interfaz para el **Módulo de Operaciones de Caja, Control de Vales y Arqueo/Cierre Diario Multimoneda**.

---

## 1. Reglas de Negocio (Business Rules)

### A. Registro y Control de Vales de Caja (`cash_vouchers`)
1. **Definición**: Un vale de caja representa un egreso provisional o definitivo de dinero en efectivo de la caja activa para gastos imprevistos, compras de emergencia, o adelantos al personal.
2. **Moneda**: Puede ser emitido en **USD** o **VES**. Si es en VES, se calcula su equivalencia a USD según la tasa del día para fines de auditoría.
3. **Flujo de Caja**: Todo vale emitido dentro de un turno de caja activo resta automáticamente el efectivo disponible teórico para ese turno al momento del cierre.
4. **Estados**:
   - `pendiente`: El vale ha sido emitido pero no se ha rendido la factura/soporte de compra.
   - `consolidado`: El vale ya fue rendido y pasa a ser un gasto consolidado en el cierre.
5. **Aislamiento Multi-Empresa**: Cada vale debe incluir un `company_id` y regirse bajo las políticas de Row Level Security (RLS) de Supabase.

### B. Módulo de Operaciones de Caja y Puntos de Venta (POS)
1. **Apertura de Caja Vinculada a un POS**: 
   - Al abrir un nuevo turno de caja registradora, el operador o supervisor **debe seleccionar obligatoriamente desde cuál terminal POS** (de la lista de terminales persistentes cargada de la BD) se están registrando las operaciones.
   - El sistema almacena esta asociación en el campo `pos_terminal_id` de la tabla `cash_closures` para fines de trazabilidad por máquina/POS.
   - Se requiere registrar un **Saldo Inicial (Opening Balance USD)** al abrir la jornada.
2. **Control Multi-Caja (Listado de Cierres)**:
   - El sistema proporciona una vista unificada de control de cierres que lista de forma ordenada todos los turnos/cajas **abiertas** y **cerradas** de la empresa activa.
   - El operador o supervisor puede hacer clic en cualquier caja abierta de la lista para proceder a registrar el arqueo físico, editarlo o consolidarlo.
3. **Declaración Física (Formulario de Arqueo)**:
   - **Efectivo USD (Divisas)**: Conteo interactivo billete por billete ($100 a $1) con suma reactiva automática.
   - **Efectivo VES (Moneda Nacional)**: Conteo interactivo billete por billete (Bs. 500 a 10) con suma reactiva automática.
   - **Puntos de Venta (POS) & Billeteras**: Inputs dinámicos auto-calculados de forma bidireccional (Bs / USD) según los terminales y billeteras activos.

### C. Guardado en Borrador y Conciliación Final (`cash_closures`)
1. **Guardado en Borrador (Draft Saving)**:
   - El cajero puede ingresar montos parciales de su arqueo físico y presionar **"Guardar Borrador"**.
   - El sistema persiste los billetes contados (en `cash_count_details` JSONB), el desglose de billeteras (en `digital_wallets_details` JSONB) y las declaraciones de POS en la base de datos de Supabase, manteniendo el estado de la caja como `open`.
   - Esto permite que el conteo no se pierda al recargar la página o cambiar de pestaña.
2. **Fórmula del Total Esperado (Teórico)**:
   $$\text{Total Esperado (USD)} = \text{Saldo Inicial (USD)} + \text{Ventas Totales (USD)} - \text{Total Vales Emitidos (USD)}$$
3. **Cálculo de Descuadres (Discrepancia)**:
   $$\text{Diferencia} = \text{Total Declarado Físicamente (USD)} - \text{Total Esperado (USD)}$$
4. **Consolidación y Cierre de Caja**:
   - Al presionar **"Procesar y Consolidar Cierre"**, la caja se marca como `closed` y los datos del arqueo quedan bloqueados de forma irreversible para auditoría.
5. **Exportación e Impresión de Documentos**:
   - El sistema permite generar la impresión física o exportar el comprobante tanto para cajas en estado **Borrador (Draft)** como **Cerrado (Consolidado)**.
   - El documento emitido en borrador contará con un distintivo visual claro de "BORRADOR NO CONSOLIDADO" para evitar manipulaciones financieras.

---

## 2. Estructura de Base de Datos (Supabase SQL)

Proponemos la creación de las siguientes tablas con soporte multi-empresa e índices optimizados:

```sql
-- =========================================================================
-- TABLAS PARA CONTROL DE CAJA Y ARQUEO DIARIO MULTIMONEDA
-- =========================================================================

-- Tabla de Cierres/Arqueos de Caja
CREATE TABLE IF NOT EXISTS public.cash_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    pos_terminal_id UUID REFERENCES public.pos_terminals(id) ON DELETE SET NULL, -- POS vinculado al turno
    opening_balance_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance_usd >= 0),
    closing_date TIMESTAMP WITH TIME ZONE, -- Puede ser NULL hasta que se cierre completamente
    
    -- Declaraciones Físicas de Caja (Declarado por el usuario)
    declared_usd_cash NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (declared_usd_cash >= 0),
    declared_ves_cash NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (declared_ves_cash >= 0),
    declared_pos_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (declared_pos_total >= 0),
    declared_pagomovil NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (declared_pagomovil >= 0),
    declared_transfer NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (declared_transfer >= 0),
    
    -- Ventas registradas en sistema para este arqueo
    sales_system_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (sales_system_usd >= 0),
    
    -- Totales y Conciliación Calculados
    total_vouchers_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_vouchers_amount >= 0),
    theoretical_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discrepancy_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    
    -- Auditoría Detallada y Borrador Persistente
    declared_pos_details JSONB DEFAULT '[]'::jsonb NOT NULL,
    cash_count_details JSONB DEFAULT '{}'::jsonb NOT NULL, -- Borrador del desglose de denominaciones USD/VES
    digital_wallets_details JSONB DEFAULT '{}'::jsonb NOT NULL, -- Borrador de las billeteras (Zelle, Paypal, PM)
    
    -- Parámetros del Turno
    exchange_rate_closure NUMERIC(12, 4) NOT NULL CHECK (exchange_rate_closure > 0),
    observations TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabla de Vales de Caja (Egresos provisionales)
CREATE TABLE IF NOT EXISTS public.cash_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    cash_register_id UUID REFERENCES public.cash_closures(id) ON DELETE SET NULL,
    employee_name VARCHAR(255) NOT NULL,
    amount_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (amount_usd >= 0),
    amount_ves NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (amount_ves >= 0),
    exchange_rate NUMERIC(12, 4) NOT NULL CHECK (exchange_rate > 0),
    concept TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'consolidated')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- SEGURIDAD A NIVEL DE FILAS (RLS)
-- =========================================================================

ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_vouchers ENABLE ROW LEVEL SECURITY;

-- Políticas para cash_closures
CREATE POLICY "Aislamiento de cierres de caja por empresa"
    ON public.cash_closures FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Políticas para cash_vouchers
CREATE POLICY "Aislamiento de vales de caja por empresa"
    ON public.cash_vouchers FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- =========================================================================
-- ÍNDICES DE RENDIMIENTO
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_cash_closures_company ON public.cash_closures(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_date ON public.cash_closures(closing_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_vouchers_closure ON public.cash_vouchers(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_vouchers_company ON public.cash_vouchers(company_id);
```

---

## 3. Contratos de Datos (TypeScript)

### `src/types/cash.ts`
```typescript
export interface CashClosure {
  id: string;
  company_id: string;
  user_id: string;
  pos_terminal_id?: string; // Terminal POS asociado al turno
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
  declared_pos_details?: any[]; // Instantánea de montos individuales por terminal POS
  cash_count_details?: any; // Billetes contados de borrador
  digital_wallets_details?: any; // Billeteras de borrador
  // Campos del cajero (enriquecido)
  user_full_name?: string;
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
```

---

## 4. Estado Global (Zustand)

### Store: `src/store/useCashRegisterStore.ts`
- **Estado**:
  - `activeClosure: CashClosure | null` (La caja abierta actualmente para el cajero)
  - `closures: CashClosure[]` (Historial de cierres de caja)
  - `vouchers: CashVoucher[]` (Lista de vales)
  - `loading: boolean`
  - `error: string | null`
- **Acciones**:
  - `checkActiveClosure(companyId: string, userId: string): Promise<void>`
  - `openRegister(companyId: string, openingBalance: number, currentRate: number): Promise<boolean>`
  - `fetchVouchers(companyId: string, status?: 'pending' | 'consolidated'): Promise<void>`
  - `addVoucher(companyId: string, input: CreateCashVoucherInput): Promise<boolean>`
  - `consolidateVoucher(voucherId: string): Promise<boolean>`
  - `processClosure(companyId: string, input: CreateCashClosureInput): Promise<boolean>`
  - `fetchClosuresHistory(companyId: string): Promise<void>`

---

## 5. Interfaz de Usuario (React + Tailwind CSS)

### Vista: `src/views/Cash/CashClosure.tsx`

La interfaz utilizará una barra lateral limpia y una sección central organizada en pestañas premium (`glassmorphism`):

1. **Pestaña 1: Caja Activa & Arqueo de Caja**
   - **Cabecera**: Indicador visual dinámico del estado del turno (`ABIERTA` en verde pulsante, `CERRADA` en gris).
   - **Formulario de Denominaciones (USD & Bs)**:
     - Tabla interactiva con inputs numéricos para denominaciones de $100, $50, $20, $10, $5, $1 y Bs. 500, 200, 100, 50, 20, 10.
     - Suma automatizada en tiempo real mediante micro-animaciones.
   - **Puntos de Venta (POS) de Bancos de Venezuela**:
     - Tabla premium interactiva con inputs bidireccionales (USD y VES) para los 16 terminales POS nacionales: Banesco, BDV, Mercantil, Provincial, BNC, Bancamiga, Banplus, BFC, Exterior, Plaza, Caroní, Activo, Del Sur, Venezolano de Crédito, 100% Banco y Biopago.
     - Digitar montos en Bs. o USD realiza una auto-conversión reactiva instantánea según la tasa de cambio vigente.
   - **Canales Electrónicos y Billeteras Digitales**:
     - Inputs bidireccionales específicos para Pago Móvil, Transferencia Bancaria, Zelle, Binance y Paypal.
     - Incorporación de un **separador visual elegante y de alta calidad (dashed border)** antes del subtotal de medios digitales.
   - **Panel de Conciliación en Tiempo Real**:
     - Muestra: *Teórico Esperado* vs *Total Declarado*.
     - Diferencia calculada dinámicamente con color representativo:
       - **Diferencia = 0**: Fondo verde suave con texto "Caja Cuadrada".
       - **Diferencia < 0**: Fondo rojo suave con texto "Faltante en Caja".
       - **Diferencia > 0**: Fondo azul suave con texto "Sobrante en Caja".
     - Botón de acción: `Procesar y Consolidar Cierre`.

2. **Pestaña 2: Control de Vales de Caja**
   - Listado de vales pendientes por rendir con filtro interactivo por empleado o estado.
   - Botón `Nuevo Vale` que despliega un modal premium integrado.
   - Cada vale contará con la opción rápida de `Consolidar` (rendir cuentas) o `Editar`.

3. **Pestaña 3: Historial de Cierres de Caja (Auditoría)**
   - Tabla histórica con filtros por rango de fecha y cajero.
   - Acciones: `Ver Detalle`, `Imprimir Reporte`.

---

## 6. Reporte de Cierre e Impresión (Formato Auditoría)

- Implementaremos estilos CSS optimizados para impresión (`@media print`):
  - **Formato Ticket 80mm**: Ideal para imprimir en ticketera térmica del POS de forma compacta.
  - **Formato Carta de Auditoría**: Layout limpio, estructurado y elegante para supervisor.
- **Estructura del Reporte**:
  - **Encabezado**: RIF, Nombre de la Empresa, Fecha/Hora de Apertura y Cierre, Cajero Responsable.
  - **Sección Entradas**: Ventas Totales por Canal (Bs / USD), Pago Móvil y Tarjetas.
  - **Sección Salidas**: Detalle pormenorizado de Vales (Beneficiario, Concepto y Monto).
  - **Cuadro Resumen de Auditoría**:
    - Saldo Inicial.
    - Total Teórico Esperado.
    - Total Físico Declarado.
    - **Descuadre / Diferencia** (destacado con borde grueso).
  - **Firmas de Conformidad**: Líneas para firma física de Cajero y Supervisor al pie del ticket o página.

---

## 7. Cuestionario de Validación para el Usuario

Antes de que nuestro equipo inicie con el desarrollo, solicitamos su confirmación o feedback en los siguientes aspectos del diseño:

1. **Denominaciones de Billetes en VES**: ¿Las denominaciones planteadas (Bs. 500, 200, 100, 50, 20, 10) cubren la totalidad de su flujo físico actual o prefiere incluir alguna otra?
2. **Puntos de Venta (POS)**: ¿Desea que la lista de terminales POS sea fija en código (ej. Banesco, BDV, Mercantil) o que se consulte dinámicamente desde alguna tabla de base de datos existente como `company_payment_methods`?
3. **Restricción de Apertura**: ¿Se debe permitir que un cajero abra una nueva caja sin haber cerrado la del turno anterior, o el sistema debe bloquear estrictamente la apertura si existe un turno previo `open`?
4. **Formato de Impresión Predeterminado**: ¿Prefiere que al presionar "Imprimir Cierre" se renderice directamente en formato de Ticketera Térmica (80mm) o el formato extendido de Hoja Carta?
