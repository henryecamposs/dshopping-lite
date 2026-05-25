# Especificación Técnica (SDD): Módulo Persistente de Puntos de Venta (POS Terminals)

Este documento define el diseño técnico, las reglas de negocio, los contratos de TypeScript, el modelado SQL de Supabase y el plan de interfaz para el **Módulo Persistente de Puntos de Venta (POS)** y su integración dinámica en el arqueo y cierre de caja diario.

---

## 1. Reglas de Negocio (Business Rules)

### A. Gestión de Terminales POS (`pos_terminals`)
1. **Definición**: Un terminal POS representa un punto de venta físico de cobro electrónico de tarjetas de débito/crédito vinculado a una cuenta bancaria de la empresa.
2. **Atributos Clave**:
   - Debe pertenecer a una empresa activa (`company_id`).
   - Se asocia a un banco oficial de la lista nacional de bancos de Venezuela.
   - Posee un nombre descriptivo personalizado (ej. "Banesco Principal", "BDV Caja 2").
   - Posee un serial físico o número de terminal (opcional).
   - Posee un estado operativo (`active` o `inactive`).
3. **Aislamiento Corporativo**: RLS estricto basado en `company_id`. Un usuario operador/administrador solo puede ver, crear o modificar terminales de su empresa.
4. **Visibilidad en Arqueo**: Únicamente los terminales que tengan estado `active` aparecerán dinámicamente en la planilla de arqueo diario de caja.

### B. Integración Dinámica en Arqueo (`cash_closures`)
1. **Carga Reactiva**: Al abrir el formulario de arqueo, el sistema consulta los terminales POS activos de la BD y genera dinámicamente un input bimonetario bidireccional (Bs / USD) por cada terminal.
2. **Instantánea de Auditoría (Persistencia)**:
   - Los desgloses de los montos declarados por terminal de cobro en un arqueo específico no pueden depender de si el terminal se edita, desactiva o elimina en el futuro.
   - Al guardar el cierre de caja, se captura una **instantánea JSONB** en el campo `declared_pos_details` de la tabla `cash_closures` con el desglose exacto (ID del terminal, banco, nombre y montos declarados en USD/VES).
   - El subtotal de los montos individuales de los POS sigue sumando al campo consolidador `declared_pos_total` para mantener compatibilidad.

---

## 2. Estructura de Base de Datos (Supabase SQL)

### Script de Migración SQL: `public.pos_terminals` y Adiciones

```sql
-- =========================================================================
-- TABLA DE TERMINALES POS (PUNTOS DE VENTA PERSISTENTES)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.pos_terminals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_name VARCHAR(150) NOT NULL,
    terminal_name VARCHAR(150) NOT NULL,
    serial_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE public.pos_terminals IS 'Almacena terminales de Puntos de Venta (POS) persistentes y parametrizables de cada empresa';

-- =========================================================================
-- MODIFICACIÓN EN CASH_CLOSURES PARA AUDITORÍA DE POS DETALLADOS
-- =========================================================================

ALTER TABLE public.cash_closures 
ADD COLUMN IF NOT EXISTS declared_pos_details JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.cash_closures.declared_pos_details IS 'Instantánea JSON con el desglose individual por POS declarado en el arqueo';

-- =========================================================================
-- SEGURIDAD A NIVEL DE FILAS (RLS)
-- =========================================================================

ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aislamiento de terminales POS por empresa"
    ON public.pos_terminals FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- =========================================================================
-- ÍNDICE DE RENDIMIENTO
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_pos_terminals_company ON public.pos_terminals(company_id);

-- =========================================================================
-- INSERCIÓN SEMILLA (SEED DATA)
-- =========================================================================
-- Insertar terminales por defecto para la empresa de prueba (DEMO) o la empresa en sesión
INSERT INTO public.pos_terminals (company_id, bank_name, terminal_name, serial_number, status)
SELECT 
    c.id, 
    'Banesco', 
    'Banesco Principal POS', 
    'SN-BAN-9982', 
    'active'
FROM public.companies c
WHERE c.serial_code = 'DEMO-123456'
ON CONFLICT DO NOTHING;

INSERT INTO public.pos_terminals (company_id, bank_name, terminal_name, serial_number, status)
SELECT 
    c.id, 
    'Banco de Venezuela (BDV)', 
    'BDV POS Caja Chica', 
    'SN-BDV-1022', 
    'active'
FROM public.companies c
WHERE c.serial_code = 'DEMO-123456'
ON CONFLICT DO NOTHING;

INSERT INTO public.pos_terminals (company_id, bank_name, terminal_name, serial_number, status)
SELECT 
    c.id, 
    'Banco Mercantil', 
    'Mercantil POS Principal', 
    'SN-MER-4412', 
    'active'
FROM public.companies c
WHERE c.serial_code = 'DEMO-123456'
ON CONFLICT DO NOTHING;

INSERT INTO public.pos_terminals (company_id, bank_name, terminal_name, serial_number, status)
SELECT 
    c.id, 
    'Banco Provincial (BBVA)', 
    'Provincial POS Caja 1', 
    'SN-PRO-5541', 
    'active'
FROM public.companies c
WHERE c.serial_code = 'DEMO-123456'
ON CONFLICT DO NOTHING;
```

