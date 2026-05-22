-- Migración Fase 2: Módulo SENIAT, Banca, Tasas Históricas y Utilidades
-- Desarrollado por @Dev_Node

-- 1. Modificar public.providers para añadir datos SENIAT
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS is_taxpayer BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS iva_retention_percentage INTEGER DEFAULT 75 CHECK (iva_retention_percentage IN (75, 100));

-- 2. Modificar public.invoices para alinearse con los datos del excel
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS net_payable NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS observation VARCHAR(255);

-- 3. Tabla Cuentas Bancarias de Proveedores
CREATE TABLE IF NOT EXISTS public.provider_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL, -- Ej: PROVINCIAL, BANESCO
    account_type VARCHAR(50) NOT NULL, -- Corriente, Ahorro, Pago Móvil, Zelle
    account_number VARCHAR(20),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    account_holder VARCHAR(255),
    document_id VARCHAR(50), -- RIF del titular
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.provider_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento de cuentas bancarias" ON public.provider_bank_accounts;
CREATE POLICY "Aislamiento de cuentas bancarias"
    ON public.provider_bank_accounts FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 4. Tabla Retenciones (IVA e ISLR)
CREATE TABLE IF NOT EXISTS public.invoice_retentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IVA', 'ISLR')),
    retention_percentage NUMERIC(5, 2) NOT NULL,
    retention_amount NUMERIC(15, 2) NOT NULL,
    correlative_number VARCHAR(50), -- Ej: 20260500000001
    islr_concept VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT retention_invoice_type_unique UNIQUE (invoice_id, type)
);

ALTER TABLE public.invoice_retentions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento de retenciones" ON public.invoice_retentions;
CREATE POLICY "Aislamiento de retenciones"
    ON public.invoice_retentions FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Función RPC para Generar Correlativo de Retención Único por Empresa (YYYYMM + Secuencia)
CREATE OR REPLACE FUNCTION public.generate_retention_correlative(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR;
    v_last_sequence INTEGER;
    v_new_sequence VARCHAR;
    v_correlative VARCHAR;
BEGIN
    v_prefix := to_char(CURRENT_DATE, 'YYYYMM');
    
    -- Bloquear concurrencia para evitar colisiones
    SELECT COALESCE(MAX(CAST(RIGHT(correlative_number, 8) AS INTEGER)), 0)
    INTO v_last_sequence
    FROM public.invoice_retentions
    WHERE company_id = p_company_id 
      AND LEFT(correlative_number, 6) = v_prefix; -- Note: En Supabase public schema functions, usar SELECT sin FOR UPDATE para evitar deadlock simple si no es estricto, o crear tabla de secuencias. Usaremos SELECT standard.

    v_new_sequence := LPAD(CAST(v_last_sequence + 1 AS VARCHAR), 8, '0');
    v_correlative := v_prefix || v_new_sequence;
    
    RETURN v_correlative;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Tabla Pagos (Transactions) referenciando el ID histórico de la tasa de cambio
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    destination_account_id UUID REFERENCES public.provider_bank_accounts(id) ON DELETE SET NULL,
    exchange_rate_id UUID NOT NULL REFERENCES public.exchange_rates(id) ON DELETE RESTRICT, -- RELACIÓN ESTRICTA
    amount_paid NUMERIC(15, 2) NOT NULL CHECK (amount_paid > 0),
    currency VARCHAR(10) DEFAULT 'VES' NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    origin_bank VARCHAR(100),
    payment_method VARCHAR(50) NOT NULL, -- Transferencia, Pago Móvil, Efectivo, Zelle
    reference_number VARCHAR(100),
    observation VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento de pagos" ON public.payment_transactions;
CREATE POLICY "Aislamiento de pagos"
    ON public.payment_transactions FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 6. Tabla Turnos (Staff Shifts)
CREATE TABLE IF NOT EXISTS public.staff_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    shift_type VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento de turnos" ON public.staff_shifts;
CREATE POLICY "Aislamiento de turnos"
    ON public.staff_shifts FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
