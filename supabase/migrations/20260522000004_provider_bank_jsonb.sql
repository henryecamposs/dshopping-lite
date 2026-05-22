-- Migración: Cuentas Bancarias de Proveedores en JSONB y Formas de Pago de la Empresa
-- Desarrollado por @Dev_Node bajo la metodología SDD

-- 1. Agregar columna JSONB de cuentas bancarias en la tabla de proveedores
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]'::jsonb;

-- 2. Crear tabla de Formas de Pago Corporativas (Canales de Egreso propios de la empresa)
CREATE TABLE IF NOT EXISTS public.company_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Ej: Banesco Corriente Empresa, Pago Móvil BNC
    type VARCHAR(50) NOT NULL CHECK (type IN ('Transferencia', 'Pago Móvil', 'Efectivo', 'Zelle')),
    bank_name VARCHAR(100),
    account_number VARCHAR(100),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    account_holder VARCHAR(255),
    document_id VARCHAR(50), -- RIF/CI del titular
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_company_payment_method_name UNIQUE (company_id, name)
);

-- 3. Habilitar RLS en company_payment_methods
ALTER TABLE public.company_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aislamiento de formas de pago corporativas" ON public.company_payment_methods;
CREATE POLICY "Aislamiento de formas de pago corporativas"
    ON public.company_payment_methods FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
