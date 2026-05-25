-- Migración: Módulo Persistente de Cajas Registradoras (Cash Registers)
-- Desarrollado por @Dev_Node bajo la metodología SDD
-- Fecha: 2026-05-25

-- =========================================================================
-- 1. CREACIÓN DE LA TABLA DE CAJAS REGISTRADORAS (ESTACIONES DE VENTA)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE public.cash_registers IS 'Almacena las cajas registradoras físicas o puntos de venta físicos de la empresa';
COMMENT ON COLUMN public.cash_registers.name IS 'Nombre descriptivo de la caja física, ej. Caja Principal, Caja Chica';
COMMENT ON COLUMN public.cash_registers.status IS 'Estado operativo de la caja (active | inactive)';

-- =========================================================================
-- 2. ALTERACIONES EN LA TABLA public.cash_closures (VINCULACIÓN A LA CAJA)
-- =========================================================================

-- Añadir cash_register_id para vincular el turno a una caja física
ALTER TABLE public.cash_closures 
ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.cash_closures.cash_register_id IS 'ID de la caja registradora física (estación de venta) asociada a este turno';

-- =========================================================================
-- 3. SEGURIDAD A NIVEL DE FILAS (ROW LEVEL SECURITY - RLS)
-- =========================================================================

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aislamiento de cajas registradoras por empresa" ON public.cash_registers;

CREATE POLICY "Aislamiento de cajas registradoras por empresa"
    ON public.cash_registers FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- =========================================================================
-- 4. ÍNDICES DE RENDIMIENTO Y OPTIMIZACIÓN
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_cash_registers_company ON public.cash_registers(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_cash_register ON public.cash_closures(cash_register_id);

-- =========================================================================
-- 5. INSERCIÓN SEMILLA (SEED DATA) PARA LA EMPRESA DEMOSTRATIVA
-- =========================================================================

-- Caja Principal
INSERT INTO public.cash_registers (company_id, name, status)
SELECT 
    c.id, 
    'Caja Principal', 
    'active'
FROM public.companies c
WHERE c.serial_code = 'DEMO-123456'
ON CONFLICT DO NOTHING;

-- Caja Chica / Auxiliar
INSERT INTO public.cash_registers (company_id, name, status)
SELECT 
    c.id, 
    'Caja Auxiliar / Delivery', 
    'active'
FROM public.companies c
WHERE c.serial_code = 'DEMO-123456'
ON CONFLICT DO NOTHING;

-- Caja Secundaria
INSERT INTO public.cash_registers (company_id, name, status)
SELECT 
    c.id, 
    'Caja Secundaria 1', 
    'active'
FROM public.companies c
WHERE c.serial_code = 'DEMO-123456'
ON CONFLICT DO NOTHING;