---

## 3. Lista Oficial de Bancos de Venezuela (Selector CRUD)
Al registrar o modificar un terminal, el selector de "Banco" desplegará la totalidad de las instituciones bancarias en Venezuela para garantizar precisión:
1. Banco de Venezuela (BDV)
2. Banesco
3. Banco Mercantil
4. Banco Provincial (BBVA)
5. Banco Nacional de Crédito (BNC)
6. Bancamiga
7. Banplus
8. Banco Fondo Común (BFC)
9. Banco Exterior
10. Banco Plaza
11. Banco Caroní
12. Banco Activo
13. Banco del Sur
14. Banco Venezolano de Crédito
15. 100% Banco
16. Banco del Tesoro
17. Banco Agrícola de Venezuela
18. Banco Bicentenario
19. Mi Banco
20. Bancrecer
21. Citibank N.A. (Venezuela)

---

## 4. Contratos de Datos (TypeScript)

### `src/types/pos.ts`
```typescript
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
```

---

## 5. Capa de Estado Global (Zustand)

### Store: `src/store/usePOSTerminalStore.ts`
- **Estado**:
  - `terminals: POSTerminal[]`
  - `loading: boolean`
  - `error: string | null`
- **Acciones**:
  - `fetchTerminals(companyId: string): Promise<void>`
  - `createTerminal(companyId: string, input: CreatePOSTerminalInput): Promise<boolean>`
  - `updateTerminal(terminalId: string, input: Partial<CreatePOSTerminalInput>): Promise<boolean>`
  - `deleteTerminal(terminalId: string): Promise<boolean>`

---

## 6. Interfaz de Usuario (React + Tailwind CSS)

### Vista de Configuración / CRUD de POS
- **Pestaña Nueva en Caja**: "Gestión de Puntos (POS)".
- **Diseño**: Tabla interactiva con botones para añadir nuevo punto, editar datos y desactivar/eliminar.
- **Formulario Integrado/Modal**: Modal estilizado con glassmorphism que contiene:
  - Input de Texto para Nombre del POS (Ej: "Banesco Principal").
  - Selector de Banco de Venezuela con todos los 21 bancos de la lista.
  - Input de Texto para Serial (opcional).
  - Selector de estado (`active` / `inactive`).

### Vista de Arqueo Dinámica
- En vez de la lista estática en `CashClosure.tsx`, se mapea `terminals.filter(t => t.status === 'active')`.
- Cada elemento genera un input bidireccional reactivo.
- Al procesar el cierre, se mapea el estado a un arreglo `POSDeclaredDetail[]` y se pasa en el parámetro `declared_pos_details` al procesar el cierre.
