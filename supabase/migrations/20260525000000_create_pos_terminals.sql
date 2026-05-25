-- Migración: Módulo Persistente de Puntos de Venta (POS Terminals)
-- Creado por @Dev_Node bajo la metodología SDD
-- Fecha: 2026-05-25

-- =========================================================================
-- 1. CREACIÓN DE LA TABLA DE TERMINALES POS
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
COMMENT ON COLUMN public.pos_terminals.bank_name IS 'Nombre de la institución bancaria oficial de Venezuela';
COMMENT ON COLUMN public.pos_terminals.terminal_name IS 'Nombre descriptivo personalizado de la caja o terminal POS';
COMMENT ON COLUMN public.pos_terminals.status IS 'Estado operativo del punto de venta (active | inactive)';

-- =========================================================================
-- 2. MODIFICACIÓN DE CASH_CLOSURES (AÑADIR CAMPO DE AUDITORÍA DETALLADA)
-- =========================================================================

ALTER TABLE public.cash_closures 
ADD COLUMN IF NOT EXISTS declared_pos_details JSONB DEFAULT '[]'::jsonb NOT NULL;

COMMENT ON COLUMN public.cash_closures.declared_pos_details IS 'Instantánea JSON con el desglose individual por POS declarado en el arqueo diario';

-- =========================================================================
-- 3. SEGURIDAD A NIVEL DE FILAS (ROW LEVEL SECURITY - RLS)
-- =========================================================================

ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;

-- Evitar duplicidad de políticas
DROP POLICY IF EXISTS "Aislamiento de terminales POS por empresa" ON public.pos_terminals;

CREATE POLICY "Aislamiento de terminales POS por empresa"
    ON public.pos_terminals FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- =========================================================================
-- 4. ÍNDICES DE RENDIMIENTO Y OPTIMIZACIÓN
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_pos_terminals_company ON public.pos_terminals(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_status ON public.pos_terminals(company_id, status);

-- =========================================================================
-- 5. INSERCIÓN SEMILLA (SEED DATA) PARA LA EMPRESA DEMOSTRATIVA
-- =========================================================================

-- Aseguramos la existencia de los terminales más comunes para pruebas en la empresa DEMO
INSERT INTO public.pos_terminals (company_id, bank_name, terminal_name, serial_number, status)
SELECT 
    c.id, 
    'Banesco', 
    'Banesco POS Principal', 
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
