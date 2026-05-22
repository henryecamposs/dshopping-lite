-- dCompras Lite - Supabase Database Schema DDL
-- Desarrollado por @Dev_Node bajo la metodología SDD
-- Arquitectura Multi-Empresa con aislamiento estricto y Row Level Security (RLS)

-- Habilitar la extensión UUID si no está activada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. CREACIÓN DE TABLAS PRINCIPALES
-- =========================================================================

-- Tabla de Empresas
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    rif VARCHAR(50) NOT NULL,
    serial_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Comentarios de tabla companies
COMMENT ON TABLE public.companies IS 'Almacena la información de las diferentes empresas integradas en dCompras Lite';
COMMENT ON COLUMN public.companies.serial_code IS 'Código serial único utilizado por los usuarios para vincularse a la empresa';

-- Tabla de Usuarios (Custom Auth Flow vinculada a Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE public.users IS 'Almacena perfiles de usuario vinculados al auth.users de Supabase y asociados a una empresa';

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rif VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Asegurar que el RIF sea único por empresa, pero un mismo proveedor puede existir en distintas empresas
    CONSTRAINT provider_rif_company_unique UNIQUE (company_id, rif)
);

COMMENT ON TABLE public.providers IS 'Proveedores asociados a cada empresa';

-- Tabla de Tasas de Cambio (Tasa del Día)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    rate_value NUMERIC(12, 4) NOT NULL CHECK (rate_value > 0),
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Evitar duplicados de tasas de cambio para la misma fecha en la misma empresa
    CONSTRAINT rate_date_company_unique UNIQUE (company_id, date)
);

COMMENT ON TABLE public.exchange_rates IS 'Historial de tasas de cambio diarias configuradas por empresa';

-- Tabla de Facturas (Invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    control_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    credit_days INTEGER DEFAULT 0 NOT NULL CHECK (credit_days >= 0),
    due_date DATE NOT NULL, -- Calculada automáticamente (due_date = invoice_date + credit_days)
    base_taxable NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (base_taxable >= 0),
    base_exempt NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (base_exempt >= 0),
    sub_total NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (sub_total >= 0),
    iva_percentage NUMERIC(5, 2) DEFAULT 16.00 NOT NULL CHECK (iva_percentage >= 0),
    iva_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (iva_amount >= 0),
    total_invoice NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (total_invoice >= 0),
    exchange_rate_at_invoice NUMERIC(12, 4) NOT NULL CHECK (exchange_rate_at_invoice > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE public.invoices IS 'Almacena los registros financieros de las facturas de compras';

-- =========================================================================
-- 2. TRIGGERS DE CÁLCULOS AUTOMÁTICOS (INTEGRIDAD DE DATOS EN BD)
-- =========================================================================

-- Función para calcular valores automáticos de la factura antes de insertar/actualizar
CREATE OR REPLACE FUNCTION public.fn_calculate_invoice_financials()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Auto-cálculo de la Fecha de Vencimiento sumando los Días de Crédito a la Fecha de Factura
    NEW.due_date := NEW.invoice_date + NEW.credit_days;

    -- 2. Auto-cálculo del Subtotal (Base Imponible + Base Exenta)
    NEW.sub_total := NEW.base_taxable + NEW.base_exempt;

    -- 3. Auto-cálculo del monto de IVA en base a la tasa
    NEW.iva_amount := ROUND((NEW.base_taxable * (NEW.iva_percentage / 100.00)), 2);

    -- 4. Auto-cálculo del Total de la factura (Subtotal + IVA)
    NEW.total_invoice := NEW.sub_total + NEW.iva_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en public.invoices
CREATE OR REPLACE TRIGGER trg_invoices_financial_calculations
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.fn_calculate_invoice_financials();

-- Función auxiliar para obtener la empresa de un usuario sin provocar recursión infinita en las políticas RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id UUID)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (SELECT company_id FROM public.users WHERE id = p_user_id);
END;
$$;

-- =========================================================================
-- 3. SEGURIDAD A NIVEL DE FILAS (ROW LEVEL SECURITY - RLS)
-- =========================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 3.1 Políticas para public.companies
CREATE POLICY "Permitir lectura de empresas a usuarios vinculados"
    ON public.companies FOR SELECT
    USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Permitir inserción de empresas en registro"
    ON public.companies FOR INSERT
    WITH CHECK (true);

-- 3.2 Políticas para public.users
CREATE POLICY "Permitir a los usuarios leer su propio perfil"
    ON public.users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Permitir a miembros leer usuarios de su empresa"
    ON public.users FOR SELECT
    USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Permitir inserción de usuario en registro"
    ON public.users FOR INSERT
    WITH CHECK (true);

-- 3.3 Políticas para public.providers
CREATE POLICY "Aislamiento de proveedores por empresa"
    ON public.providers FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 3.4 Políticas para public.exchange_rates
CREATE POLICY "Aislamiento de tasas de cambio por empresa"
    ON public.exchange_rates FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 3.5 Políticas para public.invoices
CREATE POLICY "Aislamiento de facturas por empresa"
    ON public.invoices FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- =========================================================================
-- 4. ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS Y RENDIMIENTO
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_providers_company ON public.providers(company_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_company_date ON public.exchange_rates(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_company_due ON public.invoices(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_provider ON public.invoices(provider_id);

-- =========================================================================
-- 5. FUNCIONES RPC OPTIMIZADAS (REMOTE PROCEDURE CALLS)
-- =========================================================================

-- 5.1 Obtener métricas financieras consolidadas del Dashboard en un solo request HTTP
CREATE OR REPLACE FUNCTION public.get_company_dashboard_stats(
    p_company_id UUID,
    p_current_rate NUMERIC
)
RETURNS TABLE (
    total_pending_usd NUMERIC,
    total_pending_ves_at_invoice NUMERIC,
    total_pending_ves_at_current NUMERIC,
    total_expired_usd NUMERIC,
    total_expired_ves_at_current NUMERIC,
    total_paid_usd NUMERIC,
    count_pending BIGINT,
    count_expired BIGINT,
    count_paid BIGINT
) AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Control de acceso: Verificar que el usuario pertenece a la empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'Acceso denegado. No pertenece a esta empresa.';
    END IF;

    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'pending' THEN total_invoice ELSE 0 END), 0.00)::NUMERIC AS total_pending_usd,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN ROUND(total_invoice * exchange_rate_at_invoice, 2) ELSE 0 END), 0.00)::NUMERIC AS total_pending_ves_at_invoice,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN ROUND(total_invoice * p_current_rate, 2) ELSE 0 END), 0.00)::NUMERIC AS total_pending_ves_at_current,
        COALESCE(SUM(CASE WHEN status = 'pending' AND due_date < v_today THEN total_invoice ELSE 0 END), 0.00)::NUMERIC AS total_expired_usd,
        COALESCE(SUM(CASE WHEN status = 'pending' AND due_date < v_today THEN ROUND(total_invoice * p_current_rate, 2) ELSE 0 END), 0.00)::NUMERIC AS total_expired_ves_at_current,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_invoice ELSE 0 END), 0.00)::NUMERIC AS total_paid_usd,
        COALESCE(COUNT(CASE WHEN status = 'pending' THEN 1 END), 0)::BIGINT AS count_pending,
        COALESCE(COUNT(CASE WHEN status = 'pending' AND due_date < v_today THEN 1 END), 0)::BIGINT AS count_expired,
        COALESCE(COUNT(CASE WHEN status = 'paid' THEN 1 END), 0)::BIGINT AS count_paid
    FROM public.invoices
    WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Pagar un lote de facturas de forma atómica y transaccional
CREATE OR REPLACE FUNCTION public.pay_invoices_batch(
    p_invoice_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
    v_user_company_id UUID;
BEGIN
    -- Obtener la empresa del usuario actual
    SELECT company_id INTO v_user_company_id
    FROM public.users
    WHERE id = auth.uid();

    IF v_user_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado o no asociado a una empresa.';
    END IF;

    -- Actualizar facturas asegurando aislamiento por empresa
    UPDATE public.invoices
    SET status = 'paid'
    WHERE id = ANY(p_invoice_ids) AND company_id = v_user_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Obtener alertas de facturas por vencer (Hoy/Mañana) o vencidas
CREATE OR REPLACE FUNCTION public.get_due_invoices_alert(
    p_company_id UUID
)
RETURNS TABLE (
    id UUID,
    invoice_number VARCHAR(100),
    due_date DATE,
    total_invoice NUMERIC,
    exchange_rate_at_invoice NUMERIC,
    provider_name VARCHAR(255),
    days_remaining INTEGER
) AS $$
BEGIN
    -- Control de acceso
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'Acceso denegado. No pertenece a esta empresa.';
    END IF;

    RETURN QUERY
    SELECT 
        i.id,
        i.invoice_number,
        i.due_date,
        i.total_invoice,
        i.exchange_rate_at_invoice,
        p.name AS provider_name,
        (i.due_date - CURRENT_DATE)::INTEGER AS days_remaining
    FROM public.invoices i
    JOIN public.providers p ON i.provider_id = p.id
    WHERE i.company_id = p_company_id
      AND i.status = 'pending'
      AND i.due_date <= CURRENT_DATE + 1
    ORDER BY i.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 6. DATOS DE DEMOSTRACIÓN (OPCIONAL - INSERCIÓN SEMILLA)
-- =========================================================================
-- Para probar localmente o en el SQL Editor de Supabase:
-- INSERT INTO public.companies (id, name, rif, serial_code) VALUES 
-- ('99999999-9999-9999-9999-999999999999', 'Empresa de Prueba, C.A.', 'J-12345678-9', 'DEMO-123456')
-- ON CONFLICT DO NOTHING;

